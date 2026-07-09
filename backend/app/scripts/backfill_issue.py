"""CLI: run the same ingestion pipeline used by POST /api/admin/issues/upload
against a historical PDF/DOCX, for bulk-loading past issues without clicking
through the admin UI one at a time (backend-spec.md §5 step 6).

Usage (inside the backend container):
    docker compose run --rm backend python -m app.scripts.backfill_issue "/data/India Governance Watch - 1st May to 15th May.pdf"
"""

import asyncio
import sys
from pathlib import Path

from app.core.config import get_settings
from app.core.db import ensure_indexes, get_database
from app.services.ingestion import IngestionError, ingest_report


async def backfill(path: str) -> None:
    file_path = Path(path)
    if not file_path.exists():
        print(f"File not found: {path}")
        sys.exit(1)

    db = get_database()
    await ensure_indexes()
    settings = get_settings()

    file_bytes = file_path.read_bytes()
    try:
        issue_doc, item_docs = await ingest_report(
            db,
            filename=file_path.name,
            file_bytes=file_bytes,
            ministry_match_threshold=settings.MINISTRY_MATCH_THRESHOLD,
        )
    except IngestionError as e:
        print(f"Ingestion failed: {e}")
        sys.exit(1)

    print(f"Published issue '{issue_doc['label']}' ({issue_doc['_id']}) with {len(item_docs)} items")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m app.scripts.backfill_issue <path-to-pdf-or-docx>")
        sys.exit(1)
    asyncio.run(backfill(sys.argv[1]))
