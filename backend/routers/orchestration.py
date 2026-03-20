from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.orchestration import OrchestrationOrder
from backend.schemas.orchestration import OrchestrationOrderResponse, PipelineStatusResponse
from backend.services.orchestrator import OrchestratorService

router = APIRouter()


@router.get("/{design_id}/status", response_model=PipelineStatusResponse)
async def get_pipeline_status(design_id: int, db: AsyncSession = Depends(get_db)):
    service = OrchestratorService(db)
    status = await service.get_pipeline_status(design_id)
    return status


@router.get("/{design_id}/orders", response_model=list[OrchestrationOrderResponse])
async def list_orders(design_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OrchestrationOrder)
        .where(OrchestrationOrder.design_id == design_id)
        .order_by(OrchestrationOrder.created_at)
    )
    orders = result.scalars().all()
    return [OrchestrationOrderResponse.model_validate(o) for o in orders]
