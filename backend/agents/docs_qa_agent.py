"""
Docs QA Agent — answers questions about uploaded documents with rich markdown formatting.
"""

import re
import logging

from ..core.lyzr_integration import run_lyzr_agent
from ..core.utils import parse_json_clean
from ..memory.embeddings import embed_query
from ..memory.qdrant_client import search_memories
from ..memory.schemas import MemoryFilter

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """Role: Document Intelligence Specialist. You are an expert AI answering questions about uploaded documents with clarity and rich Markdown.
Rules:
1. Answer directly and concisely using structured Markdown with bullet points or tables where appropriate.
2. If the provided context is relevant, use it. Do NOT include inline citations like [Context 0] in the text.
3. If context is NOT relevant or insufficient, state clearly that the uploaded documents do not contain this information, then provide helpful general context if applicable.
4. Output valid JSON matching this schema:
{
  "answer": "Structured markdown answer...",
  "confidence": "high|medium|low",
  "sources_used": [0, 1]
}"""


def _build_context_block(results) -> tuple[str, list[dict]]:
    # format retrieved document chunks with file name and excerpt
    context_lines = []
    sources = []

    for i, r in enumerate(results):
        context_lines.append(
            f"[Context {i}] File: {r.speaker_name or 'Document'} (Meeting {r.meeting_id})\n{r.text}"
        )
        sources.append({
            "index": i,
            "meeting_id": r.meeting_id,
            "speaker_name": r.speaker_name,
            "excerpt": r.text[:200] + "..." if len(r.text) > 200 else r.text,
            "score": round(r.score, 3),
        })

    return "\n\n".join(context_lines), sources


async def run_docs_qa_agent(
    question: str,
    org_id: str,
    user_id: str,
    filters: dict | None = None,
) -> dict:
    # searches uploaded document embeddings in qdrant and answers user questions
    filters = filters or {}

    mem_filter = MemoryFilter(
        org_id=org_id,
        user_id=filters.get("user_id", ""),
        meeting_id=filters.get("meeting_id"),
        speaker_name=filters.get("speaker_name"),
        topic="uploaded_context",
    )

    query_vec = await embed_query(question)
    results = await search_memories(query_vector=query_vec, memory_filter=mem_filter, limit=6)

    context_block, sources = _build_context_block(results)

    prompt = (
        f"{_SYSTEM_PROMPT}\n\nQuestion: {question}\n\n"
        f"Retrieved context from documents:\n{context_block if context_block else '(No relevant document context found)'}\n\n"
        "Answer the question based on the document context above. Ensure valid JSON output:\n"
        '{\n  "answer": "...",\n  "confidence": "high|medium|low",\n  "sources_used": [0, 1]\n}'
    )

    try:
        from ..core.llm_fallback import generate_content_with_fallback
        raw, powered_by = await generate_content_with_fallback(
            prompt,
            response_format_json=True,
            max_tokens=1024,
            bypass_cache=False,
            user_id=user_id,
        )
        result = parse_json_clean(raw)
        if not result:
            result = {"answer": raw.strip(), "confidence": "low", "sources_used": []}
    except Exception as e:
        return {
            "answer": "An error occurred while querying documents. Please try again.",
            "confidence": "low",
            "sources": sources,
            "error": str(e)[:150],
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
        "powered_by": powered_by,
        "guardrail_score": guardrail_res.score,
        "guardrail_valid": guardrail_res.valid,
        "guardrail_violations": guardrail_res.violations,
    }

