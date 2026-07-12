from datetime import datetime

from pydantic import BaseModel, Field


class PillarModel(BaseModel):
    id: str = Field(alias="_id")
    name: str
    created_at: datetime

    model_config = {"populate_by_name": True}
