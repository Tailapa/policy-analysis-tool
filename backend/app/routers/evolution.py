from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, get_db
from app.core.deps import get_current_admin
from app.core.utils import parse_object_id
from app.schemas.evolution import (
    EvolutionBackfillResultOut,
    GenerateEvolutionOut,
    ItemEvolutionOut,
    ItemEvolutionStatusOut,
)
from app.services.policy_evolution import (
    backfill_missing_item_evolution,
    generate_item_evolution,
)

item_evolution_router = APIRouter(prefix="/api/items", tags=["evolution"])
admin_evolution_router = APIRouter(prefix="/api/admin", tags=["admin", "evolution"])


@item_evolution_router.get("/{item_id}/evolution", response_model=ItemEvolutionStatusOut)
async def get_item_evolution(item_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    oid = parse_object_id(item_id, "Item not found")
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": oid}, {"evolution": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")

    evolution = doc.get("evolution")
    if evolution is None:
        return ItemEvolutionStatusOut(status="pending", evolution=None)

    out = dict(evolution)
    out["generated_at"] = out["generated_at"].isoformat()
    return ItemEvolutionStatusOut(status="ready", evolution=ItemEvolutionOut.model_validate(out))


@admin_evolution_router.post(
    "/items/{item_id}/generate-evolution", response_model=GenerateEvolutionOut, status_code=202
)
async def trigger_item_evolution(
    item_id: str,
    background_tasks: BackgroundTasks,
    force: bool = False,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    oid = parse_object_id(item_id, "Item not found")
    doc = await db[COLLECTIONS["policy_items"]].find_one({"_id": oid}, {"_id": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")

    background_tasks.add_task(generate_item_evolution, db, oid, force)
    return GenerateEvolutionOut()


@admin_evolution_router.post("/evolution/backfill", response_model=EvolutionBackfillResultOut)
async def trigger_item_evolution_backfill(
    limit: int = 100,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _admin: dict = Depends(get_current_admin),
):
    count = await backfill_missing_item_evolution(db, limit=limit)
    return EvolutionBackfillResultOut(chains_generated=count)
