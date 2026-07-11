"""One-off data migration: recompute stored SCTP group quadrants from their
own power_score/construction_score, for items generated before the
_derive_quadrant fix in services/policy_intelligence.py. The LLM's free-text
quadrant label wasn't reliably consistent with its own two numeric scores,
so some already-generated items have a group plotted (by score) on one side
of the chart while colored/labeled (by quadrant field) as another — this
recomputes the label deterministically from the scores already on file, no
LLM call needed.

Usage:
    docker compose run --rm backend python -m app.scripts.fix_sctp_quadrants
"""

import asyncio

from app.core.db import COLLECTIONS, get_database
from app.services.policy_intelligence import _derive_quadrant


async def main() -> None:
    db = get_database()
    cursor = db[COLLECTIONS["policy_items"]].find({"intelligence.sctp.groups": {"$exists": True}})

    checked = 0
    fixed = 0
    async for doc in cursor:
        checked += 1
        groups = doc["intelligence"]["sctp"]["groups"]
        changed = False
        for group in groups:
            correct = _derive_quadrant(group["power_score"], group["construction_score"])
            if group["quadrant"] != correct:
                group["quadrant"] = correct
                changed = True
        if changed:
            fixed += 1
            await db[COLLECTIONS["policy_items"]].update_one(
                {"_id": doc["_id"]}, {"$set": {"intelligence.sctp.groups": groups}}
            )

    print(f"Checked {checked} items, fixed quadrant mismatches on {fixed}")


if __name__ == "__main__":
    asyncio.run(main())
