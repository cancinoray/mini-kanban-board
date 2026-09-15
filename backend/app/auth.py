from __future__ import annotations

import os
import secrets

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyCookie

from app.store import Store, get_store

SESSION_COOKIE = "session"

# scheme_name makes the generated OpenAPI expose this exactly as the spec's
# `sessionCookie` scheme. auto_error is off so this module owns the 401 body.
session_cookie = APIKeyCookie(name=SESSION_COOKIE, scheme_name="sessionCookie", auto_error=False)

# Left off by default so the API works over plain http in local development.
# Set KANBAN_COOKIE_SECURE=1 wherever the API is served over HTTPS.
COOKIE_SECURE = os.environ.get("KANBAN_COOKIE_SECURE", "").lower() in {"1", "true", "yes"}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def generate_session_id() -> str:
    return secrets.token_urlsafe(32)


def get_current_session_id(
    session_id: str | None = Depends(session_cookie),
    store: Store = Depends(get_store),
) -> str:
    if not session_id or store.session_user_id(session_id) is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No active session")
    return session_id


def get_current_user_id(
    session_id: str = Depends(get_current_session_id),
    store: Store = Depends(get_store),
) -> str:
    user_id = store.session_user_id(session_id)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No active session")
    return user_id
