"""Module 5: BOM Engine service with realistic component catalog."""

import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete

from backend.models.design import Design
from backend.models.bom import BOMEntry
from backend.schemas.bom import (
    BOMGenerateRequest, BOMResponse, BOMEntryResponse,
    CostBreakdown, CostScenario, AlternatePart,
)
from backend.services.ai_provider import get_ai_provider
from backend.services.nexar_client import get_live_price
from backend.semiconductor.process_nodes import get_process_node, estimate_dies_per_wafer
from backend.semiconductor.component_db import get_standard_bom_for_domain

logger = logging.getLogger(__name__)


class BOMEngineService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai = get_ai_provider()

    async def generate_bom(self, design: Design, req: BOMGenerateRequest) -> BOMResponse:
        arch = design.architecture_json
        blocks = arch.get("blocks", [])
        pn = get_process_node(arch.get("process_node", design.process_node or "28nm"))
        domain = design.target_domain or "general"

        block_types = [b.get("type", "cpu") for b in blocks]
        catalog_entries = get_standard_bom_for_domain(domain, block_types)

        try:
            ai_entries = await self.ai.generate_bom(arch, domain)
        except Exception as e:
            logger.warning(f"AI BOM generation failed, using catalog only: {e}")
            ai_entries = []

        merged = self._merge_bom_sources(catalog_entries, ai_entries)

        # Attempt to enrich up to 8 entries with live pricing (Nexar/Mouser).
        # Fire requests concurrently; fall back to catalog price on any failure.
        try:
            live_tasks = [
                get_live_price(entry.get("part_number", ""))
                for entry in merged[:8]
            ]
            live_results = await asyncio.gather(*live_tasks, return_exceptions=True)
            for entry, live in zip(merged[:8], live_results):
                if isinstance(live, dict) and live.get("unit_price"):
                    entry["unit_price"]   = live["unit_price"]
                    entry["availability"] = live.get("availability", entry.get("availability", "In Stock"))
                    if live.get("supplier"):
                        entry["supplier"] = live["supplier"]
                    entry["price_source"] = live.get("source", "live")
        except Exception as exc:
            logger.warning(f"Live pricing enrichment error: {exc}")

        # Clear previous BOM
        await self.db.execute(delete(BOMEntry).where(BOMEntry.design_id == design.id))

        db_entries = []
        for i, entry in enumerate(merged):
            alt = entry.get("alternate")
            bom = BOMEntry(
                design_id=design.id,
                part_number=entry["part_number"],
                description=entry["description"],
                category=entry.get("category", "Other"),
                quantity=entry.get("quantity", 1),
                unit_price=entry.get("unit_price", 0),
                lead_time_days=entry.get("lead_time_days"),
                availability=entry.get("availability", "In Stock"),
                supplier=entry.get("supplier"),
                alternate_parts_json=[alt] if alt else None,
            )
            self.db.add(bom)
            db_entries.append(bom)

        await self.db.commit()
        for b in db_entries:
            await self.db.refresh(b)

        total_bom_cost = sum(e.unit_price * e.quantity for e in db_entries)
        total_area = arch.get("total_area_mm2", 1.0)
        cost_breakdown = self._compute_cost_breakdown(total_bom_cost, total_area, pn, req.volume)
        scenarios = self._generate_scenarios(cost_breakdown, total_bom_cost, db_entries)
        critical_path = self._find_lead_time_critical_path(db_entries)
        diversity_score, diversity_risk = self._compute_supplier_diversity(db_entries)

        response_entries = []
        for e in db_entries:
            alternates = []
            if e.alternate_parts_json:
                for a in e.alternate_parts_json:
                    if a:
                        alternates.append(AlternatePart(
                            part_number=a.get("part_number", ""),
                            description=a.get("description", ""),
                            unit_price=a.get("unit_price", 0),
                            lead_time_days=a.get("lead_time_days", 7),
                            savings_pct=a.get("savings_pct", round((1 - a.get("unit_price", 0) / max(e.unit_price, 0.001)) * 100, 1)),
                        ))
            response_entries.append(BOMEntryResponse(
                id=e.id,
                part_number=e.part_number,
                description=e.description,
                category=e.category or "Other",
                quantity=e.quantity,
                unit_price=e.unit_price,
                total_price=round(e.unit_price * e.quantity, 4),
                lead_time_days=e.lead_time_days,
                availability=e.availability,
                supplier=e.supplier,
                alternates=alternates,
            ))

        return BOMResponse(
            design_id=design.id,
            entries=response_entries,
            total_bom_cost=round(total_bom_cost, 2),
            cost_breakdown=cost_breakdown,
            scenarios=scenarios,
            lead_time_critical_path=critical_path,
            supplier_diversity_score=diversity_score,
            supplier_diversity_risk=diversity_risk,
        )

    def _merge_bom_sources(self, catalog: list[dict], ai: list[dict]) -> list[dict]:
        """Merge catalog and AI-generated BOM, preferring catalog for known parts."""
        seen_categories = set()
        merged = []
        for c in catalog:
            merged.append(c)
            seen_categories.add(c.get("category", "").lower())

        for a in ai:
            cat = a.get("category", "").lower()
            if cat not in seen_categories:
                merged.append(a)

        return merged

    def _compute_cost_breakdown(self, bom_cost: float, die_area_mm2: float, pn, volume: int) -> CostBreakdown:
        dpw = estimate_dies_per_wafer(die_area_mm2, pn.wafer_diameter_mm, pn.typical_die_edge_exclusion_mm)
        fab_per_die = pn.fab_cost_per_wafer_usd / max(dpw, 1)
        packaging = 0.15 if die_area_mm2 < 10 else 0.50
        test_cost = 0.05
        overhead_pct = 15.0
        subtotal = bom_cost + fab_per_die + packaging + test_cost
        total = subtotal * (1 + overhead_pct / 100)

        return CostBreakdown(
            bom_cost=round(bom_cost, 2),
            fab_cost_per_wafer=pn.fab_cost_per_wafer_usd,
            dies_per_wafer=dpw,
            fab_cost_per_die=round(fab_per_die, 2),
            packaging_cost=packaging,
            test_cost=test_cost,
            overhead_pct=overhead_pct,
            total_per_unit=round(total, 2),
        )

    def _generate_scenarios(
        self, baseline: CostBreakdown, bom_cost: float, entries: list[BOMEntry]
    ) -> list[CostScenario]:
        """
        Generate three cost tiers derived from the actual BOM entries.
        Descriptions reference the real top-cost components and realistic substitution paths.
        """
        # Rank entries by total line cost (desc) to surface the drivers
        sorted_entries = sorted(entries, key=lambda e: e.unit_price * e.quantity, reverse=True)
        top_parts = sorted_entries[:3]

        # Build human-readable driver text for the top cost line items
        driver_names = [f"{e.description.split(',')[0]} ({e.part_number})" for e in top_parts]
        driver_str = driver_names[0] if driver_names else "primary ICs"
        driver2 = driver_names[1] if len(driver_names) > 1 else "passive components"

        # Count long lead-time parts (>28 days)
        long_lead = [e for e in entries if (e.lead_time_days or 0) > 28]
        long_lead_str = f"{len(long_lead)} part(s) with >28-day lead times" if long_lead else "all parts <28-day lead"

        # Supplier count
        suppliers = set(e.supplier for e in entries if e.supplier)
        supplier_str = f"{len(suppliers)} distinct supplier(s)" if suppliers else "mixed supplier base"

        # Tier pricing based on actual BOM totals
        budget_bom  = round(bom_cost * 0.78, 2)
        balanced_bom = round(bom_cost, 2)
        premium_bom  = round(bom_cost * 1.28, 2)

        budget_total  = round(baseline.total_per_unit * 0.75, 2)
        balanced_total = baseline.total_per_unit
        premium_total  = round(baseline.total_per_unit * 1.38, 2)

        return [
            CostScenario(
                name="Budget",
                description=(
                    f"Substitute {driver_str} with pin-compatible economy alternates; "
                    f"reduce test coverage; single-source to cut BOM to ${budget_bom:.2f}"
                ),
                total_per_unit=budget_total,
                bom_cost=budget_bom,
                tradeoffs=(
                    f"BOM drops to ${budget_bom:.2f} by downgrading {driver_str} and {driver2}. "
                    f"Accepts 10–15% timing/thermal margin reduction and single-source risk. "
                    f"{long_lead_str}."
                ),
            ),
            CostScenario(
                name="Balanced",
                description=(
                    f"As-designed BOM (${balanced_bom:.2f}) across {supplier_str}. "
                    f"Meets all constraints; dual-source on critical path."
                ),
                total_per_unit=balanced_total,
                bom_cost=balanced_bom,
                tradeoffs=(
                    f"${balanced_bom:.2f} BOM from {supplier_str}. "
                    f"Top cost driver: {driver_str}. "
                    f"All design rule and thermal constraints met. "
                    f"{long_lead_str}."
                ),
            ),
            CostScenario(
                name="Premium",
                description=(
                    f"Upgrade {driver_str} to industrial/automotive grade; "
                    f"dual-source all {len(entries)} lines; priority allocation — BOM ${premium_bom:.2f}"
                ),
                total_per_unit=premium_total,
                bom_cost=premium_bom,
                tradeoffs=(
                    f"BOM rises to ${premium_bom:.2f} with AEC-Q100/Q200 graded {driver_str}, "
                    f"100% incoming inspection, and geographically diverse {supplier_str}. "
                    f"Priority distributor allocation eliminates {long_lead_str.lower()}."
                ),
            ),
        ]

    def _find_lead_time_critical_path(self, entries: list[BOMEntry]) -> list[dict]:
        sorted_entries = sorted(entries, key=lambda e: e.lead_time_days or 0, reverse=True)
        return [
            {
                "part_number": e.part_number,
                "description": e.description,
                "lead_time_days": e.lead_time_days,
                "availability": e.availability,
                "is_critical": i == 0,
            }
            for i, e in enumerate(sorted_entries[:5])
        ]

    def _compute_supplier_diversity(self, entries: list[BOMEntry]) -> tuple[float, str]:
        suppliers = [e.supplier for e in entries if e.supplier]
        if not suppliers:
            return 0.0, "HIGH"

        unique = set(suppliers)
        diversity = len(unique) / len(suppliers) * 100

        if diversity >= 60:
            risk = "LOW"
        elif diversity >= 40:
            risk = "MEDIUM"
        else:
            risk = "HIGH"

        return round(diversity, 1), risk
