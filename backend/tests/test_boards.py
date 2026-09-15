from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient


def test_create_and_list_boards(auth_client: TestClient) -> None:
    response = auth_client.post("/api/boards", json={"name": "Work"})
    assert response.status_code == 201
    board = response.json()
    assert board["name"] == "Work"
    assert board["order"] == 0

    response = auth_client.get("/api/boards")
    assert response.status_code == 200
    assert [b["name"] for b in response.json()] == ["Work"]


def test_boards_are_ordered_by_creation(auth_client: TestClient) -> None:
    auth_client.post("/api/boards", json={"name": "Work"})
    auth_client.post("/api/boards", json={"name": "Personal"})
    response = auth_client.get("/api/boards")
    names = [b["name"] for b in response.json()]
    assert names == ["Work", "Personal"]


def test_rename_board(auth_client: TestClient) -> None:
    board = auth_client.post("/api/boards", json={"name": "Work"}).json()
    response = auth_client.patch(f"/api/boards/{board['id']}", json={"name": "Renamed"})
    assert response.status_code == 200
    assert response.json()["name"] == "Renamed"


def test_rename_unknown_board_is_404(auth_client: TestClient) -> None:
    response = auth_client.patch("/api/boards/does-not-exist", json={"name": "x"})
    assert response.status_code == 404


def test_delete_board_cascades_to_columns_and_cards(auth_client: TestClient) -> None:
    board = auth_client.post("/api/boards", json={"name": "Work"}).json()
    column = auth_client.post(f"/api/boards/{board['id']}/columns", json={"name": "To Do"}).json()
    auth_client.post(f"/api/columns/{column['id']}/cards", json={"title": "Task"})

    response = auth_client.delete(f"/api/boards/{board['id']}")
    assert response.status_code == 204

    assert auth_client.get("/api/boards").json() == []
    assert auth_client.get(f"/api/boards/{board['id']}/columns").status_code == 404


def test_boards_are_scoped_per_user(
    auth_client: TestClient, sign_up_client: Callable[[str], TestClient]
) -> None:
    auth_client.post("/api/boards", json={"name": "Alice's board"})

    eve = sign_up_client("eve@example.com")
    response = eve.get("/api/boards")
    assert response.status_code == 200
    assert response.json() == []


def test_user_cannot_rename_another_users_board(
    auth_client: TestClient, sign_up_client: Callable[[str], TestClient]
) -> None:
    board = auth_client.post("/api/boards", json={"name": "Alice's board"}).json()

    eve = sign_up_client("eve@example.com")
    response = eve.patch(f"/api/boards/{board['id']}", json={"name": "Hijacked"})
    assert response.status_code == 404
