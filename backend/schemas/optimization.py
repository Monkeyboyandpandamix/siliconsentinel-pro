from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PPCAScores(BaseModel):
    power: float  # 0-100
    performance: float
    cost: float
    area: float


class OptimizationMetrics(BaseModel):
    total_power_mw: float
    total_area_mm2: float
    critical_path_delay_ns: float
    max_temperature_c: float
    estimated_yield_pct: float
    estimated_cost_per_unit: float


class OptimizationRequest(BaseModel):
    focus: str = "balanced"  # power, performance, area, cost, balanced


class OptimizationResponse(BaseModel):
    id: int
    design_id: int
    iteration: int
    metrics_before: OptimizationMetrics
    metrics_after: OptimizationMetrics
    improvement_pct: float
    ppca_before: PPCAScores
    ppca_after: PPCAScores
    changes_summary: list[str]
    optimized_architecture: Optional[dict] = None
    timestamp: datetime

    model_config = {"from_attributes": True}
