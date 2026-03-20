from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.design import Design
from backend.services.orchestrator import OrchestratorService
from backend.services.yield_predictor import YieldPredictorService

router = APIRouter()


@router.get("/{design_id}/predictions")
async def get_predictions(design_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    if not design.architecture_json:
        raise HTTPException(status_code=400, detail="Design has no architecture")

    orchestrator = OrchestratorService(db)
    order = await orchestrator.create_order(design_id, "FORECAST")
    service = YieldPredictorService(db)
    try:
        predictions = await service.predict(design)
        await orchestrator.complete_order(order.id, success=True)
        return predictions
    except Exception as exc:
        await orchestrator.complete_order(order.id, success=False, error=str(exc))
        raise
