from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import httpx

from backend.database import get_db
from backend.config import get_settings
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


# ─── Watson TTS speak endpoint ────────────────────────────────────────────────

WATSON_VOICE_MAP: dict[str, str] = {
    "female": "en-US_AllisonV3Voice",
    "male": "en-US_HenryV3Voice",
    "allison": "en-US_AllisonV3Voice",
    "lisa": "en-US_LisaV3Voice",
    "michael": "en-US_MichaelV3Voice",
    "henry": "en-US_HenryV3Voice",
    "kevin": "en-US_KevinV3Voice",
    "olivia": "en-GB_OliviaV3Voice",
    "charlotte": "en-GB_CharlotteV3Voice",
}


class TTSSpeakRequest(BaseModel):
    text: str
    voice: str = "female"
    speed: float = 1.0


@router.post("/tts/speak")
async def tts_speak(req: TTSSpeakRequest):
    settings = get_settings()
    api_key = settings.watson_tts_api_key
    tts_url = settings.watson_tts_url.rstrip("/")

    if not api_key or not tts_url:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Watson TTS not configured")

    watson_voice = WATSON_VOICE_MAP.get(req.voice.lower(), "en-US_AllisonV3Voice")
    text = req.text[:5000]

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{tts_url}/v1/synthesize",
            auth=(  "apikey", api_key),
            headers={"Content-Type": "application/json", "Accept": "audio/mp3"},
            params={"voice": watson_voice},
            json={"text": text},
        )
        resp.raise_for_status()
        return Response(
            content=resp.content,
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-store"},
        )
