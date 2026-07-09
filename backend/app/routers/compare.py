from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import COLLECTIONS, get_db
from app.core.utils import parse_object_id
from app.schemas.compare import Axis, CompareEntry, CompareResult, Metric

router = APIRouter(prefix="/api/compare", tags=["compare"])

IMPACT_WEIGHT = {"High": 3, "Medium": 2, "Low": 1}


@router.get("", response_model=CompareResult)
async def compare(
    axis: Axis,
    ids: str = Query(..., description="Comma-separated ids appropriate to the axis"),
    metric: Metric = "count",
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    id_list = [i.strip() for i in ids.split(",") if i.strip()]
    collection = db[COLLECTIONS["policy_items"]]
    results: list[CompareEntry] = []

    for raw_id in id_list:
        if axis == "ministry":
            oid = parse_object_id(raw_id)
            match = {"ministry_id": oid}
            ministry_doc = await db[COLLECTIONS["ministries"]].find_one({"_id": oid})
            label = ministry_doc["name"] if ministry_doc else raw_id
        elif axis == "pillar":
            match = {"pillar": raw_id}
            label = raw_id
        else:
            oid = parse_object_id(raw_id)
            match = {"issue_id": oid}
            issue_doc = await db[COLLECTIONS["issues"]].find_one({"_id": oid})
            label = issue_doc["label"] if issue_doc else raw_id

        if metric == "count":
            value = float(await collection.count_documents(match))
        else:
            docs = [doc async for doc in collection.find(match, {"impact_level": 1})]
            value = float(sum(IMPACT_WEIGHT.get(d["impact_level"], 0) for d in docs))

        results.append(CompareEntry(id=raw_id, label=label, value=value))

    return CompareResult(axis=axis, metric=metric, results=results)
