# India Governance Watch

A dashboard tracking Viksit Bharat policy and administrative developments, published bi-monthly from real PDF issue reports. React + Vite frontend, FastAPI + MongoDB backend with a deterministic (no-LLM) ingestion pipeline that parses the source reports into structured policy items.

- **Frontend**: React 19, Vite, Tailwind (`frontend/`)
- **Backend**: FastAPI, Motor (async MongoDB driver), JWT auth (`backend/`)
- **Database**: MongoDB 7 (local via Docker, or a hosted cluster like Atlas)

**Live deployment (Fly.io):**
- Frontend: https://india-governance-watch.fly.dev
- Backend API: https://india-governance-watch-api.fly.dev (`/docs` for interactive API docs)

See [Deploy to Fly.io](#deploy-to-flyio-production) below for redeploy commands, and [Operations reference](#operations-reference) for a general Docker/uv/Fly cheat sheet.

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

# 4. Load real data — upload a real issue PDF via the UI (Login as admin/admin → Upload tab),
#    or from the command line:
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" -d '{"email":"admin","password":"admin"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -X POST http://localhost:8000/api/admin/issues/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/your-issue.pdf"
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

The backend's Python dependencies are managed with [uv](https://docs.astral.sh/uv/), declared in `backend/pyproject.toml` and locked in `backend/uv.lock`. The virtual environment itself lives at the **project root** (`.venv/`), not nested inside `backend/` — one shared venv for the whole repo, pointed at explicitly via `UV_PROJECT_ENVIRONMENT` since `backend/pyproject.toml` isn't at the root.

```bash
# from backend/ — creates/updates the root .venv/ and installs pinned deps
cd backend
UV_PROJECT_ENVIRONMENT=../.venv uv sync

cp .env.example .env
# edit backend/.env:
#   - MONGODB_URI: mongodb://localhost:27017 for a local Mongo, or your Atlas connection string
#   - JWT_SECRET: generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`
#   - ADMIN_USERS: email:password pairs, comma-separated (see "Admin credentials" below)

# run the API (still from backend/) — uses the root .venv via UV_PROJECT_ENVIRONMENT
UV_PROJECT_ENVIRONMENT=../.venv uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`uv sync` reads `pyproject.toml` and installs exactly what's pinned in `uv.lock` — re-run it after pulling changes that touch dependencies. See [Operations reference](#uv--fast-python-package-manager) for the full `uv` command reference (adding a dependency, recreating the venv from scratch, etc.).

Seed ministries + a dev issue, and load real data, the same way as the Docker flow but without `docker compose run --rm backend`:

```bash
UV_PROJECT_ENVIRONMENT=../.venv uv run python -m app.scripts.seed_dev
UV_PROJECT_ENVIRONMENT=../.venv uv run python -m app.scripts.backfill_issue "/path/to/your-issue.pdf"
```

### 2. Frontend

In a separate terminal:

```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

`VITE_API_BASE_URL` must be a URL reachable from your **browser** (not a Docker service name) — `http://localhost:8000` matches the backend command above. If you omit it, `frontend/src/api.ts` defaults to `http://localhost:8000` anyway.

Open **http://localhost:3000**.

### Running the backend on a different port

If port 8000 is already in use, pass a different `--port` to `uvicorn` and update `VITE_API_BASE_URL` to match:

```bash
UV_PROJECT_ENVIRONMENT=../.venv uv run uvicorn app.main:app --host 0.0.0.0 --port 8010
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
- To sync immediately without restarting the server, run from `backend/`:
  ```bash
  UV_PROJECT_ENVIRONMENT=../.venv uv run python -c "
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
| `backend/.env.example` | Backend config — Mongo connection, JWT secret, admin credentials, CORS |
| `frontend/.env` | Frontend config — `VITE_API_BASE_URL` for the browser to reach the backend |

---

## Running tests

```bash
cd backend
UV_PROJECT_ENVIRONMENT=../.venv uv run python -m pytest -q --cov=app.routers --cov=app.services --cov-report=term-missing
```

Or inside Docker: `docker compose run --rm backend python -m pytest -q`.

---

## Project structure

```
├── frontend/                # React + Vite SPA
│   ├── src/
│   ├── package.json
│   ├── Dockerfile.frontend       # dev container
│   ├── Dockerfile.frontend.prod  # nginx-served prod build
│   ├── nginx.conf
│   ├── fly.toml                  # deploys the frontend Fly app
│   └── firebase.json             # alternate static-hosting target
├── backend/
│   ├── app/
│   │   ├── routers/       # FastAPI endpoints
│   │   ├── services/      # ingestion pipeline, parsing, matching, resolvers
│   │   ├── models/        # Pydantic document models
│   │   ├── schemas/       # API request/response shapes
│   │   ├── data/          # ministry seed list, source URL lookup
│   │   └── scripts/       # seed_dev, backfill_issue
│   ├── tests/
│   ├── requirements.txt   # pinned deps for the Docker image (pip-based build)
│   ├── pyproject.toml     # backend deps for local dev (uv-based, see Option B above)
│   ├── uv.lock            # locked/pinned versions resolved from pyproject.toml
│   └── fly.toml           # deploys the backend Fly app
├── .venv/                 # shared local dev virtual environment (gitignored, created by `uv sync`)
└── docker-compose.yml
```

`backend/requirements.txt` (used by the Docker build) and `backend/pyproject.toml`/`uv.lock` (used by local `uv sync`) declare the same dependencies from two different package managers — keep them in sync by hand if you add/remove a dependency.

---

## Operations reference

Command reference for operating this project from the terminal. Commands are written for Git Bash / a POSIX-style shell on Windows; Windows-native commands (`taskkill`, `netstat`) work the same from Git Bash, PowerShell, or cmd.

### Rebuild after code changes

Docker images are a **snapshot** taken at build time — editing files on your host does *not* change a running container (except the frontend, which runs `vite dev` and hot-reloads). After changing backend code, or anything in the frontend's `Dockerfile.frontend`/`package.json`, rebuild:

```bash
docker compose build backend            # rebuild just the backend image
docker compose build frontend           # rebuild just the frontend image
docker compose up -d backend frontend   # recreate containers from the new images

# or, do both in one shot:
docker compose up --build -d
```

A **clean rebuild from scratch** (confirms nothing is relying on leftover state):

```bash
docker compose down -v
docker compose up --build -d
```

### Finding and killing whatever's on a port

A server process started outside Docker (`npm run dev`, `uvicorn`, ...) keeps running until you kill it directly — stopping/restarting Docker, closing a terminal tab, or even a reboot of WSL doesn't necessarily clean it up if it was backgrounded (`nohup ... &`, `&disown`).

**Windows (netstat + taskkill) — works from Git Bash, PowerShell, or cmd:**

```bash
netstat -ano | grep ":3000"          # find what's listening on port 3000
# rightmost column is the PID, e.g.:
#   TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    60292
taskkill //F //PID 60292              # force-kill it
```

(Note the double slashes `//F //PID` — Git Bash rewrites single-slash flags as Windows paths, which breaks native Windows commands. Use `//` or run the same command from `cmd.exe`/PowerShell with single slashes: `taskkill /F /PID 60292`.)

**PowerShell native equivalent:**

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
Stop-Process -Id 60292 -Force
```

**macOS / Linux:**

```bash
lsof -i :3000                 # find the PID on port 3000
kill -9 <PID>                 # force-kill it
# or in one line:
kill -9 $(lsof -t -i :3000)
```

### Docker Compose

```bash
docker compose up                  # foreground, build if needed
docker compose up -d                # detached (background)
docker compose up --build -d         # force rebuild images first
docker compose up -d <service>        # start just one service (and its dependencies)

docker compose down                    # stop + remove containers (volumes kept)
docker compose down -v                  # also delete named volumes (full data wipe)

docker compose build <service>           # rebuild one image without starting it
docker compose restart <service>          # restart a service without rebuilding (won't pick up code baked in via COPY)

docker compose ps                          # list services + health status
docker compose logs -f <service>            # follow logs (Ctrl+C to stop watching, doesn't stop the container)

docker compose exec <service> <cmd>          # run a command inside an already-running container
docker compose run --rm <service> <cmd>       # spin up a one-off container, run a command, remove it after
```

**Common gotchas:**
- Editing source files does **not** affect a running container unless that service bind-mounts the source directory or is running a dev server that watches the filesystem inside the container. A `Dockerfile` with `COPY . .` bakes a snapshot in at *build* time — you must rebuild.
- `docker compose down` does not remove named volumes by default — your database survives a `down`/`up` cycle. Use `-v` when you explicitly want a clean slate.
- If a container can't bind a port ("port is already allocated"), something else already holds it — see the port-killing section above.

### `uv` — fast Python package manager

[uv](https://docs.astral.sh/uv/) replaces `venv` + `pip` + `pip-tools` with one fast, single binary. This project's backend deps are declared in `backend/pyproject.toml` and locked in `backend/uv.lock`, but the venv itself lives at the repo root — always set `UV_PROJECT_ENVIRONMENT=../.venv` when running `uv` commands from `backend/` (or `UV_PROJECT_ENVIRONMENT="$(pwd)/.venv" uv ... --project backend` from the repo root).

```bash
uv sync                          # create/update .venv from pyproject.toml + uv.lock,
                                   # installing the "dev" dependency group too by default
uv sync --no-dev                  # install only production deps, skip pytest/etc.
uv sync --frozen                   # install exactly what's in uv.lock, don't re-resolve
                                     # (use this in CI — fails instead of silently drifting)

uv add <package>                  # add a new dependency to pyproject.toml, re-lock, install
uv add --dev <package>              # add a dev-only dependency (test tools, linters, ...)
uv remove <package>                   # remove a dependency

uv run <command>                        # run a command using the venv, without activating it
                                          # e.g.: uv run pytest -q
```

**Recreating the venv from scratch** (e.g. it's in a weird state, or you switched machines):

```bash
rm -rf .venv
cd backend && UV_PROJECT_ENVIRONMENT=../.venv uv sync
```

### MongoDB quick checks

```bash
mongosh "mongodb://localhost:27017"                # connect to a local instance
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/dbname"   # connect to Atlas

# inside mongosh:
show dbs
use governance_watch
show collections
db.policy_items.countDocuments({})
db.policy_items.findOne()
```

One-off queries via Docker, without opening `mongosh`:

```bash
docker compose exec -T mongo mongosh governance_watch --quiet --eval "db.issues.find().pretty()"
```

### Deploy to Fly.io (production)

Two separate Fly apps, deployed from two different config files:

| App | Config | Deployed from |
|---|---|---|
| `india-governance-watch-api` | `backend/fly.toml` (uses `backend/Dockerfile`) | `backend/` |
| `india-governance-watch` | `frontend/fly.toml` (uses `Dockerfile.frontend.prod` + `nginx.conf`) | `frontend/` |

Database is MongoDB Atlas (not hosted on Fly — Fly has no managed MongoDB offering). Atlas Network Access is set to allow `0.0.0.0/0`, since Fly machines don't have a fixed outbound IP by default.

**Redeploy the backend** after a code change:

```bash
cd backend
flyctl deploy --app india-governance-watch-api
```

**Redeploy the frontend** after a code change:

```bash
cd frontend
flyctl deploy --app india-governance-watch
```

The frontend bakes `VITE_API_BASE_URL` into the JS bundle at *build* time (set in `frontend/fly.toml`'s `[build.args]`) — if the backend's URL ever changes, update it there before redeploying the frontend; changing it after the fact requires a rebuild, not just a restart.

**Update a secret** (e.g. rotate `JWT_SECRET`, add another `ADMIN_USERS` pair, change `MONGODB_URI`):

```bash
flyctl secrets set ADMIN_USERS="admin:admin,newadmin:pass" --app india-governance-watch-api
# setting a secret triggers an automatic redeploy of that app
```

**Check logs / status:**

```bash
flyctl logs --app india-governance-watch-api
flyctl status --app india-governance-watch-api
flyctl logs --app india-governance-watch
flyctl status --app india-governance-watch
```

**Cost note:** both apps are configured with `min_machines_running = 0` (scale-to-zero when idle) to minimize cost on Fly's free/hobby tier — the tradeoff is a several-second cold start on the first request after a period of no traffic.

**General `flyctl` reference:**

```bash
flyctl auth login                       # authenticate (opens a browser)
flyctl auth whoami                       # check who you're logged in as

flyctl apps list                            # list your apps
flyctl deploy --app <name> --config path/to/fly.toml  # use a specific config file
flyctl deploy --app <name> --build-arg KEY=value       # pass a Docker build arg for this deploy only

flyctl ssh console --app <name>            # shell into a running machine
flyctl machine list --app <name>            # list machines (an app can have several, e.g. for HA)
flyctl machine restart <machine-id>          # restart one machine without a full redeploy
```

**Things that bite people new to Fly:**
- **Env vars baked into a client-side JS bundle at build time** (Vite's `VITE_*`) can't be changed by setting a Fly secret — secrets are injected as *runtime* environment variables, but the bundle was already built before the container ever started. Pass them as `[build.args]` in `fly.toml` instead, and redeploy whenever the value needs to change.
- **No managed MongoDB** — Fly doesn't offer a MongoDB service. Either point at an external provider (Atlas, etc.) or self-host it on a Fly volume, which then makes you responsible for backups/HA yourself.
- **Default outbound IPs are shared/dynamic**, not fixed. If a downstream service allowlists specific IPs, either allowlist broadly (`0.0.0.0/0`, relying on auth/TLS instead of network restriction) or set up a static outbound IP on Fly first.
- A `Dockerfile` with `COPY . .` means secrets/`.env` files must be excluded via `.dockerignore`, or they get baked into the image layer — never rely on `.gitignore` alone for this, they're unrelated to what Docker includes in a build.
