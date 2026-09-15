Documents

- `_docs/plan.md` - product scope
- `_docs/backlog.md` - task breakdown and dependencies
- `_docs/process.md` - how work is organized
- Before writing tests, read `_docs/testing-guidelines.md`
- For anything touching the UI, read `_docs/design-system.md`
- For anything touching a URL route or view, read `_docs/api.md`

Rules

- Dependencies are added in `pyproject.toml` (via `uv add`, dev tools under
  `[dependency-groups] dev`). Do not add one without asking.
- Tests live in each app's `tests.py` (e.g. `chores/tests.py`); `test_*.py` is
  also collected.

for backend, use uv for dependency management. a few useful commands:

uv sync
uv add <PACKAGE-NAME>
uv run python <PYTHON-FILE>

regularly commit code to git
