from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from backend.database import Base


class QualityCheck(Base):
    __tablename__ = "quality_checks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    design_id = Column(Integer, ForeignKey("designs.id"), nullable=False, index=True)
    image_path = Column(String(512), nullable=True)
    defect_map_json = Column(JSON, nullable=True)
    defect_count = Column(Integer, default=0)
    defect_types_json = Column(JSON, nullable=True)
    pass_fail = Column(String(8), nullable=True)
    confidence = Column(Float, nullable=True)
    root_cause = Column(Text, nullable=True)
    design_rule_updates = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    design = relationship("Design", back_populates="quality_checks")
