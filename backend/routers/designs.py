from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.limiter import limiter
from backend.models.design import Design
from backend.schemas.design import DesignCreateRequest, DesignResponse, ApplyInstructionRequest
from backend.services.design_copilot import DesignCopilotService
from backend.services.orchestrator import OrchestratorService

router = APIRouter()


@router.post("", response_model=DesignResponse, status_code=201)
@limiter.limit("10/minute")
async def create_design(request: Request, req: DesignCreateRequest, db: AsyncSession = Depends(get_db)):
    service = DesignCopilotService(db)
    try:
        design = await service.create_design(req)
        orchestrator = OrchestratorService(db)
        order = await orchestrator.create_order(design.id, "DESIGN")
        await orchestrator.complete_order(order.id, success=True)
        return design
    except Exception:
        raise


@router.get("", response_model=list[DesignResponse])
async def list_designs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Design).order_by(Design.created_at.desc()))
    designs = result.scalars().all()
    responses = []
    for d in designs:
        responses.append(DesignResponse(
            id=d.id,
            nl_input=d.nl_input,
            architecture=d.architecture_json,
            materials=d.material_recommendations,
            constraint_satisfaction=d.constraint_satisfaction,
            process_node=d.process_node,
            target_domain=d.target_domain,
            status=d.status,
            created_at=d.created_at,
        ))
    return responses


@router.get("/{design_id}", response_model=DesignResponse)
async def get_design(design_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    return DesignResponse(
        id=design.id,
        nl_input=design.nl_input,
        architecture=design.architecture_json,
        materials=design.material_recommendations,
        constraint_satisfaction=design.constraint_satisfaction,
        process_node=design.process_node,
        target_domain=design.target_domain,
        status=design.status,
        created_at=design.created_at,
    )


@router.post("/{design_id}/apply-instruction", response_model=DesignResponse)
@limiter.limit("10/minute")
async def apply_instruction(
    request: Request,
    design_id: int,
    req: ApplyInstructionRequest,
    db: AsyncSession = Depends(get_db),
):
    service = DesignCopilotService(db)
    # Load design
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")
    return await service.apply_instruction_to_design(design, req.instruction)
