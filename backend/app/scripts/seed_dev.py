"""CLI: seed a clean dev database with one issue and ~19 ministries.
(Admin users are no longer seeded here — they're synced from the
ADMIN_USERS env var on every backend startup, see app/services/admin_sync.py.)

Run inside the backend container:
    docker compose run --rm backend python -m app.scripts.seed_dev
"""

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

from app.core.db import COLLECTIONS, ensure_indexes, get_database

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


async def seed() -> None:
    db = get_database()
    await ensure_indexes()

    ministries_path = DATA_DIR / "ministries_seed.json"
    ministries = json.loads(ministries_path.read_text(encoding="utf-8"))

    ministries_col = db[COLLECTIONS["ministries"]]
    for m in ministries:
        await ministries_col.update_one(
            {"name": m["name"]},
            {"$setOnInsert": {**m, "department": None, "seal_url": None}},
            upsert=True,
        )
    print(f"Seeded {len(ministries)} ministries")

    issues_col = db[COLLECTIONS["issues"]]
    existing_issue = await issues_col.find_one({"label": "May 2026 | Issue I"})
    if not existing_issue:
        await issues_col.insert_one(
            {
                "label": "May 2026 | Issue I",
                "period_start": datetime(2026, 5, 1),
                "period_end": datetime(2026, 5, 15),
                "pdf_url": "",
                "executive_summary": "Seed placeholder issue for local development.",
                "contributors": [
                    {"name": "Manasa Sriram", "role": "Lead Editor"},
                    {"name": "Veer Patil", "role": "Editor"},
                ],
                "published_at": datetime.now(timezone.utc),
            }
        )
        print("Seeded 1 issue")
    else:
        print("Issue already exists, skipping")


if __name__ == "__main__":
    asyncio.run(seed())
