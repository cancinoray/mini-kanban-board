from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user_id
from app.models import Card, MoveCardInput, NewCardInput, UpdateCardInput
from app.store import Store, get_store

router = APIRouter(tags=["Cards"])


@router.get("/boards/{board_id}/cards", response_model=list[Card])
def list_cards(
    board_id: str,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> list[Card]:
    if not store.owns_board(board_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return store.cards_for_board(board_id)


@router.post("/columns/{column_id}/cards", status_code=status.HTTP_201_CREATED, response_model=Card)
def create_card(
    column_id: str,
    payload: NewCardInput,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> Card:
    if not store.owns_column(column_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found")
    return store.create_card(
        column_id,
        title=payload.title,
        description=payload.description,
        due_date=payload.dueDate,
        tags=payload.tags,
    )


@router.patch("/cards/{card_id}", response_model=Card)
def update_card(
    card_id: str,
    payload: UpdateCardInput,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> Card:
    if not store.owns_card(card_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    updates = payload.model_dump(exclude_unset=True)
    return store.update_card(card_id, updates)


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: str,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> None:
    if not store.owns_card(card_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    store.delete_card(card_id)


@router.post("/cards/{card_id}/move", response_model=list[Card])
def move_card(
    card_id: str,
    payload: MoveCardInput,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> list[Card]:
    if not store.owns_card(card_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    if not store.owns_column(payload.toColumnId, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination column not found")

    return store.move_card(card_id, payload.toColumnId, payload.toIndex)
