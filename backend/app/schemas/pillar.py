from pydantic import BaseModel


class PillarOut(BaseModel):
    id: str
    name: str


class PillarCreate(BaseModel):
    name: str
