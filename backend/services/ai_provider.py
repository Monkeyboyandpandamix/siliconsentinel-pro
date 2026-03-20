from abc import ABC, abstractmethod
from typing import Optional
import json
import re

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
    async def analyze_defects(self, image_description: str, design_context: dict) -> dict:
        """Analyze chip image for defects."""

    @abstractmethod
    async def optimize_design(self, architecture: dict, sim_results: dict, focus: str) -> dict:
        """Suggest design optimizations given simulation results."""

    @abstractmethod
    async def generate_supply_chain_analysis(self, architecture: dict, bom: list[dict]) -> dict:
        """Generate supply chain risk analysis and supplier recommendations."""


class GeminiProvider(AIProvider):
    def __init__(self):
        from google import genai
        settings = get_settings()
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = "gemini-3.1-pro-preview"

    async def _call(self, prompt: str) -> str:
        response = self.client.models.generate_content(
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

    async def analyze_defects(self, image_description: str, design_context: dict) -> dict:
        from backend.prompts.defect_analysis import get_defect_analysis_prompt
        full_prompt = get_defect_analysis_prompt(image_description, design_context)
        response = await self._call(full_prompt)
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
    """Stub for IBM watsonx.ai integration. Implements the same interface
    so the system can switch providers via config."""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.watsonx_api_key
        self.project_id = settings.watsonx_project_id
        self.url = settings.watsonx_url

    async def generate_architecture(self, prompt: str, constraints: dict) -> dict:
        raise NotImplementedError("watsonx provider not yet implemented — set AI_PROVIDER=gemini")

    async def analyze_simulation(self, design: dict, sim_results: dict) -> dict:
        raise NotImplementedError("watsonx provider not yet implemented")

    async def generate_bom(self, architecture: dict, domain: str) -> list[dict]:
        raise NotImplementedError("watsonx provider not yet implemented")

    async def analyze_defects(self, image_description: str, design_context: dict) -> dict:
        raise NotImplementedError("watsonx provider not yet implemented")

    async def optimize_design(self, architecture: dict, sim_results: dict, focus: str) -> dict:
        raise NotImplementedError("watsonx provider not yet implemented")

    async def generate_supply_chain_analysis(self, architecture: dict, bom: list[dict]) -> dict:
        raise NotImplementedError("watsonx provider not yet implemented")


_provider_instance: Optional[AIProvider] = None


def get_ai_provider() -> AIProvider:
    global _provider_instance
    if _provider_instance is None:
        settings = get_settings()
        if settings.ai_provider == "watsonx":
            _provider_instance = WatsonxProvider()
        else:
            _provider_instance = GeminiProvider()
    return _provider_instance
