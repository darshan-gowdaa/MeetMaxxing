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
from ..core.utils import parse_json_clean

_last_call_times: dict[str, float] = {}
_last_results: dict[str, dict] = {}
_last_chunk_counts: dict[str, int] = {}
_consecutive_unchanged: dict[str, int] = {}

_SYSTEM_PROMPT = """You are MeetMaxxing, an AI meeting copilot giving LIVE assistance to the speaker in a meeting.

Your job:
1. SUGGESTIONS ("What to answer") — 1-2 precise, direct, and actionable talking points the user should say right now in response to the current discussion. Must be extremely concise.
2. RISKS — Flag any red flags in the conversation. 1-2 max. Only flag real issues visible in the text.
3. NEXT_QUESTION ("Suggestion of what to Ask") — A single, highly strategic, thought-provoking question to ask next. Must be EXACTLY 1 sentence. 
4. RECAP ("Recap Agent") — 1-2 sentences summarizing the main discussion so far. Must be extremely refined and to the point.

CRITICAL RULES:
- Only reference names, numbers, and facts that EXPLICITLY appear in the transcript.
- Do NOT invent any statements, names, or commitments not in the text.
- If no risks, return empty array for risks.

Respond ONLY in valid JSON matching this exact schema. Do NOT include markdown code blocks or ```json wrappers. Just raw JSON:
{
  "suggestions": ["...", "..."],
  "risks": ["..."],
  "next_question": "...",
  "recap": "..."
}"""





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
    raw_chunks = await get_transcript_window(
        meeting_id,
        last_n=settings.REALTIME_WINDOW_MINUTES * 20,  # pull more to allow filtering
    )
    chunks = [c for c in raw_chunks if c.get("source") != "audio"]
    # Limit to the last N relevant chunks
    chunks = chunks[-(settings.REALTIME_WINDOW_MINUTES * 10):]

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

    # Pass the entire rolling window so fallback LLMs have context
    print(f"\n[MeetMaxxing Realtime Agent] Analyzing {len(chunks)} chunks (window) for {meeting_id}...")
    
    transcript_text = _format_window(chunks)

    context_block = ""
    if context:
        context_block = f"""
Meeting context:
- Title: {context.get('title', 'Unknown')}
- Attendees: {', '.join(context.get('attendees', []))}
- Agenda: {context.get('agenda', 'None provided')}

"""

    prompt = f"""{_SYSTEM_PROMPT}

{context_block}New transcript utterances:
{transcript_text}"""

    try:
        from ..core.llm_fallback import generate_content_with_fallback
        print(f"[MeetMaxxing LLM Pipeline] Generating real-time insights with Fallback LLM...")
        raw, powered_by = await generate_content_with_fallback(prompt, bypass_cache=force)
        result = parse_json_clean(raw or "{}")
        result["powered_by"] = powered_by
        print(f"[MeetMaxxing API] Success ({powered_by})! Generated {len(result.get('suggestions', []))} suggestions & {len(result.get('risks', []))} risk flags.")
    except Exception as e:
        err_str = str(e)
        print(f"[MeetMaxxing API] ERROR during Lyzr SDK execution: {err_str}")
        if meeting_id in _last_results and _last_results[meeting_id].get("suggestions"):
            print("[MeetMaxxing API] Lyzr failed. Returning last valid cached insights.")
            return _last_results[meeting_id]
        return {
            "meeting_id": meeting_id,
            "error": f"Lyzr API Error: {err_str}. Insights will auto-refresh shortly.",
            "suggestions": ["Lyzr API temporarily unavailable. Insights will auto-refresh."],
            "risks": [],
            "next_question": "Waiting for Lyzr API...",
            "transcript_chunks": len(chunks),
            "powered_by": "Lyzr API Failed"
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
