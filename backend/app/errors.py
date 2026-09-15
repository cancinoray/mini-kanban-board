from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


def validation_message(exc: RequestValidationError) -> str:
    """Turn a validation error into the one line the frontend shows the user."""
    errors = exc.errors()
    if not errors:
        return "The request is not valid"
    first = errors[0]
    location = ".".join(str(part) for part in first["loc"] if part != "body")
    return f"{location}: {first['msg']}" if location else first["msg"]


def install_error_handlers(app: FastAPI) -> None:
    """Render every error as {"message": ...}, per the spec's Error schema,
    instead of FastAPI's default {"detail": ...}."""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"message": str(exc.detail)},
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"message": validation_message(exc)},
        )
