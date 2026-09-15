from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient


def test_export_reflects_current_state(auth_client: TestClient) -> None:
    board = auth_client.post("/api/boards", json={"name": "Work"}).json()
    column = auth_client.post(f"/api/boards/{board['id']}/columns", json={"name": "To Do"}).json()
    auth_client.post(f"/api/columns/{column['id']}/cards", json={"title": "Task"})

    response = auth_client.get("/api/export")
    assert response.status_code == 200
    body = response.json()
    assert len(body["boards"]) == 1
    assert len(body["columns"]) == 1
    assert len(body["cards"]) == 1
    assert body["exportedAt"]


def test_export_only_includes_own_data(
    auth_client: TestClient, sign_up_client: Callable[[str], TestClient]
) -> None:
    auth_client.post("/api/boards", json={"name": "Alice's board"})

    eve = sign_up_client("eve@example.com")
    response = eve.get("/api/export")
    assert response.json()["boards"] == []


def test_import_replaces_users_data(auth_client: TestClient) -> None:
    auth_client.post("/api/boards", json={"name": "Old board"})

    snapshot = {
        "boards": [{"id": "b1", "name": "Imported board", "order": 0}],
        "columns": [{"id": "c1", "boardId": "b1", "name": "Imported column", "order": 0}],
        "cards": [
            {
                "id": "card1",
                "columnId": "c1",
                "title": "Imported card",
                "description": "",
                "dueDate": None,
                "tags": [],
                "order": 0,
                "archived": False,
            }
        ],
        "exportedAt": "2024-01-01T00:00:00Z",
    }
    response = auth_client.post("/api/import", json=snapshot)
    assert response.status_code == 204

    boards = auth_client.get("/api/boards").json()
    assert [b["name"] for b in boards] == ["Imported board"]

    columns = auth_client.get("/api/boards/b1/columns").json()
    assert [c["name"] for c in columns] == ["Imported column"]

    cards = auth_client.get("/api/boards/b1/cards").json()
    assert [c["title"] for c in cards] == ["Imported card"]


def test_import_does_not_affect_other_users(
    auth_client: TestClient, sign_up_client: Callable[[str], TestClient]
) -> None:
    eve = sign_up_client("eve@example.com")
    eve.post("/api/boards", json={"name": "Eve's board"})

    snapshot = {"boards": [], "columns": [], "cards": [], "exportedAt": "2024-01-01T00:00:00Z"}
    auth_client.post("/api/import", json=snapshot)

    eve_boards = eve.get("/api/boards").json()
    assert [b["name"] for b in eve_boards] == ["Eve's board"]
