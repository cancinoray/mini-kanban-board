from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status

from app.auth import get_current_user_id
from app.models import Column, KanbanExport
from app.store import Store, get_store

router = APIRouter(tags=["Data"])


@router.get("/export", response_model=KanbanExport)
def export_data(
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> KanbanExport:
    boards = store.boards_for_user(user_id)
    columns: list[Column] = []
    for board in boards:
        columns.extend(store.columns_for_board(board.id))
    cards = store.cards_for_user(user_id)
    return KanbanExport(
        boards=boards,
        columns=columns,
        cards=cards,
        exportedAt=datetime.now(timezone.utc),
    )


@router.post("/import", status_code=status.HTTP_204_NO_CONTENT)
def import_data(
    payload: KanbanExport,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> None:
    # Replace only the current user's data, cascading the delete down to
    # that user's columns and cards before inserting the imported snapshot.
    old_board_ids = {b.id for b in store.boards_for_user(user_id)}
    old_column_ids = {c.id for c in store.columns.values() if c.boardId in old_board_ids}

    for card_id in [c.id for c in store.cards.values() if c.columnId in old_column_ids]:
        del store.cards[card_id]
    for column_id in old_column_ids:
        del store.columns[column_id]
    for board_id in old_board_ids:
        del store.boards[board_id]
        del store.board_owners[board_id]

    for board in payload.boards:
        store.boards[board.id] = board
        store.board_owners[board.id] = user_id
    for column in payload.columns:
        store.columns[column.id] = column
    for card in payload.cards:
        store.cards[card.id] = card
