from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.accessibility import AccessibilityPrefs
from backend.schemas.accessibility import AccessibilityPrefsRequest, AccessibilityPrefsResponse

router = APIRouter()


@router.get("/{user_id}", response_model=AccessibilityPrefsResponse)
async def get_prefs(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AccessibilityPrefs).where(AccessibilityPrefs.user_id == user_id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = AccessibilityPrefs(user_id=user_id)
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
    return AccessibilityPrefsResponse.model_validate(prefs)


@router.put("/{user_id}", response_model=AccessibilityPrefsResponse)
async def update_prefs(user_id: str, req: AccessibilityPrefsRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AccessibilityPrefs).where(AccessibilityPrefs.user_id == user_id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = AccessibilityPrefs(user_id=user_id)
        db.add(prefs)

    prefs.color_mode = req.color_mode
    prefs.tts_enabled = req.tts_enabled
    prefs.tts_speed = req.tts_speed
    prefs.tts_voice = req.tts_voice
    prefs.font_size = req.font_size
    prefs.motion_reduced = req.motion_reduced

    await db.commit()
    await db.refresh(prefs)
    return AccessibilityPrefsResponse.model_validate(prefs)
