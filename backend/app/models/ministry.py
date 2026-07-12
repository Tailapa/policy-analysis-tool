from typing import Literal, Optional

from pydantic import BaseModel, Field

MinistryCategory = Literal["ministry", "regulatory_body"]


class Ministry(BaseModel):
    id: str = Field(alias="_id")
    name: str
    minister_name: Optional[str] = None
    department: Optional[str] = None
    seal_url: Optional[str] = None
    icon: str = "Building2"
    category: MinistryCategory = "ministry"

    model_config = {"populate_by_name": True}
