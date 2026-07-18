"""
Realtime Agent — runs on a rolling timer during live meetings.

Trigger: Every REALTIME_CADENCE_SECONDS while meeting is active
Input:   Last N minutes of transcript (rolling window from Redis)
Output:  {suggestions: [], risks: [], next_question: str, recap: str}
Model:   Gemini Flash (fast + cheap for frequent calls)
Governed by Lyzr light guardrail
"""

import json
import time
import hashlib
from google import genai
from google.genai import types as genai_types
from ..core.config import settings
from ..core.redis_client import get_transcript_window

_last_call_times: dict[str, float] = {}
_last_results: dict[str, dict] = {}
_last_chunk_counts: dict[str, int] = {}
_consecutive_unchanged: dict[str, int] = {}

_SYSTEM_PROMPT = """You are MeetMaxxing, an AI meeting copilot giving LIVE assistance to the speaker in a meeting.

Your job:
1. SUGGESTIONS — 1-3 concise action prompts the speaker could say RIGHT NOW (questions to ask, points to clarify, things to propose). Keep each under 15 words.
2. RISKS — Flag any red flags in the conversation (commitment without timeline, vague ownership, contradictions, pricing discussions without specifics). 1-2 max. Only flag real issues visible in the text.
3. NEXT_QUESTION — The single best question to ask next given the conversation flow. 1 sentence.
4. RECAP — A 2-3 sentence recap for someone joining late right now. Include who said what.

CRITICAL RULES:
- Only reference names, numbers, and facts that EXPLICITLY appear in the transcript.
- Do NOT invent any statements, names, or commitments not in the text.
- If no risks, return empty array for risks.
- Always provide a recap, even if the transcript is very short.

Respond ONLY in valid JSON matching this exact schema:
{
  "suggestions": ["...", "..."],
  "risks": ["..."],
  "next_question": "...",
  "recap": "..."
}"""


def _parse_json_clean(raw: str) -> dict:
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]
    try:
        return json.loads(cleaned)
    except:
        return {}


def _format_window(chunks: list[dict]) -> str:
    """Format transcript chunks into readable text for the LLM."""
    if not chunks:
        return "No transcript yet."
    lines = []
    for chunk in chunks:
        speaker = chunk.get("speaker", "Unknown")
        text = chunk.get("text", "")
        ts = chunk.get("timestamp_ms", 0)
        mins = ts // 60000
        secs = (ts % 60000) // 1000
        lines.append(f"[{mins:02d}:{secs:02d}] {speaker}: {text}")
    return "\n".join(lines)


async def run_realtime_agent(meeting_id: str, context: dict | None = None, force: bool = False) -> dict:
    """
    Main entry point — fetch rolling window, call fallback pipeline, return suggestions.
    context: optional dict with meeting title, attendees, agenda for richer suggestions.
    """
    # Fetch last N chunks from Redis (approx REALTIME_WINDOW_MINUTES of speech)
    chunks = await get_transcript_window(
        meeting_id,
        last_n=settings.REALTIME_WINDOW_MINUTES * 10,  # ~10 utterances/minute
    )

    if not chunks:
        return {
            "meeting_id": meeting_id,
            "suggestions": ["Listening for spoken speech... Turn on Google Meet Captions (CC) at the bottom right to begin real-time AI analysis."],
            "risks": [],
            "next_question": "Waiting for speaker utterance...",
            "recap": "No spoken words captured yet. Turn on Google Meet Captions (CC) below so MeetMaxxing can listen and summarize the discussion.",
            "transcript_chunks": 0,
        }

    now = time.time()
    last_time = _last_call_times.get(meeting_id, 0.0)
    last_count = _last_chunk_counts.get(meeting_id, 0)
    
    # Adaptive Cadence: If transcript unchanged, back off
    if len(chunks) == last_count:
        _consecutive_unchanged[meeting_id] = _consecutive_unchanged.get(meeting_id, 0) + 1
    else:
        _consecutive_unchanged[meeting_id] = 0

    unchanged_count = _consecutive_unchanged.get(meeting_id, 0)
    adaptive_delay = 45.0 if unchanged_count >= 3 else 28.0

    if not force and (now - last_time < adaptive_delay or len(chunks) == last_count):
        if meeting_id in _last_results:
            return _last_results[meeting_id]
    if force and (now - last_time < 6.0):
        if meeting_id in _last_results:
            return _last_results[meeting_id]

    # Delta-only Analysis Context Construction
    new_chunks = chunks[max(0, last_count-3):] # Take 3 chunks overlap
    print(f"\n[MeetMaxxing Realtime Agent] Analyzing {len(new_chunks)} new chunks (overlap 3) out of {len(chunks)} total chunks for {meeting_id}...")
    
    # Compress context if too large
    if len(chunks) > 30:
        transcript_text = "(Previous conversation context omitted for brevity)\n" + _format_window(chunks[-30:])
    else:
        transcript_text = _format_window(chunks)

    context_block = ""
    if context:
        context_block = f"""
Meeting context:
- Title: {context.get('title', 'Unknown')}
- Attendees: {', '.join(context.get('attendees', []))}
- Agenda: {context.get('agenda', 'None provided')}

"""

    prompt = f"""{context_block}Current transcript (rolling window):
{transcript_text}

Analyze the above and respond with suggestions, risks, next question, and recap."""

    try:
        from ..core.llm_fallback import generate_content_with_fallback
        print(f"[MeetMaxxing LLM Pipeline] Generating real-time insights with automatic failover...")
        raw, powered_by = await generate_content_with_fallback(
            prompt=prompt,
            system_instruction=_SYSTEM_PROMPT,
            temperature=0.3,
            max_tokens=512,
            response_format_json=True,
            cache_ttl=300, # Cache for 5 mins
        )
        result = _parse_json_clean(raw or "{}")
        result["powered_by"] = powered_by
        print(f"[MeetMaxxing API] Success ({powered_by})! Generated {len(result.get('suggestions', []))} suggestions & {len(result.get('risks', []))} risk flags.")
    except Exception as e:
        err_str = str(e)
        print(f"[MeetMaxxing API] ERROR during generate_content_with_fallback: {err_str}")
        if meeting_id in _last_results and _last_results[meeting_id].get("suggestions"):
            print("[MeetMaxxing Gemini API] Fallback failed. Returning last valid cached insights.")
            return _last_results[meeting_id]
        return {
            "meeting_id": meeting_id,
            "error": "Rate limit reached or all fallback APIs failed. Insights will auto-refresh shortly.",
            "suggestions": ["Rate limit reached. Insights will auto-refresh shortly once quota resets."],
            "risks": [],
            "next_question": "Rate limit temporarily reached. Auto-refreshing soon.",
            "recap": "Late-join recap delayed by rate limits. Auto-refreshing soon.",
            "transcript_chunks": len(chunks),
            "powered_by": "Cached Insight / API Failed"
        }

    # Run Lyzr light guardrail validation on real suggestions
    from ..services.guardrails import validate_realtime_output
    raw_suggs = result.get("suggestions", [])
    validated_suggs = validate_realtime_output(raw_suggs, transcript_text)

    res = {
        "meeting_id": meeting_id,
        "suggestions": validated_suggs,
        "risks": result.get("risks", []),
        "next_question": result.get("next_question", ""),
        "recap": result.get("recap", ""),
        "transcript_chunks": len(chunks),
        "powered_by": result.get("powered_by", "Unknown API"),
    }
    _last_call_times[meeting_id] = now
    _last_chunk_counts[meeting_id] = len(chunks)
    _last_results[meeting_id] = res
    return res
