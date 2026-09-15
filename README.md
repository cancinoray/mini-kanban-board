# Punchlist

A personal kanban board — multiple boards, customizable columns, and cards you drag between
them. Quiet and minimal on purpose: it's a tool you open many times a day, so the content
carries the visual weight and the interface gets out of the way.

React + TypeScript frontend, FastAPI backend, one JSON API between them.

## Requirements

- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Node.js and npm

## Quick start

```sh
make install   # uv sync + npm install
make dev       # backend on :8000, frontend on :5173
```

Then open <http://localhost:5173> and sign in with the seeded account:

| Email              | Password |
| ------------------ | -------- |
| `demo@example.com` | `demo`   |

It comes with a few boards and cards already in place. You can also create your own account
from the sign-in page — passwords need at least 8 characters.

`make dev` runs both processes and stops them together on Ctrl-C. They are also available
separately as `make dev-backend` and `make dev-frontend`.

## What it does

- **Boards** — several, switchable from the top bar; create, rename, delete
- **Columns** — add, rename, drag to reorder, delete, per board
- **Cards** — title, description, due date, tags; drag between and within columns
- **Search and filter** — by text, by tag (click one to filter), and by due date
  (overdue / due this week / no due date)
- **Archive** — archive a card instead of deleting it, and restore it from the Archived
  panel. Archiving and deleting both ask for confirmation first
- **Dark mode**
- **Export / import** — a full JSON snapshot of every board, column, and card

## Layout

```
openapi.yaml       the API contract — where the frontend's routes come from
Makefile           every developer command
AGENTS.md          house rules for agents working in this repo
_docs/             product scope, process, and team briefs
backend/
  app/
    main.py        FastAPI app, CORS, mounting the /api router
    auth.py        password hashing, the session cookie, current-user dependencies
    store.py       the in-memory store, and the demo seed
    models.py      pydantic request/response models
    routers/       auth, boards, columns, cards, data
  tests/           pytest suite
frontend/
  src/
    services/      everything that talks to a backend
    store/         zustand stores — auth and kanban
    components/    the UI
    utils/         date helpers, dark mode
```

## How it fits together

**All backend access goes through `src/services`.** Two interfaces define the entire
contract — `AuthService` and `KanbanService` — and each has two implementations: the real
HTTP clients (`HttpAuthService`, `HttpKanbanService`) and a localStorage/mock pair the tests
use. Changing what sits underneath changes nothing above it: the stores and components only
ever see the interfaces. `services/index.ts` holds the single instances everything goes
through.

**The session is an httpOnly cookie.** The frontend keeps no credentials of its own —
`getCurrentUser()` is essentially "does the cookie still work?". Every board route needs the
session, so a 401 there means the backend has stopped recognising it; when that happens the
app returns to sign-in and says why, rather than leaving you on a board that can no longer
save.

**The dev server proxies `/api` to the backend.** See `vite.config.ts`. This is not just
convenience: the session cookie is `SameSite=Lax`, so a genuinely cross-origin call would be
sent _without_ it and every request would come back 401. Sharing an origin through the proxy
sidesteps that entirely.

## Commands

Everything is wrapped in the `Makefile`; run `make` or `make help` to list it.

| Command              | What it does                              |
| -------------------- | ----------------------------------------- |
| `make install`       | Install backend and frontend dependencies |
| `make dev`           | Run backend and frontend together         |
| `make dev-backend`   | FastAPI dev server with reload            |
| `make dev-frontend`  | Vite dev server                           |
| `make test`          | Run all tests                             |
| `make test-backend`  | Backend tests (pytest)                    |
| `make test-frontend` | Frontend tests (vitest)                   |
| `make lint`          | Lint the frontend (oxlint)                |
| `make typecheck`     | Type-check the frontend (tsc)             |
| `make build`         | Build the frontend for production         |
| `make check`         | Lint, type-check, and test everything     |
| `make clean`         | Remove build output and caches            |

## Configuration

| Variable               | Where               | Default                 | Purpose                                                 |
| ---------------------- | ------------------- | ----------------------- | ------------------------------------------------------- |
| `VITE_API_TARGET`      | frontend dev server | `http://127.0.0.1:8000` | where the dev server proxies `/api` to                  |
| `API_PORT`             | Makefile            | `8000`                  | port the dev backend listens on                         |
| `KANBAN_COOKIE_SECURE` | backend             | off                     | set to `1` over HTTPS so the session cookie is `Secure` |

## API

`openapi.yaml` is the contract (v1.1.0), and the frontend's routes were written against it.
Every route lives under `/api`, and everything except the auth endpoints requires a session.
When the server is running, FastAPI also serves browsable docs at `/docs` and the raw schema
at `/openapi.json`.

## Tests

`make test` runs both suites. Neither needs a running server or a database: the backend
drives the app in-process, and the frontend tests either inject the mock services or stub
`fetch`.

## Data

The backend keeps everything in memory, so restarting it loses every board. Export to JSON
from the top bar before you stop it, and import to bring it back. Durable storage is not
implemented yet.

## Documentation

- `_docs/plan.md` — product scope and the frontend design brief
- `_docs/process.md` — how work is organized, and the role briefs in `_docs/team/`
- `AGENTS.md` — conventions for agents working in this repo
