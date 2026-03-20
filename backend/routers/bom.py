from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.design import Design
from backend.schemas.bom import BOMGenerateRequest, BOMResponse
from backend.services.bom_engine import BOMEngineService
from backend.services.orchestrator import OrchestratorService

router = APIRouter()


@router.post("/{design_id}/bom", response_model=BOMResponse)
async def generate_bom(design_id: int, req: BOMGenerateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    if not design.architecture_json:
        raise HTTPException(status_code=400, detail="Design has no architecture")

    orchestrator = OrchestratorService(db)
    order = await orchestrator.create_order(design_id, "BOM")
    service = BOMEngineService(db)
    try:
        bom = await service.generate_bom(design, req)
        await orchestrator.complete_order(order.id, success=True)
        return bom
    except Exception as exc:
        await orchestrator.complete_order(order.id, success=False, error=str(exc))
        raise
