import asyncio
import datetime
import io
import uuid

import docx
import PyPDF2
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from loguru import logger
from pydantic import BaseModel
from qdrant_client.http import models as qmodels

from ..agents.docs_qa_agent import run_docs_qa_agent
from ..agents.memory_agent import run_memory_agent
from ..core.auth import get_current_user
from ..core.config import settings
from ..memory.embeddings import embed_text
from ..memory.qdrant_client import get_qdrant, upsert_memories
from ..memory.schemas import MemoryPoint, MemoryType

router = APIRouter(prefix="/context", tags=["context"])

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB


def _sync_extract_text(raw: bytes, filename: str) -> str:
    content = ""
    bio = io.BytesIO(raw)
    if filename.endswith(".pdf"):
        pdf_reader = PyPDF2.PdfReader(bio)
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                content += text + "\n"
    elif filename.endswith(".docx"):
        doc = docx.Document(bio)
        for para in doc.paragraphs:
            content += para.text + "\n"
    elif filename.endswith(".txt"):
        content = raw.decode("utf-8", errors="replace")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    return content


async def extract_text_from_file(file: UploadFile) -> str:
    await file.seek(0)
    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 15MB)")
    filename = (file.filename or "").lower()
    return await asyncio.to_thread(_sync_extract_text, raw, filename)


@router.post("/upload")
async def upload_context(
    meeting_id: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    try:
        text = await extract_text_from_file(file)
        if not text.strip():
            raise HTTPException(status_code=400, detail="File is empty")

        # Simple chunking
        chunk_size = 1000
        chunks = [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]

        points = []
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")

        valid_chunks = [c for c in chunks if c.strip()]
        from ..memory.embeddings import embed_batch

        vectors = await embed_batch(valid_chunks)

        for idx, (chunk, vector) in enumerate(zip(valid_chunks, vectors)):
            pt = MemoryPoint(
                id=str(uuid.uuid4()),
                vector=vector,
                text=chunk,
                org_id=user["org_id"],
                user_id=user["user_id"],
                meeting_id=meeting_id,
                memory_type=MemoryType.KEY_TOPIC,
                meeting_date=today_str,
                topic="uploaded_context",
                speaker_name=file.filename,
                timestamp_ms=idx,
                priority=idx,
            )
            points.append(pt)

        await upsert_memories(points)
        return {
            "status": "success",
            "message": f"Successfully uploaded {file.filename} and processed {len(points)} chunks.",
        }
    except Exception as e:
        logger.error(f"Failed to process context upload: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to upload and process document context. Please try again.",
        )


class ContextChatRequest(BaseModel):
    meeting_id: str
    query: str
    target_file: list[str] | str | None = None


@router.post("/chat")
async def chat_context(req: ContextChatRequest, user: dict = Depends(get_current_user)):
    try:
        if req.target_file:
            res = await run_docs_qa_agent(
                question=req.query,
                org_id=user["org_id"],
                user_id=user["user_id"],
                filters={"meeting_id": req.meeting_id, "speaker_name": req.target_file},
            )
            return {
                "answer": res.get("answer"),
                "powered_by": res.get("powered_by", "Docs QA Agent"),
                "sources": res.get("sources", []),
            }
        else:
            res = await run_memory_agent(
                question=req.query,
                org_id=user["org_id"],
                user_id=user["user_id"],
                filters={"current_meeting_id": req.meeting_id},
            )
            return {
                "answer": res.get("answer"),
                "powered_by": res.get("powered_by", "Memory Agent"),
                "sources": res.get("sources", []),
            }
    except Exception as e:
        logger.error("Error in chat_context: {}", e, exc_info=True)
        return {"answer": f"An error occurred: {e!s}"}


class ContextClearRequest(BaseModel):
    meeting_id: str


@router.post("/clear")
async def clear_context(
    req: ContextClearRequest, user: dict = Depends(get_current_user)
):
    try:
        client = await get_qdrant()
        await client.delete(
            collection_name=settings.QDRANT_COLLECTION,
            points_selector=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="org_id", match=qmodels.MatchValue(value=user["org_id"])
                    ),
                    qmodels.FieldCondition(
                        key="meeting_id", match=qmodels.MatchValue(value=req.meeting_id)
                    ),
                    qmodels.FieldCondition(
                        key="topic", match=qmodels.MatchValue(value="uploaded_context")
                    ),
                ]
            ),
        )
        return {
            "status": "success",
            "message": "Uploaded context cleared successfully.",
        }
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to clear uploaded context. Please try again.",
        )


async def _scroll_all_points(
    client,
    collection_name: str,
    scroll_filter: qmodels.Filter,
    with_payload=True,
    with_vectors=False,
    page_size: int = 250,
):
    """Cursor-paginated scroll to fetch all points without loading unbounded chunks at once."""
    all_points = []
    offset = None
    while True:
        results, next_offset = await client.scroll(
            collection_name=collection_name,
            scroll_filter=scroll_filter,
            limit=page_size,
            offset=offset,
            with_payload=with_payload,
            with_vectors=with_vectors,
        )
        all_points.extend(results)
        if next_offset is None or not results:
            break
        offset = next_offset
    return all_points


@router.get("/files")
async def list_all_files(user: dict = Depends(get_current_user)):
    try:
        client = await get_qdrant()
        points = await _scroll_all_points(
            client=client,
            collection_name=settings.QDRANT_COLLECTION,
            scroll_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="org_id", match=qmodels.MatchValue(value=user["org_id"])
                    ),
                    qmodels.FieldCondition(
                        key="topic", match=qmodels.MatchValue(value="uploaded_context")
                    ),
                ]
            ),
            with_payload=["speaker_name", "meeting_id", "meeting_date"],
            with_vectors=False,
        )
        files = {}
        for pt in points:
            fname = pt.payload.get("speaker_name", "Unknown File")
            mid = pt.payload.get("meeting_id", "Unknown Meeting")
            date = pt.payload.get("meeting_date", "Unknown Date")
            key = (fname, mid, date)
            files[key] = files.get(key, 0) + 1

        file_list = [
            {"filename": fname, "meeting_id": mid, "date": date, "chunks": v}
            for (fname, mid, date), v in files.items()
        ]

        return {"files": file_list}
    except Exception:
        raise HTTPException(
            status_code=500, detail="Failed to list files. Please try again."
        )


@router.get("/files/{meeting_id}")
async def list_files(meeting_id: str, user: dict = Depends(get_current_user)):
    try:
        client = await get_qdrant()
        points = await _scroll_all_points(
            client=client,
            collection_name=settings.QDRANT_COLLECTION,
            scroll_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="org_id", match=qmodels.MatchValue(value=user["org_id"])
                    ),
                    qmodels.FieldCondition(
                        key="meeting_id", match=qmodels.MatchValue(value=meeting_id)
                    ),
                    qmodels.FieldCondition(
                        key="topic", match=qmodels.MatchValue(value="uploaded_context")
                    ),
                ]
            ),
            with_payload=["speaker_name"],
            with_vectors=False,
        )
        files = {}
        for pt in points:
            fname = pt.payload.get("speaker_name", "Unknown File")
            files[fname] = files.get(fname, 0) + 1

        file_list = [{"filename": k, "chunks": v} for k, v in files.items()]
        return {"files": file_list}
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to list files for meeting. Please try again.",
        )


class ContextClearFileRequest(BaseModel):
    meeting_id: str
    filename: str


@router.post("/clear_file")
async def clear_file(
    req: ContextClearFileRequest, user: dict = Depends(get_current_user)
):
    try:
        client = await get_qdrant()
        await client.delete(
            collection_name=settings.QDRANT_COLLECTION,
            points_selector=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="org_id", match=qmodels.MatchValue(value=user["org_id"])
                    ),
                    qmodels.FieldCondition(
                        key="meeting_id", match=qmodels.MatchValue(value=req.meeting_id)
                    ),
                    qmodels.FieldCondition(
                        key="topic", match=qmodels.MatchValue(value="uploaded_context")
                    ),
                    qmodels.FieldCondition(
                        key="speaker_name", match=qmodels.MatchValue(value=req.filename)
                    ),
                ]
            ),
        )
        return {"status": "success", "message": f"File {req.filename} cleared."}
    except Exception:
        raise HTTPException(
            status_code=500, detail="Failed to clear file. Please try again."
        )


class ContextRenameFileRequest(BaseModel):
    meeting_id: str
    old_filename: str
    new_filename: str


@router.post("/rename_file")
async def rename_file(
    req: ContextRenameFileRequest,
    user: dict = Depends(get_current_user),
):
    try:
        client = await get_qdrant()
        # Scroll to get all matching point IDs first
        scroll_filter = qmodels.Filter(
            must=[
                qmodels.FieldCondition(
                    key="org_id", match=qmodels.MatchValue(value=user["org_id"])
                ),
                qmodels.FieldCondition(
                    key="meeting_id", match=qmodels.MatchValue(value=req.meeting_id)
                ),
                qmodels.FieldCondition(
                    key="topic", match=qmodels.MatchValue(value="uploaded_context")
                ),
                qmodels.FieldCondition(
                    key="speaker_name", match=qmodels.MatchValue(value=req.old_filename)
                ),
            ]
        )
        points = await _scroll_all_points(
            client=client,
            collection_name=settings.QDRANT_COLLECTION,
            scroll_filter=scroll_filter,
            with_payload=False,
            with_vectors=False,
        )
        point_ids = [pt.id for pt in points]
        if not point_ids:
            raise HTTPException(
                status_code=404, detail=f"No points found for file '{req.old_filename}'"
            )
        # Update by explicit IDs for reliability
        await client.set_payload(
            collection_name=settings.QDRANT_COLLECTION,
            payload={"speaker_name": req.new_filename},
            points=point_ids,
            wait=True,
        )
        return {
            "status": "success",
            "message": f"File renamed to {req.new_filename}.",
            "updated": len(point_ids),
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500, detail="Failed to rename file. Please try again."
        )


class ContextFileContentRequest(BaseModel):
    meeting_id: str
    filename: str


@router.post("/file_content")
async def get_file_content(
    req: ContextFileContentRequest, user: dict = Depends(get_current_user)
):
    try:
        client = await get_qdrant()
        points = await _scroll_all_points(
            client=client,
            collection_name=settings.QDRANT_COLLECTION,
            scroll_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="org_id", match=qmodels.MatchValue(value=user["org_id"])
                    ),
                    qmodels.FieldCondition(
                        key="meeting_id", match=qmodels.MatchValue(value=req.meeting_id)
                    ),
                    qmodels.FieldCondition(
                        key="topic", match=qmodels.MatchValue(value="uploaded_context")
                    ),
                    qmodels.FieldCondition(
                        key="speaker_name", match=qmodels.MatchValue(value=req.filename)
                    ),
                ]
            ),
            with_payload=True,
            with_vectors=False,
        )
        # Sort by original chunk ordering index to avoid garbled reconstructed file content
        points.sort(
            key=lambda pt: (
                pt.payload.get("priority")
                if pt.payload.get("priority") is not None
                else pt.payload.get("timestamp_ms", 0)
            )
        )
        content = "\n\n".join([pt.payload.get("text", "") for pt in points])
        return {"content": content}
    except Exception:
        raise HTTPException(
            status_code=500, detail="Failed to retrieve file content. Please try again."
        )
