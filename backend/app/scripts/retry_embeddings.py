"""CLI: backfill embedding=null items once the Gemini API is reachable again.
Intended to run on a periodic schedule (cron, k8s CronJob, etc.) — a simple
retry job per backend-spec.md §9 Phase 6, not a long-running scheduler inside
the API process.

Usage:
    docker compose run --rm backend python -m app.scripts.retry_embeddings
"""

import asyncio

from app.core.db import get_database
from app.services.embeddings import backfill_missing_embeddings


async def main() -> None:
    db = get_database()
    count = await backfill_missing_embeddings(db)
    print(f"Backfilled {count} embeddings")


if __name__ == "__main__":
    asyncio.run(main())
