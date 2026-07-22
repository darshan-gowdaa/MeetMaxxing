"""
Transcript ingestion service — normalizes extension caption data
into a consistent speaker-tagged, timestamped format.
"""

import uuid
from datetime import datetime, timezone
from ..core.redis_client import append_transcript_chunk
from ..core.database import get_supabase_admin
from ..agents.orchestrator import dispatch, AgentTrigger
from ..core.utils import is_valid_uuid, generate_meeting_title


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


async def ingest_chunk(raw_chunk: dict, on_ai_chunk_ready=None) -> dict:
    """Normalize and store a single transcript chunk to Redis."""
    chunk = normalize_chunk(raw_chunk)
    if chunk["meeting_id"] and chunk["text"]:
        chunk["source"] = "dom"
        # Save immediately to prevent race condition with end_meeting
        await append_transcript_chunk(chunk["meeting_id"], chunk)
        
        # We no longer run LLM transcription per chunk. Raw dom chunk is broadcasted for instant CC.
        # Structured transcription happens globally at the end of the meeting to save LLM tokens and avoid hallucinated JSON in UI.
        
        if on_ai_chunk_ready:
            import asyncio
            if asyncio.iscoroutinefunction(on_ai_chunk_ready):
                await on_ai_chunk_ready(chunk)
            else:
                on_ai_chunk_ready(chunk)

    return chunk


async def persist_transcript_to_db(meeting_id: str, utterances: list[dict]) -> None:
    """
    Persist full transcript to Supabase after meeting ends.
    Stored as JSONB in meetings.transcript_data column.
    """
    if not is_valid_uuid(meeting_id):
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
    
    final_title = generate_meeting_title(title, google_meet_link)
    clean_code = google_meet_link.strip().replace("https://meet.google.com/", "").strip("/")

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
