import time
import logging

from ..core.llm_fallback import generate_content_with_fallback
from ..core.redis_client import get_full_transcript
from ..core.utils import parse_json_clean

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are MeetMaxxing's Late-Join Agent. The user just asked for an executive recap of the meeting so far.
Analyze the transcript and provide a highly refined, concise summary covering:
- The main current topic.
- Key decisions made so far.
- Who said what (brief highlights).

Keep it extremely brief and professional. Do NOT output unnecessary details. Return ONLY a valid JSON object matching this schema. Do NOT include markdown code blocks or ```json wrappers. Just raw JSON:
{
  "recap": "2-3 sentences max.",
  "current_topic": "...",
  "key_decisions_so_far": ["...", "..."],
  "who_said_what": ["Speaker A: ...", "Speaker B: ..."]
}"""

# In-process cache (not multi-worker safe)
_last_recaps: dict[str, dict] = {}
_last_recap_times: dict[str, float] = {}


def _format_transcript(chunks: list[dict]) -> str:
    # formats utterances and keeps the most recent parts in full detail
    if not chunks:
        return "No transcript yet."
    if len(chunks) > 80:
        older = chunks[:-40]
        recent = chunks[-40:]
        older_summary = f"[Earlier {len(older)} utterances summarized: Discussion occurred between {', '.join(set(c.get('speaker', 'Speaker') for c in older[:5]))}]"
        recent_lines = [f"{c.get('speaker', 'Unknown')}: {c.get('text', '')}" for c in recent]
        return older_summary + "\n" + "\n".join(recent_lines)
    return "\n".join(f"{c.get('speaker', 'Unknown')}: {c.get('text', '')}" for c in chunks)


async def generate_late_join_recap(
    meeting_id: str,
    force: bool = False,
    user_id: str | None = None,
) -> dict:
    now = time.time()

    if not force and meeting_id in _last_recaps and (now - _last_recap_times.get(meeting_id, 0) < 120):
        return _last_recaps[meeting_id]

    chunks = await get_full_transcript(meeting_id)

    if not chunks:
        return {
            "recap": "No speech captured yet. Enable Captions (CC) in Google Meet.",
            "key_decisions_so_far": [],
            "current_topic": "Waiting for meeting to start...",
            "who_said_what": [],
        }

    transcript_text = _format_transcript(chunks)
    prompt = f"{_SYSTEM_PROMPT}\n\nGenerate a late join recap for the following transcript:\n\n{transcript_text}"

    try:
        raw, powered_by = await generate_content_with_fallback(
            prompt,
            response_format_json=True,
            bypass_cache=force,
            max_tokens=800,
            user_id=user_id,
        )
        result = parse_json_clean(raw)

        if not isinstance(result, dict) or not result.get("recap"):
            result = {
                "recap": result.get("_raw") if isinstance(result, dict) and result.get("_raw") else "Meeting in progress.",
                "key_decisions_so_far": [],
                "current_topic": "General Discussion",
                "who_said_what": [],
            }
        else:
            _last_recaps[meeting_id] = result
            _last_recap_times[meeting_id] = now

        result["powered_by"] = powered_by
        return result
    except Exception as e:
        logger.error(f"[Late Join Agent] Error: {e}")
        return {
            "recap": "Error generating recap due to API failure or rate limits.",
            "key_decisions_so_far": [],
            "current_topic": "Unknown",
            "who_said_what": [],
            "error": str(e),
        }


async def run_late_join_agent(meeting_id: str) -> dict:
    # grpc task bus wrapper that always bypasses cache
    return await generate_late_join_recap(meeting_id, force=True)

