from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.design import Design
from backend.schemas.optimization import OptimizationRequest, OptimizationResponse
from backend.services.optimizer import OptimizerService

router = APIRouter()


@router.post("/{design_id}/optimize", response_model=OptimizationResponse)
async def optimize_design(design_id: int, req: OptimizationRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    if not design.architecture_json:
        raise HTTPException(status_code=400, detail="Design has no architecture")

    service = OptimizerService(db)
    optimization = await service.optimize(design, req)
    return optimization
