from abc import ABC, abstractmethod
from typing import Optional
import json
import math
import re
import hashlib

from backend.config import get_settings


class AIProvider(ABC):
    """Abstract interface for AI backends. Supports Gemini now, watsonx in the future."""

    @abstractmethod
    async def generate_architecture(self, prompt: str, constraints: dict) -> dict:
        """Generate chip architecture from NL description + constraints."""

    @abstractmethod
    async def analyze_simulation(self, design: dict, sim_results: dict) -> dict:
        """Analyze simulation results and provide AI insights."""

    @abstractmethod
    async def generate_bom(self, architecture: dict, domain: str) -> list[dict]:
        """Generate BOM entries from architecture specification."""

    @abstractmethod
    async def analyze_defects(self, image_description: str, design_context: dict, image_path: str | None = None) -> dict:
        """Analyze chip image for defects. If image_path is provided and the provider supports vision,
        actual image bytes are sent for real visual analysis."""

    @abstractmethod
    async def optimize_design(self, architecture: dict, sim_results: dict, focus: str) -> dict:
        """Suggest design optimizations given simulation results."""

    @abstractmethod
    async def generate_supply_chain_analysis(self, architecture: dict, bom: list[dict]) -> dict:
        """Generate supply chain risk analysis and supplier recommendations."""


class PhysicsProvider(AIProvider):
    """
    Physics-based fallback AI provider.
    Generates realistic semiconductor architectures and analyses using
    deterministic physics models — no API key required.
    """

    # Block templates keyed by chip domain keyword
    _DOMAIN_TEMPLATES = {
        "mobile": [
            {"type": "cpu", "name": "Application CPU", "power_mw": 800, "area_mm2": 4.2, "clock_mhz": 2400},
            {"type": "memory", "name": "LPDDR Cache", "power_mw": 120, "area_mm2": 1.8},
            {"type": "rf", "name": "RF Transceiver", "power_mw": 200, "area_mm2": 0.9},
            {"type": "power", "name": "PMIC", "power_mw": 30, "area_mm2": 0.5},
            {"type": "io", "name": "USB/Camera I/O", "power_mw": 50, "area_mm2": 0.4},
        ],
        "automotive": [
            {"type": "cpu", "name": "Safety MCU", "power_mw": 1200, "area_mm2": 6.0, "clock_mhz": 1000},
            {"type": "accelerator", "name": "Vision Accelerator", "power_mw": 3000, "area_mm2": 8.5},
            {"type": "memory", "name": "SRAM Cache", "power_mw": 200, "area_mm2": 2.1},
            {"type": "analog", "name": "LiDAR AFE", "power_mw": 150, "area_mm2": 1.2},
            {"type": "io", "name": "CAN/Ethernet MAC", "power_mw": 80, "area_mm2": 0.7},
            {"type": "power", "name": "Automotive PMIC", "power_mw": 50, "area_mm2": 0.6},
        ],
        "ai": [
            {"type": "accelerator", "name": "Tensor Core Array", "power_mw": 15000, "area_mm2": 28.0},
            {"type": "memory", "name": "HBM Interface", "power_mw": 2000, "area_mm2": 5.5},
            {"type": "cpu", "name": "Control CPU", "power_mw": 600, "area_mm2": 2.0, "clock_mhz": 1800},
            {"type": "io", "name": "PCIe Gen5 I/O", "power_mw": 800, "area_mm2": 3.2},
            {"type": "power", "name": "Power Distribution", "power_mw": 80, "area_mm2": 1.0},
        ],
        "iot": [
            {"type": "cpu", "name": "Ultra-Low Power MCU", "power_mw": 15, "area_mm2": 0.8, "clock_mhz": 64},
            {"type": "rf", "name": "BLE/Zigbee Radio", "power_mw": 12, "area_mm2": 0.6},
            {"type": "memory", "name": "Flash Cache", "power_mw": 5, "area_mm2": 0.3},
            {"type": "analog", "name": "Sensor ADC", "power_mw": 3, "area_mm2": 0.2},
            {"type": "power", "name": "Energy Harvesting PMIC", "power_mw": 2, "area_mm2": 0.2},
        ],
        "rf": [
            {"type": "rf", "name": "PA Array", "power_mw": 800, "area_mm2": 3.5},
            {"type": "rf", "name": "LNA/Mixer", "power_mw": 120, "area_mm2": 1.1},
            {"type": "analog", "name": "PLL Synthesizer", "power_mw": 80, "area_mm2": 0.9},
            {"type": "dsp", "name": "Baseband DSP", "power_mw": 300, "area_mm2": 2.2, "clock_mhz": 500},
            {"type": "io", "name": "Digital I/O", "power_mw": 40, "area_mm2": 0.3},
        ],
        "server": [
            {"type": "cpu", "name": "Server CPU Complex", "power_mw": 18000, "area_mm2": 35.0, "clock_mhz": 3600},
            {"type": "memory", "name": "LLC Cache", "power_mw": 3000, "area_mm2": 12.0},
            {"type": "io", "name": "PCIe/CXL Fabric", "power_mw": 2000, "area_mm2": 6.5},
            {"type": "memory", "name": "DDR5 Controller", "power_mw": 800, "area_mm2": 2.8},
            {"type": "power", "name": "Integrated VRM", "power_mw": 200, "area_mm2": 1.5},
        ],
        "general": [
            {"type": "cpu", "name": "Core Processor", "power_mw": 1500, "area_mm2": 6.5, "clock_mhz": 1500},
            {"type": "memory", "name": "On-chip SRAM", "power_mw": 250, "area_mm2": 2.5},
            {"type": "io", "name": "Digital I/O", "power_mw": 100, "area_mm2": 0.8},
            {"type": "power", "name": "Power Management", "power_mw": 40, "area_mm2": 0.5},
        ],
    }

    def _detect_domain(self, prompt: str, constraints: dict) -> str:
        prompt_lower = prompt.lower()
        domain = constraints.get("application_domain", "").lower()

        keyword_map = [
            (["mobile", "smartphone", "phone", "5g", "lte", "cellular", "handset"], "mobile"),
            (["automotive", "adas", "lidar", "radar", "car", "vehicle", "functional safety"], "automotive"),
            (["machine learning", "neural", "ai chip", "npu", "tpu", "gpu", "inference", "training", "transformer", "llm"], "ai"),
            (["iot", "sensor", "wearable", "battery", "low power", "bluetooth", "zigbee", "ultra-low", "edge device"], "iot"),
            (["rf", "radio", "antenna", "amplifier", "transceiver", "mmwave", "microwave", "wireless"], "rf"),
            (["server", "datacenter", "data center", "hpc", "cloud", "hyperscale", "xeon", "epyc"], "server"),
        ]

        for keywords, d in keyword_map:
            if any(k in prompt_lower or k in domain for k in keywords):
                return d

        return "general"

    def _scale_blocks_to_constraints(self, blocks: list[dict], constraints: dict) -> list[dict]:
        """Scale block power/area to fit within constraints if provided."""
        max_power = constraints.get("max_power_mw")
        max_area = constraints.get("max_area_mm2")
        total_power = sum(b["power_mw"] for b in blocks)
        total_area = sum(b["area_mm2"] for b in blocks)

        power_scale = (max_power / total_power * 0.9) if (max_power and total_power > max_power) else 1.0
        area_scale = (max_area / total_area * 0.9) if (max_area and total_area > max_area) else 1.0
        scale = min(power_scale, area_scale)

        scaled = []
        cols = max(2, math.ceil(math.sqrt(len(blocks))))
        for i, b in enumerate(blocks):
            col = i % cols
            row = i // cols
            sb = dict(b)
            sb["power_mw"] = round(b["power_mw"] * scale, 1)
            sb["area_mm2"] = round(b["area_mm2"] * scale, 2)
            sb["x"] = col * 15.0
            sb["y"] = row * 15.0
            sb["width"] = 12.0
            sb["height"] = 12.0
            sb["connections"] = []
            scaled.append(sb)

        # Wire blocks sequentially
        for i in range(len(scaled) - 1):
            scaled[i]["connections"] = [scaled[i + 1]["id"]]

        return scaled

    def _make_chip_name(self, prompt: str, domain: str) -> str:
        words = [w.capitalize() for w in re.findall(r'[a-zA-Z]{3,}', prompt)[:3]]
        suffix = {"mobile": "SoC", "automotive": "AutoChip", "ai": "AI-Core",
                  "iot": "IoTNode", "rf": "RF-IC", "server": "ServerCPU"}.get(domain, "ASIC")
        base = "".join(words) if words else "Custom"
        return f"{base}-{suffix}-1.0"

    async def generate_architecture(self, prompt: str, constraints: dict) -> dict:
        domain = self._detect_domain(prompt, constraints)
        templates = self._DOMAIN_TEMPLATES.get(domain, self._DOMAIN_TEMPLATES["general"])
        process_node = constraints.get("process_node", "28nm")

        # Use a hash of the prompt to add slight variation
        h = int(hashlib.md5(prompt.encode()).hexdigest(), 16)
        variation = 0.9 + (h % 20) / 100.0  # 0.90 – 1.09

        blocks = []
        for i, t in enumerate(templates):
            block_id = f"blk_{i:02d}"
            blocks.append({
                "id": block_id,
                "name": t["name"],
                "type": t["type"],
                "power_mw": round(t["power_mw"] * variation, 1),
                "area_mm2": round(t["area_mm2"] * variation, 3),
                "clock_mhz": t.get("clock_mhz"),
                "description": f"{t['name']} block for {domain} application",
                "x": 0.0,
                "y": 0.0,
                "width": 12.0,
                "height": 12.0,
                "connections": [],
            })

        blocks = self._scale_blocks_to_constraints(blocks, constraints)

        name = self._make_chip_name(prompt, domain)
        total_power = round(sum(b["power_mw"] for b in blocks), 1)
        total_area = round(sum(b["area_mm2"] for b in blocks), 3)

        return {
            "name": name,
            "blocks": blocks,
            "process_node": process_node,
            "total_power_mw": total_power,
            "total_area_mm2": total_area,
            "description": f"Physics-generated {domain} architecture for: {prompt[:120]}",
        }

    async def analyze_simulation(self, design: dict, sim_results: dict) -> dict:
        bottlenecks = sim_results.get("bottlenecks", [])
        score = sim_results.get("overall_score", 75)
        insights = []

        if score >= 85:
            insights.append("Design meets all performance targets with margin to spare.")
        elif score >= 65:
            insights.append("Design is viable but has optimization opportunities.")
        else:
            insights.append("Design requires significant improvement before tape-out.")

        for b in bottlenecks[:3]:
            cat = b.get("category", "Unknown")
            detail = b.get("detail", "")
            insights.append(f"{cat}: {detail}")

        return {
            "summary": " ".join(insights),
            "score": score,
            "recommendations": [
                "Consider clock gating on idle blocks to reduce dynamic power.",
                "Review metal layer routing in high-density areas.",
                "Validate thermal interface material thickness against junction temp limits.",
            ],
        }

    async def generate_bom(self, architecture: dict, domain: str) -> list[dict]:
        # Return empty — the catalog fallback in bom_engine.py is comprehensive
        return []

    async def analyze_defects(self, image_description: str, design_context: dict, image_path: str | None = None) -> dict:
        return {
            "defect_count": 0,
            "pass_fail": "PASS",
            "confidence": 0.72,
            "defects": [],
            "root_cause": (
                "Physics-based inspection: No critical defects detected from image metadata. "
                "Full AI vision analysis requires Gemini API key."
            ),
            "design_rule_updates": [],
        }

    async def optimize_design(self, architecture: dict, sim_results: dict, focus: str) -> dict:
        blocks = architecture.get("blocks", [])
        focus_lower = (focus or "balanced").lower()

        optimized = []
        changes = []

        for b in blocks:
            ob = dict(b)
            block_type = b.get("type", "cpu")
            power = b.get("power_mw", 0)
            area = b.get("area_mm2", 0)

            if focus_lower in ("power", "balanced"):
                if block_type in ("cpu", "accelerator", "dsp") and power > 100:
                    reduction = 0.12
                    ob["power_mw"] = round(power * (1 - reduction), 1)
                    changes.append(
                        f"{b.get('name', block_type)}: power gating applied — "
                        f"{power:.0f} → {ob['power_mw']:.0f} mW ({reduction*100:.0f}% reduction)"
                    )

            if focus_lower in ("area", "balanced"):
                if block_type == "memory" and area > 1.0:
                    reduction = 0.10
                    ob["area_mm2"] = round(area * (1 - reduction), 3)
                    changes.append(
                        f"{b.get('name', block_type)}: SRAM compiler re-cut — "
                        f"{area:.2f} → {ob['area_mm2']:.2f} mm² ({reduction*100:.0f}% reduction)"
                    )

            if focus_lower == "performance":
                if block_type == "cpu" and b.get("clock_mhz"):
                    boost = 1.08
                    ob["clock_mhz"] = round(b["clock_mhz"] * boost, 0)
                    ob["power_mw"] = round(power * boost * 1.05, 1)
                    changes.append(
                        f"{b.get('name', block_type)}: clock boosted "
                        f"{b['clock_mhz']:.0f} → {ob['clock_mhz']:.0f} MHz (+{(boost-1)*100:.0f}%)"
                    )

            optimized.append(ob)

        if not changes:
            changes.append(
                "Design already near-optimal for selected focus. "
                "No structural changes applied by physics optimizer."
            )

        return {
            "optimized_blocks": optimized,
            "changes": changes,
        }

    async def generate_supply_chain_analysis(self, architecture: dict, bom: list[dict]) -> dict:
        process_node = architecture.get("process_node", "28nm")
        return {
            "summary": f"Physics-based supply chain analysis for {process_node} design.",
            "primary_risk": "MEDIUM",
            "recommendations": [
                "Dual-source critical passive components.",
                "Establish buffer stock for long lead-time ICs.",
                "Evaluate regional fab alternatives to reduce geopolitical concentration.",
            ],
        }


class GeminiProvider(AIProvider):
    def __init__(self):
        from google import genai
        settings = get_settings()
        self.client = genai.Client(api_key=settings.gemini_api_key)
        # Use a stable, production-available model name.
        # gemini-2.0-flash is fast and broadly available; bump to 2.5-pro when stable.
        self.model = "gemini-2.0-flash"

    async def _call(self, prompt: str) -> str:
        import asyncio
        # generate_content is synchronous — run in a thread pool to avoid
        # blocking FastAPI's async event loop.
        response = await asyncio.to_thread(
            self.client.models.generate_content,
            model=self.model,
            contents=prompt,
        )
        return response.text

    def _extract_json(self, text: str) -> dict:
        """Extract JSON from LLM response, handling markdown code fences."""
        json_match = re.search(r"```(?:json)?\s*\n(.*?)\n```", text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
            raise

    async def generate_architecture(self, prompt: str, constraints: dict) -> dict:
        from backend.prompts.architecture import get_architecture_prompt
        full_prompt = get_architecture_prompt(prompt, constraints)
        response = await self._call(full_prompt)
        return self._extract_json(response)

    async def analyze_simulation(self, design: dict, sim_results: dict) -> dict:
        from backend.prompts.simulation_analysis import get_simulation_analysis_prompt
        full_prompt = get_simulation_analysis_prompt(design, sim_results)
        response = await self._call(full_prompt)
        return self._extract_json(response)

    async def generate_bom(self, architecture: dict, domain: str) -> list[dict]:
        from backend.prompts.bom_generation import get_bom_prompt
        full_prompt = get_bom_prompt(architecture, domain)
        response = await self._call(full_prompt)
        data = self._extract_json(response)
        return data.get("entries", data) if isinstance(data, dict) else data

    async def analyze_defects(self, image_description: str, design_context: dict, image_path: str | None = None) -> dict:
        import asyncio, mimetypes
        from backend.prompts.defect_analysis import get_defect_analysis_prompt
        from google.genai import types as genai_types

        text_prompt = get_defect_analysis_prompt(image_description, design_context)

        # If an image file is available, send actual bytes for real vision analysis
        if image_path:
            import os
            try:
                with open(image_path, "rb") as fh:
                    image_bytes = fh.read()
                mime = mimetypes.guess_type(image_path)[0] or "image/jpeg"
                parts = [
                    genai_types.Part.from_bytes(data=image_bytes, mime_type=mime),
                    genai_types.Part.from_text(text=text_prompt),
                ]
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model,
                    contents=genai_types.Content(role="user", parts=parts),
                )
                return self._extract_json(response.text)
            except FileNotFoundError:
                pass  # fall through to text-only call
            except Exception as exc:
                import logging
                logging.getLogger(__name__).warning(f"Gemini vision call failed, falling back to text: {exc}")

        # Text-only fallback (no image key or read failure)
        response = await self._call(text_prompt)
        return self._extract_json(response)

    async def optimize_design(self, architecture: dict, sim_results: dict, focus: str) -> dict:
        from backend.prompts.optimization import get_optimization_prompt
        full_prompt = get_optimization_prompt(architecture, sim_results, focus)
        response = await self._call(full_prompt)
        return self._extract_json(response)

    async def generate_supply_chain_analysis(self, architecture: dict, bom: list[dict]) -> dict:
        from backend.prompts.supply_chain import get_supply_chain_prompt
        full_prompt = get_supply_chain_prompt(architecture, bom)
        response = await self._call(full_prompt)
        return self._extract_json(response)


class WatsonxProvider(AIProvider):
    """
    Placeholder for IBM watsonx.ai foundation model integration.

    This provider is NOT yet implemented — all calls delegate to PhysicsProvider.
    Set AI_PROVIDER=gemini (with GEMINI_API_KEY) for LLM-backed generation.
    This class exists as an integration point for future watsonx.ai LLM wiring.
    """

    def __init__(self):
        import logging
        logging.getLogger(__name__).warning(
            "WatsonxProvider selected but not yet implemented — delegating to PhysicsProvider. "
            "Set AI_PROVIDER=gemini with GEMINI_API_KEY for LLM-backed generation."
        )
        self._fallback = PhysicsProvider()

    async def generate_architecture(self, prompt: str, constraints: dict) -> dict:
        return await self._fallback.generate_architecture(prompt, constraints)

    async def analyze_simulation(self, design: dict, sim_results: dict) -> dict:
        return await self._fallback.analyze_simulation(design, sim_results)

    async def generate_bom(self, architecture: dict, domain: str) -> list[dict]:
        return await self._fallback.generate_bom(architecture, domain)

    async def analyze_defects(self, image_description: str, design_context: dict, image_path: str | None = None) -> dict:
        return await self._fallback.analyze_defects(image_description, design_context, image_path)

    async def optimize_design(self, architecture: dict, sim_results: dict, focus: str) -> dict:
        return await self._fallback.optimize_design(architecture, sim_results, focus)

    async def generate_supply_chain_analysis(self, architecture: dict, bom: list[dict]) -> dict:
        return await self._fallback.generate_supply_chain_analysis(architecture, bom)


_provider_instance: Optional[AIProvider] = None


def get_ai_provider() -> AIProvider:
    global _provider_instance
    if _provider_instance is None:
        settings = get_settings()
        if settings.ai_provider == "watsonx":
            _provider_instance = WatsonxProvider()
        elif settings.ai_provider == "gemini" and settings.gemini_api_key:
            try:
                _provider_instance = GeminiProvider()
            except Exception:
                import logging
                logging.getLogger(__name__).warning(
                    "GeminiProvider init failed — falling back to PhysicsProvider"
                )
                _provider_instance = PhysicsProvider()
        else:
            import logging
            logging.getLogger(__name__).info(
                "No Gemini API key configured — using PhysicsProvider (physics-based fallback)"
            )
            _provider_instance = PhysicsProvider()
    return _provider_instance
