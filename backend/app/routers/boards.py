from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user_id
from app.models import Board, CreateBoardInput, RenameBoardInput
from app.store import Store, get_store

router = APIRouter(prefix="/boards", tags=["Boards"])


@router.get("", response_model=list[Board])
def list_boards(
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> list[Board]:
    return store.boards_for_user(user_id)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Board)
def create_board(
    payload: CreateBoardInput,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> Board:
    return store.create_board(user_id, payload.name)


@router.patch("/{board_id}", response_model=Board)
def rename_board(
    board_id: str,
    payload: RenameBoardInput,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> Board:
    if not store.owns_board(board_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    board = store.boards[board_id]
    updated = board.model_copy(update={"name": payload.name})
    store.boards[board_id] = updated
    return updated


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_id: str,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> None:
    if not store.owns_board(board_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")

    column_ids = {c.id for c in store.columns.values() if c.boardId == board_id}
    for card_id in [c.id for c in store.cards.values() if c.columnId in column_ids]:
        del store.cards[card_id]
    for column_id in column_ids:
        del store.columns[column_id]

    del store.boards[board_id]
    del store.board_owners[board_id]
