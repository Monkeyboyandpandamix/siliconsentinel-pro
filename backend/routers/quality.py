from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

from backend.database import get_db
from backend.config import get_settings
from backend.models.design import Design
from backend.schemas.quality import QualityCheckResponse
from backend.services.quality_inspector import QualityInspectorService

router = APIRouter()


@router.post("/{design_id}/quality-check", response_model=QualityCheckResponse)
async def run_quality_check(
    design_id: int,
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    upload_dir = get_settings().upload_dir
    os.makedirs(upload_dir, exist_ok=True)
    image_path = os.path.join(upload_dir, f"qc_{design_id}_{image.filename}")
    with open(image_path, "wb") as f:
        content = await image.read()
        f.write(content)

    service = QualityInspectorService(db)
    qc_result = await service.inspect(design, image_path)
    return qc_result
