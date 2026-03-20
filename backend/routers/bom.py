from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.design import Design
from backend.schemas.bom import BOMGenerateRequest, BOMResponse
from backend.services.bom_engine import BOMEngineService

router = APIRouter()


@router.post("/{design_id}/bom", response_model=BOMResponse)
async def generate_bom(design_id: int, req: BOMGenerateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    if not design.architecture_json:
        raise HTTPException(status_code=400, detail="Design has no architecture")

    service = BOMEngineService(db)
    bom = await service.generate_bom(design, req)
    return bom
