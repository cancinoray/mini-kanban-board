from __future__ import annotations

from fastapi.testclient import TestClient


def _make_board_with_columns(client: TestClient) -> tuple[dict, dict, dict]:
    board = client.post("/api/boards", json={"name": "Work"}).json()
    todo = client.post(f"/api/boards/{board['id']}/columns", json={"name": "To Do"}).json()
    doing = client.post(f"/api/boards/{board['id']}/columns", json={"name": "Doing"}).json()
    return board, todo, doing


def test_create_card_with_defaults(auth_client: TestClient) -> None:
    _, todo, _ = _make_board_with_columns(auth_client)
    response = auth_client.post(f"/api/columns/{todo['id']}/cards", json={"title": "Write tests"})
    assert response.status_code == 201
    card = response.json()
    assert card["title"] == "Write tests"
    assert card["description"] == ""
    assert card["tags"] == []
    assert card["archived"] is False
    assert card["order"] == 0


def test_create_card_on_missing_column_is_404(auth_client: TestClient) -> None:
    response = auth_client.post("/api/columns/nope/cards", json={"title": "x"})
    assert response.status_code == 404


def test_list_cards_for_board(auth_client: TestClient) -> None:
    _, todo, doing = _make_board_with_columns(auth_client)
    auth_client.post(f"/api/columns/{todo['id']}/cards", json={"title": "A"})
    auth_client.post(f"/api/columns/{doing['id']}/cards", json={"title": "B"})

    board, _, _ = _make_board_with_columns(auth_client)
    response = auth_client.get(f"/api/boards/{board['id']}/cards")
    assert response.status_code == 200


def test_update_card_partial_fields(auth_client: TestClient) -> None:
    _, todo, _ = _make_board_with_columns(auth_client)
    card = auth_client.post(f"/api/columns/{todo['id']}/cards", json={"title": "Task"}).json()

    response = auth_client.patch(f"/api/cards/{card['id']}", json={"archived": True})
    assert response.status_code == 200
    updated = response.json()
    assert updated["archived"] is True
    assert updated["title"] == "Task"


def test_update_missing_card_is_404(auth_client: TestClient) -> None:
    response = auth_client.patch("/api/cards/nope", json={"title": "x"})
    assert response.status_code == 404


def test_delete_card(auth_client: TestClient) -> None:
    _, todo, _ = _make_board_with_columns(auth_client)
    card = auth_client.post(f"/api/columns/{todo['id']}/cards", json={"title": "Task"}).json()

    response = auth_client.delete(f"/api/cards/{card['id']}")
    assert response.status_code == 204
    assert auth_client.delete(f"/api/cards/{card['id']}").status_code == 404


def test_move_card_within_same_column_reorders(auth_client: TestClient) -> None:
    _, todo, _ = _make_board_with_columns(auth_client)
    a = auth_client.post(f"/api/columns/{todo['id']}/cards", json={"title": "A"}).json()
    b = auth_client.post(f"/api/columns/{todo['id']}/cards", json={"title": "B"}).json()

    response = auth_client.post(f"/api/cards/{a['id']}/move", json={"toColumnId": todo["id"], "toIndex": 1})
    assert response.status_code == 200
    ordered = sorted(response.json(), key=lambda c: c["order"])
    assert [c["id"] for c in ordered] == [b["id"], a["id"]]


def test_move_card_to_different_column(auth_client: TestClient) -> None:
    _, todo, doing = _make_board_with_columns(auth_client)
    a = auth_client.post(f"/api/columns/{todo['id']}/cards", json={"title": "A"}).json()
    b = auth_client.post(f"/api/columns/{todo['id']}/cards", json={"title": "B"}).json()

    response = auth_client.post(f"/api/cards/{a['id']}/move", json={"toColumnId": doing["id"], "toIndex": 0})
    assert response.status_code == 200

    todo_cards = auth_client.get(f"/api/boards/{todo['boardId']}/cards").json()
    moved = next(c for c in todo_cards if c["id"] == a["id"])
    remaining = next(c for c in todo_cards if c["id"] == b["id"])
    assert moved["columnId"] == doing["id"]
    assert moved["order"] == 0
    assert remaining["columnId"] == todo["id"]
    assert remaining["order"] == 0


def test_move_card_to_missing_column_is_404(auth_client: TestClient) -> None:
    _, todo, _ = _make_board_with_columns(auth_client)
    card = auth_client.post(f"/api/columns/{todo['id']}/cards", json={"title": "A"}).json()

    response = auth_client.post(f"/api/cards/{card['id']}/move", json={"toColumnId": "nope", "toIndex": 0})
    assert response.status_code == 404
