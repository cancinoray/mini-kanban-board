from __future__ import annotations

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.errors import install_error_handlers
from app.routers import auth, boards, cards, columns, data

app = FastAPI(title="Mini Kanban Board API", version="1.1.0")

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
