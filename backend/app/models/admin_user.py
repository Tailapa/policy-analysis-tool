from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["editor", "lead_editor", "admin"]


class AdminUser(BaseModel):
    id: str = Field(alias="_id")
    email: str
    hashed_password: str
    role: Role = "editor"

    model_config = {"populate_by_name": True}
