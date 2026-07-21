"""Test fixtures.

By default tests run against a throwaway SQLite database. Set TEST_DATABASE_URL
to run the same suite against PostgreSQL, e.g.:

    TEST_DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/nenify_test
"""
import os
import tempfile

import pytest

os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    f"sqlite:///{tempfile.mkdtemp()}/test.db",
)

from fastapi.testclient import TestClient  # noqa: E402

from app.database import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402


@pytest.fixture(scope="session")
def client():
    # Fresh schema per test session
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def alice(client):
    """Registered user -> (auth headers, user dict)."""
    r = client.post(
        "/api/auth/local/register",
        json={"username": "alice", "email": "alice@example.com", "password": "secret123"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    return {"Authorization": f"Bearer {body['jwt']}"}, body["user"]


@pytest.fixture(scope="session")
def mallory(client):
    """A second user. Registration is owner-only, so she is inserted directly
    into the database — the ownership checks must hold even for accounts that
    exist outside the normal signup flow."""
    from app.database import SessionLocal
    from app.models import User
    from app.security import hash_password

    db = SessionLocal()
    try:
        db.add(User(
            username="mallory",
            email="m@example.com",
            hashed_password=hash_password("secret123"),
        ))
        db.commit()
    finally:
        db.close()

    r = client.post("/api/auth/local", json={"identifier": "mallory", "password": "secret123"})
    assert r.status_code == 200, r.text
    body = r.json()
    return {"Authorization": f"Bearer {body['jwt']}"}, body["user"]
