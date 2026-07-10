# Documentation — Running, Rebuilding, and Killing This Project

Command reference for operating this project from the terminal. Section 1 is
specific to this repo; Section 2 is a general-purpose cheat sheet for
Docker/uvicorn/npm-based projects like this one.

Commands are written for Git Bash / a POSIX-style shell on Windows (the
environment this project has been run in). Windows-native commands
(`taskkill`, `netstat`) work the same from Git Bash, PowerShell, or cmd.

---

## 1. This project

### 1.1 Start everything (Docker)

```bash
cd d:/Varahe/IGW
docker compose up --build -d
```

`-d` runs it in the background. Drop it to watch logs in the foreground
(Ctrl+C stops the foreground view but not the containers — use `docker
compose down` for that).

### 1.2 Stop everything (Docker)

```bash
docker compose down          # stop + remove containers, KEEP the mongo volume (data survives)
docker compose down -v       # stop + remove containers AND wipe the mongo volume (clean slate)
```

### 1.3 Rebuild after code changes

Docker images are a **snapshot** taken at build time — editing files on your
host does *not* change a running container (except the frontend, which runs
`vite dev` and hot-reloads). After changing backend code, or anything in the
frontend's `Dockerfile.frontend`/`package.json`, rebuild:

```bash
docker compose build backend            # rebuild just the backend image
docker compose build frontend           # rebuild just the frontend image
docker compose up -d backend frontend   # recreate containers from the new images

# or, do both in one shot:
docker compose up --build -d
```

A **clean rebuild from scratch** (confirms nothing is relying on leftover
state):

```bash
docker compose down -v
docker compose up --build -d
```

### 1.4 Check status / logs

```bash
docker compose ps                    # container status + health
docker compose logs -f backend        # tail backend logs (Ctrl+C to stop tailing, containers keep running)
docker compose logs -f frontend
docker compose logs -f mongo
```

### 1.5 Seed data / load real issues

```bash
# ministries + a placeholder dev issue
docker compose run --rm backend python -m app.scripts.seed_dev

# log in and upload a real issue PDF
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" -d '{"email":"admin","password":"admin"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -X POST http://localhost:8000/api/admin/issues/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@data/India Governance Watch - 1st May to 15th May.pdf"
```

### 1.6 Run the test suite

```bash
docker compose run --rm backend python -m pytest -q
docker compose run --rm backend python -m pytest -q --cov=app.routers --cov=app.services --cov-report=term-missing
```

### 1.7 Run manually, without Docker

Backend deps live in an isolated `uv`-managed venv at the **project root**
(`.venv/`), driven by the root `pyproject.toml`/`uv.lock` — not the global
Python install, and not nested inside `backend/`. See §2.6 for the general
`uv` reference.

```bash
# from the project root, once (or after pulling dependency changes):
uv sync

# run the API — --directory backend makes it cd there first, so app.main:app
# resolves and backend/.env is picked up, while still using the root .venv
uv run --directory backend uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend (separate terminal, from repo root):

```bash
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

If port 8000 is already taken, pick another port for uvicorn and point
`VITE_API_BASE_URL` at it:

```bash
uv run --directory backend uvicorn app.main:app --host 0.0.0.0 --port 8010
# other terminal:
VITE_API_BASE_URL=http://localhost:8010 npm run dev
```

### 1.8 Inject/update admin users

```bash
# after editing ADMIN_USERS in backend/.env, either restart the backend, or
# sync immediately without restarting (run from the project root):
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

---

## 2. General-purpose cheat sheet (Docker / uvicorn / npm projects)

### 2.1 Finding and killing whatever's on a port

This is the #1 thing that trips people up: a server process started outside
Docker (`npm run dev`, `uvicorn`, `python manage.py runserver`, ...) keeps
running until you kill it directly — stopping/restarting Docker, closing a
terminal tab, or even a reboot of WSL doesn't necessarily clean it up if it
was backgrounded (`nohup ... &`, `&disown`).

**Windows (netstat + taskkill) — works from Git Bash, PowerShell, or cmd:**

```bash
netstat -ano | grep ":3000"          # find what's listening on port 3000
# rightmost column is the PID, e.g.:
#   TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    60292
taskkill //F //PID 60292              # force-kill it
```

(Note the double slashes `//F //PID` — Git Bash rewrites single-slash flags
as Windows paths, which breaks native Windows commands. Use `//` or run the
same command from `cmd.exe`/PowerShell with single slashes: `taskkill /F /PID 60292`.)

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

**Killing background jobs you started in the same shell session:**

```bash
jobs -l           # list background jobs from this shell (won't show anything started with `disown`)
kill %1            # kill job 1
```

### 2.2 Docker Compose

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

docker compose down -v && docker system prune -f --volumes   # nuclear option: wipe this
                                                                # project's volumes AND unused
                                                                # images/containers/networks
                                                                # system-wide — only run this if you
                                                                # mean "clean up my whole Docker install"
```

**Common gotchas:**
- Editing source files does **not** affect a running container unless that
  service bind-mounts the source directory (`volumes: - ./src:/app/src` in
  `docker-compose.yml`) or is running a dev server that watches the
  filesystem inside the container. A `Dockerfile` with `COPY . .` bakes a
  snapshot in at *build* time — you must rebuild.
- `docker compose down` does not remove named volumes by default — your
  database survives a `down`/`up` cycle. Use `-v` when you explicitly want a
  clean slate.
- If a container can't bind a port ("port is already allocated"), something
  else — Docker Desktop's own port-forwarding proxy, or a manually-started
  process — already holds it. See §2.1.

### 2.3 uvicorn (FastAPI)

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000     # basic run
uvicorn app.main:app --reload                         # auto-restart on code changes (dev only)
uvicorn app.main:app --workers 4                        # multiple worker processes (prod-ish)
python -m uvicorn app.main:app --port 8000                # equivalent, but guarantees the right
                                                             # Python/venv is used (`python -m ...`
                                                             # resolves via sys.path, not PATH)
```

`app.main:app` means: import module `app.main`, use the object named `app`
(the `FastAPI()` instance) from it. Run this from the directory that module
path resolves from (usually the project root containing the `app/` package).

Interactive API docs are auto-generated at `/docs` (Swagger UI) and `/redoc`
whenever a FastAPI app is running.

### 2.4 npm / Vite

```bash
npm install                      # install dependencies from package.json
npm run dev                       # start the Vite dev server (hot reload)
npm run build                      # production build → dist/
npm run preview                     # locally preview the production build
npm run lint                         # (if defined) run tsc/eslint checks

# override the dev server port/host inline:
npm run dev -- --port=4000 --host=0.0.0.0

# pass a runtime env var to Vite (must be prefixed VITE_ to be exposed to client code):
VITE_API_BASE_URL=http://localhost:8010 npm run dev
```

### 2.5 Python virtual environments (stdlib `venv` + `pip`)

The traditional approach — still worth knowing since most Python projects
you'll encounter use it:

```bash
python -m venv .venv                     # create a venv
source .venv/Scripts/activate               # activate it (Git Bash on Windows)
.venv\Scripts\activate.bat                    # activate it (cmd.exe)
.venv\Scripts\Activate.ps1                      # activate it (PowerShell)
deactivate                                        # leave the venv

pip install -r requirements.txt                    # install pinned deps
pip freeze > requirements.txt                        # capture current versions
```

The biggest footgun: if you forget to `activate` (or your shell's prompt
doesn't show `(.venv)`), `pip install` silently falls back to your **global**
Python environment. Always double-check with `which python` (or `where
python` on Windows) — it should point inside `.venv/`.

### 2.6 `uv` — fast Python package manager (this project uses it)

[uv](https://docs.astral.sh/uv/) replaces `venv` + `pip` + `pip-tools` with
one fast, single binary. This project's backend deps are declared in the
root `pyproject.toml` and locked in `uv.lock`; running `uv sync` from the
project root creates/updates `.venv/` at the root to match.

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
uv run --directory backend <command>       # cd into a subdirectory first, then run
                                             # (needed here since the app package lives in
                                             # backend/app/ while the venv is at the root)

uv venv                                       # create an empty venv (rarely needed directly —
                                                # `uv sync` creates one automatically)
uv python list                                  # show installed/available Python versions
uv python install 3.12                           # install a specific Python version uv-managed,
                                                   # no system Python required
```

**Recreating the venv from scratch** (e.g. it's in a weird state, or you
switched machines):

```bash
rm -rf .venv
uv sync
```

**Why the venv lives at the project root, not `backend/.venv`:** `uv sync`
places `.venv` next to whichever `pyproject.toml` it's using. Keeping
`pyproject.toml` at the repo root means one shared venv for the whole
project (mirroring `node_modules/` also living at the root for the
frontend), rather than one nested inside each Python subproject. If you ever
add a second Python component, either add it as a `uv` workspace member or
give it its own `pyproject.toml` + explicit venv path.

### 2.7 MongoDB quick checks

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

From outside `mongosh`, one-off queries via Docker:

```bash
docker compose exec -T mongo mongosh governance_watch --quiet --eval "db.issues.find().pretty()"
```
