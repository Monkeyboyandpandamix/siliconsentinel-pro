from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os

from backend.database import get_db
from backend.config import get_settings
from backend.limiter import limiter
from backend.models.design import Design
from backend.schemas.quality import QualityCheckResponse
from backend.services.orchestrator import OrchestratorService
from backend.services.quality_inspector import QualityInspectorService

router = APIRouter()

# Max image upload size — 10 MB to prevent abuse
_MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# Allowed image content types
_ALLOWED_IMAGE_TYPES = {
    "image/jpeg", "image/png", "image/tiff", "image/bmp", "image/webp",
}


@router.post("/{design_id}/quality-check", response_model=QualityCheckResponse)
@limiter.limit("5/minute")
async def run_quality_check(
    request: Request,
    design_id: int,
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    content_type = (image.content_type or "").lower()
    if content_type and content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{content_type}'. Upload a JPEG, PNG, TIFF, BMP, or WebP image.",
        )

    orchestrator = OrchestratorService(db)
    order = await orchestrator.create_order(design_id, "QC")

    upload_dir = get_settings().upload_dir
    os.makedirs(upload_dir, exist_ok=True)

    safe_filename = os.path.basename(image.filename or "upload.jpg")
    image_path = os.path.join(upload_dir, f"qc_{design_id}_{safe_filename}")
    with open(image_path, "wb") as f:
        content = await image.read(_MAX_UPLOAD_BYTES + 1)
        if len(content) > _MAX_UPLOAD_BYTES:
            os.remove(image_path) if os.path.exists(image_path) else None
            raise HTTPException(
                status_code=413,
                detail=f"Image exceeds the 10 MB size limit ({len(content) / 1024 / 1024:.1f} MB uploaded).",
            )
        f.write(content)

    service = QualityInspectorService(db)
    try:
        qc_result = await service.inspect(design, image_path)
        await orchestrator.complete_order(order.id, success=True)
        return qc_result
    except Exception as exc:
        await orchestrator.complete_order(order.id, success=False, error=str(exc))
        raise
