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
}


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
