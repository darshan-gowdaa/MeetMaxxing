"""
Transcription Agent — processes incoming transcript chunks from the Chrome Extension.

Trigger: gRPC Task Bus (or HTTP via Orchestrator)
Input: Raw caption data
Output: Cleaned, timestamped, speaker-diarized text
Model: Gemini Flash (optional for cleanup)
"""
import logging

logger = logging.getLogger(__name__)

async def process_transcript_chunk(meeting_id: str, raw_text: str, speaker: str, timestamp_ms: int) -> dict:
    """
    Validates and cleans the incoming transcription chunk.
    In a full implementation, this could use an LLM for diarization correction.
    """
    logger.info(f"[Transcription Agent] Processing chunk for meeting {meeting_id}: {speaker} at {timestamp_ms}ms")
    from ..core.lyzr_integration import run_lyzr_agent
    
    system_prompt = "You are a speech text refiner. Output ONLY the cleaned utterance. Do not add any preamble, explanations, quotes, or conversational filler."
    prompt = f"{system_prompt}\n\nSpeaker: {speaker}\nRaw text: {raw_text}\nClean this utterance."
    
    try:
        clean_text, _ = await run_lyzr_agent("Transcription Agent - MeetMaxxing", prompt)
    except Exception as e:
        logger.error(f"[Transcription Agent] Lyzr failed: {e}")
        clean_text = raw_text.strip()
        
    return {
        "meeting_id": meeting_id,
        "speaker": speaker or "Unknown",
        "text": clean_text,
        "timestamp_ms": timestamp_ms,
        "processed": True
    }
