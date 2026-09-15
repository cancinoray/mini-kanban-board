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
    return store.rename_board(board_id, payload.name)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(
    board_id: str,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> None:
    if not store.owns_board(board_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")

    store.delete_board(board_id)
