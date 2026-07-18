"""
Cross-meeting memory query endpoint.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from ..core.auth import get_current_user
from ..agents.memory_agent import run_memory_agent

router = APIRouter(prefix="/memory", tags=["memory"])


class MemoryQueryRequest(BaseModel):
    question: str
    filters: dict | None = None
    # Optional direct filters for quick access
    speaker_id: str = ""
    topic: str = ""
    date_from: str = ""
    date_to: str = ""
    memory_type: str = ""  # transcript | decision | relationship


@router.post("/query")
async def query_memory(
    req: MemoryQueryRequest,
    user: dict = Depends(get_current_user),
):
    """
    Natural-language cross-meeting memory query.
    
    Examples:
    - "What did the client say about pricing in the last 3 meetings?"
    - "What's pending with Rahul?"
    - "What was decided about the API design?"
    """
    # Merge explicit filter fields into filters dict
    filters = req.filters or {}
    if req.speaker_id:
        filters["speaker_id"] = req.speaker_id
    if req.topic:
        filters["topic"] = req.topic
    if req.date_from:
        filters["date_from"] = req.date_from
    if req.date_to:
        filters["date_to"] = req.date_to
    if req.memory_type:
        filters["memory_type"] = req.memory_type

    result = await run_memory_agent(
        question=req.question,
        org_id=user["org_id"],
        user_id=user["user_id"],
        filters=filters or None,
    )
    return result
