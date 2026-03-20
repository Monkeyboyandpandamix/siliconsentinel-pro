from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DefectEntry(BaseModel):
    type: str  # void, short, particle, crack, contamination
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    location_x: float
    location_y: float
    size_um: float
    confidence: float


class DesignRuleUpdate(BaseModel):
    rule: str
    current_value: str
    suggested_value: str
    reason: str


class QualityCheckResponse(BaseModel):
    id: int
    design_id: int
    defect_count: int
    defects: list[DefectEntry]
    pass_fail: str
    confidence: float
    root_cause: Optional[str] = None
    design_rule_updates: list[DesignRuleUpdate] = []
    timestamp: datetime

    model_config = {"from_attributes": True}
