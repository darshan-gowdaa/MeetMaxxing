import uuid
import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
import PyPDF2
import docx
from ..core.auth import get_current_user
from ..memory.embeddings import embed_query, embed_text
from ..memory.qdrant_client import upsert_memories, search_memories
from ..memory.schemas import MemoryPoint, MemoryFilter, MemoryType
from ..core.llm_fallback import generate_content_with_fallback

router = APIRouter(prefix="/context", tags=["context"])

def extract_text_from_file(file: UploadFile) -> str:
    content = ""
    if file.filename.endswith(".pdf"):
        pdf_reader = PyPDF2.PdfReader(file.file)
        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                content += text + "\n"
    elif file.filename.endswith(".docx"):
        doc = docx.Document(file.file)
        for para in doc.paragraphs:
            content += para.text + "\n"
    elif file.filename.endswith(".txt"):
        content = file.file.read().decode("utf-8")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    return content

@router.post("/upload")
async def upload_context(
    meeting_id: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    try:
        text = extract_text_from_file(file)
        if not text.strip():
            raise HTTPException(status_code=400, detail="File is empty")
        
        # Simple chunking
        chunk_size = 1000
        chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
        
        points = []
        today_str = datetime.datetime.now().strftime("%Y-%m-%d")
        
        for chunk in chunks:
            if not chunk.strip():
                continue
            vector = await embed_text(chunk)
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
                speaker_name=file.filename
            )
            points.append(pt)
            
        await upsert_memories(points)
        return {"status": "success", "message": f"Successfully uploaded {file.filename} and processed {len(points)} chunks."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ContextChatRequest(BaseModel):
    meeting_id: str
    query: str
    target_file: list[str] | str | None = None

@router.post("/chat")
async def chat_context(
    req: ContextChatRequest,
    user: dict = Depends(get_current_user)
):
    from ..agents.docs_qa_agent import run_docs_qa_agent
    from ..agents.memory_agent import run_memory_agent
    try:
        if req.target_file:
            res = await run_docs_qa_agent(
                question=req.query,
                org_id=user["org_id"],
                user_id=user["user_id"],
                filters={
                    "meeting_id": req.meeting_id,
                    "speaker_name": req.target_file,
                }
            )
            return {"answer": res.get("answer"), "powered_by": res.get("powered_by", "Lyzr Docs QA Agent"), "sources": res.get("sources", [])}
        else:
            res = await run_memory_agent(
                question=req.query,
                org_id=user["org_id"],
                user_id=user["user_id"],
                filters={
                    "meeting_id": [req.meeting_id, "global"],
                    "memory_type": "key_topic"
                }
            )
            return {"answer": res.get("answer"), "powered_by": res.get("powered_by", "Lyzr Memory Agent"), "sources": res.get("sources", [])}
    except Exception as e:
        return {"answer": f"Error generating answer: {str(e)}"}

class ContextClearRequest(BaseModel):
    meeting_id: str

@router.post("/clear")
async def clear_context(
    req: ContextClearRequest,
    user: dict = Depends(get_current_user)
):
    from ..memory.qdrant_client import get_qdrant
    from ..core.config import settings
    from qdrant_client.http import models as qmodels
    try:
        client = await get_qdrant()
        await client.delete(
            collection_name=settings.QDRANT_COLLECTION,
            points_selector=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(key="org_id", match=qmodels.MatchValue(value=user["org_id"])),
                    qmodels.FieldCondition(key="meeting_id", match=qmodels.MatchValue(value=req.meeting_id)),
                    qmodels.FieldCondition(key="topic", match=qmodels.MatchValue(value="uploaded_context")),
                ]
            )
        )
        return {"status": "success", "message": "Uploaded context cleared successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files")
async def list_all_files(
    user: dict = Depends(get_current_user)
):
    from ..memory.qdrant_client import get_qdrant
    from ..core.config import settings
    from qdrant_client.http import models as qmodels
    try:
        client = await get_qdrant()
        results = await client.scroll(
            collection_name=settings.QDRANT_COLLECTION,
            scroll_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(key="org_id", match=qmodels.MatchValue(value=user["org_id"])),
                    qmodels.FieldCondition(key="topic", match=qmodels.MatchValue(value="uploaded_context")),
                ]
            ),
            limit=10000,
            with_payload=True,
            with_vectors=False,
        )
        points = results[0]
        files = {}
        for pt in points:
            fname = pt.payload.get("speaker_name", "Unknown File")
            mid = pt.payload.get("meeting_id", "Unknown Meeting")
            date = pt.payload.get("meeting_date", "Unknown Date")
            key = f"{fname}|{mid}|{date}"
            files[key] = files.get(key, 0) + 1
            
        file_list = []
        for k, v in files.items():
            fname, mid, date = k.split("|")
            file_list.append({"filename": fname, "meeting_id": mid, "date": date, "chunks": v})
            
        return {"files": file_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/{meeting_id}")
async def list_files(
    meeting_id: str,
    user: dict = Depends(get_current_user)
):
    from ..memory.qdrant_client import get_qdrant
    from ..core.config import settings
    from qdrant_client.http import models as qmodels
    try:
        client = await get_qdrant()
        results = await client.scroll(
            collection_name=settings.QDRANT_COLLECTION,
            scroll_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(key="org_id", match=qmodels.MatchValue(value=user["org_id"])),
                    qmodels.FieldCondition(key="meeting_id", match=qmodels.MatchValue(value=meeting_id)),
                    qmodels.FieldCondition(key="topic", match=qmodels.MatchValue(value="uploaded_context")),
                ]
            ),
            limit=10000,
            with_payload=True,
            with_vectors=False,
        )
        points = results[0]
        files = {}
        for pt in points:
            fname = pt.payload.get("speaker_name", "Unknown File")
            files[fname] = files.get(fname, 0) + 1
            
        file_list = [{"filename": k, "chunks": v} for k, v in files.items()]
        return {"files": file_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ContextClearFileRequest(BaseModel):
    meeting_id: str
    filename: str

@router.post("/clear_file")
async def clear_file(
    req: ContextClearFileRequest,
    user: dict = Depends(get_current_user)
):
    from ..memory.qdrant_client import get_qdrant
    from ..core.config import settings
    from qdrant_client.http import models as qmodels
    try:
        client = await get_qdrant()
        await client.delete(
            collection_name=settings.QDRANT_COLLECTION,
            points_selector=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(key="org_id", match=qmodels.MatchValue(value=user["org_id"])),
                    qmodels.FieldCondition(key="meeting_id", match=qmodels.MatchValue(value=req.meeting_id)),
                    qmodels.FieldCondition(key="topic", match=qmodels.MatchValue(value="uploaded_context")),
                    qmodels.FieldCondition(key="speaker_name", match=qmodels.MatchValue(value=req.filename)),
                ]
            )
        )
        return {"status": "success", "message": f"File {req.filename} cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ContextRenameFileRequest(BaseModel):
    meeting_id: str
    old_filename: str
    new_filename: str

@router.post("/rename_file")
async def rename_file(
    req: ContextRenameFileRequest,
    user: dict = Depends(get_current_user)
):
    from ..memory.qdrant_client import get_qdrant
    from ..core.config import settings
    from qdrant_client.http import models as qmodels
    try:
        client = await get_qdrant()
        await client.set_payload(
            collection_name=settings.QDRANT_COLLECTION,
            payload={"speaker_name": req.new_filename},
            points_selector=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(key="org_id", match=qmodels.MatchValue(value=user["org_id"])),
                    qmodels.FieldCondition(key="meeting_id", match=qmodels.MatchValue(value=req.meeting_id)),
                    qmodels.FieldCondition(key="topic", match=qmodels.MatchValue(value="uploaded_context")),
                    qmodels.FieldCondition(key="speaker_name", match=qmodels.MatchValue(value=req.old_filename)),
                ]
            )
        )
        return {"status": "success", "message": f"File renamed to {req.new_filename}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ContextFileContentRequest(BaseModel):
    meeting_id: str
    filename: str

@router.post("/file_content")
async def get_file_content(
    req: ContextFileContentRequest,
    user: dict = Depends(get_current_user)
):
    from ..memory.qdrant_client import get_qdrant
    from ..core.config import settings
    from qdrant_client.http import models as qmodels
    try:
        client = await get_qdrant()
        results = await client.scroll(
            collection_name=settings.QDRANT_COLLECTION,
            scroll_filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(key="org_id", match=qmodels.MatchValue(value=user["org_id"])),
                    qmodels.FieldCondition(key="meeting_id", match=qmodels.MatchValue(value=req.meeting_id)),
                    qmodels.FieldCondition(key="topic", match=qmodels.MatchValue(value="uploaded_context")),
                    qmodels.FieldCondition(key="speaker_name", match=qmodels.MatchValue(value=req.filename)),
                ]
            ),
            limit=10000,
            with_payload=True,
            with_vectors=False,
        )
        points = results[0]
        content = "\n\n".join([pt.payload.get("text", "") for pt in points])
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
