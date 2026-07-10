# India Governance Watch

A dashboard tracking Viksit Bharat policy and administrative developments, published bi-monthly from real PDF/DOCX issue reports. React + Vite frontend, FastAPI + MongoDB backend with a deterministic (no-LLM) ingestion pipeline that parses the source reports into structured policy items.

- **Frontend**: React 19, Vite, Tailwind (`src/`)
- **Backend**: FastAPI, Motor (async MongoDB driver), JWT auth (`backend/`)
- **Database**: MongoDB 7 (local via Docker, or a hosted cluster like Atlas)

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Docker Desktop** (only needed if running via Docker)
- A MongoDB instance — either the local `mongo` service in `docker-compose.yml`, or your own connection string (e.g. MongoDB Atlas)

---

## Option A — Run with Docker (recommended)

Brings up MongoDB, the backend API, and the frontend together.

```bash
# 1. Configure the backend
cp backend/.env.example backend/.env
# edit backend/.env — MONGODB_URI defaults to the local `mongo` service (mongodb://mongo:27017),
# leave it as-is unless you're pointing at your own cluster. Set a real JWT_SECRET.

# 2. Build and start everything
docker compose up --build -d

# 3. Seed ministries + a dev issue placeholder
docker compose run --rm backend python -m app.scripts.seed_dev

# 4. Load real data — upload the sample PDFs via the UI (Login as admin/admin → Upload tab),
#    or from the command line:
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" -d '{"email":"admin","password":"admin"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -X POST http://localhost:8000/api/admin/issues/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@data/India Governance Watch - 1st May to 15th May.pdf"
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000 (interactive docs at `/docs`)
- **Mongo**: `localhost:27017` (local container only)

**Useful commands:**

```bash
docker compose ps                                    # check service health
docker compose logs -f backend                        # tail backend logs
docker compose run --rm backend python -m pytest -q    # run the backend test suite
docker compose down                                    # stop (keeps the mongo volume)
docker compose down -v                                 # stop and wipe all data
```

---

## Option B — Run manually in the terminal (no Docker)

Runs the backend and frontend as plain processes on your machine. Useful for pointing at a remote/Atlas database, or faster iteration without rebuilding images.

### 1. Backend

The backend's Python dependencies are managed with [uv](https://docs.astral.sh/uv/)
in an isolated virtual environment at the **project root** (`.venv/`) —
not inside `backend/`, so the whole repo shares one venv rather than one
nested per component. `pyproject.toml` and `uv.lock` also live at the root.

```bash
# from the project root — creates/updates .venv/ and installs pinned deps
uv sync

cp backend/.env.example backend/.env
# edit backend/.env:
#   - MONGODB_URI: mongodb://localhost:27017 for a local Mongo, or your Atlas connection string
#   - JWT_SECRET: generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`
#   - ADMIN_USERS: email:password pairs, comma-separated (see "Admin credentials" below)

# run the API — --directory makes uv cd into backend/ before running, so
# app.main:app resolves and backend/.env is picked up, while still using
# the root .venv
uv run --directory backend uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`uv sync` reads `pyproject.toml` and installs exactly what's pinned in
`uv.lock` — re-run it after pulling changes that touch dependencies. See
`documentation.md` for the full `uv` command reference (adding a dependency,
recreating the venv from scratch, etc.).

The backend reads `backend/.env` relative to its own working directory,
which is why the command above uses `--directory backend`.

Seed ministries + a dev issue, and load real data, the same way as the
Docker flow but without `docker compose run --rm backend`:

```bash
uv run --directory backend python -m app.scripts.seed_dev
uv run --directory backend python -m app.scripts.backfill_issue "../data/India Governance Watch - 1st May to 15th May.pdf"
```

### 2. Frontend

In a separate terminal, from the project root:

```bash
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

`VITE_API_BASE_URL` must be a URL reachable from your **browser** (not a Docker service name) — `http://localhost:8000` matches the backend command above. If you omit it, `src/api.ts` defaults to `http://localhost:8000` anyway.

Open **http://localhost:3000**.

### Running the backend on a different port

If port 8000 is already in use, pass a different `--port` to `uvicorn` and update `VITE_API_BASE_URL` to match:

```bash
uv run --directory backend uvicorn app.main:app --host 0.0.0.0 --port 8010
# ...and in the other terminal:
VITE_API_BASE_URL=http://localhost:8010 npm run dev
```

---

## Admin credentials

Admin login (needed for the Upload tab and ministry management) is controlled by `ADMIN_USERS` in `backend/.env` — comma-separated `email:password` pairs, synced into the database **on every backend startup**:

```
ADMIN_USERS=admin:admin,editor1:somePassword,editor2:anotherPassword
```

- Add more admins by adding more pairs, then restart the backend.
- Changing an existing pair's password and restarting rotates that admin's password in place (it's not a one-time seed).
- To sync immediately without restarting the server, run from the project root:
  ```bash
  uv run --directory backend python -c "
  import asyncio
  from app.core.db import get_database
  from app.services.admin_sync import sync_env_admins

  async def main():
      count = await sync_env_admins(get_database())
      print(f'Synced {count} admin(s)')

  asyncio.run(main())
  "
  ```

The Login page's on-screen credential hint is static UI text and won't reflect admins added beyond the default `admin`/`admin`.

---

## Environment variables

| File | Purpose |
|---|---|
| `backend/.env.example` | Backend config — Mongo connection, JWT secret, admin credentials, CORS, optional Gemini API key for embeddings |
| `.env.example` (root) | Frontend config — `VITE_API_BASE_URL` for the browser to reach the backend |

`GEMINI_API_KEY` is optional and only powers a background "similar items" embeddings feature — the app works fully without it.

---

## Running tests

```bash
uv run --directory backend python -m pytest -q --cov=app.routers --cov=app.services --cov-report=term-missing
```

Or inside Docker: `docker compose run --rm backend python -m pytest -q`.

---

## Project structure

```
├── src/                  # React frontend
├── backend/
│   ├── app/
│   │   ├── routers/       # FastAPI endpoints
│   │   ├── services/      # ingestion pipeline, parsing, matching, resolvers
│   │   ├── models/         # Pydantic document models
│   │   ├── schemas/         # API request/response shapes
│   │   ├── data/             # ministry seed list, state gazetteer, source URL lookup
│   │   └── scripts/           # seed_dev, backfill_issue, retry_embeddings
│   ├── tests/
│   └── requirements.txt   # pinned deps for the Docker image (pip-based build)
├── data/                  # sample source PDFs
├── pyproject.toml         # backend deps for local dev (uv-based, see Option B above)
├── uv.lock                # locked/pinned versions resolved from pyproject.toml
├── .venv/                 # local dev virtual environment (gitignored, created by `uv sync`)
└── docker-compose.yml
```

`requirements.txt` (used by the Docker build) and `pyproject.toml`/`uv.lock`
(used by local `uv sync`) declare the same dependencies from two different
package managers — keep them in sync by hand if you add/remove a dependency.
