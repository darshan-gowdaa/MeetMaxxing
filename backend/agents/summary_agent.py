"""
Summary Agent — runs once at meeting-end.

Trigger: POST /meeting/{id}/end
Input:   Full transcript from Redis/Supabase
Output:  {summary, decisions[], action_items[], follow_up_draft}
Model:   Gemini Flash (via fallback)
Governed by Lyzr full guardrail + eval (groundedness check)
"""

import json
import logging

from ..core.redis_client import get_full_transcript
from ..core.utils import parse_json_clean

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are MeetMaxxing's Summary Agent. You extract structured meeting intelligence from transcripts.

Produce:
1. SUMMARY: A clear 3-5 sentence executive summary of the meeting.
2. DECISIONS: List of decisions made. Each must have: text, decided_by (speaker name from transcript), confidence (high/medium).
3. ACTION_ITEMS: List of tasks assigned. Each must have: text, owner (exact speaker name from transcript or "Unassigned"), due_date (if mentioned, else null), priority (high/medium/low).
4. FOLLOW_UP: A follow-up intent object — does this meeting imply a next meeting or follow-up? Include: required (bool), suggested_topic, suggested_attendees.

CRITICAL RULES:
- EVEN IF THE MEETING IS EXTREMELY SHORT OR CONTAINS ONLY A FEW WORDS, YOU MUST PROVIDE A 'summary'. (e.g., 'The meeting was brief with limited context.').
- Granularity: Break down grouped or list-like tasks into separate, individual action items. If multiple things need to be bought or done (e.g., "buy X, Y, and Z"), create separate action items for each (X, Y, Z) rather than consolidating them into a single "checklist" action.
- Every decision must cite the exact speaker name from the transcript. If unclear, use "Team".
- Every action item must cite an owner from the transcript. Never invent owners.
- Dates/deadlines must be exactly as stated in transcript — never assume.
- If a decision is ambiguous or debated without conclusion, mark confidence "medium".
- Do NOT fabricate commitments that aren't clearly stated.

Respond ONLY in this exact JSON schema. Do NOT include markdown code blocks or ```json wrappers. Just raw JSON:
{
  "summary": "...",
  "decisions": [
    {"text": "...", "decided_by": "...", "confidence": "high|medium"}
  ],
  "action_items": [
    {"text": "...", "owner": "...", "due_date": null, "priority": "high|medium|low"}
  ],
  "follow_up": {
    "required": true,
    "suggested_topic": "...",
    "suggested_attendees": ["..."]
  }
}"""


def _format_full_transcript(utterances: list[dict]) -> str:
    lines = []
    for utt in utterances:
        speaker = utt.get("speaker", "Unknown")
        text = utt.get("text", "")

        # Handle cases where text is a JSON array/object string from AI service
        if isinstance(text, str) and text.strip().startswith("["):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    parts = []
                    for item in parsed:
                        if isinstance(item, dict):
                            val = item.get("text") or item.get("utterance") or item.get("raw_text") or item.get("refined_text") or ""
                            if val:
                                parts.append(val)
                        elif isinstance(item, str):
                            parts.append(item)
                    if parts:
                        text = " ".join(parts)
            except Exception:
                pass
        elif isinstance(text, str) and text.strip().startswith("{"):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    if "dialog_turn" in parsed and isinstance(parsed["dialog_turn"], list):
                        text = " ".join(
                            t.get("refined_text") or t.get("raw_text") or ""
                            for t in parsed["dialog_turn"]
                            if t.get("refined_text") or t.get("raw_text")
                        )
                    else:
                        text = parsed.get("text") or parsed.get("utterance") or text
            except Exception:
                pass

        ts = utt.get("timestamp_ms", 0)
        mins = ts // 60000
        secs = (ts % 60000) // 1000
        lines.append(f"[{mins:02d}:{secs:02d}] {speaker}: {text}")
    return "\n".join(lines) if lines else "No transcript available."


async def run_summary_agent(
    meeting_id: str,
    title: str = "",
    attendees: list[str] | None = None,
    utterances: list[dict] | None = None,
) -> dict:
    """
    Main entry point — loads full transcript, generates structured summary.
    Returns raw output; Lyzr guardrail validation happens in guardrails.py before persistence.
    """
    if not utterances:
        utterances = await get_full_transcript(meeting_id)

    transcript_text = _format_full_transcript(utterances)
    attendee_str = ", ".join(attendees or []) or "Unknown"

    try:
        prompt = (
            f"{_SYSTEM_PROMPT}\n\nMeeting: {title or 'Untitled'}\n"
            f"Attendees: {attendee_str}\n"
            f"Duration: {len(utterances)} utterances recorded\n\n"
            f"Full transcript:\n{transcript_text}\n\n"
            "Extract the structured meeting intelligence as per instructions."
        )
        from ..core.llm_fallback import generate_content_with_fallback
        raw, powered_by = await generate_content_with_fallback(
            prompt,
            response_format_json=True,
            max_tokens=4096,
            bypass_cache=True,
        )

        result = parse_json_clean(raw or "{}")
        if not result:
            result = {}
        result.setdefault("summary", "The meeting was too brief or context was limited, but it has been successfully logged.")
        result.setdefault("decisions", [])
        result.setdefault("action_items", [])
        result.setdefault("follow_up", {"required": False})
        result["powered_by"] = powered_by
    except Exception as e:
        err_str = str(e)
        result = {
            "summary": "An error occurred while generating the meeting summary. Please try reprocessing.",
            "decisions": [],
            "action_items": [],
            "follow_up": {"required": False},
            "error": err_str[:200],
            "powered_by": "All LLM Fallbacks Failed",
        }

    result["meeting_id"] = meeting_id
    result["utterance_count"] = len(utterances)
    result["raw_transcript"] = transcript_text  # kept for Lyzr groundedness eval
    return result
