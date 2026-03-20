"""
Real-world semiconductor process node specifications.

Data sourced from publicly available TSMC, Samsung, GlobalFoundries, Intel,
UMC, and SMIC technical disclosure documents, IEEE ISSCC papers, IRDS roadmaps,
and analyst reports (TechInsights, IC Insights). Values are validated midpoints
for general-purpose logic/mixed-signal processes as of 2024.
"""

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class ProcessNode:
    name: str
    gate_length_nm: float
    vdd_nominal_v: float
    transistor_density_mtr_mm2: float   # million transistors per mm²
    dynamic_power_factor: float          # relative to 65nm baseline (1.0)
    leakage_factor: float                # relative to 65nm baseline (1.0)
    metal_layers_typical: int
    interconnect_material: str
    gate_oxide: str
    min_metal_pitch_nm: float
    contacted_poly_pitch_nm: float
    sram_cell_area_um2: float            # 6T bitcell area
    fab_cost_per_wafer_usd: float
    defect_density_per_cm2: float        # D0 for Poisson yield model
    max_junction_temp_c: float
    thermal_resistance_c_per_w: float    # typical package Rja
    wafer_diameter_mm: int
    typical_die_edge_exclusion_mm: float


# ─── Process node database ────────────────────────────────────────────────────
# Wafer costs: TSMC list pricing, corroborated by IBS/IC Insights surveys.
# Defect densities: industry consensus for mature process at volume ramp.

PROCESS_NODES: dict[str, ProcessNode] = {

    # ── TSMC N3 / Samsung SF3 (3nm class) ────────────────────────────────────
    "3nm": ProcessNode(
        name="3nm (N3 FinFET / SF3 GAA)",
        gate_length_nm=3,
        vdd_nominal_v=0.70,
        transistor_density_mtr_mm2=292.0,        # TSMC N3: ~292 MTr/mm²
        dynamic_power_factor=0.35,
        leakage_factor=2.2,
        metal_layers_typical=14,
        interconnect_material="Ruthenium local + copper (dual damascene)",
        gate_oxide="HfO2 high-k MG (TSMC) / MBC-GAA (Samsung SF3)",
        min_metal_pitch_nm=21,
        contacted_poly_pitch_nm=45,
        sram_cell_area_um2=0.0199,               # TSMC N3: 0.0199 µm²
        fab_cost_per_wafer_usd=20_000,           # TSMC N3 estimated ~$20k
        defect_density_per_cm2=0.18,             # early ramp D0
        max_junction_temp_c=100,
        thermal_resistance_c_per_w=22.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=2.0,
    ),

    # ── TSMC N5 / Samsung SF5 (5nm class) ────────────────────────────────────
    "5nm": ProcessNode(
        name="5nm (N5 FinFET)",
        gate_length_nm=5,
        vdd_nominal_v=0.75,
        transistor_density_mtr_mm2=171.3,        # TSMC N5: 171.3 MTr/mm²
        dynamic_power_factor=0.45,
        leakage_factor=1.8,
        metal_layers_typical=13,
        interconnect_material="Cobalt local interconnect + copper (dual damascene)",
        gate_oxide="HfO2 high-k metal gate",
        min_metal_pitch_nm=28,
        contacted_poly_pitch_nm=48,
        sram_cell_area_um2=0.021,
        fab_cost_per_wafer_usd=17_000,
        defect_density_per_cm2=0.12,
        max_junction_temp_c=105,
        thermal_resistance_c_per_w=25.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=2.0,
    ),

    # ── TSMC N7 / Samsung SF7 (7nm class) ────────────────────────────────────
    "7nm": ProcessNode(
        name="7nm (N7 FinFET EUV)",
        gate_length_nm=7,
        vdd_nominal_v=0.75,
        transistor_density_mtr_mm2=113.9,        # TSMC N7: 113.9 MTr/mm²
        dynamic_power_factor=0.55,
        leakage_factor=1.5,
        metal_layers_typical=12,
        interconnect_material="Copper (dual damascene) EUV M2-M4",
        gate_oxide="HfO2 high-k metal gate",
        min_metal_pitch_nm=36,
        contacted_poly_pitch_nm=54,
        sram_cell_area_um2=0.027,
        fab_cost_per_wafer_usd=10_000,
        defect_density_per_cm2=0.09,
        max_junction_temp_c=105,
        thermal_resistance_c_per_w=28.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=2.0,
    ),

    # ── Intel 4 / TSMC N10 equivalent ────────────────────────────────────────
    "10nm": ProcessNode(
        name="10nm (Intel 4 / TSMC N10)",
        gate_length_nm=10,
        vdd_nominal_v=0.80,
        transistor_density_mtr_mm2=67.2,
        dynamic_power_factor=0.62,
        leakage_factor=1.35,
        metal_layers_typical=11,
        interconnect_material="Copper (dual damascene) DUV + some EUV",
        gate_oxide="HfO2 high-k metal gate",
        min_metal_pitch_nm=44,
        contacted_poly_pitch_nm=64,
        sram_cell_area_um2=0.041,
        fab_cost_per_wafer_usd=7_200,
        defect_density_per_cm2=0.09,
        max_junction_temp_c=105,
        thermal_resistance_c_per_w=29.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=2.0,
    ),

    # ── TSMC N12 / N16 / Samsung 14LPE / Intel 7 ─────────────────────────────
    "14nm": ProcessNode(
        name="14nm (FinFET — TSMC N12/N16, Samsung 14LPE, Intel 7)",
        gate_length_nm=14,
        vdd_nominal_v=0.80,
        transistor_density_mtr_mm2=43.5,
        dynamic_power_factor=0.70,
        leakage_factor=1.2,
        metal_layers_typical=10,
        interconnect_material="Copper (dual damascene) all DUV",
        gate_oxide="HfO2 high-k metal gate",
        min_metal_pitch_nm=56,
        contacted_poly_pitch_nm=78,
        sram_cell_area_um2=0.064,
        fab_cost_per_wafer_usd=5_500,
        defect_density_per_cm2=0.07,
        max_junction_temp_c=110,
        thermal_resistance_c_per_w=30.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=2.5,
    ),

    # ── GF 22FDX / TSMC 22ULP (22nm FD-SOI) ─────────────────────────────────
    "22nm": ProcessNode(
        name="22nm (GF 22FDX FD-SOI / TSMC 22ULP)",
        gate_length_nm=22,
        vdd_nominal_v=0.80,
        transistor_density_mtr_mm2=28.9,
        dynamic_power_factor=0.75,
        leakage_factor=0.9,                      # FD-SOI: lower leakage
        metal_layers_typical=9,
        interconnect_material="Copper (dual damascene)",
        gate_oxide="SiO2/HfO2 hybrid high-k",
        min_metal_pitch_nm=72,
        contacted_poly_pitch_nm=90,
        sram_cell_area_um2=0.090,
        fab_cost_per_wafer_usd=4_200,
        defect_density_per_cm2=0.06,
        max_junction_temp_c=110,
        thermal_resistance_c_per_w=32.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=2.5,
    ),

    # ── TSMC N28 / SMIC 28HKC+ / UMC 28HLP ──────────────────────────────────
    "28nm": ProcessNode(
        name="28nm (HKMG — TSMC N28, SMIC 28HKC+, UMC 28HLP)",
        gate_length_nm=28,
        vdd_nominal_v=0.90,
        transistor_density_mtr_mm2=19.5,
        dynamic_power_factor=0.85,
        leakage_factor=1.0,                      # baseline
        metal_layers_typical=8,
        interconnect_material="Copper (dual damascene + via-middle)",
        gate_oxide="SiON + HfO2 gate-last HKMG",
        min_metal_pitch_nm=90,
        contacted_poly_pitch_nm=117,
        sram_cell_area_um2=0.120,
        fab_cost_per_wafer_usd=3_000,
        defect_density_per_cm2=0.05,
        max_junction_temp_c=115,
        thermal_resistance_c_per_w=35.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=3.0,
    ),

    # ── TSMC N40 / UMC 40nm / GF 40LP ───────────────────────────────────────
    "40nm": ProcessNode(
        name="40nm (TSMC N40, UMC 40nm, GF 40LP)",
        gate_length_nm=40,
        vdd_nominal_v=1.0,
        transistor_density_mtr_mm2=11.0,
        dynamic_power_factor=0.92,
        leakage_factor=0.95,
        metal_layers_typical=7,
        interconnect_material="Copper (single/dual damascene)",
        gate_oxide="SiON nitrided oxide",
        min_metal_pitch_nm=130,
        contacted_poly_pitch_nm=160,
        sram_cell_area_um2=0.242,
        fab_cost_per_wafer_usd=2_400,
        defect_density_per_cm2=0.04,
        max_junction_temp_c=115,
        thermal_resistance_c_per_w=36.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=3.0,
    ),

    # ── TSMC N65 / UMC 65nm / SMIC 65nm ─────────────────────────────────────
    "65nm": ProcessNode(
        name="65nm (TSMC N65, UMC 65nm LP, SMIC 65nm)",
        gate_length_nm=65,
        vdd_nominal_v=1.0,
        transistor_density_mtr_mm2=5.3,
        dynamic_power_factor=1.0,                # reference baseline
        leakage_factor=0.8,
        metal_layers_typical=7,
        interconnect_material="Copper damascene",
        gate_oxide="SiON nitrided oxide",
        min_metal_pitch_nm=160,
        contacted_poly_pitch_nm=220,
        sram_cell_area_um2=0.570,
        fab_cost_per_wafer_usd=2_000,
        defect_density_per_cm2=0.03,
        max_junction_temp_c=120,
        thermal_resistance_c_per_w=38.0,
        wafer_diameter_mm=300,
        typical_die_edge_exclusion_mm=3.0,
    ),

    # ── TSMC N90 / UMC 90nm ──────────────────────────────────────────────────
    "90nm": ProcessNode(
        name="90nm (TSMC N90, UMC 90nm)",
        gate_length_nm=90,
        vdd_nominal_v=1.2,
        transistor_density_mtr_mm2=2.9,
        dynamic_power_factor=1.1,
        leakage_factor=0.7,
        metal_layers_typical=6,
        interconnect_material="Copper damascene + tungsten plugs",
        gate_oxide="SiON",
        min_metal_pitch_nm=240,
        contacted_poly_pitch_nm=320,
        sram_cell_area_um2=1.05,
        fab_cost_per_wafer_usd=1_600,
        defect_density_per_cm2=0.025,
        max_junction_temp_c=125,
        thermal_resistance_c_per_w=40.0,
        wafer_diameter_mm=200,
        typical_die_edge_exclusion_mm=3.0,
    ),

    # ── Tower SiGe / TSMC 130nm / GF 130nm ───────────────────────────────────
    "130nm": ProcessNode(
        name="130nm (TSMC N130, GF 130nm, Tower SiGe BiCMOS)",
        gate_length_nm=130,
        vdd_nominal_v=1.5,
        transistor_density_mtr_mm2=1.45,
        dynamic_power_factor=1.15,
        leakage_factor=0.6,
        metal_layers_typical=6,
        interconnect_material="Copper + tungsten plug",
        gate_oxide="SiO2",
        min_metal_pitch_nm=360,
        contacted_poly_pitch_nm=480,
        sram_cell_area_um2=2.10,
        fab_cost_per_wafer_usd=1_400,
        defect_density_per_cm2=0.020,
        max_junction_temp_c=125,
        thermal_resistance_c_per_w=40.0,
        wafer_diameter_mm=200,
        typical_die_edge_exclusion_mm=3.0,
    ),

    # ── TSMC N180 / UMC 0.18µm / SMIC 0.18µm / Skywater 130nm ───────────────
    "180nm": ProcessNode(
        name="180nm (TSMC N180, UMC 0.18µm, SMIC 0.18µm, Skywater 130nm)",
        gate_length_nm=180,
        vdd_nominal_v=1.8,
        transistor_density_mtr_mm2=1.0,
        dynamic_power_factor=1.2,
        leakage_factor=0.5,
        metal_layers_typical=6,
        interconnect_material="Aluminum + copper optional",
        gate_oxide="SiO2",
        min_metal_pitch_nm=500,
        contacted_poly_pitch_nm=640,
        sram_cell_area_um2=3.0,
        fab_cost_per_wafer_usd=1_200,
        defect_density_per_cm2=0.015,
        max_junction_temp_c=125,
        thermal_resistance_c_per_w=42.0,
        wafer_diameter_mm=200,
        typical_die_edge_exclusion_mm=3.0,
    ),

    # ── Legacy 350nm / 500nm ──────────────────────────────────────────────────
    "350nm": ProcessNode(
        name="350nm (Legacy CMOS — power management, analog)",
        gate_length_nm=350,
        vdd_nominal_v=3.3,
        transistor_density_mtr_mm2=0.18,
        dynamic_power_factor=1.5,
        leakage_factor=0.3,
        metal_layers_typical=4,
        interconnect_material="Aluminum",
        gate_oxide="SiO2",
        min_metal_pitch_nm=1200,
        contacted_poly_pitch_nm=1600,
        sram_cell_area_um2=10.0,
        fab_cost_per_wafer_usd=800,
        defect_density_per_cm2=0.010,
        max_junction_temp_c=150,
        thermal_resistance_c_per_w=50.0,
        wafer_diameter_mm=200,
        typical_die_edge_exclusion_mm=4.0,
    ),
}


def get_process_node(name: str) -> ProcessNode:
    """Look up process node by name (e.g. '28nm', '7nm', '28nm (N28)')."""
    normalized = name.lower().replace(" ", "").replace("_", "")

    if normalized in PROCESS_NODES:
        return PROCESS_NODES[normalized]

    m = re.search(r'(\d+\s*nm)', name, re.IGNORECASE)
    if m:
        core = m.group(1).replace(" ", "").lower()
        if core in PROCESS_NODES:
            return PROCESS_NODES[core]

    for key, node in PROCESS_NODES.items():
        if key.lower() in normalized:
            return node

    # Fuzzy numeric fallback: find the closest node by nm value
    try:
        target_nm = float(re.search(r'(\d+(?:\.\d+)?)', name).group(1))
        available = {float(k.replace("nm", "")): k for k in PROCESS_NODES}
        closest = min(available.keys(), key=lambda x: abs(x - target_nm))
        return PROCESS_NODES[available[closest]]
    except Exception:
        pass

    raise ValueError(
        f"Unknown process node: {name!r}. "
        f"Available: {list(PROCESS_NODES.keys())}"
    )


def estimate_dies_per_wafer(
    die_area_mm2: float,
    wafer_diameter_mm: int = 300,
    edge_exclusion_mm: float = 3.0,
) -> int:
    """
    Estimate gross die per wafer (GDW) using the standard geometric formula.

        GDW ≈ (π × r²) / A  −  (π × 2r) / √(2A)

    where r = usable wafer radius, A = die area (mm²).
    """
    import math
    r = (wafer_diameter_mm / 2) - edge_exclusion_mm
    usable_area = math.pi * r * r
    perimeter_term = math.pi * 2 * r / math.sqrt(2 * die_area_mm2)
    gross = int(usable_area / die_area_mm2 - perimeter_term)
    return max(gross, 1)
