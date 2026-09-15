from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from app.models import Board, Card, Column, normalize_email


def new_id() -> str:
    return uuid.uuid4().hex


@dataclass
class User:
    id: str
    name: str
    email: str
    hashed_password: str


@dataclass
class Store:
    """In-memory data store. One instance per running app (or per test)."""

    users: dict[str, User] = field(default_factory=dict)
    users_by_email: dict[str, str] = field(default_factory=dict)
    sessions: dict[str, str] = field(default_factory=dict)

    boards: dict[str, Board] = field(default_factory=dict)
    columns: dict[str, Column] = field(default_factory=dict)
    cards: dict[str, Card] = field(default_factory=dict)
    board_owners: dict[str, str] = field(default_factory=dict)

    # --- accounts ----------------------------------------------------------

    def user_by_email(self, email: str) -> User | None:
        user_id = self.users_by_email.get(normalize_email(email))
        return self.users.get(user_id) if user_id else None

    def create_user(self, name: str, email: str, hashed_password: str) -> User:
        user = User(
            id=new_id(),
            name=name,
            email=normalize_email(email),
            hashed_password=hashed_password,
        )
        self.users[user.id] = user
        self.users_by_email[user.email] = user.id
        return user

    # --- ownership helpers -------------------------------------------------

    def owns_board(self, board_id: str, user_id: str) -> bool:
        return self.board_owners.get(board_id) == user_id

    def owns_column(self, column_id: str, user_id: str) -> bool:
        column = self.columns.get(column_id)
        return column is not None and self.owns_board(column.boardId, user_id)

    def owns_card(self, card_id: str, user_id: str) -> bool:
        card = self.cards.get(card_id)
        return card is not None and self.owns_column(card.columnId, user_id)

    def boards_for_user(self, user_id: str) -> list[Board]:
        boards = [b for b in self.boards.values() if self.owns_board(b.id, user_id)]
        return sorted(boards, key=lambda b: b.order)

    def columns_for_board(self, board_id: str) -> list[Column]:
        columns = [c for c in self.columns.values() if c.boardId == board_id]
        return sorted(columns, key=lambda c: c.order)

    def cards_for_board(self, board_id: str) -> list[Card]:
        column_ids = {c.id for c in self.columns.values() if c.boardId == board_id}
        cards = [c for c in self.cards.values() if c.columnId in column_ids]
        return sorted(cards, key=lambda c: c.order)

    def cards_for_column(self, column_id: str) -> list[Card]:
        cards = [c for c in self.cards.values() if c.columnId == column_id]
        return sorted(cards, key=lambda c: c.order)

    def cards_for_user(self, user_id: str) -> list[Card]:
        board_ids = {b.id for b in self.boards_for_user(user_id)}
        column_ids = {c.id for c in self.columns.values() if c.boardId in board_ids}
        return [c for c in self.cards.values() if c.columnId in column_ids]

    # --- factory helpers -----------------------------------------------

    def create_board(self, user_id: str, name: str) -> Board:
        board = Board(id=new_id(), name=name, order=len(self.boards_for_user(user_id)))
        self.boards[board.id] = board
        self.board_owners[board.id] = user_id
        return board

    def create_column(self, board_id: str, name: str) -> Column:
        column = Column(
            id=new_id(),
            boardId=board_id,
            name=name,
            order=len(self.columns_for_board(board_id)),
        )
        self.columns[column.id] = column
        return column

    def create_card(
        self,
        column_id: str,
        title: str,
        description: str = "",
        due_date: datetime | None = None,
        tags: list[str] | None = None,
        archived: bool = False,
    ) -> Card:
        card = Card(
            id=new_id(),
            columnId=column_id,
            title=title,
            description=description,
            dueDate=due_date,
            tags=tags or [],
            order=len(self.cards_for_column(column_id)),
            archived=archived,
        )
        self.cards[card.id] = card
        return card


def seed(store: Store) -> None:
    """Seed a demo user with sample boards/columns/cards, matching the
    frontend's design brief (Work / Doing / Done)."""
    demo = store.create_user(
        name="Demo",
        email="demo@example.com",
        hashed_password=_seed_password_hash(),
    )

    now = datetime.now(timezone.utc)

    work = store.create_board(demo.id, "Work")
    personal = store.create_board(demo.id, "Personal")

    todo = store.create_column(work.id, "To Do")
    doing = store.create_column(work.id, "Doing")
    done = store.create_column(work.id, "Done")

    store.create_card(
        todo.id,
        "Write project proposal",
        description="Draft the initial scope and share with the team.",
        due_date=now + timedelta(days=3),
        tags=["writing"],
    )
    store.create_card(
        todo.id,
        "Review pull requests",
        tags=["code-review"],
    )
    store.create_card(
        doing.id,
        "Implement authentication",
        description="Hash passwords and keep the session in a cookie.",
        due_date=now + timedelta(days=1),
        tags=["backend"],
    )
    store.create_card(
        done.id,
        "Set up project scaffolding",
        archived=False,
        tags=["setup"],
    )

    backlog = store.create_column(personal.id, "Backlog")
    store.create_card(backlog.id, "Plan weekend trip", tags=["personal"])


def _seed_password_hash() -> str:
    # Lazily import to avoid a circular import between auth <-> store.
    from app.auth import hash_password

    return hash_password("demo")


_default_store: Store | None = None


def get_store() -> Store:
    """FastAPI dependency. Overridden in tests to isolate state."""
    global _default_store
    if _default_store is None:
        _default_store = Store()
        seed(_default_store)
    return _default_store
