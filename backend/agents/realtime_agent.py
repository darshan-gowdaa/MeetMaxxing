"""
Realtime Agent — runs on a rolling timer during live meetings.

Trigger: Every REALTIME_CADENCE_SECONDS while meeting is active
Input:   Last N minutes of transcript (rolling window from Redis)
Output:  {suggestions: [], risks: [], next_question: str}
Model:   Gemini Flash (fast + cheap for frequent calls)
Governed by Lyzr light guardrail
"""

import time

from loguru import logger

from ..core.config import settings
from ..core.redis_client import get_transcript_window
from ..core.utils import parse_json_clean

# In-process state (not multi-worker safe — Redis-backed solution needed for production scale)
_last_call_times: dict[str, float] = {}
_last_results: dict[str, dict] = {}
_last_chunk_counts: dict[str, int] = {}
_consecutive_unchanged: dict[str, int] = {}

_SYSTEM_PROMPT = """You are MeetMaxxing, an AI meeting copilot giving LIVE assistance to the speaker in a meeting.

Your job:
1. SUGGESTIONS ("What to answer") — 1-2 precise, direct, and actionable talking points the user should say right now in response to the current discussion. Must be extremely concise.
2. RISKS — Flag any red flags in the conversation. 1-2 max. Only flag real issues visible in the text.
3. NEXT_QUESTIONS ("Suggestion of what to Ask") — Exactly 2 highly strategic, thought-provoking questions to ask next based on the conversation context.

CRITICAL RULES:
- Only reference names, numbers, and facts that EXPLICITLY appear in the transcript or Uploaded Meeting Context Documents.
- Do NOT invent any statements, names, or commitments not in the text.
- If no risks, return empty array for risks.

Respond ONLY in valid JSON matching this exact schema. Do NOT include markdown code blocks or ```json wrappers. Just raw JSON:
{
  "suggestions": ["...", "..."],
  "risks": ["..."],
  "next_questions": ["...", "..."]
}"""


def _format_window(chunks: list[dict]) -> str:
    """Format transcript chunks into readable text for the LLM."""
    if not chunks:
        return "No transcript yet."
    lines = []
    for chunk in chunks:
        ts = chunk.get("timestamp_ms", 0)
        mins = ts // 60000
        secs = (ts % 60000) // 1000
        lines.append(f"[{mins:02d}:{secs:02d}] {chunk.get('speaker', 'Unknown')}: {chunk.get('text', '')}")
    return "\n".join(lines)


async def run_realtime_agent(meeting_id: str, context: dict | None = None, force: bool = False) -> dict:
    """
    Main entry point — fetch rolling window, call fallback pipeline, return suggestions.
    context: optional dict with meeting title, attendees, agenda for richer suggestions.
    """
    raw_chunks = await get_transcript_window(
        meeting_id,
        last_n=settings.REALTIME_WINDOW_MINUTES * 20,
    )
    chunks = [c for c in raw_chunks if c.get("source") != "audio"]
    chunks = chunks[-(settings.REALTIME_WINDOW_MINUTES * 10):]

    if not chunks:
        return {
            "meeting_id": meeting_id,
            "suggestions": ["Listening for spoken speech... Turn on Google Meet Captions (CC) at the bottom right to begin real-time AI analysis."],
            "risks": [],
            "next_questions": ["Waiting for speaker utterance..."],
            "transcript_chunks": 0,
        }

    now = time.time()
    last_time = _last_call_times.get(meeting_id, 0.0)
    last_count = _last_chunk_counts.get(meeting_id, 0)

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

    transcript_text = _format_window(chunks)

    context_block = ""
    if context:
        context_block = (
            f"Meeting context:\n"
            f"- Title: {context.get('title', 'Unknown')}\n"
            f"- Attendees: {', '.join(context.get('attendees', []))}\n"
            f"- Agenda: {context.get('agenda', 'None provided')}\n\n"
        )

    # Fetch uploaded context documents scoped to the meeting's org
    uploaded_context = ""
    try:
        from ..memory.embeddings import embed_query
        from ..memory.qdrant_client import search_memories
        from ..memory.schemas import MemoryFilter, MemoryType

        # Use org_id from context if available; otherwise search without org filter (limited results)
        org_id = (context or {}).get("org_id", "")
        if org_id:
            q_vec = await embed_query("meeting context overview")
            mem_filter = MemoryFilter(
                org_id=org_id,
                meeting_id=meeting_id,
                memory_type=MemoryType.KEY_TOPIC,
                topic="uploaded_context",
                query_text="meeting context overview",
            )
            context_res = await search_memories(query_vector=q_vec, memory_filter=mem_filter, limit=4)
            if context_res:
                uploaded_context = "\n\nUploaded Meeting Context Documents:\n" + "\n".join(r.text for r in context_res)
    except Exception as e:
        logger.debug("[Realtime Agent] Could not fetch uploaded context: {}", e)

    prompt = f"{_SYSTEM_PROMPT}\n\n{context_block}{uploaded_context}\nNew transcript utterances:\n{transcript_text}"

    try:
        from ..core.llm_fallback import generate_content_with_fallback
        raw, powered_by = await generate_content_with_fallback(prompt, bypass_cache=force)
        result = parse_json_clean(raw or "{}")
        result["powered_by"] = powered_by
    except Exception as e:
        logger.error("[Realtime Agent] LLM failed: {}", e)
        if meeting_id in _last_results and _last_results[meeting_id].get("suggestions"):
            return _last_results[meeting_id]
        return {
            "meeting_id": meeting_id,
            "error": "AI temporarily unavailable. Insights will auto-refresh shortly.",
            "suggestions": ["AI temporarily unavailable. Insights will auto-refresh."],
            "risks": [],
            "next_questions": ["Waiting for AI..."],
            "transcript_chunks": len(chunks),
            "powered_by": "Error",
        }

    from ..services.guardrails import validate_realtime_output
    validated_suggs = validate_realtime_output(result.get("suggestions", []), transcript_text)

    # In case the model still returns a string
    raw_nq = result.get("next_questions") or result.get("next_question") or []
    if isinstance(raw_nq, str):
        raw_nq = [raw_nq]

    res = {
        "meeting_id": meeting_id,
        "suggestions": validated_suggs,
        "risks": result.get("risks", []),
        "next_questions": raw_nq,
        "transcript_chunks": len(chunks),
        "powered_by": result.get("powered_by", "Unknown API"),
    }
    _last_call_times[meeting_id] = now
    _last_chunk_counts[meeting_id] = len(chunks)
    _last_results[meeting_id] = res
    return res
