"""One-off data migration: some earlier intelligence/governance runs stored
`sources[].query` as a list of strings instead of a single string, because
Gemini sometimes bundled multiple search queries into one function_call's
`query` arg as a list rather than making separate calls (fixed at the source
in services/research.py). Existing rows with the bad shape fail
PolicyIntelligenceOut/PolicyGovernanceOut validation — flatten them into a
single joined string so they're valid and still informative.

Usage:
    docker compose run --rm backend python -m app.scripts.fix_source_query_lists
"""

import asyncio

from app.core.db import COLLECTIONS, get_database


def _fix_sources(sources: list[dict]) -> bool:
    changed = False
    for source in sources:
        if isinstance(source.get("query"), list):
            source["query"] = "; ".join(str(q) for q in source["query"])
            changed = True
    return changed


async def main() -> None:
    db = get_database()
    collection = db[COLLECTIONS["policy_items"]]
    cursor = collection.find(
        {"$or": [{"intelligence.sources": {"$exists": True}}, {"governance.sources": {"$exists": True}}]}
    )

    checked = 0
    fixed = 0
    async for doc in cursor:
        checked += 1
        update: dict = {}

        intel_sources = (doc.get("intelligence") or {}).get("sources")
        if intel_sources and _fix_sources(intel_sources):
            update["intelligence.sources"] = intel_sources

        gov_sources = (doc.get("governance") or {}).get("sources")
        if gov_sources and _fix_sources(gov_sources):
            update["governance.sources"] = gov_sources

        if update:
            fixed += 1
            await collection.update_one({"_id": doc["_id"]}, {"$set": update})

    print(f"Checked {checked} items, fixed source query lists on {fixed}")


if __name__ == "__main__":
    asyncio.run(main())
