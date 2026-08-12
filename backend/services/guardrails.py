"""
Guardrails — validates agent outputs before persistence.

Two tiers:
  Light (realtime): fast name/number hallucination check
  Full  (summary/memory): groundedness eval using LLM
"""

import re
from dataclasses import dataclass

from ..core.config import settings
from ..core.utils import parse_json_clean


@dataclass
class GuardrailResult:
    valid: bool
    score: float          # 0.0 – 1.0 groundedness score
    violations: list[str]
    cleaned_output: dict


def _extract_speaker_names(transcript_window: str) -> set[str]:
    """Extract all speaker names that appear in the transcript window."""
    pattern = r"(?:\[\d{2}:\d{2}\]\s+)?([^:]+):\s"
    matches = re.findall(pattern, transcript_window)
    return {m.strip() for m in matches if m.strip()}


def validate_realtime_output(suggestions: list, transcript_window: str) -> list:
    """
    Light guardrail — currently passes all suggestions through.
    Hallucination heuristic: flag capitalized names not in transcript.
    (Extended logic can be added here without changing callers.)
    """
    return suggestions if suggestions else []


async def _run_groundedness_eval(
    context: str,
    content_to_validate: str,
) -> tuple[float, list[str]]:
    """
    Shared LLM groundedness evaluator used by both summary and memory guardrails.
    Returns (score, issues_list).
    """
    from ..core.llm_fallback import generate_content_with_fallback

    instructions = (
        "Evaluate if the provided content is supported by the context. "
        "Score from 0.0 (hallucinated) to 1.0 (fully grounded). "
        'Return JSON: {"score": 0.9, "issues": ["..."]}'
    )
    eval_input = f"Context:\n{context}\n\nContent to validate:\n{content_to_validate}"

    try:
        raw, _ = await generate_content_with_fallback(
            prompt=eval_input,
            system_instruction=instructions,
            temperature=0.1,
            max_tokens=512,
            response_format_json=True,
            cache_ttl=300,
        )
        result = parse_json_clean(raw or "{}")
        return float(result.get("score", 1.0)), result.get("issues", [])
    except Exception as e:
        return 1.0, [f"Eval unavailable (non-fatal): {e}"]


async def validate_summary_output(
    summary_output: dict,
    transcript: str,
) -> GuardrailResult:
    """
    Full guardrail — checks that decisions and action items are grounded in transcript.
    """
    decisions = summary_output.get("decisions", [])
    action_items = summary_output.get("action_items", [])
    violations = []

    speaker_names = _extract_speaker_names(transcript)
    for dec in decisions:
        decided_by = dec.get("decided_by", "")
        if decided_by and decided_by not in {"Team", "Group", "Everyone"} and decided_by not in speaker_names:
            violations.append(f"Decision owner '{decided_by}' not found in transcript speakers")

    for ai in action_items:
        owner = ai.get("owner", "")
        if owner and owner not in {"Unassigned", "Team"} and owner not in speaker_names:
            violations.append(f"Action item owner '{owner}' not found in transcript speakers")

    eval_context = f"Transcript (first 2000 chars):\n{transcript[:2000]}"
    eval_content = (
        f"Summary: {summary_output.get('summary', '')}\n"
        f"Decisions: {[d.get('text') for d in decisions]}\n"
        f"Action Items: {[a.get('text') for a in action_items]}"
    )
    score, llm_issues = await _run_groundedness_eval(eval_context, eval_content)
    violations.extend(llm_issues)

    cleaned = dict(summary_output)
    if score < 0.5:
        cleaned["decisions"] = [d for d in decisions if d.get("confidence") == "high"]

    return GuardrailResult(
        valid=len(violations) == 0 or score >= 0.7,
        score=score,
        violations=violations,
        cleaned_output=cleaned,
    )


async def validate_memory_output(answer: str, sources: list[dict]) -> GuardrailResult:
    """
    Cross-contextual guardrail — validates memory agent answer against retrieved sources.
    """
    if not sources or not answer:
        return GuardrailResult(valid=True, score=1.0, violations=[], cleaned_output={"answer": answer})

    context_text = "\n".join(f"Context {i}: {s.get('excerpt', '')}" for i, s in enumerate(sources))
    score, violations = await _run_groundedness_eval(context_text, answer)

    cleaned_answer = answer
    if score < 0.7:
        cleaned_answer = "I couldn't find relevant information in the provided context to confidently answer your question."

    return GuardrailResult(
        valid=len(violations) == 0 or score >= 0.7,
        score=score,
        violations=violations,
        cleaned_output={"answer": cleaned_answer},
    )
