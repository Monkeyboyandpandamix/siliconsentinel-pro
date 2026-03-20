"""
Semiconductor yield prediction models.

Implements Murphy's yield model (industry standard) and Poisson yield model.

Murphy's model:  Y = ((1 - e^(-D0·A)) / (D0·A))²
Poisson model:   Y = e^(-D0·A)

Where:
  D0 = defect density (defects per cm²)
  A  = die area (cm²)

Murphy's model is more conservative than Poisson and accounts for
clustered defect distributions, which is more realistic for actual
semiconductor manufacturing.
"""

import math
from backend.semiconductor.process_nodes import ProcessNode, estimate_dies_per_wafer


def murphy_yield(d0: float, area_cm2: float) -> float:
    """Murphy's yield model — standard for semiconductor manufacturing."""
    da = d0 * area_cm2
    if da < 1e-10:
        return 1.0
    y = ((1 - math.exp(-da)) / da) ** 2
    return max(0.0, min(1.0, y))


def poisson_yield(d0: float, area_cm2: float) -> float:
    """Poisson yield model — simpler but less accurate."""
    return math.exp(-d0 * area_cm2)


def compute_yield_prediction(
    die_area_mm2: float,
    process_node: ProcessNode,
    metal_layers: int = 8,
    design_complexity_factor: float = 1.0,
) -> dict:
    """Full yield prediction with confidence intervals and cost impact.

    Args:
        die_area_mm2: Total die area in mm².
        process_node: Process node for D0 and wafer cost lookup.
        metal_layers: Number of metal layers (more layers = higher D0).
        design_complexity_factor: 1.0 = typical, >1 = more complex.
    """
    area_cm2 = die_area_mm2 / 100.0

    # Adjust D0 for metal layers (each layer adds ~5% defect risk)
    layer_factor = 1.0 + (metal_layers - process_node.metal_layers_typical) * 0.05
    adjusted_d0 = process_node.defect_density_per_cm2 * layer_factor * design_complexity_factor

    yield_murphy = murphy_yield(adjusted_d0, area_cm2)
    yield_poisson = poisson_yield(adjusted_d0, area_cm2)

    # Confidence interval based on D0 uncertainty (±20%)
    yield_low = murphy_yield(adjusted_d0 * 1.2, area_cm2)
    yield_high = murphy_yield(adjusted_d0 * 0.8, area_cm2)

    dies_per_wafer = estimate_dies_per_wafer(
        die_area_mm2,
        process_node.wafer_diameter_mm,
        process_node.typical_die_edge_exclusion_mm,
    )
    good_dies = int(dies_per_wafer * yield_murphy)

    cost_per_wafer = process_node.fab_cost_per_wafer_usd
    cost_per_good_die = cost_per_wafer / max(good_dies, 1)

    return {
        "yield_pct": round(yield_murphy * 100, 1),
        "yield_low_pct": round(yield_low * 100, 1),
        "yield_high_pct": round(yield_high * 100, 1),
        "yield_model": "Murphy",
        "yield_poisson_pct": round(yield_poisson * 100, 1),
        "defect_density_per_cm2": round(adjusted_d0, 4),
        "die_area_mm2": round(die_area_mm2, 2),
        "die_area_cm2": round(area_cm2, 4),
        "dies_per_wafer": dies_per_wafer,
        "good_dies_per_wafer": good_dies,
        "fab_cost_per_wafer": cost_per_wafer,
        "fab_cost_per_good_die": round(cost_per_good_die, 2),
        "confidence_interval": f"±{round((yield_high - yield_low) * 50, 1)}%",
    }
