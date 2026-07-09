from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException


def parse_object_id(raw: str, not_found_detail: str = "Not found") -> ObjectId:
    try:
        return ObjectId(raw)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail=not_found_detail)
