"""
Transcript ingestion service — normalizes extension caption data
into a consistent speaker-tagged, timestamped format.
"""

import uuid
from datetime import datetime, timezone
from ..core.redis_client import append_transcript_chunk
from ..core.database import get_supabase_admin


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
) -> dict:
    """Create a meeting record in Supabase and return it."""
    supabase = get_supabase_admin()
    result = (
        supabase.table("meetings")
        .insert({
            "id": str(uuid.uuid4()),
            "org_id": org_id,
            "user_id": user_id,
            "title": title,
            "attendees": attendees,
            "start_at": datetime.now(timezone.utc).isoformat(),
            "status": "active",
        })
        .execute()
    )
    return result.data[0] if result.data else {}
