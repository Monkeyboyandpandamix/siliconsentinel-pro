"""
Real-world semiconductor process node specifications.

Data sourced from publicly available TSMC, Samsung, and Intel foundry datasheets,
ITRS roadmaps, and IEEE ISSCC publications. Values are representative midpoints
for general-purpose logic processes.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ProcessNode:
    name: str
    gate_length_nm: float
    vdd_nominal_v: float
    transistor_density_mtr_mm2: float  # million transistors per mm²
    dynamic_power_factor: float  # relative to 65nm baseline
    leakage_factor: float  # relative to 65nm baseline
    metal_layers_typical: int
    interconnect_material: str
    gate_oxide: str
    min_metal_pitch_nm: float
    contacted_poly_pitch_nm: float
    sram_cell_area_um2: float  # 6T SRAM bitcell area
    fab_cost_per_wafer_usd: float
    defect_density_per_cm2: float  # D0 for yield modeling
    max_junction_temp_c: float
    thermal_resistance_c_per_w: float  # typical package Rja
    wafer_diameter_mm: int
    typical_die_edge_exclusion_mm: float


PROCESS_NODES: dict[str, ProcessNode] = {
    "5nm": ProcessNode(
        name="5nm (N5)",
        gate_length_nm=5,
        vdd_nominal_v=0.75,
        transistor_density_mtr_mm2=171.3,
        dynamic_power_factor=0.45,
        leakage_factor=1.8,
        metal_layers_typical=13,
        interconnect_material="copper (dual damascene) + cobalt local",
        gate_oxide="HfO2 (high-k)",
        min_metal_pitch_nm=28,
        contacted_poly_pitch_nm=48,
        sram_cell_area_um2=0.021,
        fab_cost_per_wafer_usd=17000,
        defect_density_per_cm2=0.12,
        max_junction_temp_c=105,
        thermal_resistance_c_per_w=25.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=2.0,
    ),
    "7nm": ProcessNode(
        name="7nm (N7)",
        gate_length_nm=7,
        vdd_nominal_v=0.75,
        transistor_density_mtr_mm2=113.9,
        dynamic_power_factor=0.55,
        leakage_factor=1.5,
        metal_layers_typical=12,
        interconnect_material="copper (dual damascene)",
        gate_oxide="HfO2 (high-k)",
        min_metal_pitch_nm=36,
        contacted_poly_pitch_nm=54,
        sram_cell_area_um2=0.027,
        fab_cost_per_wafer_usd=10000,
        defect_density_per_cm2=0.10,
        max_junction_temp_c=105,
        thermal_resistance_c_per_w=28.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=2.0,
    ),
    "14nm": ProcessNode(
        name="14nm (N14)",
        gate_length_nm=14,
        vdd_nominal_v=0.80,
        transistor_density_mtr_mm2=43.5,
        dynamic_power_factor=0.70,
        leakage_factor=1.2,
        metal_layers_typical=10,
        interconnect_material="copper (dual damascene)",
        gate_oxide="HfO2 (high-k)",
        min_metal_pitch_nm=56,
        contacted_poly_pitch_nm=78,
        sram_cell_area_um2=0.064,
        fab_cost_per_wafer_usd=5500,
        defect_density_per_cm2=0.08,
        max_junction_temp_c=110,
        thermal_resistance_c_per_w=30.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=2.5,
    ),
    "28nm": ProcessNode(
        name="28nm (N28)",
        gate_length_nm=28,
        vdd_nominal_v=0.90,
        transistor_density_mtr_mm2=19.5,
        dynamic_power_factor=0.85,
        leakage_factor=1.0,
        metal_layers_typical=8,
        interconnect_material="copper",
        gate_oxide="SiON / HfO2",
        min_metal_pitch_nm=90,
        contacted_poly_pitch_nm=117,
        sram_cell_area_um2=0.120,
        fab_cost_per_wafer_usd=3000,
        defect_density_per_cm2=0.06,
        max_junction_temp_c=115,
        thermal_resistance_c_per_w=35.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=3.0,
    ),
    "65nm": ProcessNode(
        name="65nm",
        gate_length_nm=65,
        vdd_nominal_v=1.0,
        transistor_density_mtr_mm2=5.3,
        dynamic_power_factor=1.0,
        leakage_factor=0.8,
        metal_layers_typical=7,
        interconnect_material="copper",
        gate_oxide="SiON",
        min_metal_pitch_nm=160,
        contacted_poly_pitch_nm=220,
        sram_cell_area_um2=0.570,
        fab_cost_per_wafer_usd=2000,
        defect_density_per_cm2=0.04,
        max_junction_temp_c=120,
        thermal_resistance_c_per_w=38.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=3.0,
    ),
    "180nm": ProcessNode(
        name="180nm",
        gate_length_nm=180,
        vdd_nominal_v=1.8,
        transistor_density_mtr_mm2=1.0,
        dynamic_power_factor=1.2,
        leakage_factor=0.5,
        metal_layers_typical=6,
        interconnect_material="aluminum + copper",
        gate_oxide="SiO2",
        min_metal_pitch_nm=500,
        contacted_poly_pitch_nm=640,
        sram_cell_area_um2=3.0,
        fab_cost_per_wafer_usd=1200,
        defect_density_per_cm2=0.02,
        max_junction_temp_c=125,
        thermal_resistance_c_per_w=42.0,
        wafer_diameter_mm=200,
        typical_die_edge_exclusion_mm=3.0,
    ),
}


def get_process_node(name: str) -> ProcessNode:
    """Look up process node by name (e.g. '28nm', '7nm', '28nm (N28)')."""
    import re
    import json, time, pathlib

    # region agent log
    _log_path = pathlib.Path("debug-8f466e.log")
    _log_path.open("a").write(json.dumps({"sessionId": "8f466e", "hypothesisId": "A", "location": "process_nodes.py:get_process_node", "message": "raw input", "data": {"name": name}, "timestamp": int(time.time() * 1000)}) + "\n")
    # endregion

    normalized = name.lower().replace(" ", "").replace("_", "")

    # Exact key match
    if normalized in PROCESS_NODES:
        return PROCESS_NODES[normalized]

    # Extract core Xnm token (handles "28nm (N28)", "7nm LPP", "5 nm", etc.)
    m = re.search(r'(\d+\s*nm)', name, re.IGNORECASE)
    if m:
        core = m.group(1).replace(" ", "").lower()
        if core in PROCESS_NODES:
            # region agent log
            _log_path.open("a").write(json.dumps({"sessionId": "8f466e", "hypothesisId": "A", "location": "process_nodes.py:get_process_node", "message": "matched via regex", "data": {"core": core}, "timestamp": int(time.time() * 1000)}) + "\n")
            # endregion
            return PROCESS_NODES[core]

    # Fallback: any key that appears as substring in the normalized input
    for key, node in PROCESS_NODES.items():
        if key.lower() in normalized:
            # region agent log
            _log_path.open("a").write(json.dumps({"sessionId": "8f466e", "hypothesisId": "A", "location": "process_nodes.py:get_process_node", "message": "matched via substring fallback", "data": {"key": key}, "timestamp": int(time.time() * 1000)}) + "\n")
            # endregion
            return node

    # region agent log
    _log_path.open("a").write(json.dumps({"sessionId": "8f466e", "hypothesisId": "A", "location": "process_nodes.py:get_process_node", "message": "no match found", "data": {"name": name, "normalized": normalized}, "timestamp": int(time.time() * 1000)}) + "\n")
    # endregion
    raise ValueError(f"Unknown process node: {name}. Available: {list(PROCESS_NODES.keys())}")


def estimate_dies_per_wafer(die_area_mm2: float, wafer_diameter_mm: int = 300, edge_exclusion_mm: float = 3.0) -> int:
    """Estimate gross die per wafer using the standard geometric formula.

    GDW ≈ (π * r²) / A - (π * 2r) / √(2A)
    where r = usable wafer radius, A = die area.
    """
    import math
    r = (wafer_diameter_mm / 2) - edge_exclusion_mm
    usable_area = math.pi * r * r
    die_edge = math.sqrt(die_area_mm2)
    perimeter_term = math.pi * 2 * r / (math.sqrt(2 * die_area_mm2))
    gross = int(usable_area / die_area_mm2 - perimeter_term)
    return max(gross, 1)
