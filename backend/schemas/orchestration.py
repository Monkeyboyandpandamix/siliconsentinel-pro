from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OrchestrationOrderResponse(BaseModel):
    id: int
    design_id: int
    stage: str
    status: str
    agent_type: Optional[str] = None
    sla_deadline: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PipelineStatusResponse(BaseModel):
    design_id: int
    orders: list[OrchestrationOrderResponse]
    current_stage: Optional[str] = None
    overall_status: str  # IN_PROGRESS, COMPLETED, FAILED
    progress_pct: float
