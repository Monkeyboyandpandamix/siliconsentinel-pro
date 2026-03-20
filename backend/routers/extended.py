"""Module 8: Extended Intelligence Features — Carbon, Comparison, Manufacturability."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.design import Design
from backend.models.simulation import Simulation
from backend.models.bom import BOMEntry
from backend.services.carbon_estimator import estimate_carbon_footprint
from backend.semiconductor.process_nodes import get_process_node
from backend.semiconductor.yield_model import compute_yield_prediction

router = APIRouter()


class CarbonRequest(BaseModel):
    volume: int = 10000
    fab_country: str = "Taiwan"
    assembly_country: str = "Taiwan"
    shipping_distance_km: float = 10000.0


class CompareRequest(BaseModel):
    design_ids: list[int]


@router.post("/{design_id}/carbon")
async def estimate_carbon(design_id: int, req: CarbonRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    arch = design.architecture_json or {}
    node = arch.get("process_node", design.process_node or "28nm")
    area = arch.get("total_area_mm2", 1.0)

    carbon = estimate_carbon_footprint(
        process_node_name=node,
        die_area_mm2=area,
        volume=req.volume,
        fab_country=req.fab_country,
        assembly_country=req.assembly_country,
        shipping_distance_km=req.shipping_distance_km,
    )
    return carbon


@router.get("/{design_id}/manufacturability")
async def get_manufacturability(design_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Design).where(Design.id == design_id))
    design = result.scalar_one_or_none()
    if not design:
        raise HTTPException(status_code=404, detail="Design not found")

    arch = design.architecture_json or {}
    blocks = arch.get("blocks", [])
    pn = get_process_node(arch.get("process_node", design.process_node or "28nm"))

    # DRC compliance (25%) — based on constraint satisfaction
    cs = design.constraint_satisfaction or {}
    drc_score = cs.get("overall", 70.0)

    # Yield prediction (25%)
    total_area = arch.get("total_area_mm2", sum(b.get("area_mm2", 0) for b in blocks))
    yield_data = compute_yield_prediction(total_area, pn, arch.get("metal_layers", pn.metal_layers_typical))
    yield_score = yield_data["yield_pct"]

    # Supply chain readiness (20%)
    bom_result = await db.execute(select(BOMEntry).where(BOMEntry.design_id == design_id))
    bom_entries = bom_result.scalars().all()
    if bom_entries:
        backorder_ratio = sum(1 for e in bom_entries if e.availability == "Backorder") / len(bom_entries)
        supply_score = max(0, (1 - backorder_ratio) * 100)
    else:
        supply_score = 50.0

    # Cost efficiency (15%)
    cost_score = min(100, yield_score * 0.8 + 20)

    # Sustainability (15%)
    carbon = estimate_carbon_footprint(
        arch.get("process_node", "28nm"),
        total_area,
        10000,
    )
    co2_per_chip = carbon["co2e_per_chip_kg"]
    sustainability_score = max(0, min(100, 100 - co2_per_chip * 500))

    overall = (
        drc_score * 0.25 +
        yield_score * 0.25 +
        supply_score * 0.20 +
        cost_score * 0.15 +
        sustainability_score * 0.15
    )

    if overall >= 80:
        verdict = "EXCELLENT"
    elif overall >= 65:
        verdict = "GOOD"
    elif overall >= 50:
        verdict = "FAIR"
    else:
        verdict = "POOR"

    return {
        "overall_score": round(overall, 1),
        "verdict": verdict,
        "label": f"{verdict} — {round(overall)}/100",
        "components": {
            "design_rule_compliance": {"score": round(drc_score, 1), "weight": "25%"},
            "yield_prediction": {"score": round(yield_score, 1), "weight": "25%"},
            "supply_chain_readiness": {"score": round(supply_score, 1), "weight": "20%"},
            "cost_efficiency": {"score": round(cost_score, 1), "weight": "15%"},
            "sustainability": {"score": round(sustainability_score, 1), "weight": "15%"},
        },
        "top_factors": _get_top_factors(drc_score, yield_score, supply_score, cost_score, sustainability_score),
    }


@router.post("/compare")
async def compare_designs(req: CompareRequest, db: AsyncSession = Depends(get_db)):
    if len(req.design_ids) < 2 or len(req.design_ids) > 4:
        raise HTTPException(status_code=400, detail="Compare 2 to 4 designs")

    comparisons = []
    for did in req.design_ids:
        result = await db.execute(select(Design).where(Design.id == did))
        design = result.scalar_one_or_none()
        if not design:
            raise HTTPException(status_code=404, detail=f"Design {did} not found")

        arch = design.architecture_json or {}
        blocks = arch.get("blocks", [])
        pn = get_process_node(arch.get("process_node", design.process_node or "28nm"))

        total_area = arch.get("total_area_mm2", 0)
        total_power = arch.get("total_power_mw", 0)
        yield_data = compute_yield_prediction(total_area, pn)
        carbon = estimate_carbon_footprint(
            arch.get("process_node", "28nm"), total_area, 10000
        )

        comparisons.append({
            "design_id": did,
            "name": arch.get("name", f"Design #{did}"),
            "process_node": arch.get("process_node"),
            "metrics": {
                "power_mw": round(total_power, 2),
                "area_mm2": round(total_area, 2),
                "yield_pct": yield_data["yield_pct"],
                "cost_per_unit": yield_data["fab_cost_per_good_die"],
                "block_count": len(blocks),
                "co2e_per_chip_kg": carbon["co2e_per_chip_kg"],
            },
            "radar": {
                "power": round(max(0, min(100, 100 - total_power * 0.1)), 1),
                "performance": 75.0,
                "cost": round(max(0, min(100, 100 - yield_data["fab_cost_per_good_die"] * 2)), 1),
                "area": round(max(0, min(100, 100 - total_area * 2)), 1),
                "yield": yield_data["yield_pct"],
                "carbon": round(max(0, min(100, 100 - carbon["co2e_per_chip_kg"] * 500)), 1),
            },
        })

    return {"designs": comparisons}


def _get_top_factors(drc, yield_s, supply, cost, sustainability) -> list[str]:
    factors = [
        (drc, "Design rule compliance"),
        (yield_s, "Yield prediction"),
        (supply, "Supply chain readiness"),
        (cost, "Cost efficiency"),
        (sustainability, "Sustainability"),
    ]
    factors.sort(key=lambda f: f[0])
    return [
        f"{name}: {score:.0f}/100 — {'strength' if score >= 70 else 'needs improvement'}"
        for score, name in factors[:3]
    ]
