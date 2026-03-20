from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from backend.database import Base


class BOMEntry(Base):
    __tablename__ = "bom_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    design_id = Column(Integer, ForeignKey("designs.id"), nullable=False, index=True)
    part_number = Column(String(64), nullable=False)
    description = Column(String(256), nullable=False)
    category = Column(String(64), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    lead_time_days = Column(Integer, nullable=True)
    availability = Column(String(24), default="In Stock")
    supplier = Column(String(128), nullable=True)
    alternate_parts_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    design = relationship("Design", back_populates="bom_entries")
