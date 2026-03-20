"""Module 8.1: Carbon Footprint Estimator service."""

from backend.semiconductor.process_nodes import get_process_node, estimate_dies_per_wafer

# CO2e emission factors by region (kg CO2e per kWh of electricity)
GRID_CARBON_INTENSITY = {
    "Taiwan": 0.509,
    "South Korea": 0.459,
    "United States": 0.379,
    "China": 0.581,
    "Israel": 0.453,
    "Japan": 0.474,
    "Germany": 0.338,
    "Ireland": 0.296,
}

# Energy consumption per wafer by process node (kWh)
ENERGY_PER_WAFER_KWH = {
    "5nm": 850,
    "7nm": 650,
    "14nm": 400,
    "28nm": 250,
    "65nm": 180,
    "180nm": 120,
}

PACKAGING_ENERGY_KWH = 15  # per wafer equivalent
TEST_ENERGY_KWH = 5


def estimate_carbon_footprint(
    process_node_name: str,
    die_area_mm2: float,
    volume: int = 10000,
    fab_country: str = "Taiwan",
    assembly_country: str = "Taiwan",
    shipping_distance_km: float = 10000.0,
) -> dict:
    """Estimate CO2 footprint for a chip manufacturing run."""
    pn = get_process_node(process_node_name)
    node_key = process_node_name.lower().replace(" ", "")

    fab_energy_kwh = ENERGY_PER_WAFER_KWH.get(node_key, 300)
    carbon_intensity = GRID_CARBON_INTENSITY.get(fab_country, 0.5)

    dpw = estimate_dies_per_wafer(die_area_mm2, pn.wafer_diameter_mm, pn.typical_die_edge_exclusion_mm)
    wafers_needed = max(1, -(-volume // max(dpw, 1)))  # ceiling division

    # Fab emissions
    fab_co2e_per_wafer = fab_energy_kwh * carbon_intensity
    fab_co2e_total = fab_co2e_per_wafer * wafers_needed

    # Process gases (NF3, CF4, SF6) — industry average ~30% of fab emissions
    process_gas_co2e = fab_co2e_total * 0.30

    # Packaging emissions
    assembly_intensity = GRID_CARBON_INTENSITY.get(assembly_country, 0.5)
    packaging_co2e = PACKAGING_ENERGY_KWH * assembly_intensity * wafers_needed

    # Test emissions
    test_co2e = TEST_ENERGY_KWH * carbon_intensity * wafers_needed

    # Shipping emissions (air freight: ~0.6 kg CO2e per ton-km)
    chip_weight_kg = die_area_mm2 * 0.0001  # rough estimate
    total_weight_tons = (chip_weight_kg * volume) / 1000
    shipping_co2e = total_weight_tons * shipping_distance_km * 0.6

    total_co2e = fab_co2e_total + process_gas_co2e + packaging_co2e + test_co2e + shipping_co2e
    co2e_per_chip = total_co2e / max(volume, 1)
    co2e_per_wafer = total_co2e / max(wafers_needed, 1)

    intensity_label = "LOW" if carbon_intensity < 0.4 else "MEDIUM" if carbon_intensity < 0.5 else "HIGH"

    return {
        "total_co2e_kg": round(total_co2e, 1),
        "co2e_per_chip_kg": round(co2e_per_chip, 4),
        "co2e_per_wafer_kg": round(co2e_per_wafer, 1),
        "breakdown": {
            "fabrication_kg": round(fab_co2e_total, 1),
            "process_gases_kg": round(process_gas_co2e, 1),
            "packaging_kg": round(packaging_co2e, 1),
            "testing_kg": round(test_co2e, 1),
            "shipping_kg": round(shipping_co2e, 1),
        },
        "fab_country": fab_country,
        "carbon_intensity_kwh": carbon_intensity,
        "carbon_intensity_label": intensity_label,
        "wafers_needed": wafers_needed,
        "volume": volume,
        "energy_per_wafer_kwh": fab_energy_kwh,
    }
