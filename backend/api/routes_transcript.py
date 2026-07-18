"""
WebSocket + REST endpoint for live transcript ingestion from Chrome extension.
Handles both text chunks and base64 audio chunks (transcribed via Gemini multimodal).
"""

import asyncio
import base64
import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from pydantic import BaseModel
from ..core.auth import get_current_user
from ..services.transcript import ingest_chunk, create_meeting_record
from ..agents.orchestrator import dispatch, AgentTrigger

router = APIRouter(prefix="/ingest", tags=["transcript"])

# Active WebSocket connections: meeting_id → set of WebSocket connections
_active_connections: dict[str, set[WebSocket]] = {}


class TranscriptChunk(BaseModel):
    meeting_id: str
    speaker: str
    text: str
    timestamp_ms: int = 0
    platform: str = "google_meet"


class StartMeetingRequest(BaseModel):
    title: str = "Untitled Meeting"
    attendees: list[str] = []


@router.get("/realtime/{meeting_id}")
@router.post("/realtime/{meeting_id}")
async def get_realtime_insights(
    meeting_id: str,
    force: bool = True,
    user: dict = Depends(get_current_user),
):
    """On-demand generation of suggestions, next question, and late-join recap."""
    print(f"[MeetMaxxing REST] ⚡ On-demand realtime insights requested for meeting {meeting_id} (force={force})...")
    result = await dispatch(AgentTrigger.REALTIME_TICK, {"meeting_id": meeting_id, "force": force})
    return result

@router.get("/late-recap/{meeting_id}")
async def get_late_recap(
    meeting_id: str,
    force: bool = False,
    user: dict = Depends(get_current_user),
):
    """Generates an executive late join recap."""
    print(f"[MeetMaxxing REST] 📝 Late join recap requested for {meeting_id}")
    result = await dispatch(AgentTrigger.LATE_JOIN_RECAP, {"meeting_id": meeting_id, "force": force})
    return result


@router.post("/start")
async def start_meeting(
    req: StartMeetingRequest,
    user: dict = Depends(get_current_user),
):
    """Create a new meeting record and return meeting_id for the extension."""
    record = await create_meeting_record(
        org_id=user["org_id"],
        user_id=user["user_id"],
        title=req.title,
        attendees=req.attendees,
    )
    return {"meeting_id": record.get("id"), "status": "active"}


@router.post("/transcript")
async def ingest_transcript_chunk(
    chunk: TranscriptChunk,
    user: dict = Depends(get_current_user),
):
    """REST fallback for transcript ingestion (used if WebSocket unavailable)."""
    print(f"[MeetMaxxing REST Ingest] 🎤 {chunk.speaker}: \"{chunk.text}\"")
    result = await ingest_chunk(chunk.model_dump())
    # Broadcast to active WS connections if any exist
    if chunk.meeting_id in _active_connections:
        for ws in list(_active_connections[chunk.meeting_id]):
            try:
                await ws.send_json({"type": "live_caption_chunk", "chunk": chunk.model_dump()})
            except Exception:
                pass
    return {"status": "ingested", "chunk_id": result.get("id")}


class AudioChunkRequest(BaseModel):
    meeting_id: str
    audio_base64: str
    mime_type: str = "audio/webm"


@router.post("/audio")
async def ingest_audio_chunk(
    req: AudioChunkRequest,
    user: dict = Depends(get_current_user),
):
    """
    Receive a base64-encoded audio chunk from the Chrome extension tab capture.
    Transcribe using Gemini multimodal, store transcript, return copilot update.
    """
    from ..core.config import settings
    from google import genai
    from google.genai import types as genai_types

    transcript_text = ""
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_FLASH_MODEL,
            contents=[
                genai_types.Part.from_bytes(data=audio_bytes, mime_type=req.mime_type),
                "Transcribe this meeting audio exactly as spoken. Return only the raw transcript text with speaker labels if distinguishable (format: 'Speaker: text'). No commentary.",
            ],
        )
        transcript_text = response.text.strip() if response.text else ""
    except Exception as e:
        print(f"[MeetMaxxing Audio Ingest] ⚠️ Gemini audio transcription failed ({e}). Checking Groq fallback...")
        groq_key = getattr(settings, "GROQ_API_KEY", "")
        if groq_key and groq_key.strip():
            try:
                import httpx
                audio_bytes = base64.b64decode(req.audio_base64)
                ext = "webm" if "webm" in req.mime_type else "wav"
                files = {"file": (f"chunk.{ext}", audio_bytes, req.mime_type)}
                data = {"model": "whisper-large-v3", "prompt": "Meeting conversation transcription:"}
                async with httpx.AsyncClient(timeout=15.0) as http_client:
                    res = await http_client.post(
                        "https://api.groq.com/openai/v1/audio/transcriptions",
                        headers={"Authorization": f"Bearer {groq_key.strip()}"},
                        files=files,
                        data=data,
                    )
                    if res.status_code == 200:
                        transcript_text = res.json().get("text", "").strip()
                        print(f"[MeetMaxxing Audio Ingest] ✅ Groq Whisper fallback succeeded! Transcribed: \"{transcript_text[:50]}...\"")
                    else:
                        print(f"[MeetMaxxing Audio Ingest] ❌ Groq Whisper error: {res.text}")
            except Exception as groq_err:
                print(f"[MeetMaxxing Audio Ingest] ❌ Groq Whisper exception: {groq_err}")
        if not transcript_text:
            return {"status": "skipped", "reason": str(e), "copilot_update": None}

    if not transcript_text:
        return {"status": "empty", "copilot_update": None}

    print(f"[MeetMaxxing Audio Ingest] 🔊 Transcribed audio: \"{transcript_text[:80]}...\"")

    # Store each line as a transcript chunk
    for line in transcript_text.splitlines():
        line = line.strip()
        if not line:
            continue
        # Parse "Speaker: text" format
        if ": " in line:
            speaker, text = line.split(": ", 1)
        else:
            speaker, text = "Participant", line
        chunk_data = {
            "meeting_id": req.meeting_id,
            "speaker": speaker.strip(),
            "text": text.strip(),
            "timestamp_ms": 0,
            "platform": "google_meet",
        }
        await ingest_chunk(chunk_data)
        if req.meeting_id in _active_connections:
            for ws in list(_active_connections[req.meeting_id]):
                try:
                    await ws.send_json({"type": "live_caption_chunk", "chunk": chunk_data})
                except Exception:
                    pass

    return {"status": "transcribed", "transcript": transcript_text, "copilot_update": None}


@router.websocket("/ws/{meeting_id}")
async def transcript_websocket(websocket: WebSocket, meeting_id: str):
    """
    WebSocket endpoint for live transcript streaming from extension.
    Client sends: JSON transcript chunks
    Server receives live audio/text chunks and broadcasts to connected clients.
    AI insights run ON DEMAND when explicitly requested via button click.
    """
    await websocket.accept()
    print(f"[MeetMaxxing WS] 🔌 Client connected for meeting {meeting_id}")

    # Register connection
    if meeting_id not in _active_connections:
        _active_connections[meeting_id] = set()
    _active_connections[meeting_id].add(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            raw = json.loads(data)
            if raw.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            raw["meeting_id"] = meeting_id
            print(f"[MeetMaxxing WS Ingest] 💬 {raw.get('speaker', 'Speaker')}: \"{raw.get('text', '')}\"")
            await ingest_chunk(raw)

            # Broadcast live caption to all connected clients
            for ws_conn in list(_active_connections.get(meeting_id, set())):
                try:
                    await ws_conn.send_json({"type": "live_caption_chunk", "chunk": raw})
                except Exception:
                    pass

            # Acknowledge receipt
            await websocket.send_json({"type": "ack", "chunk_id": str(uuid.uuid4())})

    except WebSocketDisconnect:
        pass
    finally:
        _active_connections.get(meeting_id, set()).discard(websocket)
        if not _active_connections.get(meeting_id):
            _active_connections.pop(meeting_id, None)
