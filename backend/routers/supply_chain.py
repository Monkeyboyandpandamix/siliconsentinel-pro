from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.design import Design
from backend.services.orchestrator import OrchestratorService
from backend.services.supply_chain import SupplyChainService

router = APIRouter()


@router.get("/{design_id}/supply-chain")
async def get_supply_chain(design_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    if not design.architecture_json:
        raise HTTPException(status_code=400, detail="Design has no architecture")

    orchestrator = OrchestratorService(db)
    order = await orchestrator.create_order(design_id, "SUPPLY_CHAIN")
    service = SupplyChainService(db)
    try:
        analysis = await service.analyze(design)
        await orchestrator.complete_order(order.id, success=True)
        return analysis
    except Exception as exc:
        await orchestrator.complete_order(order.id, success=False, error=str(exc))
        raise
