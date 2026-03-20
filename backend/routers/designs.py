from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.design import Design
from backend.schemas.design import DesignCreateRequest, DesignResponse
from backend.services.design_copilot import DesignCopilotService

router = APIRouter()


@router.post("", response_model=DesignResponse, status_code=201)
async def create_design(req: DesignCreateRequest, db: AsyncSession = Depends(get_db)):
    service = DesignCopilotService(db)
    design = await service.create_design(req)
    return design


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
