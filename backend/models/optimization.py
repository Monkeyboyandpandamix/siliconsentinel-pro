from sqlalchemy import Column, Integer, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from backend.database import Base


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    design_id = Column(Integer, ForeignKey("designs.id"), nullable=False, index=True)
    iteration = Column(Integer, nullable=False, default=1)
    metrics_before_json = Column(JSON, nullable=True)
    metrics_after_json = Column(JSON, nullable=True)
    optimized_architecture_json = Column(JSON, nullable=True)
    improvement_pct = Column(Float, nullable=True)
    ppca_scores_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    design = relationship("Design", back_populates="optimization_runs")
