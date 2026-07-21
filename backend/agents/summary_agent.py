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
from ..core.lyzr_integration import run_lyzr_agent

logger = logging.getLogger(__name__)
_SYSTEM_PROMPT = """You are MeetMaxxing's Summary Agent. You extract structured meeting intelligence from transcripts.

Produce:
1. SUMMARY: A clear 3-5 sentence executive summary of the meeting.
2. DECISIONS: List of decisions made. Each must have: text, decided_by (speaker name from transcript), confidence (high/medium).
3. ACTION_ITEMS: List of tasks assigned. Each must have: text, owner (exact speaker name from transcript or "Unassigned"), due_date (if mentioned, else null), priority (high/medium/low).
4. FOLLOW_UP: A follow-up intent object — does this meeting imply a next meeting or follow-up? Include: required (bool), suggested_topic, suggested_attendees.

CRITICAL RULES:
- EVEN IF THE MEETING IS EXTREMELY SHORT OR CONTAINS ONLY A FEW WORDS, YOU MUST PROVIDE A 'summary'. (e.g., 'The meeting was brief with limited context.').
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

def _format_full_transcript(utterances: list[dict]) -> str:
    lines = []
    for utt in utterances:
        speaker = utt.get("speaker", "Unknown")
        text = utt.get("text", "")
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
    raw, _ = await run_lyzr_agent("Summary Agent - MeetMaxxing", prompt)
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
    
    # If transcript is massive, we use Hierarchical Summarization
    # Rough approximation: 1 char is ~0.25 tokens. 15000 chars is ~3750 tokens.
    MAX_CHARS_PER_CHUNK = 15000
    
    try:
        if len(transcript_text) > MAX_CHARS_PER_CHUNK * 1.2:
            logger.info(f"[Summary Agent] Transcript is large ({len(transcript_text)} chars). Using hierarchical summarization.")
            chunks = _chunk_transcript(raw_lines, MAX_CHARS_PER_CHUNK)
            sub_summaries = []
            for i, chunk in enumerate(chunks):
                logger.info(f"[Summary Agent] Summarizing chunk {i+1}/{len(chunks)}")
                sub_sum = await _summarize_chunk(chunk, title, attendee_str)
                sub_summaries.append(sub_sum)
            
            # Synthesize
            synthesis_prompt = f"{_SYNTHESIS_PROMPT}\n\nMerge the following sub-summaries into one cohesive JSON:\n\n"
            for i, s in enumerate(sub_summaries):
                synthesis_prompt += f"--- SUB-SUMMARY {i+1} ---\n{s}\n\n"
                
            raw, powered_by = await run_lyzr_agent("Summary Agent - MeetMaxxing", synthesis_prompt)
        else:
            prompt = f"{_SYSTEM_PROMPT}\n\nMeeting: {title or 'Untitled'}\nAttendees: {attendee_str}\nDuration: {len(utterances)} utterances recorded\n\nFull transcript:\n{transcript_text}\n\nExtract the structured meeting intelligence as per instructions."
            raw, powered_by = await run_lyzr_agent("Summary Agent - MeetMaxxing", prompt)
            
        result = _parse_json_clean(raw or "{}")
        if not result or "summary" not in result:
            if not result:
                result = {}
                result["error"] = "JSON parse failed"
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
