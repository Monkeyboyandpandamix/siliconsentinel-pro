"""Module 6: Supply Chain Intelligence service."""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.models.design import Design
from backend.models.bom import BOMEntry
from backend.semiconductor.process_nodes import get_process_node

logger = logging.getLogger(__name__)

FOUNDRY_DATABASE = [
    {
        "name": "TSMC",
        "location": "Hsinchu, Taiwan",
        "country": "Taiwan",
        "process_nodes": ["5nm", "7nm", "14nm", "28nm", "65nm", "180nm"],
        "capacity_status": "Constrained",
        "cost_tier": "premium",
        "lead_time_weeks_base": 12,
        "strengths": ["Leading-edge nodes", "Highest yield", "Largest capacity"],
    },
    {
        "name": "Samsung Foundry",
        "location": "Hwaseong, South Korea",
        "country": "South Korea",
        "process_nodes": ["5nm", "7nm", "14nm", "28nm", "65nm"],
        "capacity_status": "Available",
        "cost_tier": "premium",
        "lead_time_weeks_base": 10,
        "strengths": ["GAA transistors at 3nm", "Competitive pricing", "Vertical integration"],
    },
    {
        "name": "GlobalFoundries",
        "location": "Malta, NY, USA",
        "country": "United States",
        "process_nodes": ["14nm", "28nm", "65nm", "180nm"],
        "capacity_status": "Available",
        "cost_tier": "mid",
        "lead_time_weeks_base": 8,
        "strengths": ["US-based fab", "Specialty nodes", "ITAR-compliant"],
    },
    {
        "name": "Intel Foundry Services",
        "location": "Chandler, AZ, USA",
        "country": "United States",
        "process_nodes": ["7nm", "14nm"],
        "capacity_status": "Available",
        "cost_tier": "premium",
        "lead_time_weeks_base": 14,
        "strengths": ["US-based", "Advanced packaging (Foveros, EMIB)", "High-performance compute"],
    },
    {
        "name": "UMC",
        "location": "Hsinchu, Taiwan",
        "country": "Taiwan",
        "process_nodes": ["28nm", "65nm", "180nm"],
        "capacity_status": "Available",
        "cost_tier": "economy",
        "lead_time_weeks_base": 6,
        "strengths": ["Cost-effective mature nodes", "Automotive qualified", "Low MOQ"],
    },
    {
        "name": "SMIC",
        "location": "Shanghai, China",
        "country": "China",
        "process_nodes": ["14nm", "28nm", "65nm", "180nm"],
        "capacity_status": "Available",
        "cost_tier": "economy",
        "lead_time_weeks_base": 8,
        "strengths": ["Lowest cost", "High volume capacity", "Domestic China supply"],
    },
    {
        "name": "Tower Semiconductor",
        "location": "Migdal HaEmek, Israel",
        "country": "Israel",
        "process_nodes": ["65nm", "180nm"],
        "capacity_status": "Available",
        "cost_tier": "mid",
        "lead_time_weeks_base": 8,
        "strengths": ["Analog/mixed-signal specialty", "RF excellence", "Sensor integration"],
    },
]

GEOPOLITICAL_RISK = {
    "Taiwan": {
        "risk_level": "HIGH",
        "factors": [
            "Cross-strait tensions with China",
            "Earthquake-prone region",
            "Single point of failure for advanced nodes",
        ],
        "mitigation": "Diversify to US or South Korean fabs for critical designs",
    },
    "South Korea": {
        "risk_level": "MEDIUM",
        "factors": [
            "North Korean border proximity",
            "US-China trade friction exposure",
        ],
        "mitigation": "Maintain secondary source outside East Asia",
    },
    "United States": {
        "risk_level": "LOW",
        "factors": [
            "CHIPS Act subsidies improving capacity",
            "Higher labor costs",
        ],
        "mitigation": "Leverage CHIPS Act incentives to offset cost premium",
    },
    "China": {
        "risk_level": "CRITICAL",
        "factors": [
            "US export controls on advanced equipment",
            "Entity List restrictions on end customers",
            "Technology transfer restrictions",
        ],
        "mitigation": "Avoid for designs requiring advanced nodes or US-market products",
    },
    "Israel": {
        "risk_level": "MEDIUM",
        "factors": [
            "Regional geopolitical instability",
            "Limited capacity for high volume",
        ],
        "mitigation": "Suitable for specialty analog/RF — pair with volume fab elsewhere",
    },
}


class SupplyChainService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze(self, design: Design) -> dict:
        import re, json, time, pathlib
        arch = design.architecture_json
        process_node_name = arch.get("process_node", design.process_node or "28nm")
        pn = get_process_node(process_node_name)

        # Fix: extract core Xnm token the same way process_nodes.py now does,
        # so "7nm (N7)", "28nm (N28)", "14nm LPP", etc. all resolve correctly.
        _m = re.search(r'(\d+\s*nm)', process_node_name, re.IGNORECASE)
        node_key = _m.group(1).replace(" ", "").lower() if _m else process_node_name.replace(" ", "").lower()

        # region agent log
        _lp = pathlib.Path("debug-8f466e.log")
        _lp.open("a").write(json.dumps({"sessionId": "8f466e", "runId": "post-fix", "hypothesisId": "A", "location": "supply_chain.py:analyze", "message": "node resolution", "data": {"raw": process_node_name, "node_key": node_key}, "timestamp": int(time.time() * 1000)}) + "\n")
        # endregion

        matching_fabs = self._match_fabs(node_key, pn)
        geo_risks = self._assess_geopolitical_risks(matching_fabs)
        diversity_plan = self._create_diversification_plan(matching_fabs)

        result = await self.db.execute(
            select(BOMEntry).where(BOMEntry.design_id == design.id)
        )
        bom_entries = result.scalars().all()
        supplier_analysis = self._analyze_suppliers(bom_entries)

        return {
            "fab_recommendations": matching_fabs,
            "geopolitical_risks": geo_risks,
            "diversification_plan": diversity_plan,
            "supplier_analysis": supplier_analysis,
        }

    def _match_fabs(self, node_key: str, pn) -> list[dict]:
        import json, time, pathlib
        results = []
        for fab in FOUNDRY_DATABASE:
            supported = [n.replace(" ", "").lower() for n in fab["process_nodes"]]
            if node_key not in supported:
                continue

            capability_match = 90 if node_key in supported[:2] else 70
            cost_multiplier = {"premium": 1.2, "mid": 1.0, "economy": 0.8}.get(fab["cost_tier"], 1.0)
            estimated_cost = int(pn.fab_cost_per_wafer_usd * cost_multiplier)

            country = fab["country"]
            geo = GEOPOLITICAL_RISK.get(country, {"risk_level": "MEDIUM"})
            risk_penalty = {"LOW": 0, "MEDIUM": 10, "HIGH": 25, "CRITICAL": 40}.get(geo["risk_level"], 10)
            risk_score = max(0, 100 - risk_penalty)

            cost_score = max(0, min(100, int(100 - (cost_multiplier - 0.7) * 100)))
            overall = int(capability_match * 0.35 + cost_score * 0.30 + risk_score * 0.35)

            results.append({
                "name": fab["name"],
                "location": fab["location"],
                "country": country,
                "process_nodes": fab["process_nodes"],
                "capacity_status": fab["capacity_status"],
                "estimated_cost_per_wafer": estimated_cost,
                "lead_time_weeks": fab["lead_time_weeks_base"],
                "capability_match": capability_match,
                "cost_score": cost_score,
                "risk_score": risk_score,
                "overall_score": overall,
                "strengths": fab["strengths"],
                "risk_factors": geo.get("factors", []),
            })

        results.sort(key=lambda f: f["overall_score"], reverse=True)

        # region agent log
        _lp = pathlib.Path("debug-8f466e.log")
        _lp.open("a").write(json.dumps({"sessionId": "8f466e", "runId": "post-fix", "hypothesisId": "A", "location": "supply_chain.py:_match_fabs", "message": "matched fabs", "data": {"node_key": node_key, "count": len(results), "names": [f["name"] for f in results]}, "timestamp": int(time.time() * 1000)}) + "\n")
        # endregion

        return results

    def _assess_geopolitical_risks(self, fabs: list[dict]) -> list[dict]:
        seen_countries = set()
        risks = []
        for fab in fabs:
            country = fab["country"]
            if country in seen_countries:
                continue
            seen_countries.add(country)
            geo = GEOPOLITICAL_RISK.get(country, {
                "risk_level": "MEDIUM",
                "factors": ["No specific intelligence available"],
                "mitigation": "Standard due diligence recommended",
            })
            risks.append({
                "region": country,
                "risk_level": geo["risk_level"],
                "factors": geo["factors"],
                "mitigation": geo["mitigation"],
            })
        return risks

    def _create_diversification_plan(self, fabs: list[dict]) -> dict:
        if len(fabs) < 2:
            return {
                "primary_fab": fabs[0]["name"] if fabs else "None available",
                "secondary_fab": "No alternative found for this node",
                "rationale": "Limited fab options at this process node",
            }

        primary = fabs[0]
        secondary = next(
            (f for f in fabs[1:] if f["country"] != primary["country"]),
            fabs[1],
        )

        return {
            "primary_fab": primary["name"],
            "secondary_fab": secondary["name"],
            "rationale": (
                f"Primary: {primary['name']} ({primary['country']}) — highest overall score ({primary['overall_score']}). "
                f"Secondary: {secondary['name']} ({secondary['country']}) — geographic diversification "
                f"to mitigate {primary['country']} concentration risk."
            ),
        }

    def _analyze_suppliers(self, bom_entries: list) -> dict:
        if not bom_entries:
            return {"suppliers": [], "concentration_risk": "N/A"}

        supplier_map: dict[str, list] = {}
        for e in bom_entries:
            s = e.supplier or "Unknown"
            supplier_map.setdefault(s, []).append({
                "part_number": e.part_number,
                "category": e.category,
            })

        total = len(bom_entries)
        suppliers = []
        for name, parts in supplier_map.items():
            share = len(parts) / total * 100
            suppliers.append({
                "name": name,
                "component_count": len(parts),
                "share_pct": round(share, 1),
                "categories": list(set(p["category"] for p in parts if p.get("category"))),
            })

        suppliers.sort(key=lambda s: s["share_pct"], reverse=True)
        top_share = suppliers[0]["share_pct"] if suppliers else 0
        concentration = "HIGH" if top_share > 40 else "MEDIUM" if top_share > 25 else "LOW"

        return {
            "suppliers": suppliers,
            "concentration_risk": concentration,
            "total_suppliers": len(suppliers),
        }
