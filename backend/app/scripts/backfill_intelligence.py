"""CLI: backfill intelligence=null items (admin-triggered retry job, not an
automatic startup job — see knowledge_specs.md Policy Intelligence plan).

Usage:
    docker compose run --rm backend python -m app.scripts.backfill_intelligence
"""

import asyncio

from app.core.db import get_database
from app.services.policy_intelligence import backfill_missing_intelligence


async def main() -> None:
    db = get_database()
    count = await backfill_missing_intelligence(db)
    print(f"Backfilled {count} policy intelligence records")


if __name__ == "__main__":
    asyncio.run(main())
