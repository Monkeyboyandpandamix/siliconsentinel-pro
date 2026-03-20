"""Module 2: Digital Twin Simulation Engine service."""

import math
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.design import Design
from backend.models.simulation import Simulation
from backend.schemas.simulation import SimulationRequest, SimulationResponse
from backend.semiconductor.process_nodes import get_process_node
from backend.semiconductor.thermal_model import compute_thermal_map
from backend.semiconductor.power_model import compute_full_power_breakdown
from backend.semiconductor.signal_integrity import compute_signal_integrity, compute_timing_analysis

logger = logging.getLogger(__name__)


class SimulationEngineService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def run_simulation(self, design: Design, req: SimulationRequest) -> SimulationResponse:
        arch = design.architecture_json
        blocks = arch.get("blocks", [])
        process_node_name = arch.get("process_node", design.process_node or "28nm")
        pn = get_process_node(process_node_name)

        total_area = arch.get("total_area_mm2", sum(b.get("area_mm2", 1) for b in blocks))
        die_side_mm = max(math.sqrt(total_area) * 1.3, 1.0)

        clock_mhz = req.clock_mhz or self._infer_clock(blocks)
        voltage_v = req.voltage_v or pn.vdd_nominal_v

        # Apply workload scaling
        workload_scale = {"idle": 0.2, "typical": 1.0, "stress": 1.5}.get(req.workload_profile, 1.0)
        scaled_blocks = []
        for b in blocks:
            sb = dict(b)
            sb["power_mw"] = b.get("power_mw", 1.0) * workload_scale
            scaled_blocks.append(sb)

        thermal = compute_thermal_map(
            scaled_blocks, pn,
            ambient_temp_c=req.ambient_temp_c,
            grid_resolution=50,
        )

        power = compute_full_power_breakdown(scaled_blocks, pn, clock_mhz, voltage_v)

        signal = compute_signal_integrity(blocks, pn, die_side_mm)

        timing = compute_timing_analysis(blocks, pn, clock_mhz, die_side_mm)

        overall_score, pass_fail, bottlenecks = self._compute_verdict(
            thermal, power, signal, timing, pn
        )

        sim = Simulation(
            design_id=design.id,
            thermal_map_json=thermal,
            signal_data_json=signal,
            power_data_json=power,
            timing_data_json=timing,
            overall_score=overall_score,
            pass_fail=pass_fail,
            bottlenecks=bottlenecks,
        )
        self.db.add(sim)
        # Flush to assign PKs deterministically for the response.
        await self.db.flush()
        await self.db.commit()

        return SimulationResponse(
            id=sim.id,
            design_id=design.id,
            thermal=thermal,
            signal=signal,
            power=power,
            timing=timing,
            overall_score=overall_score,
            pass_fail=pass_fail,
            bottlenecks=bottlenecks,
            timestamp=sim.timestamp,
        )

    def _infer_clock(self, blocks: list[dict]) -> float:
        """Infer a reasonable clock from block specs."""
        clocks = [b["clock_mhz"] for b in blocks if b.get("clock_mhz")]
        return max(clocks) if clocks else 100.0

    def _compute_verdict(self, thermal, power, signal, timing, pn) -> tuple:
        """Compute overall pass/fail and score from sub-engine results."""
        scores = []
        bottlenecks = []

        # Thermal scoring (0-100)
        max_temp = thermal["max_temp_c"]
        if max_temp > pn.max_junction_temp_c:
            thermal_score = max(0, 100 - (max_temp - pn.max_junction_temp_c) * 5)
            bottlenecks.append({
                "category": "Thermal",
                "severity": "CRITICAL" if max_temp > pn.max_junction_temp_c + 10 else "WARNING",
                "detail": f"Max junction temperature {max_temp:.1f}°C exceeds limit of {pn.max_junction_temp_c}°C",
            })
        else:
            margin = pn.max_junction_temp_c - max_temp
            thermal_score = min(100, 70 + margin)
        scores.append(("thermal", thermal_score, 0.25))

        # Power scoring
        efficiency = power["power_efficiency_pct"]
        power_score = min(100, efficiency + 10)
        if efficiency < 60:
            bottlenecks.append({
                "category": "Power",
                "severity": "WARNING",
                "detail": f"Power efficiency {efficiency:.1f}% — high static leakage ratio",
            })
        scores.append(("power", power_score, 0.25))

        # Signal integrity scoring
        si_score = signal["worst_integrity_score"]
        if signal["timing_violations"] > 0:
            si_score = max(0, si_score - signal["timing_violations"] * 10)
            bottlenecks.append({
                "category": "Signal Integrity",
                "severity": "WARNING",
                "detail": f"{signal['timing_violations']} timing violations detected",
            })
        scores.append(("signal", si_score, 0.25))

        # Timing scoring
        if timing["timing_met"]:
            timing_score = min(100, 80 + timing["setup_slack_ns"] * 10)
        else:
            timing_score = max(0, 50 + timing["setup_slack_ns"] * 20)
            bottlenecks.append({
                "category": "Timing",
                "severity": "CRITICAL",
                "detail": f"Setup slack = {timing['setup_slack_ns']:.3f} ns — timing not met",
            })
        scores.append(("timing", timing_score, 0.25))

        overall = sum(s * w for _, s, w in scores)

        if overall >= 75 and not any(b["severity"] == "CRITICAL" for b in bottlenecks):
            pass_fail = "PASS"
        elif overall >= 50:
            pass_fail = "WARNING"
        else:
            pass_fail = "FAIL"

        return round(overall, 1), pass_fail, bottlenecks
