import json


def get_simulation_analysis_prompt(design: dict, sim_results: dict) -> str:
    return f"""You are a semiconductor simulation engineer analyzing digital twin results.

CHIP DESIGN:
{json.dumps(design, indent=2)}

SIMULATION RESULTS:
{json.dumps(sim_results, indent=2)}

Analyze these simulation results and provide engineering insights. Focus on:
1. Thermal hotspots and their root causes
2. Signal integrity issues and timing violations
3. Power distribution inefficiencies
4. Specific actionable recommendations

Return ONLY valid JSON:
{{
  "thermal_analysis": {{
    "hotspot_blocks": ["<block ids with T > 85°C>"],
    "root_causes": ["<why each hotspot occurs>"],
    "recommendations": ["<specific mitigation steps>"]
  }},
  "signal_analysis": {{
    "critical_paths": ["<path descriptions>"],
    "timing_risks": ["<specific timing concerns>"],
    "recommendations": ["<routing or buffer insertion suggestions>"]
  }},
  "power_analysis": {{
    "power_hogs": ["<blocks consuming disproportionate power>"],
    "leakage_concerns": ["<static power issues>"],
    "recommendations": ["<power gating, clock gating suggestions>"]
  }},
  "overall_assessment": "<2-3 sentence summary>",
  "risk_level": "<LOW|MEDIUM|HIGH|CRITICAL>"
}}"""
