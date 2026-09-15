from __future__ import annotations

from fastapi.testclient import TestClient


def _make_board(client: TestClient, name: str = "Work") -> dict:
    return client.post("/api/boards", json={"name": name}).json()


def test_create_and_list_columns(auth_client: TestClient) -> None:
    board = _make_board(auth_client)
    response = auth_client.post(f"/api/boards/{board['id']}/columns", json={"name": "To Do"})
    assert response.status_code == 201
    column = response.json()
    assert column["name"] == "To Do"
    assert column["boardId"] == board["id"]
    assert column["order"] == 0

    response = auth_client.get(f"/api/boards/{board['id']}/columns")
    assert [c["name"] for c in response.json()] == ["To Do"]


def test_create_column_on_missing_board_is_404(auth_client: TestClient) -> None:
    response = auth_client.post("/api/boards/nope/columns", json={"name": "To Do"})
    assert response.status_code == 404


def test_rename_column(auth_client: TestClient) -> None:
    board = _make_board(auth_client)
    column = auth_client.post(f"/api/boards/{board['id']}/columns", json={"name": "To Do"}).json()
    response = auth_client.patch(f"/api/columns/{column['id']}", json={"name": "Doing"})
    assert response.status_code == 200
    assert response.json()["name"] == "Doing"


def test_delete_column_cascades_to_cards(auth_client: TestClient) -> None:
    board = _make_board(auth_client)
    column = auth_client.post(f"/api/boards/{board['id']}/columns", json={"name": "To Do"}).json()
    auth_client.post(f"/api/columns/{column['id']}/cards", json={"title": "Task"})

    response = auth_client.delete(f"/api/columns/{column['id']}")
    assert response.status_code == 204

    response = auth_client.get(f"/api/boards/{board['id']}/cards")
    assert response.json() == []


def test_reorder_columns(auth_client: TestClient) -> None:
    board = _make_board(auth_client)
    a = auth_client.post(f"/api/boards/{board['id']}/columns", json={"name": "A"}).json()
    b = auth_client.post(f"/api/boards/{board['id']}/columns", json={"name": "B"}).json()
    c = auth_client.post(f"/api/boards/{board['id']}/columns", json={"name": "C"}).json()

    response = auth_client.post(
        f"/api/boards/{board['id']}/columns/reorder",
        json={"orderedColumnIds": [c["id"], a["id"], b["id"]]},
    )
    assert response.status_code == 200
    reordered = response.json()
    assert [col["name"] for col in reordered] == ["C", "A", "B"]
    assert [col["order"] for col in reordered] == [0, 1, 2]


def test_reorder_columns_rejects_mismatched_ids(auth_client: TestClient) -> None:
    board = _make_board(auth_client)
    a = auth_client.post(f"/api/boards/{board['id']}/columns", json={"name": "A"}).json()

    response = auth_client.post(
        f"/api/boards/{board['id']}/columns/reorder",
        json={"orderedColumnIds": [a["id"], "bogus-id"]},
    )
    assert response.status_code == 400
