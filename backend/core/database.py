import uuid
from datetime import UTC, datetime

from .config import settings
from .utils import generate_meeting_title, is_valid_uuid

try:
    from supabase import Client, create_client
except Exception:
    Client = object
    def create_client(*args, **kwargs):
        raise RuntimeError("supabase module not installed")

_client: Client | None = None
_admin_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _client


def get_supabase_admin() -> Client:
    """Service role client — bypasses RLS. Use only server-side."""
    global _admin_client
    if _admin_client is None:
        _admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _admin_client


def get_meeting_record(supabase, meeting_id: str, org_id: str = None) -> dict | None:
    """Fetch a meeting by UUID or google_meet_link code."""
    if not meeting_id:
        return None

    is_uuid = is_valid_uuid(meeting_id)
    clean_id = meeting_id.replace("https://meet.google.com/", "").strip("/")

    try:
        query = supabase.table("meetings").select("*")
        if is_uuid:
            query = query.eq("id", meeting_id)
        else:
            # Search by exact meet code first, then by title fallback
            query = query.eq("google_meet_link", clean_id)

        if org_id:
            query = query.eq("org_id", org_id)

        res = query.order("created_at", desc=True).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass

    return None


def ensure_meeting_record(
    supabase, meeting_id: str, org_id: str = "default_org",
    user_id: str = "default_user", title: str = ""
) -> dict:
    """Ensure a meeting record exists in Supabase, auto-creating if missing."""
    record = get_meeting_record(supabase, meeting_id, org_id)
    if record:
        return record

    is_uuid = is_valid_uuid(meeting_id)
    m_id = meeting_id if is_uuid else str(uuid.uuid4())
    clean_code = meeting_id.replace("https://meet.google.com/", "").strip("/") if not is_uuid else ""

    final_title = generate_meeting_title(title, clean_code)

    insert_data = {
        "id": m_id,
        "org_id": org_id,
        "user_id": user_id,
        "title": final_title,
        "attendees": [],
        "start_at": datetime.now(UTC).isoformat(),
        "status": "active",
    }
    if clean_code:
        insert_data["google_meet_link"] = clean_code

    try:
        res = supabase.table("meetings").insert(insert_data).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        if "google_meet_link" in str(e):
            insert_data.pop("google_meet_link", None)
            try:
                res = supabase.table("meetings").insert(insert_data).execute()
                if res.data:
                    return res.data[0]
            except Exception:
                pass

    return {"id": m_id, "title": final_title, "status": "active", "attendees": [], "org_id": org_id}
