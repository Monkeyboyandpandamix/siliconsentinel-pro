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

REFERENCE EXAMPLES for a BLE wearable at 28nm:
- CPU: ARM Cortex-M4F (120 MHz), 1.2 mW, 0.35 mm², reference_component: "ARM Cortex-M4F IP (TSMC 28HPM)"
- Memory: SRAM 256KB (TS1N28HPM), 0.3 mW, 0.55 mm², reference_component: "TSMC TS1N28HPMLVTA bitcell"
- RF: BLE 5.2 Transceiver (Bluetooth 5.2), 7 mW TX, 1.1 mm², reference_component: "Nordic nRF52840-QDAA RF subsystem"
- Power: PMIC (DCDC + LDO), 0.08 mW, 0.25 mm², reference_component: "TI TPS62840 DC/DC + TLV1117 LDO IP"
- IO: GPIO/SPI/I2C/UART pad ring, 0.12 mW, 0.18 mm², reference_component: "TSMC 28HPM GPIO_18 standard pad cell"

Scale reference_component, power, and area appropriately for the actual node and block function.
cell_library should be the standard cell library for the process node (e.g. "TSMC 28HPM SC9 v2.1").
voltage_domain: e.g. "VDD 1.0V", "VDD 1.8V core / 3.3V IO", "VDD 0.9V".

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
      "description": "<one-line technical description including key specs>",
      "reference_component": "<specific IP core or standard cell reference, e.g. 'ARM Cortex-M4F IP (TSMC 28HPM)'>",
      "cell_library": "<standard cell library name for this process node>",
      "voltage_domain": "<voltage supply, e.g. 'VDD 1.0V core / 1.8V IO'>"
    }}
  ]
}}"""
