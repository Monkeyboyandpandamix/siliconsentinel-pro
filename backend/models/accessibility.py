from sqlalchemy import Column, Integer, String, Float, Boolean
from datetime import datetime, timezone

from backend.database import Base


class AccessibilityPrefs(Base):
    __tablename__ = "accessibility_prefs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), unique=True, nullable=False, index=True)
    color_mode = Column(String(24), default="default")  # default, high_contrast, pattern_color, grayscale
    tts_enabled = Column(Boolean, default=False)
    tts_speed = Column(Float, default=1.0)
    tts_voice = Column(String(16), default="female")
    font_size = Column(String(16), default="standard")  # standard, large, extra_large
    motion_reduced = Column(Boolean, default=False)
