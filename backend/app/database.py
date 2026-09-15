from __future__ import annotations

import os
from collections.abc import Iterator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Which database the server connects to. SQLAlchemy URLs make this
# database-agnostic: the default is SQLite, but any SQLAlchemy dialect works
# (e.g. postgresql+psycopg://user:pass@host/db). Nothing below assumes SQLite.
DEFAULT_DATABASE_URL = "sqlite:///./kanban.db"

DATABASE_URL_ENV = "KANBAN_DATABASE_URL"


def database_url() -> str:
    return os.environ.get(DATABASE_URL_ENV, DEFAULT_DATABASE_URL)


def create_db_engine(url: str | None = None) -> Engine:
    """Build an engine for `url` (or the configured database).

    Only the SQLite dialect needs special handling: its connections are bound
    to the thread that created them, and FastAPI runs sync endpoints on a
    threadpool. An in-memory database also needs a shared pool, otherwise each
    connection would see a different, empty database.
    """
    url = url or database_url()
    options: dict[str, object] = {}
    if url.startswith("sqlite"):
        options["connect_args"] = {"check_same_thread": False}
        if ":memory:" in url or url.endswith("://"):
            options["poolclass"] = StaticPool
    return create_engine(url, **options)


class Base(DeclarativeBase):
    pass


engine = create_db_engine()
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db(target_engine: Engine | None = None) -> None:
    """Create any missing tables. Safe to call on every start."""
    Base.metadata.create_all(target_engine or engine)


def get_session() -> Iterator[Session]:
    """FastAPI dependency. Commits are made explicitly by the store, so this
    only has to guarantee the session is closed when the request ends."""
    with SessionLocal() as session:
        yield session
