import json
import time
from typing import Dict, Any

from ..core.redis_client import get_transcript_window
from ..core.lyzr_integration import run_lyzr_agent

_SYSTEM_PROMPT = """You are MeetMaxxing's Late Join Recap Agent. 
Your goal is to provide a concise, structured recap for someone who just joined the meeting late.

Analyze the transcript and provide a summary covering:
1. 'recap': 2-3 sentences summarizing the main discussion so far.
2. 'key_decisions_so_far': A list of 1-3 decisions made. If none, return empty list.
3. 'current_topic': 1 sentence describing what is being discussed right now.
4. 'who_said_what': A brief list mapping speaker names to their main contribution/stance.

CRITICAL RULES:
- Ground everything in the exact text. Do not invent details.
- Respond ONLY in valid JSON matching this schema:
{
  "recap": "...",
  "key_decisions_so_far": ["...", "..."],
  "current_topic": "...",
  "who_said_what": ["Speaker A: ...", "Speaker B: ..."]
}"""

_last_recaps: Dict[str, Dict[str, Any]] = {}
_last_recap_times: Dict[str, float] = {}

def _format_transcript(chunks: list[dict]) -> str:
    if not chunks:
        return "No transcript yet."
    lines = []
    for chunk in chunks:
        speaker = chunk.get("speaker", "Unknown")
        text = chunk.get("text", "")
        lines.append(f"{speaker}: {text}")
    return "\n".join(lines)

async def generate_late_join_recap(meeting_id: str, force: bool = False) -> Dict[str, Any]:
    now = time.time()
    
    # Cache recap for 2 minutes to avoid spamming the LLM
    if not force and meeting_id in _last_recaps and (now - _last_recap_times.get(meeting_id, 0) < 120):
        print(f"[Late Join Agent] Returning cached recap for {meeting_id}")
        return _last_recaps[meeting_id]
        
    chunks = await get_transcript_window(meeting_id, last_n=1000) # Get all recent chunks
    
    if not chunks:
        return {
            "recap": "No speech captured yet. Enable Captions (CC) in Google Meet.",
            "key_decisions_so_far": [],
            "current_topic": "Waiting for meeting to start...",
            "who_said_what": []
        }
    
    # Formats transcript and runs LLM recap for any non-empty transcript chunks
    transcript_text = _format_transcript(chunks)
    prompt = f"{_SYSTEM_PROMPT}\n\nGenerate a late join recap for the following transcript:\n\n{transcript_text}"
    
    try:
        raw, powered_by = await run_lyzr_agent("Late-Join Agent - MeetMaxxing", prompt)
        
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
            result = json.loads(cleaned)
        except Exception:
            result = {
                "recap": "Error generating recap due to LLM output parsing failure.",
                "key_decisions_so_far": [],
                "current_topic": "Unknown",
                "who_said_what": []
            }
            
        result["powered_by"] = powered_by
        
        _last_recaps[meeting_id] = result
        _last_recap_times[meeting_id] = now
        
        return result
    except Exception as e:
        print(f"[Late Join Agent] Error: {e}")
        return {
            "recap": "Error generating recap due to API failure or rate limits.",
            "key_decisions_so_far": [],
            "current_topic": "Unknown",
            "who_said_what": [],
            "error": str(e)
        }

async def run_late_join_agent(meeting_id: str) -> dict:
    """
    Wrapper for gRPC task bus.
    """
    return await generate_late_join_recap(meeting_id, force=True)
