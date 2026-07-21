"""
Memory Agent — answers cross-meeting natural language queries.

Trigger: POST /memory/query
Input:   NL question + org_id + user_id scope
Flow:    Embed query → Qdrant filtered search → Reranking → Gemini grounded answer
Output:  {answer, sources: [{meeting_id, date, excerpt, speaker}]}
Governed by Lyzr guardrail — answer must cite sources
"""

import json
import logging
from google import genai
from google.genai import types as genai_types
from ..core.config import settings
from ..memory.qdrant_client import search_memories
from ..memory.embeddings import embed_query
from ..memory.schemas import MemoryFilter, MemoryType

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are MeetMaxxing's Memory Agent, a conversational AI chatbot. You answer questions about past meetings using ONLY the provided context.

Rules:
- Answer naturally and conversationally using proper grammar and tenses (e.g., "Emit owes you ₹50,000...").
- Format all currency and large numbers using the Indian numbering format (e.g., ₹50,000, 1,00,000).
- Answer ONLY based on context chunks provided. Never invent facts.
- Do NOT include citations like [Context 0] in your answer text. The system will handle citations automatically.
- If the context is insufficient to answer, say "I couldn't find relevant information in past meetings."
- Format your response as STRICTLY valid JSON. Do not use unescaped quotes inside the answer string. Do NOT include markdown code blocks or ```json wrappers. Just raw JSON:

{
  "answer": "Your conversational answer here...",
  "confidence": "high|medium|low",
  "sources_used": [0, 1, 2]
}"""


def _build_context_block(results) -> tuple[str, list[dict]]:
    """Format retrieved memories as numbered context for the LLM, also return structured sources."""
    context_lines = []
    sources = []

    for i, r in enumerate(results):
        context_lines.append(
            f"[Context {i}] Meeting {r.meeting_id} ({r.meeting_date}) — {r.speaker_name}\n{r.text}"
        )
        sources.append({
            "index": i,
            "meeting_id": r.meeting_id,
            "meeting_date": r.meeting_date,
            "speaker_name": r.speaker_name,
            "memory_type": r.memory_type,
            "excerpt": r.text[:200] + "..." if len(r.text) > 200 else r.text,
            "score": round(r.score, 3),
        })

    return "\n\n".join(context_lines), sources

def _rerank_results(results):
    """
    Reranks results based on score and memory type priority.
    Prioritizes DECISION > ACTION_ITEM > TRANSCRIPT_CHUNK.
    """
    priority_weights = {
        MemoryType.DECISION: 1.5,
        MemoryType.ACTION_ITEM: 1.3,
        MemoryType.TRANSCRIPT_CHUNK: 1.0,
        MemoryType.KEY_TOPIC: 1.2
    }
    
    # Filter score > 0.05
    filtered = [r for r in results if r.score > 0.05]
    
    for r in filtered:
        weight = priority_weights.get(r.memory_type, 1.0)
        # We attach a dynamic attribute just for sorting
        r._rerank_score = r.score * weight
        
    filtered.sort(key=lambda x: x._rerank_score, reverse=True)
    return filtered[:6] # Take top 6 after reranking


async def run_memory_agent(
    question: str,
    org_id: str,
    user_id: str,
    filters: dict | None = None,
) -> dict:
    """
    Answer a natural-language question about past meetings using Qdrant retrieval.
    
    filters: optional dict with keys: speaker_id, topic, memory_type, date_from, date_to
    """
    filters = filters or {}

    # Build memory filter — org_id always mandatory
    mem_filter = MemoryFilter(
        org_id=org_id,
        user_id=filters.get("user_id", ""),
        speaker_id=filters.get("speaker_id", ""),
        topic=filters.get("topic", ""),
        date_from=filters.get("date_from", ""),
        date_to=filters.get("date_to", ""),
    )

    # Parse memory_type filter if provided
    if mt := filters.get("memory_type"):
        try:
            mem_filter.memory_type = MemoryType(mt)
        except ValueError:
            pass

    # Embed the question with RETRIEVAL_QUERY task type
    query_vec = await embed_query(question)

    # Search across all memory types unless filtered. Get 12 to allow reranking.
    raw_results = await search_memories(
        query_vector=query_vec,
        memory_filter=mem_filter,
        limit=12,
    )
    
    results = _rerank_results(raw_results)

    if not results:
        return {
            "answer": "I couldn't find relevant information in your past meetings.",
            "confidence": "low",
            "sources": [],
        }

    context_block, sources = _build_context_block(results)

    prompt = f"""Question: {question}

Retrieved context from past meetings:
{context_block}

Answer the question conversationally based solely on the context above. 
You MUST format your response as a valid JSON object. Ensure all quotes inside strings are properly escaped. Do NOT include markdown code blocks or ```json wrappers. Just raw JSON:
{{
  "answer": "Your conversational answer here. Do not include [Context N]. Format numbers in Indian style (e.g. ₹50,000).",
  "confidence": "high|medium|low",
  "sources_used": [0, 1, 2] 
}}"""

    if settings.GEMINI_API_KEY in ["your-gemini-api-key", "mock-key", ""] or not settings.GEMINI_API_KEY:
        return {
            "answer": "Cannot run natural language memory search: GEMINI_API_KEY is not configured in backend/.env. Please add your Gemini API key and restart backend on port 8000.",
            "confidence": "low",
            "sources": sources,
            "total_retrieved": len(results),
            "error": "GEMINI_API_KEY missing in .env"
        }
    else:
        try:
            from ..core.lyzr_integration import run_lyzr_agent
            raw, powered_by = await run_lyzr_agent("Memory Agent - MeetMaxxing", prompt)
            
            from ..core.utils import parse_json_clean
            result = parse_json_clean(raw)
            if not result:
                # If LLM ignored JSON rules and returned plain text (e.g. "I don't know")
                result = {
                    "answer": raw.strip(),
                    "confidence": "low",
                    "sources_used": []
                }
        except Exception as e:
            err_str = str(e)
            return {
                "answer": f"Error querying Lyzr Memory Agent: {err_str[:150]}",
                "confidence": "low",
                "sources": sources,
                "total_retrieved": len(results),
                "error": err_str[:150],
                "powered_by": "Lyzr SDK Error"
            }

    # Map source indices to full source objects
    used_indices = result.get("sources_used", list(range(len(sources))))
    cited_sources = [sources[i] for i in used_indices if i < len(sources)]

    # Lyzr cross-contextual guardrail validation
    from ..services.guardrails import validate_memory_output
    guardrail_res = await validate_memory_output(
        answer=result.get("answer", ""),
        sources=cited_sources
    )

    final_answer = guardrail_res.cleaned_output.get("answer", result.get("answer", ""))

    import re
    final_answer = re.sub(r'\[Context\s*[\d,\s]*\]', '', final_answer).strip()

    return {
        "answer": final_answer,
        "confidence": result.get("confidence", "low"),
        "sources": cited_sources,
        "total_retrieved": len(results),
        "powered_by": powered_by,
        "guardrail_score": guardrail_res.score,
        "guardrail_valid": guardrail_res.valid,
        "guardrail_violations": guardrail_res.violations
    }
