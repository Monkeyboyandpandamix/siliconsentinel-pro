from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BlockSpec(BaseModel):
    id: str
    name: str
    type: str  # cpu, memory, io, power, rf, analog, dsp, accelerator
    power_mw: float = Field(description="Power consumption in milliwatts")
    area_mm2: float = Field(description="Area in mm²")
    x: float = 0
    y: float = 0
    width: float = 10
    height: float = 10
    connections: list[str] = []
    clock_mhz: Optional[float] = None
    description: Optional[str] = None


class ArchitectureBlueprint(BaseModel):
    name: str
    process_node: str
    total_power_mw: float
    total_area_mm2: float
    blocks: list[BlockSpec]
    metal_layers: int = 6
    substrate: str = "silicon"
    gate_oxide: str = "HfO2"
    interconnect: str = "copper"


class DesignConstraints(BaseModel):
    max_power_mw: Optional[float] = None
    max_area_mm2: Optional[float] = None
    min_clock_mhz: Optional[float] = None
    max_temp_c: Optional[float] = 85.0
    budget_per_unit: Optional[float] = None
    target_volume: Optional[int] = None
    process_node: Optional[str] = None
    application_domain: Optional[str] = None


class DesignCreateRequest(BaseModel):
    nl_input: str = Field(description="Natural language chip description")
    constraints: Optional[DesignConstraints] = None
    process_node: Optional[str] = None
    target_domain: Optional[str] = None
    budget_ceiling: Optional[float] = None


class ApplyInstructionRequest(BaseModel):
    instruction: str = Field(description="Instruction to apply to the existing architecture")


class ConstraintSatisfaction(BaseModel):
    power: float = Field(ge=0, le=100, description="% satisfaction")
    area: float = Field(ge=0, le=100)
    performance: float = Field(ge=0, le=100)
    thermal: float = Field(ge=0, le=100)
    cost: float = Field(ge=0, le=100)
    overall: float = Field(ge=0, le=100)


class MaterialRecommendation(BaseModel):
    substrate: str
    gate_oxide: str
    metal_layers: int
    interconnect_material: str
    doping_type: str
    passivation: str
    justification: str


class DesignResponse(BaseModel):
    id: int
    nl_input: str
    architecture: Optional[ArchitectureBlueprint] = None
    materials: Optional[MaterialRecommendation] = None
    constraint_satisfaction: Optional[ConstraintSatisfaction] = None
    process_node: Optional[str] = None
    target_domain: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
