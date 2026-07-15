"""One-off: computes financial_outlay for items ingested before that field
existed. Pure regex over already-stored title/description — no LLM cost —
so unlike drafts/evolution this is safe to backfill in bulk.

Usage:
    docker compose run --rm backend python -m app.scripts.backfill_financial_outlay
"""

import asyncio

from app.core.db import COLLECTIONS, get_database
from app.services.financial_extractor import extract_financial_outlay


async def main() -> None:
    db = get_database()
    cursor = db[COLLECTIONS["policy_items"]].find(
        {"financial_outlay": None}, {"title": 1, "description": 1}
    )
    count = 0
    async for doc in cursor:
        outlay = extract_financial_outlay(f"{doc['title']} {doc['description']}")
        if outlay:
            await db[COLLECTIONS["policy_items"]].update_one(
                {"_id": doc["_id"]}, {"$set": {"financial_outlay": outlay}}
            )
            count += 1
    print(f"Backfilled financial_outlay for {count} items")


if __name__ == "__main__":
    asyncio.run(main())
