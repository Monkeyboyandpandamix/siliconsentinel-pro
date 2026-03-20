import json


def get_optimization_prompt(architecture: dict, sim_results: dict, focus: str) -> str:
    focus_guidance = {
        "power": "Prioritize reducing total power consumption. Consider clock gating, power gating, voltage scaling, and reducing switching activity.",
        "performance": "Prioritize improving clock speed and reducing critical path delay. Consider pipelining, buffer insertion, and logic restructuring.",
        "area": "Prioritize reducing die area. Consider shared resources, memory compression, and block consolidation.",
        "cost": "Prioritize reducing manufacturing cost. Consider simpler process options, reducing metal layers, and smaller die size.",
        "balanced": "Balance power, performance, cost, and area tradeoffs equally.",
    }

    return f"""You are a senior IC design optimization engineer.

CURRENT ARCHITECTURE:
{json.dumps(architecture, indent=2)}

SIMULATION RESULTS SUMMARY:
{json.dumps(sim_results, indent=2)}

OPTIMIZATION FOCUS: {focus}
{focus_guidance.get(focus, focus_guidance['balanced'])}

Propose specific, actionable optimizations to the chip architecture. Each optimization
should be physically realizable and must preserve functional correctness.

Return ONLY valid JSON:
{{
  "optimized_blocks": [
    {{
      "id": "<block id>",
      "name": "<block name>",
      "type": "<block type>",
      "power_mw": <optimized power>,
      "area_mm2": <optimized area>,
      "x": <layout x>,
      "y": <layout y>,
      "width": <width>,
      "height": <height>,
      "connections": ["<connected block ids>"],
      "clock_mhz": <optimized clock or null>,
      "description": "<updated description>"
    }}
  ],
  "changes": [
    "<human-readable description of each change made>"
  ],
  "tradeoffs": {{
    "power_delta_pct": <negative = improvement>,
    "area_delta_pct": <negative = improvement>,
    "performance_delta_pct": <positive = improvement>,
    "cost_delta_pct": <negative = improvement>
  }}
}}"""
