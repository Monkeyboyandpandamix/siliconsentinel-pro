from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AlternatePart(BaseModel):
    part_number: str
    description: str
    unit_price: float
    lead_time_days: int
    savings_pct: float


class BOMEntryResponse(BaseModel):
    id: int
    part_number: str
    description: str
    category: str
    quantity: int
    unit_price: float
    total_price: float
    lead_time_days: Optional[int] = None
    availability: str
    supplier: Optional[str] = None
    alternates: list[AlternatePart] = []

    model_config = {"from_attributes": True}


class CostBreakdown(BaseModel):
    bom_cost: float
    fab_cost_per_wafer: float
    dies_per_wafer: int
    fab_cost_per_die: float
    packaging_cost: float
    test_cost: float
    overhead_pct: float
    total_per_unit: float


class CostScenario(BaseModel):
    name: str  # Budget, Balanced, Premium
    description: str
    total_per_unit: float
    bom_cost: float
    tradeoffs: str


class BOMGenerateRequest(BaseModel):
    volume: int = 10000
    budget_target: Optional[float] = None


class BOMResponse(BaseModel):
    design_id: int
    entries: list[BOMEntryResponse]
    total_bom_cost: float
    cost_breakdown: CostBreakdown
    scenarios: list[CostScenario]
    lead_time_critical_path: list[dict]
    supplier_diversity_score: float
    supplier_diversity_risk: str  # LOW, MEDIUM, HIGH

    model_config = {"from_attributes": True}
