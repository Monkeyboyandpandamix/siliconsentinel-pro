from pydantic import BaseModel, Field
from typing import Optional


class AccessibilityPrefsRequest(BaseModel):
    color_mode: str = "default"
    tts_enabled: bool = False
    tts_speed: float = Field(default=1.0, ge=0.5, le=2.0)
    tts_voice: str = "female"
    font_size: str = "standard"
    motion_reduced: bool = False


class AccessibilityPrefsResponse(BaseModel):
    id: int
    user_id: str
    color_mode: str
    tts_enabled: bool
    tts_speed: float
    tts_voice: str
    font_size: str
    motion_reduced: bool

    model_config = {"from_attributes": True}
