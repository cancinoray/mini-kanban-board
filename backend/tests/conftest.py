from __future__ import annotations

import os
from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

# The app's own engine is never used by the tests (they override get_session),
# but keep it off any real database file in case importing the app opens one.
os.environ["KANBAN_DATABASE_URL"] = "sqlite://"

from app.database import Base, create_db_engine, get_session  # noqa: E402
from app.main import app  # noqa: E402
from app.store import Store  # noqa: E402

PASSWORD = "hunter2000"


@pytest.fixture
def session_factory(tmp_path) -> Iterator[sessionmaker[Session]]:
    """A fresh database per test. It lives on disk (rather than in memory) so
    the test's own session and the app's per-request sessions can share it."""
    engine = create_db_engine(f"sqlite:///{tmp_path / 'kanban.db'}")
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def store(session_factory: sessionmaker[Session]) -> Iterator[Store]:
    """A store against the same database the client writes to, for asserting on
    rows the API does not expose."""
    with session_factory() as session:
        yield Store(session)


@pytest.fixture
def client(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    def override_get_session() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_session, None)


@pytest.fixture
def auth_client(client: TestClient) -> TestClient:
    """A client signed in as alice. Registering sets the session cookie on this
    client, so its later requests are authenticated without any extra work."""
    response = client.post(
        "/api/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": PASSWORD},
    )
    assert response.status_code == 201
    return client


@pytest.fixture
def sign_up_client(client: TestClient) -> Iterator[Callable[[str], TestClient]]:
    """Factory for extra signed-in clients, each with its own cookie jar, so
    multi-user tests can act as two people at once against the same store."""

    others: list[TestClient] = []

    def sign_up(email: str = "eve@example.com") -> TestClient:
        other = TestClient(app)
        others.append(other)
        response = other.post(
            "/api/auth/register",
            json={"name": email.split("@")[0], "email": email, "password": PASSWORD},
        )
        assert response.status_code == 201
        return other

    yield sign_up
    for other in others:
        other.close()
