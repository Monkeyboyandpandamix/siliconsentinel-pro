"""Pipeline Orchestrator service.

Manages the full chip lifecycle as a sequence of stages. Each stage creates
an orchestration order record for audit trail and status tracking. Designed
with the interface pattern for future watsonx Orchestrate integration.
"""

import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.models.orchestration import OrchestrationOrder
from backend.schemas.orchestration import OrchestrationOrderResponse, PipelineStatusResponse

logger = logging.getLogger(__name__)

PIPELINE_STAGES = [
    ("DESIGN", "Design Co-Pilot Agent"),
    ("SIMULATION", "Simulation Agent"),
    ("OPTIMIZATION", "Optimization Agent"),
    ("BOM", "BOM Agent"),
    ("SUPPLY_CHAIN", "Supply Chain Agent"),
    ("FORECAST", "Yield Predictor Agent"),
    ("QC", "Defect Detection Agent"),
]

STAGE_SLA_MINUTES = {
    "DESIGN": 5,
    "SIMULATION": 10,
    "OPTIMIZATION": 10,
    "BOM": 5,
    "SUPPLY_CHAIN": 3,
    "FORECAST": 3,
    "QC": 10,
}


class OrchestratorService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_order(self, design_id: int, stage: str) -> OrchestrationOrder:
        agent_type = dict(PIPELINE_STAGES).get(stage, "Unknown Agent")
        sla_minutes = STAGE_SLA_MINUTES.get(stage, 10)

        now = datetime.now(timezone.utc)
        order = OrchestrationOrder(
            design_id=design_id,
            stage=stage,
            status="PROCESSING",
            agent_type=agent_type,
            sla_deadline=now + timedelta(minutes=sla_minutes),
            started_at=now,
        )
        self.db.add(order)
        # Flush to assign PKs (SQLite + SQLAlchemy sometimes can't `refresh()`
        # immediately after commit, even though the row exists).
        await self.db.flush()
        await self.db.commit()
        return order

    async def complete_order(self, order_id: int, success: bool = True, error: str | None = None):
        result = await self.db.execute(
            select(OrchestrationOrder).where(OrchestrationOrder.id == order_id)
        )
        order = result.scalar_one_or_none()
        if order:
            order.status = "COMPLETED" if success else "FAILED"
            order.completed_at = datetime.now(timezone.utc)
            if error:
                order.error_message = error
            await self.db.commit()

    async def get_pipeline_status(self, design_id: int) -> PipelineStatusResponse:
        result = await self.db.execute(
            select(OrchestrationOrder)
            .where(OrchestrationOrder.design_id == design_id)
            .order_by(OrchestrationOrder.created_at)
        )
        orders = result.scalars().all()

        order_responses = [OrchestrationOrderResponse.model_validate(o) for o in orders]

        completed_stages = {o.stage for o in orders if o.status == "COMPLETED"}
        failed = any(o.status == "FAILED" for o in orders)
        processing = any(o.status == "PROCESSING" for o in orders)

        total_stages = len(PIPELINE_STAGES)
        progress = len(completed_stages) / total_stages * 100 if total_stages > 0 else 0

        current_stage = None
        for stage, _ in PIPELINE_STAGES:
            if stage not in completed_stages:
                current_stage = stage
                break

        if failed:
            overall = "FAILED"
        elif len(completed_stages) == total_stages:
            overall = "COMPLETED"
        else:
            overall = "IN_PROGRESS"

        return PipelineStatusResponse(
            design_id=design_id,
            orders=order_responses,
            current_stage=current_stage,
            overall_status=overall,
            progress_pct=round(progress, 1),
        )
