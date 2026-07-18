from pydantic import BaseModel


class StatsSummary(BaseModel):
    total: int
    policy_updates: int
    announcements: int
    high_impact: int


class MinistryStat(BaseModel):
    ministry_id: str
    name: str
    count: int


class PillarStat(BaseModel):
    pillar: str
    count: int
