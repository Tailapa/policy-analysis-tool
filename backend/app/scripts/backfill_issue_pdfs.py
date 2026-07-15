"""One-off: uploads the original PDF bytes for issues that predate GridFS
storage (added alongside the Reports tab) into GridFS, linking them via
pdf_file_id/pdf_filename. Matches *.pdf files in a directory to existing
issue docs by filename <-> label overlap (every issue PDF so far has been
named e.g. "India Governance Watch - 16th May to 31st May.pdf", matching its
issue's label). Skips issues that already have a pdf_file_id.

Usage (inside the backend container, with ./data mounted read-only):
    docker compose run --rm backend python -m app.scripts.backfill_issue_pdfs
    docker compose run --rm backend python -m app.scripts.backfill_issue_pdfs /some/other/dir
"""

import asyncio
import sys
from pathlib import Path

from app.core.db import COLLECTIONS, get_database
from app.services.gridfs_storage import store_issue_pdf

DEFAULT_DATA_DIR = Path("/data")


async def backfill(data_dir: Path) -> None:
    db = get_database()
    pdf_files = list(data_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDFs found in {data_dir}")
        return

    async for issue in db[COLLECTIONS["issues"]].find({"pdf_file_id": None}):
        match = next(
            (f for f in pdf_files if f.stem in issue["label"] or issue["label"] in f.stem), None
        )
        if not match:
            print(f"No matching file for issue '{issue['label']}' — skipped")
            continue

        file_bytes = match.read_bytes()
        file_id = await store_issue_pdf(db, match.name, file_bytes)
        await db[COLLECTIONS["issues"]].update_one(
            {"_id": issue["_id"]},
            {"$set": {"pdf_file_id": file_id, "pdf_filename": match.name}},
        )
        print(f"Linked '{match.name}' to issue '{issue['label']}'")


if __name__ == "__main__":
    directory = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DATA_DIR
    if not directory.exists():
        print(f"Directory not found: {directory}")
        sys.exit(1)
    asyncio.run(backfill(directory))
