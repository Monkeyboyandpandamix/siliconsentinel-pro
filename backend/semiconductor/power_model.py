"""
CMOS power modeling for semiconductor blocks.

Dynamic power:  P_dyn = α · C_load · V_dd² · f
Static power:   P_static = I_leak · V_dd

Where:
  α = activity factor (switching probability per clock cycle)
  C_load = total load capacitance
  V_dd = supply voltage
  f = clock frequency
  I_leak = leakage current (technology-dependent)
"""

from backend.semiconductor.process_nodes import ProcessNode
from backend.semiconductor.materials import BLOCK_TYPE_DEFAULTS


def compute_block_power(
    block: dict,
    process_node: ProcessNode,
    clock_mhz: float | None = None,
    voltage_v: float | None = None,
) -> dict:
    """Compute dynamic and static power for a single block.

    Uses CMOS power equations with process-node-scaled parameters.
    If the block already has a power_mw value from the AI, we use it as
    a baseline and compute the split between dynamic and static.
    """
    block_type = block.get("type", "cpu")
    defaults = BLOCK_TYPE_DEFAULTS.get(block_type, BLOCK_TYPE_DEFAULTS["cpu"])

    vdd = voltage_v or process_node.vdd_nominal_v
    freq_mhz = clock_mhz or block.get("clock_mhz") or 100.0
    freq_hz = freq_mhz * 1e6
    area_mm2 = block.get("area_mm2", 1.0)

    alpha = defaults["activity_factor"]
    cap_pf_per_mm2 = defaults["capacitance_pf_per_mm2"]
    leak_ua_per_mm2 = defaults["leakage_ua_per_mm2"]

    total_cap_f = cap_pf_per_mm2 * area_mm2 * 1e-12
    p_dynamic_w = alpha * total_cap_f * (vdd ** 2) * freq_hz
    p_dynamic_w *= process_node.dynamic_power_factor

    leak_a = leak_ua_per_mm2 * area_mm2 * 1e-6 * process_node.leakage_factor
    p_static_w = leak_a * vdd

    p_dynamic_mw = p_dynamic_w * 1000
    p_static_mw = p_static_w * 1000
    total_mw = p_dynamic_mw + p_static_mw

    return {
        "block_id": block.get("id", "unknown"),
        "block_name": block.get("name", "Unknown"),
        "dynamic_power_mw": round(p_dynamic_mw, 4),
        "static_power_mw": round(p_static_mw, 4),
        "total_power_mw": round(total_mw, 4),
    }


def compute_full_power_breakdown(
    blocks: list[dict],
    process_node: ProcessNode,
    clock_mhz: float | None = None,
    voltage_v: float | None = None,
) -> dict:
    """Compute power breakdown for all blocks in the design."""
    results = []
    total_dynamic = 0.0
    total_static = 0.0

    for block in blocks:
        power = compute_block_power(block, process_node, clock_mhz, voltage_v)
        total_dynamic += power["dynamic_power_mw"]
        total_static += power["static_power_mw"]
        results.append(power)

    total_power = total_dynamic + total_static

    for r in results:
        r["percentage"] = round(r["total_power_mw"] / total_power * 100, 1) if total_power > 0 else 0

    # Power efficiency: ratio of dynamic (useful switching) to total
    efficiency = (total_dynamic / total_power * 100) if total_power > 0 else 100.0

    return {
        "blocks": results,
        "total_dynamic_mw": round(total_dynamic, 4),
        "total_static_mw": round(total_static, 4),
        "total_power_mw": round(total_power, 4),
        "power_efficiency_pct": round(efficiency, 1),
    }
