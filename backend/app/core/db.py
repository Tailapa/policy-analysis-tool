from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(settings.MONGODB_URI)
    return _client


def get_database() -> AsyncIOMotorDatabase:
    settings = get_settings()
    return get_client()[settings.MONGODB_DB]


async def get_db() -> AsyncIOMotorDatabase:
    return get_database()


async def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def ping_db() -> bool:
    try:
        await get_database().command("ping")
        return True
    except Exception:
        return False


COLLECTIONS = {
    "policy_items": "policy_items",
    "issues": "issues",
    "ministries": "ministries",
    "admin_users": "admin_users",
    "policy_evolution": "policy_evolution",
    "pillars": "pillars",
}

# The 6 themes the app has shipped with — used only as a one-time seed for a
# brand-new/empty `pillars` collection so existing deployments keep working
# unchanged on first boot after this collection was introduced. From then on
# the list is fully admin-managed (see routers/pillars.py, admin.py).
DEFAULT_PILLARS = [
    "Economic Growth",
    "Infrastructure",
    "Human Development",
    "National Security",
    "Rural & Agri",
    "Misc",
]


async def ensure_indexes() -> None:
    db = get_database()

    await db[COLLECTIONS["policy_items"]].create_index(
        [("pillar", 1), ("status", 1), ("impact_level", 1)]
    )
    await db[COLLECTIONS["policy_items"]].create_index("ministry_id")
    await db[COLLECTIONS["policy_items"]].create_index("issue_id")
    await db[COLLECTIONS["policy_items"]].create_index("geography.states")
    await db[COLLECTIONS["policy_items"]].create_index(
        [("title", "text"), ("description", "text"), ("tags", "text")],
        name="items_text_search",
    )

    await db[COLLECTIONS["ministries"]].create_index("name", unique=True)
    await db[COLLECTIONS["admin_users"]].create_index("email", unique=True)
    await db[COLLECTIONS["issues"]].create_index("published_at")
    await db[COLLECTIONS["pillars"]].create_index("name", unique=True)


async def seed_default_pillars() -> None:
    """Unlike ministries (manually seeded via scripts/seed_dev.py, dev-only),
    `pillars` must never be empty for the app to function — the item-creation
    endpoints validate against it. Called from main.py's lifespan right after
    ensure_indexes(); no-ops once the collection has anything in it, so it
    never overwrites admin edits (including deletions) on subsequent boots."""
    db = get_database()
    collection = db[COLLECTIONS["pillars"]]
    if await collection.count_documents({}, limit=1):
        return
    now = datetime.now(timezone.utc)
    await collection.insert_many([{"name": name, "created_at": now} for name in DEFAULT_PILLARS])
