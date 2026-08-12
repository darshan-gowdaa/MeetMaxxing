import json
import re
import uuid


def is_valid_uuid(val: str) -> bool:
    """Check if a string is a valid UUID."""
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False


def generate_meeting_title(title: str, meet_code: str) -> str:
    """Generate a clean meeting title, falling back to meet code or default."""
    final_title = title.strip() if title else ""
    # meet_code may arrive with or without the full URL prefix — strip it here
    clean_code = meet_code.strip().replace("https://meet.google.com/", "").strip("/") if meet_code else ""

    if clean_code and (not final_title or final_title in ["Google Meet", "Untitled Meeting", "Google Meet Session"]):
        final_title = f"Meet - {clean_code}"

    return final_title or "Meet - Live Session"


def parse_json_clean(raw: str) -> dict:
    """Extract and parse JSON from an LLM response string."""
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    cleaned = cleaned.removesuffix("```").strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start: end + 1]
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        # Regex fallback for malformed JSON (e.g. unescaped quotes)
        result = {}
        ans_match = re.search(
            r'"answer"\s*:\s*"(.*?)"\s*(?:,\s*"confidence"|,\s*"sources_used"|\n\})',
            cleaned, re.DOTALL
        )
        if ans_match:
            result["answer"] = ans_match.group(1).replace('\\"', '"').replace("\\n", "\n")

        conf_match = re.search(r'"confidence"\s*:\s*"(.*?)"', cleaned)
        if conf_match:
            result["confidence"] = conf_match.group(1)

        src_match = re.search(r'"sources_used"\s*:\s*\[(.*?)\]', cleaned)
        if src_match:
            result["sources_used"] = [
                int(s.strip()) for s in src_match.group(1).split(",") if s.strip().isdigit()
            ]

        if not result:
            recap_match = re.search(r'"recap"\s*:\s*"(.*?)"\s*(?:,\s*"current_topic"|,\s*"key_decisions_so_far"|\n\})', cleaned, re.DOTALL)
            if recap_match:
                result["recap"] = recap_match.group(1).replace('\\"', '"').replace("\\n", "\n")
            topic_match = re.search(r'"current_topic"\s*:\s*"(.*?)"', cleaned)
            if topic_match:
                result["current_topic"] = topic_match.group(1).replace('\\"', '"')

        # In case of absolute failure to parse, just return a dict with the raw text so it can be handled or debugged
        if not result:
            result["_raw"] = cleaned
            
        return result
