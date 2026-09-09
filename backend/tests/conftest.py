import sys
from pathlib import Path

# Ensure the repo root (parent of backend/) is importable so that
# `from backend.main import app` works when pytest is run from backend/.
# conftest.py lives at backend/tests/conftest.py, so the repo root is 3 parents up.
_repo_root = str(Path(__file__).resolve().parent.parent.parent)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

import pytest
from backend.main import app
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client
