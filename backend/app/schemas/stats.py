from pydantic import BaseModel


class StatsSummary(BaseModel):
    total: int
    policy_updates: int
    announcements: int
    high_impact: int


class MapStat(BaseModel):
    state_code: str
    count: int


class MinistryStat(BaseModel):
    ministry_id: str
    name: str
    count: int


class PillarStat(BaseModel):
    pillar: str
    count: int


class MomentumSeriesPoint(BaseModel):
    issue_label: str
    count: int


class MomentumEntry(BaseModel):
    label: str
    latest_count: int
    previous_count: int
    delta_pct: float | None  # None if previous_count == 0 (undefined % change)
    trend_slope: float  # OLS slope of count vs. issue index across the trailing series
    series: list[MomentumSeriesPoint]  # oldest -> newest


class MomentumOut(BaseModel):
    themes: list[MomentumEntry]
    ministries: list[MomentumEntry]
    latest_issue_label: str
    previous_issue_label: str
