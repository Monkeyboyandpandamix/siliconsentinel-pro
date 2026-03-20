import json


def get_architecture_prompt(nl_input: str, constraints: dict) -> str:
    constraint_text = ""
    if constraints:
        parts = []
        if constraints.get("max_power_mw"):
            parts.append(f"Maximum power budget: {constraints['max_power_mw']} mW")
        if constraints.get("max_area_mm2"):
            parts.append(f"Maximum die area: {constraints['max_area_mm2']} mm²")
        if constraints.get("min_clock_mhz"):
            parts.append(f"Minimum clock frequency: {constraints['min_clock_mhz']} MHz")
        if constraints.get("max_temp_c"):
            parts.append(f"Maximum operating temperature: {constraints['max_temp_c']}°C")
        if constraints.get("budget_per_unit"):
            parts.append(f"Target cost per unit: ${constraints['budget_per_unit']}")
        if constraints.get("target_volume"):
            parts.append(f"Production volume: {constraints['target_volume']} units")
        if constraints.get("process_node"):
            parts.append(f"Target process node: {constraints['process_node']}")
        if constraints.get("application_domain"):
            parts.append(f"Application domain: {constraints['application_domain']}")
        constraint_text = "\n".join(parts)

    return f"""You are a senior semiconductor architect with 20+ years of experience in IC design.
Given the following chip requirements, generate a complete architecture specification.

USER REQUEST:
{nl_input}

DESIGN CONSTRAINTS:
{constraint_text if constraint_text else "No specific constraints provided — use reasonable defaults for the described application."}

Generate a JSON response with this exact structure. All values must be realistic for the
specified process node and application. Power values should follow CMOS scaling — smaller
nodes have lower dynamic power but higher leakage. Area values should reflect actual
transistor density at the specified node.

Block types must be one of: cpu, memory, io, power, rf, analog, dsp, accelerator

For a BLE wearable chip at 28nm, typical blocks might consume:
- ARM Cortex-M0+ core: ~0.5-2 mW active, ~0.3 mm²
- SRAM 64KB: ~0.1-0.5 mW, ~0.15 mm²
- BLE radio (RF transceiver): ~5-10 mW TX, ~1.0 mm²
- Power management unit: ~0.05 mW, ~0.2 mm²
- GPIO/peripherals: ~0.1 mW, ~0.1 mm²

Scale appropriately for other applications and nodes.

Return ONLY valid JSON (no markdown, no explanation):
{{
  "name": "<descriptive chip name>",
  "process_node": "<e.g. 28nm>",
  "total_power_mw": <sum of all block powers>,
  "total_area_mm2": <sum of all block areas>,
  "metal_layers": <4-12 depending on complexity>,
  "substrate": "<silicon or SOI>",
  "gate_oxide": "<SiO2 for >=65nm, HfO2 for <=45nm>",
  "interconnect": "<aluminum for >=130nm, copper for <=90nm>",
  "blocks": [
    {{
      "id": "<unique_id>",
      "name": "<block name>",
      "type": "<cpu|memory|io|power|rf|analog|dsp|accelerator>",
      "power_mw": <realistic power in mW>,
      "area_mm2": <realistic area in mm²>,
      "x": <0-90, non-overlapping layout>,
      "y": <0-90, non-overlapping layout>,
      "width": <proportional to area>,
      "height": <proportional to area>,
      "connections": ["<ids of connected blocks>"],
      "clock_mhz": <if clocked, null otherwise>,
      "description": "<one-line technical description>"
    }}
  ]
}}"""
