"""One-off data migration: splits the single `ministries` collection into
three collections (`ministries`, `regulatory_bodies`, `misc_entities`) per
each document's existing `category` field, preserving `_id` so
policy_items.ministry_id/additional_ministry_ids keep resolving correctly.

Ministry-category docs already live in the right collection and are left
alone. Regulatory-body and misc docs are inserted into their new collection
then deleted from `ministries`.

Usage:
    docker compose run --rm backend python -m app.scripts.migrate_entity_collections
"""

import asyncio

from app.core.db import CATEGORY_TO_COLLECTION, COLLECTIONS, ensure_indexes, get_database


async def main() -> None:
    db = get_database()
    await ensure_indexes()

    old_collection = db[COLLECTIONS["ministries"]]
    moved = {"regulatory_body": 0, "misc": 0}

    async for doc in old_collection.find({"category": {"$in": ["regulatory_body", "misc"]}}):
        category = doc["category"]
        target = db[CATEGORY_TO_COLLECTION[category]]
        await target.insert_one(doc)
        await old_collection.delete_one({"_id": doc["_id"]})
        moved[category] += 1

    remaining = await old_collection.count_documents({})
    print(f"Moved {moved['regulatory_body']} regulatory bodies, {moved['misc']} misc entities")
    print(f"{remaining} documents remain in 'ministries'")


if __name__ == "__main__":
    asyncio.run(main())
