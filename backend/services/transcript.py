"""
Transcript ingestion service — normalizes extension caption data
into a consistent speaker-tagged, timestamped format.
"""

import uuid
from datetime import datetime, timezone
from ..core.redis_client import append_transcript_chunk
from ..core.database import get_supabase_admin
from ..agents.orchestrator import dispatch, AgentTrigger


def normalize_chunk(raw: dict) -> dict:
    """
    Normalize raw caption data from Chrome extension into
    consistent transcript chunk format.
    
    Input from extension:
    {
      "speaker": "John Doe",
      "text": "Let's align on the Q3 roadmap",
      "timestamp_ms": 12500,  # ms since meeting start
      "meeting_id": "uuid",
      "platform": "google_meet"
    }
    """
    return {
        "id": str(uuid.uuid4()),
        "speaker": raw.get("speaker", "Unknown Speaker").strip(),
        "text": raw.get("text", "").strip(),
        "timestamp_ms": int(raw.get("timestamp_ms", 0)),
        "meeting_id": raw.get("meeting_id", ""),
        "platform": raw.get("platform", "google_meet"),
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }


async def ingest_chunk(raw_chunk: dict) -> dict:
    """Normalize and store a single transcript chunk to Redis."""
    chunk = normalize_chunk(raw_chunk)
    if chunk["meeting_id"] and chunk["text"]:
        # Run it through transcription agent to clean/diarize
        try:
            result = await dispatch(AgentTrigger.TRANSCRIPT_CHUNK, {
                "meeting_id": chunk["meeting_id"],
                "raw_text": chunk["text"],
                "speaker": chunk["speaker"],
                "timestamp_ms": chunk["timestamp_ms"]
            })
            if result and result.get("text"):
                chunk["text"] = result["text"]
                chunk["speaker"] = result.get("speaker", chunk["speaker"])
        except Exception as e:
            print(f"[Transcript Service] Transcription agent failed: {e}")
            
        await append_transcript_chunk(chunk["meeting_id"], chunk)
    return chunk


async def persist_transcript_to_db(meeting_id: str, utterances: list[dict]) -> None:
    """
    Persist full transcript to Supabase after meeting ends.
    Stored as JSONB in meetings.transcript_data column.
    """
    try:
        uuid.UUID(meeting_id)
    except ValueError:
        print(f"Skipping database persistence: invalid UUID meeting_id: {meeting_id}")
        return
    supabase = get_supabase_admin()
    supabase.table("meetings").update(
        {
            "transcript_data": utterances,
            "end_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", meeting_id).execute()


async def create_meeting_record(
    org_id: str,
    user_id: str,
    title: str,
    attendees: list[str],
    google_meet_link: str = "",
) -> dict:
    """Create a meeting record in Supabase and return it."""
    from ..core.redis_client import set_meeting_alias
    
    clean_code = google_meet_link.strip().replace("https://meet.google.com/", "").strip("/")
    if clean_code and (not title or title in ["Google Meet", "Untitled Meeting", "Google Meet Session"]):
        final_title = f"Meet - {clean_code}"
    elif clean_code and not title.startswith("Meet - "):
        final_title = f"Meet - {clean_code}"
    else:
        final_title = title or "Meet - Live Session"

    meeting_id = str(uuid.uuid4())
    supabase = get_supabase_admin()
    
    insert_data = {
        "id": meeting_id,
        "org_id": org_id,
        "user_id": user_id,
        "title": final_title,
        "attendees": attendees,
        "start_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
    }
    if clean_code:
        insert_data["google_meet_link"] = clean_code

    try:
        result = supabase.table("meetings").insert(insert_data).execute()
    except Exception as e:
        if "google_meet_link" in str(e):
            insert_data.pop("google_meet_link", None)
            result = supabase.table("meetings").insert(insert_data).execute()
        else:
            raise e
    
    if clean_code:
        await set_meeting_alias(meeting_id, clean_code)
        
    return result.data[0] if result.data else {}
