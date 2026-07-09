from typing import Literal

from pydantic import BaseModel

Axis = Literal["ministry", "pillar", "issue"]
Metric = Literal["count", "impact"]


class CompareEntry(BaseModel):
    id: str
    label: str
    value: float


class CompareResult(BaseModel):
    axis: Axis
    metric: Metric
    results: list[CompareEntry]
