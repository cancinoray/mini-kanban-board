from __future__ import annotations

import re
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

# Deliberately not pydantic's EmailStr: that needs the extra email-validator
# dependency, and this mirrors the check the frontend already makes.
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_email(email: str) -> str:
    """Emails are case-insensitive: Ray@Example.com and ray@example.com are one account."""
    return email.strip().lower()


def _valid_email(value: str) -> str:
    email = normalize_email(value)
    if not EMAIL_PATTERN.match(email):
        raise ValueError("value is not a valid email address")
    return email


# Registration checks the format (a 422 the spec documents); sign-in does not,
# so a malformed email is just another credential that does not match.
Email = Annotated[str, AfterValidator(_valid_email)]


class Board(BaseModel):
    id: str
    name: str
    order: int


class Column(BaseModel):
    id: str
    boardId: str
    name: str
    order: int


class Card(BaseModel):
    id: str
    columnId: str
    title: str
    description: str
    dueDate: datetime | None
    tags: list[str]
    order: int
    archived: bool


class NewCardInput(BaseModel):
    title: str
    description: str = ""
    dueDate: datetime | None = None
    tags: list[str] = Field(default_factory=list)


class UpdateCardInput(BaseModel):
    title: str | None = None
    description: str | None = None
    dueDate: datetime | None = None
    tags: list[str] | None = None
    archived: bool | None = None


class CreateBoardInput(BaseModel):
    name: str


class RenameBoardInput(BaseModel):
    name: str


class CreateColumnInput(BaseModel):
    name: str


class RenameColumnInput(BaseModel):
    name: str


class ReorderColumnsInput(BaseModel):
    orderedColumnIds: list[str]


class MoveCardInput(BaseModel):
    toColumnId: str
    toIndex: int = Field(ge=0)


class KanbanExport(BaseModel):
    boards: list[Board]
    columns: list[Column]
    cards: list[Card]
    exportedAt: datetime


class RegisterInput(BaseModel):
    name: str
    email: Email
    password: str = Field(min_length=8)


class LoginInput(BaseModel):
    email: str
    password: str


class AuthUser(BaseModel):
    """The account as the frontend sees it. Never carries the password hash."""

    id: str
    name: str
    email: str
