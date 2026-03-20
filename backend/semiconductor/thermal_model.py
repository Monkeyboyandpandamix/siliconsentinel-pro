"""
Physics-based thermal simulation for semiconductor dies.

Uses a simplified 2D steady-state thermal model based on Fourier's law
and a thermal resistance network. Each block is modeled as a uniform
heat source on a silicon substrate with package-level convective cooling.

T_junction = T_ambient + P_block * (R_die + R_package + R_heatsink)

For the thermal grid, we solve a discretized Laplace equation with
block power densities as source terms using iterative Jacobi relaxation.
"""

import numpy as np
from typing import Optional

from backend.semiconductor.process_nodes import ProcessNode


def compute_thermal_map(
    blocks: list[dict],
    process_node: ProcessNode,
    ambient_temp_c: float = 25.0,
    grid_resolution: int = 50,
    package_type: str = "bga",
) -> dict:
    """Compute a 2D thermal map of the die surface.

    Args:
        blocks: List of block dicts with x, y, width, height, power_mw keys.
                Coordinates are in 0-100 normalized space.
        process_node: Process node spec for thermal properties.
        ambient_temp_c: Ambient temperature in °C.
        grid_resolution: Grid cells per axis.
        package_type: Package type for Rja lookup.

    Returns:
        Dict with thermal grid, zone info, and hotspot data.
    """
    from backend.semiconductor.materials import PACKAGE_THERMAL_RESISTANCE, SUBSTRATE_MATERIALS

    rja = PACKAGE_THERMAL_RESISTANCE.get(package_type, 8.0)
    si = SUBSTRATE_MATERIALS["silicon"]

    total_area_mm2 = sum(b.get("area_mm2", b.get("width", 10) * b.get("height", 10) / 100) for b in blocks)
    die_side_mm = max(np.sqrt(total_area_mm2) * 1.3, 1.0)

    grid = np.full((grid_resolution, grid_resolution), ambient_temp_c, dtype=np.float64)
    power_density = np.zeros((grid_resolution, grid_resolution), dtype=np.float64)

    for block in blocks:
        x = block.get("x", 0) / 100.0
        y = block.get("y", 0) / 100.0
        w = block.get("width", 10) / 100.0
        h = block.get("height", 10) / 100.0
        power_mw = block.get("power_mw", 0)

        xi = int(x * grid_resolution)
        yi = int(y * grid_resolution)
        xf = min(int((x + w) * grid_resolution), grid_resolution)
        yf = min(int((y + h) * grid_resolution), grid_resolution)

        block_cells = max((xf - xi) * (yf - yi), 1)
        cell_area_mm2 = (die_side_mm / grid_resolution) ** 2
        power_w = power_mw / 1000.0
        pd = power_w / (block_cells * cell_area_mm2) if cell_area_mm2 > 0 else 0

        power_density[yi:yf, xi:xf] = pd

    die_thickness_mm = 0.3
    k_si = si.thermal_conductivity_w_mk
    cell_size_m = (die_side_mm / grid_resolution) / 1000.0
    dx2 = cell_size_m ** 2

    # Jacobi iteration for steady-state thermal solution
    for _ in range(200):
        grid_old = grid.copy()
        grid[1:-1, 1:-1] = 0.25 * (
            grid_old[2:, 1:-1] + grid_old[:-2, 1:-1] +
            grid_old[1:-1, 2:] + grid_old[1:-1, :-2]
        ) + (power_density[1:-1, 1:-1] * dx2 * 1e6) / (4 * k_si * (die_thickness_mm / 1000.0))

        # Boundary: convective cooling through package
        total_power_w = np.sum(power_density) * cell_size_m * cell_size_m
        base_temp = ambient_temp_c + total_power_w * rja
        grid[0, :] = base_temp
        grid[-1, :] = base_temp
        grid[:, 0] = base_temp
        grid[:, -1] = base_temp

    # Ensure physically reasonable temperatures (add bulk Rja contribution)
    total_power_w = sum(b.get("power_mw", 0) for b in blocks) / 1000.0
    bulk_rise = total_power_w * rja
    grid = grid + bulk_rise * 0.5  # partial superposition

    zones = []
    for block in blocks:
        x = block.get("x", 0) / 100.0
        y = block.get("y", 0) / 100.0
        w = block.get("width", 10) / 100.0
        h = block.get("height", 10) / 100.0
        xi = int(x * grid_resolution)
        yi = int(y * grid_resolution)
        xf = min(int((x + w) * grid_resolution), grid_resolution)
        yf = min(int((y + h) * grid_resolution), grid_resolution)

        region = grid[yi:yf, xi:xf]
        avg_temp = float(np.mean(region)) if region.size > 0 else ambient_temp_c
        power_mw = block.get("power_mw", 0)
        area = block.get("area_mm2", 1.0)
        pd = power_mw / 1000.0 / max(area, 0.01)

        if avg_temp > process_node.max_junction_temp_c:
            status = "CRITICAL"
        elif avg_temp > process_node.max_junction_temp_c - 15:
            status = "WARNING"
        else:
            status = "SAFE"

        zones.append({
            "block_id": block.get("id", "unknown"),
            "block_name": block.get("name", "Unknown"),
            "temperature_c": round(avg_temp, 1),
            "power_density_w_mm2": round(pd, 4),
            "status": status,
        })

    max_temp = float(np.max(grid))
    min_temp = float(np.min(grid))
    hotspot_count = sum(1 for z in zones if z["status"] == "CRITICAL")

    return {
        "grid": grid.tolist(),
        "grid_resolution": grid_resolution,
        "max_temp_c": round(max_temp, 1),
        "min_temp_c": round(min_temp, 1),
        "ambient_temp_c": ambient_temp_c,
        "zones": zones,
        "hotspot_count": hotspot_count,
    }
