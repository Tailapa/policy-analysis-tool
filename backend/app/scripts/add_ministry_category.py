"""One-off data migration: sets `category: "ministry"` on every ministries
doc that predates the new category field, so reads are consistent from the
API's first response rather than relying on the Pydantic model's implicit
default only showing up for documents that happen to already round-trip
through model validation.

Usage:
    docker compose run --rm backend python -m app.scripts.add_ministry_category
"""

import asyncio

from app.core.db import COLLECTIONS, get_database


async def main() -> None:
    db = get_database()
    result = await db[COLLECTIONS["ministries"]].update_many(
        {"category": {"$exists": False}}, {"$set": {"category": "ministry"}}
    )
    print(f"Set category='ministry' on {result.modified_count} ministries")


if __name__ == "__main__":
    asyncio.run(main())
