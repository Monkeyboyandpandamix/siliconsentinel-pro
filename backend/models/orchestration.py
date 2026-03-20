from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from backend.database import Base


class OrchestrationOrder(Base):
    __tablename__ = "orchestration_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    design_id = Column(Integer, ForeignKey("designs.id"), nullable=False, index=True)
    stage = Column(String(32), nullable=False)  # DESIGN, SIMULATION, OPTIMIZATION, BOM, SUPPLY_CHAIN, FORECAST, QC
    status = Column(String(16), default="QUEUED")  # QUEUED, PROCESSING, COMPLETED, FAILED
    agent_type = Column(String(64), nullable=True)
    sla_deadline = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    design = relationship("Design", back_populates="orchestration_orders")
