import re

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from rapidfuzz import fuzz, process

from app.core.db import COLLECTIONS


async def resolve_ministry(
    db: AsyncIOMotorDatabase, raw_name: str, threshold: int
) -> tuple[ObjectId, float]:
    """Fuzzy-match raw_name against ministries.name. Above threshold -> link existing.
    Below threshold -> auto-create a new ministries record (per backend-spec.md §5 step 3:
    there's no review step left to catch an unlinked item, so it has to resolve one way
    or another)."""

    collection = db[COLLECTIONS["ministries"]]
    name = raw_name.strip()

    exact = await collection.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if exact:
        return exact["_id"], 100.0

    existing_names = [doc["name"] async for doc in collection.find({}, {"name": 1})]
    if existing_names:
        match = process.extractOne(name, existing_names, scorer=fuzz.WRatio)
        if match and match[1] >= threshold:
            matched_doc = await collection.find_one({"name": match[0]})
            return matched_doc["_id"], float(match[1])

    result = await collection.insert_one(
        {
            "name": name,
            "minister_name": None,
            "department": None,
            "seal_url": None,
            "icon": "Building2",
        }
    )
    return result.inserted_id, 0.0


UNMAPPED_MINISTRY_NAME = "Unmapped — Needs Review"
MINISTRY_MENTION_THRESHOLD = 90


async def get_or_create_unmapped_ministry(db: AsyncIOMotorDatabase) -> ObjectId:
    """Destination for items whose title carries no '- Ministry X' segment
    at all and whose body text doesn't explicitly name a real ministry
    either (see find_ministry_mentioned_in_text) — grouped here rather than
    each spawning its own junk ministry record, with needs_ministry_review
    set on the item so admins can find and fix it (ManageItems.tsx)."""
    collection = db[COLLECTIONS["ministries"]]
    existing = await collection.find_one({"name": UNMAPPED_MINISTRY_NAME})
    if existing:
        return existing["_id"]
    result = await collection.insert_one(
        {
            "name": UNMAPPED_MINISTRY_NAME,
            "minister_name": None,
            "department": None,
            "seal_url": None,
            "icon": "AlertTriangle",
            "category": "misc",
        }
    )
    return result.inserted_id


async def find_ministry_mentioned_in_text(db: AsyncIOMotorDatabase, text: str) -> ObjectId | None:
    """Best-effort fallback for items with no '- Ministry X' title segment:
    scans every existing ministry/regulatory body name for a mention inside
    the item's own title+description, per the rule that an item should only
    ever be auto-mapped to a ministry that's actually named in its own text
    — never guessed from outside domain knowledge. Returns None (caller
    flags for admin review) when nothing clears the threshold."""
    collection = db[COLLECTIONS["ministries"]]
    candidates = [doc async for doc in collection.find({}, {"name": 1}) if doc["name"] and doc["name"] != UNMAPPED_MINISTRY_NAME]
    if not candidates:
        return None

    best_id: ObjectId | None = None
    best_score = 0.0
    for doc in candidates:
        score = fuzz.partial_ratio(doc["name"], text)
        if score > best_score:
            best_score = score
            best_id = doc["_id"]

    return best_id if best_score >= MINISTRY_MENTION_THRESHOLD else None


REGULATORY_BODY_MENTION_THRESHOLD = 90
MAX_ADDITIONAL_LINKS = 2


async def find_additional_regulatory_body_links(
    db: AsyncIOMotorDatabase, text: str, exclude_id: ObjectId
) -> list[ObjectId]:
    """Best-effort secondary linking: catches inline mentions of a
    regulatory body within an item's own title/description (e.g. "...
    notified by the Securities and Exchange Board of India (SEBI)...") so
    the item shows up under both its primary ministry and that regulatory
    body. Primary ministry resolution (resolve_ministry above) stays
    untouched — this only ever adds regulatory_body-category links, never
    reassigns the primary."""
    collection = db[COLLECTIONS["ministries"]]
    bodies = [
        doc
        async for doc in collection.find({"category": "regulatory_body"}, {"name": 1})
        if doc["_id"] != exclude_id
    ]
    if not bodies:
        return []

    matches: list[ObjectId] = []
    for body in bodies:
        if fuzz.partial_ratio(body["name"], text) >= REGULATORY_BODY_MENTION_THRESHOLD:
            matches.append(body["_id"])
        if len(matches) >= MAX_ADDITIONAL_LINKS:
            break
    return matches
