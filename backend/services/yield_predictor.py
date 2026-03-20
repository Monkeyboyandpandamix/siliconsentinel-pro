"""Module 4: Predictive Manufacturing Intelligence service."""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.models.design import Design
from backend.models.simulation import Simulation
from backend.models.bom import BOMEntry
from backend.semiconductor.process_nodes import get_process_node
from backend.semiconductor.yield_model import compute_yield_prediction

logger = logging.getLogger(__name__)


class YieldPredictorService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def predict(self, design: Design) -> dict:
        arch = design.architecture_json
        blocks = arch.get("blocks", [])
        pn = get_process_node(arch.get("process_node", design.process_node or "28nm"))

        total_area = arch.get("total_area_mm2", sum(b.get("area_mm2", 0) for b in blocks))
        metal_layers = arch.get("metal_layers", pn.metal_layers_typical)

        complexity = 1.0 + len(blocks) * 0.02
        yield_data = compute_yield_prediction(total_area, pn, metal_layers, complexity)

        defect_zones = self._predict_defect_zones(blocks, arch)
        delay_forecast = await self._forecast_delays(design)
        shortage_risks = await self._predict_shortages(design)

        return {
            "yield": yield_data,
            "defect_zones": defect_zones,
            "delay_forecast": delay_forecast,
            "shortage_risks": shortage_risks,
        }

    def _predict_defect_zones(self, blocks: list[dict], arch: dict) -> list[dict]:
        """Identify high-risk defect zones based on thermal + wiring density."""
        zones = []
        for block in blocks:
            power_density = block.get("power_mw", 0) / max(block.get("area_mm2", 0.01), 0.01)
            connection_count = len(block.get("connections", []))

            risk_score = 0
            risk_factors = []

            if power_density > 50:
                risk_score += 40
                risk_factors.append(f"High power density: {power_density:.1f} mW/mm²")
            elif power_density > 20:
                risk_score += 20
                risk_factors.append(f"Moderate power density: {power_density:.1f} mW/mm²")

            if connection_count > 4:
                risk_score += 30
                risk_factors.append(f"High wiring density: {connection_count} connections")
            elif connection_count > 2:
                risk_score += 15
                risk_factors.append(f"Moderate wiring density: {connection_count} connections")

            area = block.get("area_mm2", 1.0)
            if area < 0.1:
                risk_score += 20
                risk_factors.append(f"Small block area ({area:.2f} mm²) increases lithography risk")

            if risk_score >= 50:
                risk_level = "HIGH"
            elif risk_score >= 25:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            zones.append({
                "block_id": block.get("id"),
                "block_name": block.get("name"),
                "risk_level": risk_level,
                "risk_score": min(100, risk_score),
                "risk_factors": risk_factors,
                "x": block.get("x", 0),
                "y": block.get("y", 0),
                "width": block.get("width", 10),
                "height": block.get("height", 10),
            })

        zones.sort(key=lambda z: z["risk_score"], reverse=True)
        return zones

    async def _forecast_delays(self, design: Design) -> dict:
        """Forecast manufacturing delays based on BOM lead times and fab complexity."""
        result = await self.db.execute(
            select(BOMEntry).where(BOMEntry.design_id == design.id)
        )
        bom_entries = result.scalars().all()

        if not bom_entries:
            return {
                "estimated_total_weeks": 12,
                "risk_level": "MEDIUM",
                "risk_score": 50,
                "critical_items": [],
                "detail": "No BOM generated yet — using industry average estimate of 12 weeks.",
            }

        max_lead_time = max((e.lead_time_days or 7 for e in bom_entries), default=7)
        fab_weeks = 8  # typical fab cycle time
        packaging_weeks = 3
        test_weeks = 1

        total_weeks = fab_weeks + (max_lead_time / 7) + packaging_weeks + test_weeks

        critical_items = [
            {
                "part_number": e.part_number,
                "description": e.description,
                "lead_time_days": e.lead_time_days,
                "availability": e.availability,
            }
            for e in bom_entries
            if (e.lead_time_days or 0) >= 21 or e.availability == "Backorder"
        ]

        risk_score = min(100, int(total_weeks * 3 + len(critical_items) * 10))
        risk_level = "CRITICAL" if risk_score > 75 else "HIGH" if risk_score > 50 else "MEDIUM" if risk_score > 25 else "LOW"

        return {
            "estimated_total_weeks": round(total_weeks, 1),
            "fab_weeks": fab_weeks,
            "component_lead_weeks": round(max_lead_time / 7, 1),
            "packaging_weeks": packaging_weeks,
            "test_weeks": test_weeks,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "critical_items": critical_items,
        }

    async def _predict_shortages(self, design: Design) -> list[dict]:
        """Predict component shortage risks based on supplier concentration."""
        result = await self.db.execute(
            select(BOMEntry).where(BOMEntry.design_id == design.id)
        )
        bom_entries = result.scalars().all()

        if not bom_entries:
            return []

        supplier_counts: dict[str, int] = {}
        for e in bom_entries:
            sup = e.supplier or "Unknown"
            supplier_counts[sup] = supplier_counts.get(sup, 0) + 1

        total = len(bom_entries)
        at_risk = []

        for entry in bom_entries:
            risk_factors = []
            risk_score = 0

            if entry.availability == "Backorder":
                risk_score += 50
                risk_factors.append("Currently on backorder")
            elif entry.availability == "Limited":
                risk_score += 25
                risk_factors.append("Limited stock availability")

            if (entry.lead_time_days or 0) > 28:
                risk_score += 25
                risk_factors.append(f"Long lead time: {entry.lead_time_days} days")

            supplier = entry.supplier or "Unknown"
            supplier_share = supplier_counts.get(supplier, 0) / total
            if supplier_share > 0.3:
                risk_score += 15
                risk_factors.append(f"Supplier concentration: {supplier} supplies {supplier_share*100:.0f}% of BOM")

            if risk_score > 0:
                risk_level = "CRITICAL" if risk_score > 60 else "WARNING" if risk_score > 30 else "OK"
                at_risk.append({
                    "part_number": entry.part_number,
                    "description": entry.description,
                    "supplier": supplier,
                    "risk_level": risk_level,
                    "risk_score": min(100, risk_score),
                    "risk_factors": risk_factors,
                })

        at_risk.sort(key=lambda x: x["risk_score"], reverse=True)
        return at_risk
