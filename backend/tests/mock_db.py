"""
Reusable in-memory mock Supabase client for backend unit tests.
"""


class MockTable:
    def __init__(self, name: str, data_store: dict, should_fail_theme: bool = False):
        self.name = name
        self.store = data_store
        self._should_fail_theme = should_fail_theme
        self._filters: list[tuple[str, str]] = []
        self._in_filters: list[tuple[str, list]] = []
        self._order_by: tuple[str, bool] | None = None
        self._action = "select"
        self._action_data: dict | None = None

    def select(self, *cols):
        self._action = "select"
        return self

    def eq(self, col: str, val):
        self._filters.append((col, str(val)))
        return self

    def in_(self, col: str, values):
        self._in_filters.append((col, list(values)))
        return self

    def order(self, col: str, desc: bool = False):
        self._order_by = (col, desc)
        return self

    def single(self):
        return self

    def limit(self, n: int):
        return self

    def update(self, data: dict):
        if self._should_fail_theme and "theme" in data:
            raise RuntimeError("Column 'theme' does not exist in 'users' table")
        self._action = "update"
        self._action_data = data
        return self

    def upsert(self, data: dict, on_conflict: str = "id"):
        if self._should_fail_theme and "theme" in data:
            raise RuntimeError("Column 'theme' does not exist in 'users' table")
        self._action = "upsert"
        self._action_data = data
        return self

    def execute(self):
        rows = self.store.setdefault(self.name, [])

        def matches(row):
            for col, val in self._filters:
                if str(row.get(col)) != str(val):
                    return False
            for col, vals in self._in_filters:
                if row.get(col) not in vals:
                    return False
            return True

        class Result:
            def __init__(self, data):
                self.data = data

        if self._action == "select":
            matched = [dict(r) for r in rows if matches(r)]
            if self._order_by:
                col, desc = self._order_by
                matched = sorted(
                    matched, key=lambda x: str(x.get(col, "")), reverse=desc
                )
            return Result(matched)

        elif self._action == "update":
            matched = []
            for r in rows:
                if matches(r):
                    r.update(self._action_data or {})
                    matched.append(dict(r))
            return Result(matched)

        elif self._action == "upsert":
            data = dict(self._action_data or {})
            rec_id = data.get("id")
            for r in rows:
                if r.get("id") == rec_id:
                    r.update(data)
                    return Result([dict(r)])
            rows.append(data)
            return Result([dict(data)])

        return Result([])


class MockStorageBucket:
    def __init__(self, name: str):
        self.name = name
        self.files = {}

    def upload(self, path: str, file, file_options=None):
        self.files[path] = file
        return {"Key": path}

    def get_public_url(self, path: str):
        return f"https://mock-supabase.co/storage/v1/object/public/{self.name}/{path}"


class MockStorage:
    def __init__(self):
        self.buckets = {}

    def from_(self, name: str):
        if name not in self.buckets:
            self.buckets[name] = MockStorageBucket(name)
        return self.buckets[name]


class MockAuthAdmin:
    def __init__(self):
        self.updated_users = {}

    def update_user_by_id(self, uid: str, attributes: dict):
        self.updated_users[uid] = attributes
        return {"id": uid}


class MockAuth:
    def __init__(self):
        self.admin = MockAuthAdmin()


class MockSupabaseAdmin:
    def __init__(self, data_store: dict, should_fail_theme: bool = False):
        self.store = data_store
        self.should_fail_theme = should_fail_theme
        self.storage = MockStorage()
        self.auth = MockAuth()
        self.supabase_url = "https://mock-supabase.co"

    def table(self, name: str):
        return MockTable(name, self.store, self.should_fail_theme)
