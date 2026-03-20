from sqlalchemy import Column, Integer, String, Float, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from backend.database import Base


class Design(Base):
    __tablename__ = "designs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), default="default", index=True)
    nl_input = Column(Text, nullable=False)
    constraints_json = Column(JSON, nullable=True)
    architecture_json = Column(JSON, nullable=True)
    material_recommendations = Column(JSON, nullable=True)
    process_node = Column(String(16), nullable=True)
    target_domain = Column(String(32), nullable=True)
    budget_ceiling = Column(Float, nullable=True)
    constraint_satisfaction = Column(JSON, nullable=True)
    status = Column(String(24), default="draft")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    simulations = relationship("Simulation", back_populates="design", cascade="all, delete-orphan")
    bom_entries = relationship("BOMEntry", back_populates="design", cascade="all, delete-orphan")
    optimization_runs = relationship("OptimizationRun", back_populates="design", cascade="all, delete-orphan")
    quality_checks = relationship("QualityCheck", back_populates="design", cascade="all, delete-orphan")
    orchestration_orders = relationship("OrchestrationOrder", back_populates="design", cascade="all, delete-orphan")
