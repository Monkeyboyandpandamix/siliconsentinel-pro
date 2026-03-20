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

    # ── Hardware reference tables (node-aware) ────────────────────────────────
    # Maps (block_type, process_node_category) → canonical IP / component reference.
    # node_category: "advanced" ≤14nm, "mainstream" 16–40nm, "mature" 65–180nm, "legacy" ≥250nm
    _REFERENCE_COMPONENTS: dict[str, dict[str, str]] = {
        "cpu": {
            "advanced":    "ARM Cortex-A55 IP (DesignStart, TSMC N5/7)",
            "mainstream":  "ARM Cortex-M33 IP (ARMv8-M, TSMC 28HPM / GF 22FDX)",
            "mature":      "ARM Cortex-M4F IP (ARMv7-M, TSMC 65LP)",
            "legacy":      "ARM Cortex-M0+ IP (ARMv6-M, TSMC 180G)",
        },
        "memory": {
            "advanced":    "Samsung 5nm SRAM bitcell (6T, 0.021 µm²/bit)",
            "mainstream":  "TSMC TS1N28HPMLVTA SRAM compiler (28nm HPM)",
            "mature":      "ARM Artisan SP SRAM compiler (65nm LP, 0.128 µm²/bit)",
            "legacy":      "Dolphin TSMC 180nm SRAM IP (0.86 µm²/bit)",
        },
        "io": {
            "advanced":    "Cadence PHY IP: LPDDR5X / PCIe 5.0 (TSMC N5)",
            "mainstream":  "Synopsys DesignWare USB3.1 + GPIO pad ring (28nm)",
            "mature":      "Synopsys DesignWare MIPI / I2C / SPI pad ring (65nm)",
            "legacy":      "ARM PL022 SSP / PL011 UART IP + 3.3V GPIO pads (180nm)",
        },
        "power": {
            "advanced":    "TI TPS62840 DC/DC + MPS MP2731 PMIC IP (5nm reference)",
            "mainstream":  "TI TPS62840 DC/DC + TLV1117-1.2 LDO IP (28nm HPM)",
            "mature":      "Linear LTC3407 dual DC/DC + LP2985 LDO IP (65nm)",
            "legacy":      "TI TPS63020 buck-boost + MIC5219 LDO IP (180nm)",
        },
        "rf": {
            "advanced":    "Nordic nRF9161 modem (TSMC N22 FDX, NB-IoT/LTE-M)",
            "mainstream":  "Nordic nRF52840 BLE 5.2 + 802.15.4 IP (TSMC 28HPM)",
            "mature":      "Skyworks SKY66112-11 FEM + CC2640R2F RF IP (65nm)",
            "legacy":      "TI CC1101 sub-GHz transceiver IP (180nm CMOS)",
        },
        "analog": {
            "advanced":    "TI ADS127L11 24-bit delta-sigma ADC IP (16nm FinFET)",
            "mainstream":  "TI ADS8688 16-bit SAR ADC + OPA2387 op-amp IP (28nm)",
            "mature":      "TI ADS1115 16-bit ADC + LM358 op-amp IP (65nm)",
            "legacy":      "TI ADS7843 12-bit SAR ADC + TL071 op-amp IP (180nm)",
        },
        "dsp": {
            "advanced":    "Cadence Tensilica HiFi5 DSP IP (TSMC N7)",
            "mainstream":  "ARM Cortex-M7 FPU/DSP + CMSIS-DSP lib (28nm HPM)",
            "mature":      "TI C28x DSP core IP (Piccolo/Delfino, 65nm)",
            "legacy":      "TI C55x ultra-low-power DSP IP (180nm)",
        },
        "accelerator": {
            "advanced":    "Arm Ethos-U65 NPU (INT8/INT16, TSMC N5, 4 TOPS)",
            "mainstream":  "Arm Ethos-U55 ML accelerator (INT8, TSMC 28HPM, 0.5 TOPS)",
            "mature":      "Xilinx DPU-lite INT8 inference engine (65nm)",
            "legacy":      "Fixed-function AES-256 / SHA-256 crypto accelerator (180nm)",
        },
    }

    _CELL_LIBRARIES: dict[str, str] = {
        "3nm":   "TSMC N3 SC-V (CLN3PE) v1.2 / Samsung SF3 STC",
        "5nm":   "TSMC N5 SC-V (CLN5FF) v2.3 / Samsung SF5 STC",
        "7nm":   "TSMC N7 SC-V (CLN7FF) v3.1 / Samsung SF7 STC",
        "10nm":  "Samsung SF10 STC v1.5 / Intel 10nm PDK SC",
        "14nm":  "TSMC CLN16FF+ SC9 v2.0 / Samsung SF14 STC / GF 14LPP SC",
        "22nm":  "GF 22FDX SC-FDX v1.4 / Intel 22FFL SC",
        "28nm":  "TSMC 28HPM SC9 v2.1 / GF 28SLP SC / SMIC 28HKC SC",
        "40nm":  "TSMC 40G SC8 v1.3 / UMC 40LP SC",
        "65nm":  "TSMC 65G SC7 v2.0 / UMC 65LP SC / SMIC 65LL SC",
        "90nm":  "TSMC 90G SC6 v1.8 / UMC 90nm SC",
        "130nm": "TSMC 130G SC6 v2.2 / GF 130 BCDlite SC",
        "180nm": "TSMC 180G SC5 v3.0 / UMC 180nm SC / Tower SiGe SC",
        "350nm": "TSMC 350G SC4 v2.5 / Skywater SKY130 SC",
    }

    _VOLTAGE_DOMAINS: dict[str, dict[str, str]] = {
        "cpu":         {"advanced": "VDD 0.75V", "mainstream": "VDD 0.9V", "mature": "VDD 1.2V", "legacy": "VDD 1.8V"},
        "memory":      {"advanced": "VDD 0.75V", "mainstream": "VDD 1.0V", "mature": "VDD 1.2V", "legacy": "VDD 1.8V"},
        "io":          {"advanced": "VDDIO 1.8V / 3.3V", "mainstream": "VDDIO 3.3V / 1.8V", "mature": "VDDIO 3.3V", "legacy": "VDDIO 3.3V / 5V"},
        "power":       {"advanced": "VBAT 3.0–4.2V → VDD 0.75V", "mainstream": "VBAT 3.0–4.2V → VDD 0.9V", "mature": "VBAT 3.0–4.2V → VDD 1.2V", "legacy": "VIN 5V → VDD 1.8V"},
        "rf":          {"advanced": "VDD 0.9V RF / 1.8V IO", "mainstream": "VDD 1.8V RF", "mature": "VDD 1.8V RF", "legacy": "VDD 3.3V RF"},
        "analog":      {"advanced": "AVDD 1.8V", "mainstream": "AVDD 1.8V / 3.3V", "mature": "AVDD 3.3V", "legacy": "AVDD 3.3V / 5V"},
        "dsp":         {"advanced": "VDD 0.75V", "mainstream": "VDD 0.9V", "mature": "VDD 1.2V", "legacy": "VDD 1.8V"},
        "accelerator": {"advanced": "VDD 0.75V", "mainstream": "VDD 0.9V", "mature": "VDD 1.2V", "legacy": "VDD 1.8V"},
    }

    @staticmethod
    def _node_category(node_name: str) -> str:
        nm = int(''.join(c for c in node_name if c.isdigit()) or '28')
        if nm <= 14:   return "advanced"
        if nm <= 40:   return "mainstream"
        if nm <= 180:  return "mature"
        return "legacy"

    def _validate_and_enrich_architecture(self, arch_data: dict, pn) -> dict:
        """Validate AI output and enrich with process-node-accurate data."""
        blocks = arch_data.get("blocks", [])
        valid_types = {"cpu", "memory", "io", "power", "rf", "analog", "dsp", "accelerator"}
        node_cat = self._node_category(pn.name)
        cell_lib = self._CELL_LIBRARIES.get(pn.name, f"TSMC {pn.name} SC v1.0")

        for block in blocks:
            if block.get("type") not in valid_types:
                block["type"] = "cpu"
            btype = block["type"]

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

            # Populate reference_component if AI didn't supply a meaningful value
            if not block.get("reference_component"):
                block["reference_component"] = self._REFERENCE_COMPONENTS.get(btype, {}).get(node_cat, "Custom IP")

            # Populate cell_library if missing
            if not block.get("cell_library"):
                block["cell_library"] = cell_lib

            # Populate voltage_domain if missing
            if not block.get("voltage_domain"):
                block["voltage_domain"] = self._VOLTAGE_DOMAINS.get(btype, {}).get(node_cat, f"VDD {1.8 if pn.gate_length_nm >= 90 else 0.9:.1f}V")

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

        # Performance: estimate from highest block clock vs node max
        block_clocks = [b.get("clock_mhz", 0) for b in arch.get("blocks", []) if b.get("clock_mhz")]
        max_block_clock = max(block_clocks) if block_clocks else 0
        node_max_clock = getattr(pn, "max_clock_mhz", None)
        if node_max_clock and node_max_clock > 0 and max_block_clock > 0:
            clock_ratio = max_block_clock / node_max_clock
            scores["performance"] = round(max(0, min(100, clock_ratio * 100)), 1)
        else:
            scores["performance"] = 75.0

        scores["thermal"] = 80.0 if total_power < 5000 else 60.0
        scores["cost"] = 70.0

        scores["overall"] = round(
            scores["power"] * 0.25 + scores["area"] * 0.2 +
            scores["performance"] * 0.25 + scores["thermal"] * 0.15 +
            scores["cost"] * 0.15, 1
        )

        return scores
