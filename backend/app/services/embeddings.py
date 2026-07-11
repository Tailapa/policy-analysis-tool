import logging

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.db import COLLECTIONS

logger = logging.getLogger(__name__)


async def _embed_text(text: str) -> list[float] | None:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        return None

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        result = client.models.embed_content(model="gemini-embedding-001", contents=text)
        return list(result.embeddings[0].values)
    except Exception:
        logger.exception("Gemini embedding call failed")
        return None


async def generate_embedding_for_item(db: AsyncIOMotorDatabase, item_id: ObjectId) -> None:
    """Post-publish, best-effort. Never raises — a failure here must not
    affect the publish flow that already happened (backend-spec.md §5 step 7).
    embedding stays null until a retry job (backfill_missing_embeddings)
    picks it up again."""
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": item_id})
    if not doc:
        return

    text = f"{doc['title']}\n{doc['description']}"
    vector = await _embed_text(text)
    if vector is None:
        return

    await db[COLLECTIONS["policy_items"]].update_one(
        {"_id": item_id}, {"$set": {"embedding": vector}}
    )


async def backfill_missing_embeddings(db: AsyncIOMotorDatabase, limit: int = 100) -> int:
    """Periodic retry job: fills in embedding=null items once the API is
    reachable again. Returns how many were successfully backfilled."""
    cursor = db[COLLECTIONS["policy_items"]].find({"embedding": None}).limit(limit)
    count = 0
    async for doc in cursor:
        before = doc.get("embedding")
        await generate_embedding_for_item(db, doc["_id"])
        after = await db[COLLECTIONS["policy_items"]].find_one({"_id": doc["_id"]}, {"embedding": 1})
        if before is None and after and after.get("embedding") is not None:
            count += 1
    return count
