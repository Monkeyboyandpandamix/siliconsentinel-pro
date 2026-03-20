"""Module 1: AI-Driven Semiconductor Co-Pilot service."""

import logging
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.design import Design
from backend.schemas.design import (
    DesignCreateRequest, DesignResponse, ArchitectureBlueprint,
    ConstraintSatisfaction, MaterialRecommendation,
)
from backend.services.ai_provider import get_ai_provider
from backend.semiconductor.process_nodes import get_process_node, PROCESS_NODES

logger = logging.getLogger(__name__)

DEFAULT_PROCESS_NODE = "28nm"


class DesignCopilotService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai = get_ai_provider()

    async def create_design(self, req: DesignCreateRequest) -> DesignResponse:
        process_node_name = req.process_node or (
            req.constraints.process_node if req.constraints else None
        ) or DEFAULT_PROCESS_NODE

        try:
            pn = get_process_node(process_node_name)
        except ValueError:
            pn = get_process_node(DEFAULT_PROCESS_NODE)
            process_node_name = DEFAULT_PROCESS_NODE

        constraints_dict = req.constraints.model_dump() if req.constraints else {}
        constraints_dict["process_node"] = process_node_name
        if req.target_domain:
            constraints_dict["application_domain"] = req.target_domain

        arch_data = await self.ai.generate_architecture(req.nl_input, constraints_dict)
        arch = self._validate_and_enrich_architecture(arch_data, pn)
        materials = self._generate_materials(pn)
        satisfaction = self._compute_constraint_satisfaction(arch, constraints_dict, pn)

        design = Design(
            nl_input=req.nl_input,
            constraints_json=constraints_dict,
            architecture_json=arch,
            material_recommendations=materials,
            process_node=process_node_name,
            target_domain=req.target_domain,
            budget_ceiling=req.budget_ceiling,
            constraint_satisfaction=satisfaction,
            status="designed",
        )
        self.db.add(design)
        await self.db.commit()
        await self.db.refresh(design)

        return DesignResponse(
            id=design.id,
            nl_input=design.nl_input,
            architecture=arch,
            materials=materials,
            constraint_satisfaction=satisfaction,
            process_node=process_node_name,
            target_domain=req.target_domain,
            status=design.status,
            created_at=design.created_at,
        )

    def _validate_and_enrich_architecture(self, arch_data: dict, pn) -> dict:
        """Validate AI output and enrich with process-node-accurate data."""
        blocks = arch_data.get("blocks", [])
        valid_types = {"cpu", "memory", "io", "power", "rf", "analog", "dsp", "accelerator"}

        for block in blocks:
            if block.get("type") not in valid_types:
                block["type"] = "cpu"

            # Clamp unrealistic values
            area = block.get("area_mm2", 1.0)
            if area < 0.01:
                block["area_mm2"] = 0.01
            if area > 500:
                block["area_mm2"] = 500.0

            power = block.get("power_mw", 1.0)
            if power < 0:
                block["power_mw"] = 0.01
            if power > 100000:
                block["power_mw"] = 100000.0

        arch_data["process_node"] = pn.name
        arch_data["total_power_mw"] = sum(b.get("power_mw", 0) for b in blocks)
        arch_data["total_area_mm2"] = sum(b.get("area_mm2", 0) for b in blocks)

        if "metal_layers" not in arch_data:
            arch_data["metal_layers"] = pn.metal_layers_typical
        if "gate_oxide" not in arch_data:
            arch_data["gate_oxide"] = pn.gate_oxide
        if "interconnect" not in arch_data:
            arch_data["interconnect"] = pn.interconnect_material

        return arch_data

    def _generate_materials(self, pn) -> dict:
        """Generate material recommendations based on process node."""
        substrate = "SOI" if pn.gate_length_nm <= 14 else "Bulk Silicon"
        doping = "FinFET (undoped channel)" if pn.gate_length_nm <= 16 else "Planar MOSFET (doped channel)"
        passivation = "SiN / polyimide" if pn.gate_length_nm <= 28 else "SiO2 / SiN"

        return {
            "substrate": substrate,
            "gate_oxide": pn.gate_oxide,
            "metal_layers": pn.metal_layers_typical,
            "interconnect_material": pn.interconnect_material,
            "doping_type": doping,
            "passivation": passivation,
            "justification": (
                f"For {pn.name}, {substrate} substrate provides optimal performance. "
                f"{pn.gate_oxide} gate oxide is standard at this node for threshold voltage control. "
                f"{pn.metal_layers_typical} metal layers are typical, using {pn.interconnect_material} "
                f"interconnect with low-k ILD for reduced RC delay."
            ),
        }

    def _compute_constraint_satisfaction(self, arch: dict, constraints: dict, pn) -> dict:
        """Score how well the design meets stated constraints (0-100 per axis)."""
        scores = {}

        total_power = arch.get("total_power_mw", 0)
        max_power = constraints.get("max_power_mw")
        if max_power and max_power > 0:
            ratio = total_power / max_power
            scores["power"] = round(max(0, min(100, (1 - max(0, ratio - 1)) * 100)), 1)
        else:
            scores["power"] = 85.0

        total_area = arch.get("total_area_mm2", 0)
        max_area = constraints.get("max_area_mm2")
        if max_area and max_area > 0:
            ratio = total_area / max_area
            scores["area"] = round(max(0, min(100, (1 - max(0, ratio - 1)) * 100)), 1)
        else:
            scores["area"] = 80.0

        scores["performance"] = 75.0
        scores["thermal"] = 80.0 if total_power < 5000 else 60.0
        scores["cost"] = 70.0

        scores["overall"] = round(
            scores["power"] * 0.25 + scores["area"] * 0.2 +
            scores["performance"] * 0.25 + scores["thermal"] * 0.15 +
            scores["cost"] * 0.15, 1
        )

        return scores
