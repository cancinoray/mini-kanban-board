from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import Depends
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.database import get_session
from app.models import Board, Card, Column, KanbanExport, normalize_email
from app.tables import BoardRow, CardRow, ColumnRow, SessionRow, UserRow


def new_id() -> str:
    return uuid.uuid4().hex


@dataclass
class User:
    id: str
    name: str
    email: str
    hashed_password: str


def _as_utc(value: datetime | None) -> datetime | None:
    """SQLite drops timezone info; other engines keep it. Normalize on read so
    the API always reports UTC-aware timestamps."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _to_user(row: UserRow) -> User:
    return User(id=row.id, name=row.name, email=row.email, hashed_password=row.hashed_password)


def _to_board(row: BoardRow) -> Board:
    return Board(id=row.id, name=row.name, order=row.position)


def _to_column(row: ColumnRow) -> Column:
    return Column(id=row.id, boardId=row.board_id, name=row.name, order=row.position)


def _to_card(row: CardRow) -> Card:
    return Card(
        id=row.id,
        columnId=row.column_id,
        title=row.title,
        description=row.description,
        dueDate=_as_utc(row.due_date),
        tags=list(row.tags),
        order=row.position,
        archived=row.archived,
    )


# Request-model field names -> ORM attribute names (only `dueDate` differs).
_CARD_FIELDS = {
    "title": "title",
    "description": "description",
    "dueDate": "due_date",
    "tags": "tags",
    "archived": "archived",
}


class Store:
    """Database-backed data store. One instance per request, wrapping a
    SQLAlchemy session; every mutating method commits before returning."""

    def __init__(self, session: Session) -> None:
        self._session = session

    # --- accounts ----------------------------------------------------------

    def user_by_email(self, email: str) -> User | None:
        row = self._session.scalar(
            select(UserRow).where(UserRow.email == normalize_email(email))
        )
        return _to_user(row) if row is not None else None

    def get_user(self, user_id: str) -> User | None:
        row = self._session.get(UserRow, user_id)
        return _to_user(row) if row is not None else None

    def create_user(self, name: str, email: str, hashed_password: str) -> User:
        row = UserRow(
            id=new_id(),
            name=name,
            email=normalize_email(email),
            hashed_password=hashed_password,
        )
        self._session.add(row)
        self._session.commit()
        return _to_user(row)

    # --- sessions ----------------------------------------------------------

    def create_session(self, session_id: str, user_id: str) -> None:
        self._session.add(SessionRow(id=session_id, user_id=user_id))
        self._session.commit()

    def session_user_id(self, session_id: str) -> str | None:
        row = self._session.get(SessionRow, session_id)
        return row.user_id if row is not None else None

    def delete_session(self, session_id: str) -> None:
        self._session.execute(delete(SessionRow).where(SessionRow.id == session_id))
        self._session.commit()

    # --- ownership helpers -------------------------------------------------

    def owns_board(self, board_id: str, user_id: str) -> bool:
        return (
            self._session.scalar(
                select(BoardRow.id).where(
                    BoardRow.id == board_id, BoardRow.owner_id == user_id
                )
            )
            is not None
        )

    def owns_column(self, column_id: str, user_id: str) -> bool:
        return (
            self._session.scalar(
                select(ColumnRow.id)
                .join(BoardRow, ColumnRow.board_id == BoardRow.id)
                .where(ColumnRow.id == column_id, BoardRow.owner_id == user_id)
            )
            is not None
        )

    def owns_card(self, card_id: str, user_id: str) -> bool:
        return (
            self._session.scalar(
                select(CardRow.id)
                .join(ColumnRow, CardRow.column_id == ColumnRow.id)
                .join(BoardRow, ColumnRow.board_id == BoardRow.id)
                .where(CardRow.id == card_id, BoardRow.owner_id == user_id)
            )
            is not None
        )

    # --- queries -----------------------------------------------------------

    def boards_for_user(self, user_id: str) -> list[Board]:
        rows = self._session.scalars(
            select(BoardRow)
            .where(BoardRow.owner_id == user_id)
            .order_by(BoardRow.position)
        ).all()
        return [_to_board(row) for row in rows]

    def columns_for_board(self, board_id: str) -> list[Column]:
        rows = self._session.scalars(
            select(ColumnRow)
            .where(ColumnRow.board_id == board_id)
            .order_by(ColumnRow.position)
        ).all()
        return [_to_column(row) for row in rows]

    def cards_for_board(self, board_id: str) -> list[Card]:
        rows = self._session.scalars(
            select(CardRow)
            .join(ColumnRow, CardRow.column_id == ColumnRow.id)
            .where(ColumnRow.board_id == board_id)
            .order_by(CardRow.position)
        ).all()
        return [_to_card(row) for row in rows]

    def cards_for_column(self, column_id: str) -> list[Card]:
        return [_to_card(row) for row in self._card_rows_for_column(column_id)]

    def cards_for_user(self, user_id: str) -> list[Card]:
        rows = self._session.scalars(
            select(CardRow)
            .join(ColumnRow, CardRow.column_id == ColumnRow.id)
            .join(BoardRow, ColumnRow.board_id == BoardRow.id)
            .where(BoardRow.owner_id == user_id)
            .order_by(CardRow.position)
        ).all()
        return [_to_card(row) for row in rows]

    def _card_rows_for_column(self, column_id: str) -> list[CardRow]:
        return list(
            self._session.scalars(
                select(CardRow)
                .where(CardRow.column_id == column_id)
                .order_by(CardRow.position)
            ).all()
        )

    # --- board mutations ---------------------------------------------------

    def create_board(self, user_id: str, name: str) -> Board:
        row = BoardRow(
            id=new_id(),
            owner_id=user_id,
            name=name,
            position=self._next_position(BoardRow, BoardRow.owner_id == user_id),
        )
        self._session.add(row)
        self._session.commit()
        return _to_board(row)

    def rename_board(self, board_id: str, name: str) -> Board:
        row = self._session.get(BoardRow, board_id)
        assert row is not None
        row.name = name
        self._session.commit()
        return _to_board(row)

    def delete_board(self, board_id: str) -> None:
        column_ids = list(
            self._session.scalars(
                select(ColumnRow.id).where(ColumnRow.board_id == board_id)
            ).all()
        )
        if column_ids:
            self._session.execute(
                delete(CardRow).where(CardRow.column_id.in_(column_ids))
            )
            self._session.execute(
                delete(ColumnRow).where(ColumnRow.id.in_(column_ids))
            )
        self._session.execute(delete(BoardRow).where(BoardRow.id == board_id))
        self._session.commit()

    # --- column mutations --------------------------------------------------

    def create_column(self, board_id: str, name: str) -> Column:
        row = ColumnRow(
            id=new_id(),
            board_id=board_id,
            name=name,
            position=self._next_position(ColumnRow, ColumnRow.board_id == board_id),
        )
        self._session.add(row)
        self._session.commit()
        return _to_column(row)

    def rename_column(self, column_id: str, name: str) -> Column:
        row = self._session.get(ColumnRow, column_id)
        assert row is not None
        row.name = name
        self._session.commit()
        return _to_column(row)

    def reorder_columns(self, board_id: str, ordered_column_ids: list[str]) -> list[Column]:
        rows = {
            row.id: row
            for row in self._session.scalars(
                select(ColumnRow).where(ColumnRow.board_id == board_id)
            ).all()
        }
        for index, column_id in enumerate(ordered_column_ids):
            rows[column_id].position = index
        self._session.commit()
        return self.columns_for_board(board_id)

    def delete_column(self, column_id: str) -> None:
        self._session.execute(delete(CardRow).where(CardRow.column_id == column_id))
        self._session.execute(delete(ColumnRow).where(ColumnRow.id == column_id))
        self._session.commit()

    # --- card mutations ----------------------------------------------------

    def create_card(
        self,
        column_id: str,
        title: str,
        description: str = "",
        due_date: datetime | None = None,
        tags: list[str] | None = None,
        archived: bool = False,
    ) -> Card:
        row = CardRow(
            id=new_id(),
            column_id=column_id,
            title=title,
            description=description,
            due_date=due_date,
            tags=tags or [],
            position=self._next_position(CardRow, CardRow.column_id == column_id),
            archived=archived,
        )
        self._session.add(row)
        self._session.commit()
        return _to_card(row)

    def update_card(self, card_id: str, updates: dict[str, object]) -> Card:
        row = self._session.get(CardRow, card_id)
        assert row is not None
        for field, value in updates.items():
            setattr(row, _CARD_FIELDS[field], value)
        self._session.commit()
        return _to_card(row)

    def delete_card(self, card_id: str) -> None:
        self._session.execute(delete(CardRow).where(CardRow.id == card_id))
        self._session.commit()

    def move_card(self, card_id: str, to_column_id: str, to_index: int) -> list[Card]:
        card = self._session.get(CardRow, card_id)
        assert card is not None
        source_column_id = card.column_id

        dest_rows = [
            row for row in self._card_rows_for_column(to_column_id) if row.id != card_id
        ]
        index = max(0, min(to_index, len(dest_rows)))
        dest_rows.insert(index, card)

        source_rows: list[CardRow] = []
        if source_column_id != to_column_id:
            source_rows = [
                row
                for row in self._card_rows_for_column(source_column_id)
                if row.id != card_id
            ]

        for position, row in enumerate(dest_rows):
            row.column_id = to_column_id
            row.position = position
        for position, row in enumerate(source_rows):
            row.position = position
        self._session.commit()

        ordered = source_rows + dest_rows if source_column_id != to_column_id else dest_rows
        return [_to_card(row) for row in ordered]

    # --- bulk import -------------------------------------------------------

    def replace_user_data(self, user_id: str, payload: KanbanExport) -> None:
        """Replace only the current user's data, cascading the delete down to
        that user's columns and cards before inserting the imported snapshot."""
        board_ids = list(
            self._session.scalars(
                select(BoardRow.id).where(BoardRow.owner_id == user_id)
            ).all()
        )
        if board_ids:
            column_ids = list(
                self._session.scalars(
                    select(ColumnRow.id).where(ColumnRow.board_id.in_(board_ids))
                ).all()
            )
            if column_ids:
                self._session.execute(
                    delete(CardRow).where(CardRow.column_id.in_(column_ids))
                )
                self._session.execute(
                    delete(ColumnRow).where(ColumnRow.id.in_(column_ids))
                )
            self._session.execute(delete(BoardRow).where(BoardRow.id.in_(board_ids)))

        for board in payload.boards:
            self._session.add(
                BoardRow(
                    id=board.id,
                    owner_id=user_id,
                    name=board.name,
                    position=board.order,
                )
            )
        for column in payload.columns:
            self._session.add(
                ColumnRow(
                    id=column.id,
                    board_id=column.boardId,
                    name=column.name,
                    position=column.order,
                )
            )
        for card in payload.cards:
            self._session.add(
                CardRow(
                    id=card.id,
                    column_id=card.columnId,
                    title=card.title,
                    description=card.description,
                    due_date=card.dueDate,
                    tags=card.tags,
                    position=card.order,
                    archived=card.archived,
                )
            )
        self._session.commit()

    # --- internals ---------------------------------------------------------

    def _next_position(self, model: type, *filters: ColumnElement[bool]) -> int:
        count = self._session.scalar(
            select(func.count()).select_from(model).where(*filters)
        )
        return int(count or 0)


def seed_if_empty(session: Session) -> None:
    """Seed the demo account once, on a database that has no users yet."""
    if session.scalar(select(UserRow.id).limit(1)) is not None:
        return
    seed(Store(session))


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


def get_store(session: Session = Depends(get_session)) -> Store:
    """FastAPI dependency. Tests override `get_session` to isolate state."""
    return Store(session)
