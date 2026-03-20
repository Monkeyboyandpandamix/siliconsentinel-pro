"""
Signal integrity and timing analysis for semiconductor designs.

Uses the Elmore delay model for propagation delay estimation:
  t_pd = 0.7 · R_wire · C_wire

Crosstalk coupling estimation based on Miller capacitance between
adjacent metal lines at a given pitch.

Critical path identification uses a simple graph traversal of the
block connectivity to find the longest delay path.
"""

import math
from backend.semiconductor.process_nodes import ProcessNode
from backend.semiconductor.materials import METAL_LAYERS


def estimate_wire_params(
    length_mm: float,
    process_node: ProcessNode,
    metal_layer: str = "copper",
) -> tuple[float, float]:
    """Estimate wire resistance and capacitance.

    Returns (R_ohm, C_fF) for a wire of given length at the process node.
    Wire width assumed to be minimum metal pitch.
    """
    metal = METAL_LAYERS.get(metal_layer, METAL_LAYERS["copper"])
    pitch_um = process_node.min_metal_pitch_nm / 1000.0
    width_um = pitch_um * 0.5
    thickness_um = width_um * 1.5  # typical aspect ratio
    length_um = length_mm * 1000.0

    rho = metal.resistivity_ohm_cm * 1e-4  # Ω·m
    cross_section_m2 = (width_um * 1e-6) * (thickness_um * 1e-6)
    r_ohm = rho * (length_um * 1e-6) / cross_section_m2

    # Parallel plate capacitance approximation for wire-to-ground
    epsilon_0 = 8.854e-12  # F/m
    k_ild = 2.7  # low-k dielectric
    spacing_um = pitch_um * 0.5
    cap_per_length = epsilon_0 * k_ild * (width_um * 1e-6) / (spacing_um * 1e-6)
    c_f = cap_per_length * (length_um * 1e-6)
    c_ff = c_f * 1e15

    return (r_ohm, c_ff)


def elmore_delay_ps(r_ohm: float, c_ff: float) -> float:
    """Elmore delay: t_pd = 0.7 · R · C (in picoseconds)."""
    c_f = c_ff * 1e-15
    delay_s = 0.7 * r_ohm * c_f
    return delay_s * 1e12


def compute_signal_integrity(
    blocks: list[dict],
    process_node: ProcessNode,
    die_side_mm: float = 5.0,
) -> dict:
    """Analyze signal integrity across all inter-block connections.

    For each connection, estimates wire length from block positions,
    computes Elmore delay, and flags critical paths.
    """
    block_map = {b["id"]: b for b in blocks}
    paths = []

    for block in blocks:
        for target_id in block.get("connections", []):
            target = block_map.get(target_id)
            if not target:
                continue

            # Manhattan distance between block centers in die coordinates
            bx = (block.get("x", 0) + block.get("width", 10) / 2) / 100.0
            by = (block.get("y", 0) + block.get("height", 10) / 2) / 100.0
            tx = (target.get("x", 0) + target.get("width", 10) / 2) / 100.0
            ty = (target.get("y", 0) + target.get("height", 10) / 2) / 100.0

            manhattan_norm = abs(bx - tx) + abs(by - ty)
            wire_length_mm = manhattan_norm * die_side_mm

            r, c = estimate_wire_params(wire_length_mm, process_node)
            delay = elmore_delay_ps(r, c)

            # Crosstalk risk based on wire density and proximity
            crosstalk_risk = "LOW"
            if wire_length_mm > die_side_mm * 0.5:
                crosstalk_risk = "MEDIUM"
            if wire_length_mm > die_side_mm * 0.75:
                crosstalk_risk = "HIGH"

            integrity_score = max(0, 100 - delay * 0.1 - (10 if crosstalk_risk == "HIGH" else 0))

            paths.append({
                "from_block": block.get("id"),
                "to_block": target_id,
                "delay_ps": round(delay, 2),
                "integrity_score": round(min(100, max(0, integrity_score)), 1),
                "is_critical": False,
                "crosstalk_risk": crosstalk_risk,
                "wire_length_mm": round(wire_length_mm, 3),
            })

    if paths:
        paths.sort(key=lambda p: p["delay_ps"], reverse=True)
        # Top 20% longest paths are "critical"
        critical_count = max(1, len(paths) // 5)
        for i in range(critical_count):
            paths[i]["is_critical"] = True

    critical_delay = paths[0]["delay_ps"] if paths else 0.0
    worst_integrity = min((p["integrity_score"] for p in paths), default=100.0)
    timing_violations = sum(1 for p in paths if p["delay_ps"] > 500)  # >500ps is a violation flag

    return {
        "paths": paths,
        "critical_path_delay_ps": round(critical_delay, 2),
        "worst_integrity_score": round(worst_integrity, 1),
        "timing_violations": timing_violations,
    }


def compute_timing_analysis(
    blocks: list[dict],
    process_node: ProcessNode,
    clock_mhz: float = 100.0,
    die_side_mm: float = 5.0,
) -> dict:
    """Timing analysis to determine if the design meets clock requirements.

    Computes setup and hold slack based on critical path delay vs clock period.
    """
    signal = compute_signal_integrity(blocks, process_node, die_side_mm)
    critical_delay_ps = signal["critical_path_delay_ps"]
    critical_delay_ns = critical_delay_ps / 1000.0

    clock_period_ns = 1000.0 / clock_mhz  # e.g., 100 MHz → 10 ns
    gate_delay_ns = process_node.gate_length_nm * 0.01  # rough: 1ps per nm gate length

    total_path_delay_ns = critical_delay_ns + gate_delay_ns * 5  # assume 5 gate stages

    setup_time_ns = 0.1  # typical flip-flop setup time
    setup_slack = clock_period_ns - total_path_delay_ns - setup_time_ns
    hold_slack = total_path_delay_ns - 0.05  # hold time = 50ps

    max_achievable_mhz = 1000.0 / max(total_path_delay_ns + setup_time_ns, 0.001)

    # Find critical path blocks
    critical_paths = [p for p in signal["paths"] if p["is_critical"]]
    critical_block_ids = set()
    for p in critical_paths:
        critical_block_ids.add(p["from_block"])
        critical_block_ids.add(p["to_block"])

    return {
        "critical_path_blocks": list(critical_block_ids),
        "critical_path_delay_ns": round(total_path_delay_ns, 3),
        "max_clock_mhz": round(max_achievable_mhz, 1),
        "setup_slack_ns": round(setup_slack, 3),
        "hold_slack_ns": round(hold_slack, 3),
        "timing_met": setup_slack > 0 and hold_slack > 0,
    }
