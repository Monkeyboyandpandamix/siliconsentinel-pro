"""Module 3: AI Optimization Engine service."""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.models.design import Design
from backend.models.optimization import OptimizationRun
from backend.models.simulation import Simulation
from backend.schemas.optimization import OptimizationRequest, OptimizationResponse, PPCAScores, OptimizationMetrics
from backend.services.ai_provider import get_ai_provider
from backend.semiconductor.process_nodes import get_process_node
from backend.semiconductor.power_model import compute_full_power_breakdown
from backend.semiconductor.yield_model import compute_yield_prediction

logger = logging.getLogger(__name__)


class OptimizerService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai = get_ai_provider()

    async def optimize(self, design: Design, req: OptimizationRequest) -> OptimizationResponse:
        arch = design.architecture_json
        blocks = arch.get("blocks", [])
        pn = get_process_node(arch.get("process_node", design.process_node or "28nm"))

        # Get latest simulation for context
        result = await self.db.execute(
            select(Simulation)
            .where(Simulation.design_id == design.id)
            .order_by(Simulation.timestamp.desc())
            .limit(1)
        )
        latest_sim = result.scalar_one_or_none()
        sim_summary = {}
        if latest_sim:
            sim_summary = {
                "overall_score": latest_sim.overall_score,
                "pass_fail": latest_sim.pass_fail,
                "bottlenecks": latest_sim.bottlenecks,
                "max_temp": latest_sim.thermal_map_json.get("max_temp_c") if latest_sim.thermal_map_json else None,
                "total_power_mw": latest_sim.power_data_json.get("total_power_mw") if latest_sim.power_data_json else None,
            }

        metrics_before = self._compute_metrics(arch, blocks, pn)

        ai_result = await self.ai.optimize_design(arch, sim_summary, req.focus)

        optimized_blocks = ai_result.get("optimized_blocks", blocks)
        optimized_arch = dict(arch)
        optimized_arch["blocks"] = optimized_blocks
        optimized_arch["total_power_mw"] = sum(b.get("power_mw", 0) for b in optimized_blocks)
        optimized_arch["total_area_mm2"] = sum(b.get("area_mm2", 0) for b in optimized_blocks)

        metrics_after = self._compute_metrics(optimized_arch, optimized_blocks, pn)

        improvement_pct = 0.0
        if metrics_before.total_power_mw > 0:
            power_improvement = (metrics_before.total_power_mw - metrics_after.total_power_mw) / metrics_before.total_power_mw * 100
            area_improvement = (metrics_before.total_area_mm2 - metrics_after.total_area_mm2) / max(metrics_before.total_area_mm2, 0.01) * 100
            improvement_pct = (power_improvement + area_improvement) / 2

        ppca_before = self._compute_ppca(metrics_before)
        ppca_after = self._compute_ppca(metrics_after)

        # Get iteration count
        count_result = await self.db.execute(
            select(func.count()).where(OptimizationRun.design_id == design.id)
        )
        iteration = (count_result.scalar() or 0) + 1

        opt_run = OptimizationRun(
            design_id=design.id,
            iteration=iteration,
            metrics_before_json=metrics_before.model_dump(),
            metrics_after_json=metrics_after.model_dump(),
            optimized_architecture_json=optimized_arch,
            improvement_pct=round(improvement_pct, 2),
            ppca_scores_json={
                "before": ppca_before.model_dump(),
                "after": ppca_after.model_dump(),
            },
        )
        self.db.add(opt_run)
        # Flush to assign PKs; avoids fragile refresh() timing on SQLite.
        await self.db.flush()

        design.architecture_json = optimized_arch
        await self.db.commit()

        return OptimizationResponse(
            id=opt_run.id,
            design_id=design.id,
            iteration=iteration,
            metrics_before=metrics_before,
            metrics_after=metrics_after,
            improvement_pct=round(improvement_pct, 2),
            ppca_before=ppca_before,
            ppca_after=ppca_after,
            changes_summary=ai_result.get("changes", []),
            optimized_architecture=optimized_arch,
            timestamp=opt_run.timestamp,
        )

    def _compute_metrics(self, arch: dict, blocks: list[dict], pn) -> OptimizationMetrics:
        power_data = compute_full_power_breakdown(blocks, pn)
        total_area = arch.get("total_area_mm2", sum(b.get("area_mm2", 0) for b in blocks))
        yield_data = compute_yield_prediction(total_area, pn, arch.get("metal_layers", pn.metal_layers_typical))
        cost = yield_data["fab_cost_per_good_die"]

        return OptimizationMetrics(
            total_power_mw=power_data["total_power_mw"],
            total_area_mm2=round(total_area, 2),
            critical_path_delay_ns=0.5,
            max_temperature_c=45.0,
            estimated_yield_pct=yield_data["yield_pct"],
            estimated_cost_per_unit=cost,
        )

    def _compute_ppca(self, m: OptimizationMetrics) -> PPCAScores:
        power_score = max(0, min(100, 100 - m.total_power_mw * 0.1))
        perf_score = max(0, min(100, 100 - m.critical_path_delay_ns * 20))
        cost_score = max(0, min(100, 100 - m.estimated_cost_per_unit * 2))
        area_score = max(0, min(100, 100 - m.total_area_mm2 * 2))

        return PPCAScores(
            power=round(power_score, 1),
            performance=round(perf_score, 1),
            cost=round(cost_score, 1),
            area=round(area_score, 1),
        )
