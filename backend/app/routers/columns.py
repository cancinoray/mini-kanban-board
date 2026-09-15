from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user_id
from app.models import Column, CreateColumnInput, RenameColumnInput, ReorderColumnsInput
from app.store import Store, get_store

router = APIRouter(tags=["Columns"])


@router.get("/boards/{board_id}/columns", response_model=list[Column])
def list_columns(
    board_id: str,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> list[Column]:
    if not store.owns_board(board_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return store.columns_for_board(board_id)


@router.post("/boards/{board_id}/columns", status_code=status.HTTP_201_CREATED, response_model=Column)
def create_column(
    board_id: str,
    payload: CreateColumnInput,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> Column:
    if not store.owns_board(board_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return store.create_column(board_id, payload.name)


@router.post("/boards/{board_id}/columns/reorder", response_model=list[Column])
def reorder_columns(
    board_id: str,
    payload: ReorderColumnsInput,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> list[Column]:
    if not store.owns_board(board_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")

    existing = {c.id: c for c in store.columns_for_board(board_id)}
    if set(payload.orderedColumnIds) != set(existing.keys()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="orderedColumnIds must match the board's current columns exactly",
        )

    return store.reorder_columns(board_id, payload.orderedColumnIds)


@router.patch("/columns/{column_id}", response_model=Column)
def rename_column(
    column_id: str,
    payload: RenameColumnInput,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> Column:
    if not store.owns_column(column_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found")
    return store.rename_column(column_id, payload.name)


@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(
    column_id: str,
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> None:
    if not store.owns_column(column_id, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found")

    store.delete_column(column_id)
