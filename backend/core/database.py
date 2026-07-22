import uuid
from datetime import datetime, timezone
from .config import settings
from .utils import is_valid_uuid
try:
    from supabase import create_client, Client
except Exception:
    Client = object
    def create_client(*args, **kwargs):
        raise RuntimeError("supabase module not installed")

_client: any = None
_is_memory_supabase: bool | None = None

# In-memory database fallback (empty, no demo data)
_memory_db = {
    "meetings": [],
    "action_items": [],
}


class MockResponse:
    def __init__(self, data=None):
        self.data = data if data is not None else []


class MemoryTableQuery:
    def __init__(self, table_name: str, db: dict):
        self.table_name = table_name
        self.db = db
        self._filters: list[tuple[str, any]] = []
        self._order_col: str | None = None
        self._order_desc: bool = False
        self._range: tuple[int, int] | None = None
        self._is_single: bool = False
        self._action: str = "select"
        self._action_data: any = None

    def select(self, columns: str = "*", **kwargs):
        self._action = "select"
        return self

    def eq(self, column: str, value: any):
        self._filters.append((column, value, 'eq'))
        return self

    def like(self, column: str, pattern: str):
        val = pattern.replace("%", "")
        self._filters.append((column, val, 'like'))
        return self

    def order(self, column: str, desc: bool = False):
        self._order_col = column
        self._order_desc = desc
        return self

    def range(self, start: int, end: int):
        self._range = (start, end)
        return self

    def single(self):
        self._is_single = True
        return self

    def insert(self, data: any):
        self._action = "insert"
        self._action_data = data
        return self

    def update(self, data: dict):
        self._action = "update"
        self._action_data = data
        return self

    def delete(self):
        self._action = "delete"
        return self

    def execute(self) -> MockResponse:
        table_rows = self.db.setdefault(self.table_name, [])
        if self._action == "insert":
            rows_to_insert = [self._action_data] if isinstance(self._action_data, dict) else self._action_data
            for row in rows_to_insert:
                if "id" not in row:
                    row["id"] = str(uuid.uuid4())
                if "created_at" not in row:
                    row["created_at"] = datetime.now(timezone.utc).isoformat()
                table_rows.insert(0, row)
            return MockResponse(data=rows_to_insert)

        if self._action == "update":
            updated_rows = []
            for row in table_rows:
                match = True
                for col, val, op in self._filters:
                    row_val = row.get(col)
                    if op == 'eq' and row_val != val:
                        match = False
                        break
                    elif op == 'like' and (not row_val or val not in str(row_val)):
                        match = False
                        break
                if match:
                    row.update(self._action_data)
                    updated_rows.append(row)
            return MockResponse(data=updated_rows)

        if self._action == "delete":
            kept_rows = []
            deleted_rows = []
            for row in table_rows:
                match = True
                for col, val, op in self._filters:
                    row_val = row.get(col)
                    if op == 'eq' and row_val != val:
                        match = False
                        break
                    elif op == 'like' and (not row_val or val not in str(row_val)):
                        match = False
                        break
                if match:
                    deleted_rows.append(row)
                else:
                    kept_rows.append(row)
            self.db[self.table_name] = kept_rows
            return MockResponse(data=deleted_rows)

        # SELECT action
        results = []
        for row in table_rows:
            match = True
            for col, val, op in self._filters:
                row_val = row.get(col)
                if op == 'eq':
                    if row_val != val:
                        match = False
                        break
                elif op == 'like':
                    if not row_val or val not in str(row_val):
                        match = False
                        break
            if match:
                # Add relationship mock if querying action items with meetings(...)
                if self.table_name == "action_items" and "meetings" not in row:
                    for m in self.db.get("meetings", []):
                        if m["id"] == row.get("meeting_id"):
                            row["meetings"] = {"title": m.get("title"), "start_at": m.get("start_at")}
                            break
                results.append(row)

        if self._order_col:
            results.sort(key=lambda r: str(r.get(self._order_col, "")), reverse=self._order_desc)

        if self._range:
            start, end = self._range
            results = results[start : end + 1]

        if self._is_single:
            return MockResponse(data=results[0] if results else None)

        return MockResponse(data=results)


class MemorySupabaseClient:
    def __init__(self):
        self._db = _memory_db

    def table(self, table_name: str) -> MemoryTableQuery:
        return MemoryTableQuery(table_name, self._db)


def _should_use_memory_supabase() -> bool:
    global _is_memory_supabase
    if _is_memory_supabase is not None:
        return _is_memory_supabase
    if settings.SUPABASE_URL in ["https://your-project.supabase.co", "memory", "local", ""]:
        _is_memory_supabase = True
        return True
    _is_memory_supabase = False
    return False


def get_supabase() -> Client | MemorySupabaseClient:
    global _client
    if _should_use_memory_supabase():
        return MemorySupabaseClient()
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _client


def get_supabase_admin() -> Client | MemorySupabaseClient:
    """Service role client — bypasses RLS. Use only server-side."""
    if _should_use_memory_supabase():
        return MemorySupabaseClient()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_meeting_record(supabase, meeting_id: str, org_id: str = None) -> dict | None:
    """Helper to fetch a meeting by UUID or google_meet_link/title."""
    if not meeting_id:
        return None

    is_uuid = is_valid_uuid(meeting_id)
    clean_id = meeting_id.replace("https://meet.google.com/", "").strip("/")

    try:
        query = supabase.table("meetings").select("*")
        if is_uuid:
            query = query.eq("id", meeting_id)
        else:
            query = query.like("title", f"%{clean_id}%")
            
        if org_id:
            query = query.eq("org_id", org_id)

        res = query.order("created_at", desc=True).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass

    # Fallback for non-UUIDs
    if not is_uuid:
        try:
            query = supabase.table("meetings").select("*").like("title", f"%{clean_id}%")
            if org_id:
                query = query.eq("org_id", org_id)
            res = query.order("created_at", desc=True).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass

    return None


def ensure_meeting_record(supabase, meeting_id: str, org_id: str = "default_org", user_id: str = "default_user", title: str = "") -> dict:
    """Ensure a meeting record exists in Supabase, auto-creating if missing."""
    record = get_meeting_record(supabase, meeting_id, org_id)
    if record:
        return record
        
    is_uuid = is_valid_uuid(meeting_id)
    m_id = meeting_id if is_uuid else str(uuid.uuid4())
    clean_code = meeting_id.replace("https://meet.google.com/", "").strip("/") if not is_uuid else ""
    
    from .utils import generate_meeting_title
    final_title = generate_meeting_title(title, clean_code)
    
    insert_data = {
        "id": m_id,
        "org_id": org_id,
        "user_id": user_id,
        "title": final_title,
        "attendees": [],
        "start_at": datetime.now(timezone.utc).isoformat(),
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

