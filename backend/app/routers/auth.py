from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth import (
    COOKIE_SECURE,
    SESSION_COOKIE,
    generate_session_id,
    get_current_session_id,
    get_current_user_id,
    hash_password,
    verify_password,
)
from app.models import AuthUser, LoginInput, RegisterInput
from app.store import Store, User, get_store

router = APIRouter(prefix="/auth", tags=["Auth"])


def to_auth_user(user: User) -> AuthUser:
    return AuthUser(id=user.id, name=user.name, email=user.email)


def start_session(response: Response, store: Store, user_id: str) -> None:
    session_id = generate_session_id()
    store.sessions[session_id] = user_id
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_id,
        path="/",
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=AuthUser)
def register(
    payload: RegisterInput,
    response: Response,
    store: Store = Depends(get_store),
) -> AuthUser:
    if store.user_by_email(payload.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this email",
        )

    user = store.create_user(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    start_session(response, store, user.id)
    return to_auth_user(user)


@router.post("/login", response_model=AuthUser)
def login(
    payload: LoginInput,
    response: Response,
    store: Store = Depends(get_store),
) -> AuthUser:
    user = store.user_by_email(payload.email)
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect",
        )

    start_session(response, store, user.id)
    return to_auth_user(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    session_id: str = Depends(get_current_session_id),
    store: Store = Depends(get_store),
) -> None:
    store.sessions.pop(session_id, None)
    response.delete_cookie(key=SESSION_COOKIE, path="/")


@router.get("/me", response_model=AuthUser)
def read_current_user(
    user_id: str = Depends(get_current_user_id),
    store: Store = Depends(get_store),
) -> AuthUser:
    return to_auth_user(store.users[user_id])
