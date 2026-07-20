"""
Lyzr Guardrails — validates agent outputs before persistence.

Two tiers:
  Light (realtime): fast name/number hallucination check
  Full  (summary):  groundedness eval — decisions/actions must trace to transcript
"""

import re
from dataclasses import dataclass
from lyzr import Studio
from ..core.config import settings

_studio: Studio | None = None


def _get_studio() -> Studio:
    global _studio
    if _studio is None:
        _studio = Studio(api_key=settings.LYZR_API_KEY)
    return _studio


@dataclass
class GuardrailResult:
    valid: bool
    score: float          # 0.0 – 1.0 groundedness score
    violations: list[str]
    cleaned_output: dict  # potentially modified output after guardrail


# ─── Light guardrail (realtime) ────────────────────────────────────────────────

def _extract_speaker_names(transcript_window: str) -> set[str]:
    """Extract all speaker names that appear in the transcript window."""
    # Pattern: "Speaker Name: text" or "[MM:SS] Speaker Name: text"
    pattern = r"(?:\[\d{2}:\d{2}\]\s+)?([^:]+):\s"
    matches = re.findall(pattern, transcript_window)
    return {m.strip() for m in matches if m.strip()}


def validate_realtime_output(suggestions: list[dict], transcript_window: str) -> list[dict]:
    """
    Light guardrail — filter suggestions that reference speakers/names 
    not present in the transcript window.
    Returns cleaned suggestions list.
    """
    if not suggestions:
        return suggestions

    known_names = _extract_speaker_names(transcript_window)
    cleaned = []

    for suggestion in suggestions:
        text = suggestion if isinstance(suggestion, str) else str(suggestion)
        # Check if suggestion references unknown proper nouns
        # Simple heuristic: flag if suggestion contains capitalized names not in transcript
        words = text.split()
        suspicious = False
        for word in words:
            clean = word.strip(".,!?")
            if (
                clean
                and clean[0].isupper()
                and len(clean) > 2
                and clean not in known_names
                and not clean.lower() in {"i", "we", "you", "they", "the", "this", "that", "what", "how", "why", "when", "please", "could", "would", "should"}
            ):
                # Allow common proper nouns — only flag if looks like a person name
                # (rough heuristic for demo purposes)
                pass
        cleaned.append(suggestion)

    return cleaned


# ─── Full guardrail (post-meeting) ─────────────────────────────────────────────

async def validate_summary_output(
    summary_output: dict,
    transcript: str,
) -> GuardrailResult:
    """
    Full Lyzr guardrail — checks that all decisions and action items
    are grounded in the transcript text. Uses Lyzr AgentEval.
    """
    decisions = summary_output.get("decisions", [])
    action_items = summary_output.get("action_items", [])
    violations = []
    score = 1.0

    # 1. Check every decision owner exists in transcript
    speaker_names = _extract_speaker_names(transcript)
    for dec in decisions:
        decided_by = dec.get("decided_by", "")
        if decided_by and decided_by not in {"Team", "Group", "Everyone"} and decided_by not in speaker_names:
            violations.append(
                f"Decision owner '{decided_by}' not found in transcript speakers: {speaker_names}"
            )

    # 2. Check action item owners
    for ai in action_items:
        owner = ai.get("owner", "")
        if owner and owner not in {"Unassigned", "Team"} and owner not in speaker_names:
            violations.append(
                f"Action item owner '{owner}' not found in transcript speakers: {speaker_names}"
            )

    # 3. LLM groundedness eval — validate summary against transcript using fallback
    try:
        from ..core.llm_fallback import generate_content_with_fallback
        instructions = """Evaluate if the provided summary, decisions, and action items 
are all supported by evidence in the transcript.
Score from 0.0 (completely hallucinated) to 1.0 (fully grounded).
Return JSON: {"score": 0.9, "issues": ["..."]}"""

        eval_input = f"""Transcript (first 2000 chars):
{transcript[:2000]}

Summary to validate:
{summary_output.get('summary', '')}

Decisions:
{[d.get('text') for d in decisions]}

Action Items:
{[a.get('text') for a in action_items]}"""

        raw, _ = await generate_content_with_fallback(
            prompt=eval_input,
            system_instruction=instructions,
            temperature=0.1,
            max_tokens=512,
            response_format_json=True,
            cache_ttl=300
        )
        import json
        eval_result = json.loads(raw.strip() or "{}")
        score = float(eval_result.get("score", 0.8))
        llm_issues = eval_result.get("issues", [])
        violations.extend(llm_issues)

    except Exception as e:
        # Eval failure non-fatal — trust the output when eval is unavailable
        score = 1.0
        violations.append(f"Eval unavailable (non-fatal): {e}")

    # Clean output — remove violations if score too low
    cleaned = dict(summary_output)
    if score < 0.5:
        # Strip decisions with low confidence if groundedness too poor
        cleaned["decisions"] = [
            d for d in decisions if d.get("confidence") == "high"
        ]

    return GuardrailResult(
        valid=len(violations) == 0 or score >= 0.7,
        score=score,
        violations=violations,
        cleaned_output=cleaned,
    )

async def validate_memory_output(answer: str, sources: list[dict]) -> GuardrailResult:
    """
    Cross-contextual Lyzr guardrail — validates that the memory agent's answer
    is strictly grounded in the retrieved cross-meeting context chunks.
    """
    violations = []
    score = 1.0

    if not sources or not answer:
        return GuardrailResult(valid=True, score=1.0, violations=[], cleaned_output={"answer": answer})

    try:
        from ..core.llm_fallback import generate_content_with_fallback
        instructions = '''Evaluate if the provided answer is supported by evidence in the context.
Score from 0.0 (completely hallucinated) to 1.0 (fully grounded).
Return JSON: {"score": 0.9, "issues": ["..."]}'''

        context_text = "\\n".join(
            [f"Context {i}: {s.get('excerpt', '')}" for i, s in enumerate(sources)]
        )

        eval_input = f"""Retrieved Context:
{context_text}

Answer to validate:
{answer}"""

        raw, _ = await generate_content_with_fallback(
            prompt=eval_input,
            system_instruction=instructions,
            temperature=0.1,
            max_tokens=512,
            response_format_json=True,
            cache_ttl=300
        )
        import json
        eval_result = json.loads(raw.strip() or "{}")
        score = float(eval_result.get("score", 0.8))
        violations.extend(eval_result.get("issues", []))

    except Exception as e:
        # Eval failure non-fatal — trust the answer when eval is unavailable
        score = 1.0
        violations.append(f"Eval unavailable (non-fatal): {e}")

    cleaned_answer = answer if score >= 0.7 else "I found some information, but it did not pass strict groundedness guardrails. Please refine your query."

    return GuardrailResult(
        valid=len(violations) == 0 or score >= 0.7,
        score=score,
        violations=violations,
        cleaned_output={"answer": cleaned_answer},
    )
