from __future__ import annotations

from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import Store, get_store

PASSWORD = "hunter2000"


@pytest.fixture
def store() -> Store:
    """A fresh, unseeded store for each test."""
    return Store()


@pytest.fixture
def client(store: Store) -> Iterator[TestClient]:
    app.dependency_overrides[get_store] = lambda: store
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_store, None)


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
