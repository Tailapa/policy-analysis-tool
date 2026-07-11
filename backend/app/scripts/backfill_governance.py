"""CLI: backfill governance=null items — mirrors backfill_intelligence.py.

Usage:
    docker compose run --rm backend python -m app.scripts.backfill_governance
"""

import asyncio
import sys

from app.core.db import get_database
from app.services.policy_governance import backfill_missing_governance


async def main() -> None:
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    db = get_database()
    count = await backfill_missing_governance(db, limit=limit)
    print(f"Backfilled {count} policy governance records")


if __name__ == "__main__":
    asyncio.run(main())
