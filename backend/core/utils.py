import json
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
    clean_code = meet_code.strip().replace("https://meet.google.com/", "").strip("/") if meet_code else ""
    
    if clean_code and (not final_title or final_title in ["Google Meet", "Untitled Meeting", "Google Meet Session"]):
        final_title = f"Meet - {clean_code}"
    elif clean_code and not final_title.startswith("Meet - "):
        final_title = f"Meet - {clean_code}"
        
    if not final_title:
        final_title = "Meet - Live Session"
        
    return final_title

def parse_json_clean(raw: str) -> dict:
    """Extract and parse JSON from an LLM response string."""
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]
    try:
        return json.loads(cleaned)
    except:
        return {}
