from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from backend.database import Base


class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    design_id = Column(Integer, ForeignKey("designs.id"), nullable=False, index=True)
    thermal_map_json = Column(JSON, nullable=True)
    signal_data_json = Column(JSON, nullable=True)
    power_data_json = Column(JSON, nullable=True)
    timing_data_json = Column(JSON, nullable=True)
    overall_score = Column(Float, nullable=True)
    pass_fail = Column(String(8), nullable=True)  # PASS / WARNING / FAIL
    bottlenecks = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    design = relationship("Design", back_populates="simulations")
