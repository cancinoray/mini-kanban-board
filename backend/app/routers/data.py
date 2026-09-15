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
    store.replace_user_data(user_id, payload)
