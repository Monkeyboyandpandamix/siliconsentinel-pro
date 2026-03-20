from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ThermalZone(BaseModel):
    block_id: str
    block_name: str
    temperature_c: float
    power_density_w_mm2: float
    status: str  # SAFE, WARNING, CRITICAL


class ThermalMapData(BaseModel):
    grid: list[list[float]]
    grid_resolution: int
    max_temp_c: float
    min_temp_c: float
    ambient_temp_c: float
    zones: list[ThermalZone]
    hotspot_count: int


class SignalPath(BaseModel):
    from_block: str
    to_block: str
    delay_ps: float  # propagation delay in picoseconds
    integrity_score: float  # 0-100
    is_critical: bool
    crosstalk_risk: str  # LOW, MEDIUM, HIGH


class SignalData(BaseModel):
    paths: list[SignalPath]
    critical_path_delay_ps: float
    worst_integrity_score: float
    timing_violations: int


class PowerBreakdown(BaseModel):
    block_id: str
    block_name: str
    dynamic_power_mw: float
    static_power_mw: float
    total_power_mw: float
    percentage: float


class PowerData(BaseModel):
    blocks: list[PowerBreakdown]
    total_dynamic_mw: float
    total_static_mw: float
    total_power_mw: float
    power_efficiency_pct: float


class TimingData(BaseModel):
    critical_path_blocks: list[str]
    critical_path_delay_ns: float
    max_clock_mhz: float
    setup_slack_ns: float
    hold_slack_ns: float
    timing_met: bool


class SimulationRequest(BaseModel):
    clock_mhz: Optional[float] = None
    voltage_v: Optional[float] = None
    ambient_temp_c: float = 25.0
    workload_profile: str = "typical"  # idle, typical, stress


class SimulationResponse(BaseModel):
    id: int
    design_id: int
    thermal: ThermalMapData
    signal: SignalData
    power: PowerData
    timing: TimingData
    overall_score: float
    pass_fail: str
    bottlenecks: list[dict]
    timestamp: datetime

    model_config = {"from_attributes": True}
