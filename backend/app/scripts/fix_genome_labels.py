"""One-off data migration: relabel genome.dimensions on existing governance
docs to the shortened labels in GENOME_DIMENSIONS (services/policy_governance.py)
— the original longer labels ("Problem-stream strength", etc.) clipped off
the edge of the 10-axis radar chart. Positional replace only, since the
vector order is unchanged — no LLM call needed.

Usage:
    docker compose run --rm backend python -m app.scripts.fix_genome_labels
"""

import asyncio

from app.core.db import COLLECTIONS, get_database
from app.services.policy_governance import GENOME_DIMENSIONS


async def main() -> None:
    db = get_database()
    collection = db[COLLECTIONS["policy_items"]]
    cursor = collection.find({"governance.genome.dimensions": {"$exists": True}})

    checked = 0
    fixed = 0
    async for doc in cursor:
        checked += 1
        if doc["governance"]["genome"]["dimensions"] != GENOME_DIMENSIONS:
            fixed += 1
            await collection.update_one(
                {"_id": doc["_id"]}, {"$set": {"governance.genome.dimensions": GENOME_DIMENSIONS}}
            )

    print(f"Checked {checked} items, relabeled genome dimensions on {fixed}")


if __name__ == "__main__":
    asyncio.run(main())
