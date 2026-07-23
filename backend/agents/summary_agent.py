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
from typing import List, Dict, Any
from ..core.config import settings
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

_SYNTHESIS_PROMPT = """You are MeetMaxxing's Final Summary Synthesis Agent.
You will be given multiple sub-summaries from a very long meeting.
Your task is to merge them into a single, cohesive, non-repetitive final JSON output matching the exact schema.

Merge all decisions, action items, and create a single unified summary.
CRITICAL RULE: Break down grouped or list-like tasks into separate, individual action items. If multiple things need to be bought or done, keep them as separate action items rather than consolidating them into a single "checklist".

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
        
        # Handle cases where the text itself is a JSON array string from the AI service
        if isinstance(text, str) and text.strip().startswith("["):
            try:
                import json
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    extracted_texts = []
                    for item in parsed:
                        if isinstance(item, dict):
                            val = item.get("text") or item.get("utterance") or item.get("raw_text") or item.get("refined_text") or ""
                            if val:
                                extracted_texts.append(val)
                        elif isinstance(item, str):
                            extracted_texts.append(item)
                    if extracted_texts:
                        text = " ".join(extracted_texts)
            except Exception:
                pass
        elif isinstance(text, str) and text.strip().startswith("{"):
            try:
                import json
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    if "dialog_turn" in parsed and isinstance(parsed["dialog_turn"], list):
                        texts = []
                        for t in parsed["dialog_turn"]:
                            texts.append(t.get("refined_text") or t.get("raw_text") or "")
                        text = " ".join([t for t in texts if t])
                    else:
                        text = parsed.get("text") or parsed.get("utterance") or text
            except Exception:
                pass

        ts = utt.get("timestamp_ms", 0)
        mins = ts // 60000
        secs = (ts % 60000) // 1000
        lines.append(f"[{mins:02d}:{secs:02d}] {speaker}: {text}")
    return "\n".join(lines) if lines else "No transcript available."

def _chunk_transcript(lines: List[str], max_length: int = 15000) -> List[str]:
    chunks = []
    current_chunk = []
    current_length = 0
    for line in lines:
        if current_length + len(line) > max_length and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = []
            current_length = 0
        current_chunk.append(line)
        current_length += len(line)
    if current_chunk:
        chunks.append("\n".join(current_chunk))
    return chunks

async def _summarize_chunk(chunk_text: str, title: str, attendee_str: str) -> str:
    prompt = f"{_SYSTEM_PROMPT}\n\nMeeting: {title or 'Untitled'}\nAttendees: {attendee_str}\n\nTranscript Segment:\n{chunk_text}\n\nExtract the structured meeting intelligence as per instructions."
    from ..core.llm_fallback import generate_content_with_fallback
    raw, _ = await generate_content_with_fallback(
        prompt,
        response_format_json=True,
        max_tokens=4096,
        bypass_cache=True,
    )
    return raw

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
    raw_lines = _format_full_transcript(utterances).split("\n")
    transcript_text = "\n".join(raw_lines)

    attendee_str = ", ".join(attendees or []) or "Unknown"
    
    try:
        prompt = f"{_SYSTEM_PROMPT}\n\nMeeting: {title or 'Untitled'}\nAttendees: {attendee_str}\nDuration: {len(utterances)} utterances recorded\n\nFull transcript:\n{transcript_text}\n\nExtract the structured meeting intelligence as per instructions."
        from ..core.llm_fallback import generate_content_with_fallback
        raw, powered_by = await generate_content_with_fallback(
            prompt,
            response_format_json=True,
            max_tokens=4096,
            bypass_cache=True,
        )
            
        result = parse_json_clean(raw or "{}")
        if not result or "summary" not in result:
            if not result:
                result = {}
            result["summary"] = result.get("summary", "The meeting was too brief or context was limited, but it has been successfully logged.")
            result["decisions"] = result.get("decisions", [])
            result["action_items"] = result.get("action_items", [])
            result["follow_up"] = result.get("follow_up", {"required": False})
        result["powered_by"] = powered_by
    except Exception as e:
        err_str = str(e)
        result = {
            "summary": f"Error generating meeting summary (all LLM fallbacks failed): {err_str[:200]}",
            "decisions": [],
            "action_items": [],
            "follow_up": {"required": False, "error": err_str[:100]},
            "error": err_str[:200],
            "powered_by": "All LLM Fallbacks Failed"
        }

    result["meeting_id"] = meeting_id
    result["utterance_count"] = len(utterances)
    result["raw_transcript"] = transcript_text  # kept for Lyzr groundedness eval
    return result
