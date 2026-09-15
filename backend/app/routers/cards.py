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
    card = store.cards[card_id]
    updates = payload.model_dump(exclude_unset=True)
    updated = card.model_copy(update=updates)
    store.cards[card_id] = updated
    return updated


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: str,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> None:
    if not store.owns_card(card_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    del store.cards[card_id]


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

    card = store.cards[card_id]
    source_column_id = card.columnId
    dest_column_id = payload.toColumnId

    dest_cards = [c for c in store.cards_for_column(dest_column_id) if c.id != card_id]
    to_index = max(0, min(payload.toIndex, len(dest_cards)))
    dest_cards.insert(to_index, card)

    for index, c in enumerate(dest_cards):
        store.cards[c.id] = c.model_copy(update={"columnId": dest_column_id, "order": index})

    if source_column_id != dest_column_id:
        source_cards = [c for c in store.cards_for_column(source_column_id) if c.id != card_id]
        for index, c in enumerate(source_cards):
            store.cards[c.id] = c.model_copy(update={"order": index})

    result = store.cards_for_column(dest_column_id)
    if source_column_id != dest_column_id:
        result = store.cards_for_column(source_column_id) + result
    return result
