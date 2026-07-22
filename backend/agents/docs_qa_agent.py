"""
Docs QA Agent — answers questions about uploaded documents with rich markdown formatting.
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

_SYSTEM_PROMPT = """You are MeetMaxxing's AI Chatbot. You answer questions using the provided document context, but you can also answer general questions if the context doesn't apply.

Rules:
- Answer naturally and conversationally using proper grammar and tenses.
- Use rich Markdown formatting (bolding `**key terms**`, bullet points `- `, and double explicit newlines `\\n\\n` for paragraphs) to make the answer easy to read and beautifully structured.
- If the provided context is relevant, use it. Do NOT include citations like [Context 0] in your answer text.
- If the context is NOT relevant, use your general knowledge to answer, and do not say "I couldn't find relevant information". Instead, just answer the question normally.
- Format your response as STRICTLY valid JSON. You MUST escape all newlines as `\\n` inside the JSON string (e.g., `"answer": "Paragraph 1\\n\\nParagraph 2"`). Do not use unescaped quotes inside the answer string. Do NOT include markdown code blocks or ```json wrappers. Just raw JSON:

{
  "answer": "Your formatted conversational answer here...",
  "confidence": "high|medium|low",
  "sources_used": [0, 1, 2]
}"""

def _build_context_block(results) -> tuple[str, list[dict]]:
    """Format retrieved memories as numbered context for the LLM, also return structured sources."""
    context_lines = []
    sources = []

    for i, r in enumerate(results):
        context_lines.append(
            f"[Context {i}] Document {r.speaker_name} (Meeting {r.meeting_id})\n{r.text}"
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
    """
    Answer a natural-language question about uploaded documents using Qdrant retrieval.
    """
    filters = filters or {}

    mem_filter = MemoryFilter(
        org_id=org_id,
        user_id=filters.get("user_id", ""),
        meeting_id=filters.get("meeting_id"),
        topic="uploaded_context",
    )

    query_vec = await embed_query(question)

    results = await search_memories(
        query_vector=query_vec,
        memory_filter=mem_filter,
        limit=6,
    )
    
    # removed early exit for empty results so general questions still get answered

    context_block, sources = _build_context_block(results)

    prompt = f"""{_SYSTEM_PROMPT}

Question: {question}

Retrieved context from documents:
{context_block}

Answer the question conversationally. Use the context above if relevant, otherwise use your general knowledge.
You MUST format your response as a valid JSON object. Ensure all quotes inside strings are properly escaped. Do NOT include markdown code blocks or ```json wrappers. Just raw JSON:
{{
  "answer": "Your conversational answer here. Use Markdown for formatting (bold, bullet points `- `, and double newlines `\\n\\n`). Do not include [Context N]. Escape newlines properly.",
  "confidence": "high|medium|low",
  "sources_used": [0, 1, 2] 
}}"""

    try:
        from ..core.lyzr_integration import run_lyzr_agent
        raw, powered_by = await run_lyzr_agent("Docs QA Agent - MeetMaxxing", prompt)
        
        from ..core.utils import parse_json_clean
        result = parse_json_clean(raw)
        if not result:
            result = {
                "answer": raw.strip(),
                "confidence": "low",
                "sources_used": []
            }
    except Exception as e:
        return {
            "answer": f"Error querying Lyzr Docs QA Agent: {str(e)[:150]}",
            "confidence": "low",
            "sources": sources,
            "error": str(e)[:150],
            "powered_by": "Lyzr SDK Error"
        }

    used_indices = result.get("sources_used", list(range(len(sources))))
    cited_sources = [sources[i] for i in used_indices if i < len(sources)]

    # Skip guardrails for document QA since it's just extracting from uploaded files
    
    import re
    final_answer = result.get("answer", "")
    final_answer = re.sub(r'\[Context\s*[\d,\s]*\]', '', final_answer).strip()

    return {
        "answer": final_answer,
        "confidence": result.get("confidence", "low"),
        "sources": cited_sources,
        "powered_by": powered_by,
    }
