from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import SessionLocal, init_db
from app.errors import install_error_handlers
from app.routers import auth, boards, cards, columns, data
from app.store import seed_if_empty


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Create any missing tables and seed the demo account on first run."""
    init_db()
    with SessionLocal() as session:
        seed_if_empty(session)
    yield


app = FastAPI(title="Mini Kanban Board API", version="1.1.0", lifespan=lifespan)

# The session cookie is a credential, so the frontend's origin has to be named
# explicitly — a wildcard origin with allow_credentials is rejected by browsers.
DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

install_error_handlers(app)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(boards.router)
api_router.include_router(columns.router)
api_router.include_router(cards.router)
api_router.include_router(data.router)

app.include_router(api_router)
