"""
Memory Agent — answers cross-meeting natural language queries.

Trigger: POST /memory/query
Input:   NL question + org_id + user_id scope
Flow:    Embed query → Qdrant filtered search → Reranking → Gemini grounded answer
Output:  {answer, sources: [{meeting_id, date, excerpt, speaker}]}
Governed by Lyzr guardrail — answer must cite sources
"""

import re
import logging

from ..core.lyzr_integration import run_lyzr_agent
from ..core.utils import parse_json_clean
from ..memory.embeddings import embed_query
from ..memory.qdrant_client import search_memories
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
    """Rerank by score × memory-type priority weight. DECISION > ACTION_ITEM > rest."""
    priority_weights = {
        MemoryType.DECISION: 1.5,
        MemoryType.ACTION_ITEM: 1.3,
        MemoryType.KEY_TOPIC: 1.2,
        MemoryType.TRANSCRIPT_CHUNK: 1.0,
        MemoryType.TRANSCRIPT: 1.0,
    }
    scored = []
    for r in results:
        if r.score <= 0.0:
            continue
        try:
            mem_type = MemoryType(r.memory_type)
        except (ValueError, KeyError):
            mem_type = None
        weight = priority_weights.get(mem_type, 1.0)
        scored.append((r.score * weight, r))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [r for _, r in scored[:20]]


async def run_memory_agent(
    question: str,
    org_id: str,
    user_id: str,
    filters: dict | None = None,
) -> dict:
    """
    Answer a natural-language question about past meetings using Qdrant retrieval
    + Supabase meeting summaries for full cross-meeting context.
    """
    filters = filters or {}

    mem_filter = MemoryFilter(
        org_id=org_id,
        user_id=filters.get("user_id", ""),
        meeting_id=filters.get("meeting_id"),
        speaker_id=filters.get("speaker_id", ""),
        topic=filters.get("topic", ""),
        query_text=question,
        date_from=filters.get("date_from", ""),
        date_to=filters.get("date_to", ""),
    )

    if mt := filters.get("memory_type"):
        try:
            mem_filter.memory_type = MemoryType(mt)
        except ValueError:
            pass

    query_vec = await embed_query(question)
    raw_results = await search_memories(query_vector=query_vec, memory_filter=mem_filter, limit=40)
    results = _rerank_results(raw_results)

    meetings_context = ""
    meetings_list = []
    try:
        from ..core.database import get_supabase_admin
        supabase = get_supabase_admin()
        res = (
            supabase.table("meetings")
            .select("id, title, start_at, summary, decisions, attendees, status")
            .eq("org_id", org_id)
            .eq("status", "completed")
            .order("start_at", desc=True)
            .limit(50)
            .execute()
        )
        meetings_list = res.data or []
        if meetings_list:
            lines = []
            for m in meetings_list:
                date_str = (m.get("start_at") or "")[:10]
                title = m.get("title") or "Untitled Meeting"
                summary = m.get("summary") or ""
                decisions = m.get("decisions") or []
                attendees = ", ".join(m.get("attendees") or [])
                dec_text = "; ".join(d.get("text", "") for d in decisions if d.get("text"))
                line = f"[Meeting: {title} | Date: {date_str} | Attendees: {attendees}]\nSummary: {summary}"
                if dec_text:
                    line += f"\nDecisions: {dec_text}"
                lines.append(line)
            meetings_context = "\n\n".join(lines)
    except Exception as e:
        logger.warning("Could not fetch meetings from DB for memory context: {}", e)

    if not results and not meetings_context:
        return {
            "answer": "I couldn't find relevant information in your past meetings.",
            "confidence": "low",
            "sources": [],
        }

    context_block, sources = _build_context_block(results)

    db_section = (
        f"\n\n--- ALL PAST MEETING SUMMARIES (from database) ---\n{meetings_context}\n--- END OF MEETING SUMMARIES ---\n"
        if meetings_context else ""
    )

    prompt = (
        f"{_SYSTEM_PROMPT}\n\nQuestion: {question}\n\n"
        f"Retrieved semantic context from past meetings (most relevant chunks):\n"
        f"{context_block if context_block else '(No semantic matches found)'}"
        f"{db_section}\n"
        "Answer the question conversationally based solely on the context above.\n"
        "You MUST format your response as a valid JSON object. Ensure all quotes inside strings are properly escaped. "
        "Do NOT include markdown code blocks or ```json wrappers. Just raw JSON:\n"
        '{{\n  "answer": "...",\n  "confidence": "high|medium|low",\n  "sources_used": [0, 1, 2]\n}}'
    )

    try:
        raw, powered_by = await run_lyzr_agent("Memory Agent - MeetMaxxing", prompt)
        result = parse_json_clean(raw)
        if not result:
            result = {"answer": raw.strip(), "confidence": "low", "sources_used": []}
    except Exception as e:
        err_str = str(e)
        return {
            "answer": "An error occurred while querying memory. Please try again.",
            "confidence": "low",
            "sources": sources,
            "total_retrieved": len(results),
            "error": err_str[:150],
            "powered_by": "Error",
        }

    used_indices = result.get("sources_used", list(range(len(sources))))
    cited_sources = [sources[i] for i in used_indices if i < len(sources)]

    from ..services.guardrails import validate_memory_output
    guardrail_res = await validate_memory_output(answer=result.get("answer", ""), sources=cited_sources)

    final_answer = guardrail_res.cleaned_output.get("answer", result.get("answer", ""))
    final_answer = re.sub(r'\[Context\s*[\d,\s]*\]', '', final_answer).strip()

    return {
        "answer": final_answer,
        "confidence": result.get("confidence", "low"),
        "sources": cited_sources,
        "total_retrieved": len(results) + len(meetings_list),
        "powered_by": powered_by,
        "guardrail_score": guardrail_res.score,
        "guardrail_valid": guardrail_res.valid,
        "guardrail_violations": guardrail_res.violations,
    }
