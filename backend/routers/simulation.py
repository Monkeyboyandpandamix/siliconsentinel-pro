from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.design import Design
from backend.schemas.simulation import SimulationRequest, SimulationResponse
from backend.services.orchestrator import OrchestratorService
from backend.services.simulation_engine import SimulationEngineService

router = APIRouter()


@router.post("/{design_id}/simulate", response_model=SimulationResponse)
async def run_simulation(design_id: int, req: SimulationRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    if not design.architecture_json:
        raise HTTPException(status_code=400, detail="Design has no architecture — generate one first")

    orchestrator = OrchestratorService(db)
    order = await orchestrator.create_order(design_id, "SIMULATION")
    service = SimulationEngineService(db)
    try:
        sim = await service.run_simulation(design, req)
        await orchestrator.complete_order(order.id, success=True)
        return sim
    except Exception as exc:
        await orchestrator.complete_order(order.id, success=False, error=str(exc))
        raise
