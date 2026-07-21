import json
import time
from typing import Dict, Any

from ..core.redis_client import get_transcript_window
from ..core.llm_fallback import generate_content_with_fallback

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
        raw, powered_by = await generate_content_with_fallback(prompt, bypass_cache=force)
        
        from ..core.utils import parse_json_clean
        result = parse_json_clean(raw)
        
        if not result or not isinstance(result, dict) or "Error" in result.get("recap", ""):
            if not result or not isinstance(result, dict):
                result = {
                    "recap": "Error generating recap due to LLM output parsing failure.",
                    "key_decisions_so_far": [],
                    "current_topic": "Unknown",
                    "who_said_what": []
                }
        else:
            _last_recaps[meeting_id] = result
            _last_recap_times[meeting_id] = now
            
        result["powered_by"] = powered_by
        
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
