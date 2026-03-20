"""Carbon Footprint Estimator — live grid data + EPA equivalencies."""

import asyncio
import logging
import httpx

from backend.semiconductor.process_nodes import get_process_node, estimate_dies_per_wafer

logger = logging.getLogger(__name__)

# ── Fallback grid carbon intensity (kg CO2e / kWh) ─────────────────────────
# Source: IEA Electricity 2024 / Our World in Data (2022 data)
GRID_CARBON_INTENSITY_FALLBACK: dict[str, float] = {
    "Taiwan":        0.509,
    "South Korea":   0.459,
    "United States": 0.379,
    "China":         0.581,
    "Israel":        0.453,
    "Japan":         0.474,
    "Germany":       0.338,
    "Ireland":       0.296,
    "Netherlands":   0.298,
    "Singapore":     0.408,
    "India":         0.708,
    "France":        0.056,   # high nuclear share
}

# Electricity Maps zone codes
COUNTRY_ZONE: dict[str, str] = {
    "Taiwan":        "TW",
    "South Korea":   "KR",
    "United States": "US-MIDA-PJM",
    "China":         "CN",
    "Japan":         "JP-TK",
    "Germany":       "DE",
    "Ireland":       "IE",
    "Netherlands":   "NL",
    "Singapore":     "SG",
    "India":         "IN-NO",
    "France":        "FR",
    "Israel":        "IL",
}

# World Bank ISO3 codes for renewable % indicator
# Taiwan is excluded — not a World Bank member state; use fallback below
COUNTRY_ISO3: dict[str, str] = {
    "South Korea":   "KOR",
    "United States": "USA",
    "China":         "CHN",
    "Japan":         "JPN",
    "Germany":       "DEU",
    "Ireland":       "IRL",
    "Netherlands":   "NLD",
    "India":         "IND",
    "France":        "FRA",
    "Israel":        "ISR",
}

# Hardcoded renewable % fallbacks (IEA / IRENA 2022) for countries
# that lack World Bank data or where WB data is >2 years old
RENEWABLE_PCT_FALLBACK: dict[str, float] = {
    "Taiwan":        8.3,    # IEA 2022 (solar + wind + hydro)
    "Singapore":     3.2,    # IEA 2022 (mostly solar)
    "Israel":        8.4,    # IEA 2022
    "South Korea":   6.6,    # WB 2021
    "United States": 20.3,   # WB 2021
    "China":         29.6,   # IEA 2022
    "Japan":         21.1,   # WB 2021
    "Germany":       41.1,   # IEA 2022
    "Ireland":       40.5,   # IEA 2022
    "Netherlands":   34.7,   # IEA 2022
    "India":         20.3,   # IEA 2022
    "France":        24.7,   # IEA 2022 (mainly hydro/wind; nuclear is separate)
}

# Energy per wafer by process node (kWh) — TSMC/IRDS/SEMI industry estimates
# Sources: IRDS 2023, TSMC CSR Report 2023, Sustainalytics semiconductor study 2022
# EUV nodes (3nm, 5nm, 7nm) are significantly higher due to multi-patterning & EUV laser power
ENERGY_PER_WAFER_KWH: dict[str, float] = {
    "3nm":   1100,  # TSMC N3: ~34 EUV masks, most energy-intensive node in production
    "5nm":    850,  # TSMC N5: ~14 EUV + DUV multi-patterning
    "7nm":    650,  # TSMC N7: first EUV adoption, ~5 EUV mask layers
    "10nm":   520,  # Intel 10nm / Samsung 10LPE: DUV multi-patterning intensive
    "14nm":   400,  # TSMC 16FF / Samsung 14LPP / Intel 14nm: mature FinFET
    "22nm":   320,  # Intel 22nm (Ivy Bridge era) / TSMC 22ULP: planar-to-FinFET
    "28nm":   250,  # TSMC 28HPM: high-volume mature node, well-optimized fabs
    "40nm":   210,  # TSMC 40G/40LP: workhorse node for analog/mixed-signal
    "65nm":   175,  # TSMC 65G: stable, low overhead, single-patterning DUV
    "90nm":   150,  # 90nm: ageing node, less optimized energy infrastructure
    "130nm":  130,  # 130nm: legacy CMOS, lower throughput and fab utilization
    "180nm":  115,  # 180nm: bulk CMOS, simple process, low energy per mask step
    "350nm":   90,  # 350nm: oldest nodes, 200mm wafers, fewest process steps
}

PACKAGING_ENERGY_KWH = 15.0
TEST_ENERGY_KWH = 5.0

# ── EPA Greenhouse Gas Equivalencies (2024) ─────────────────────────────────
# https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator
EPA_TREE_KG_CO2_YEAR      = 60.0    # kg CO2 absorbed per urban tree per year
EPA_CAR_G_CO2_PER_MILE    = 404.0   # grams CO2 per mile, avg passenger car
EPA_PHONE_WH_PER_CHARGE   = 11.4    # Wh per smartphone full charge (avg, 2023)
EPA_HOME_KWH_PER_DAY      = 28.9    # avg US household daily electricity (EIA 2022)
FLIGHT_NYC_LONDON_KG_CO2  = 585.0   # kg CO2 per passenger, economy class (ICAO 2023)
COAL_KG_PER_KG_CO2        = 1.0 / 2.86  # 1 kg coal → 2.86 kg CO2 (oxidation factor)
BULB_60W_KW               = 0.060   # kW
LED_EQUIV_9W_KW           = 0.009   # kW (LED replacement for 60W)


async def _fetch_live_carbon_intensity(country: str, api_key: str | None) -> float | None:
    """Fetch real-time grid carbon intensity from Electricity Maps API (free tier)."""
    if not api_key:
        return None
    zone = COUNTRY_ZONE.get(country)
    if not zone:
        return None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                f"https://api.electricitymap.org/v3/carbon-intensity/latest",
                params={"zone": zone},
                headers={"auth-token": api_key},
            )
            if resp.status_code == 200:
                data = resp.json()
                ci = data.get("carbonIntensity")
                if isinstance(ci, (int, float)) and ci > 0:
                    logger.info(f"Live carbon intensity for {country}/{zone}: {ci} gCO2eq/kWh")
                    return ci / 1000.0  # g/kWh → kg/kWh
    except Exception as e:
        logger.debug(f"Electricity Maps fetch failed for {country}: {e}")
    return None


async def _fetch_renewable_pct(country: str) -> float | None:
    """
    Fetch renewable energy % from World Bank Open Data API (free, no key).
    Indicator: EG.ELC.RNEW.ZS — Renewable electricity (% of total electricity output).
    Falls back to IEA/IRENA 2022 hardcoded values for countries not in World Bank
    (e.g. Taiwan, Singapore) or when the API is unreachable.
    """
    iso3 = COUNTRY_ISO3.get(country)
    if iso3:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"https://api.worldbank.org/v2/country/{iso3}/indicator/EG.ELC.RNEW.ZS",
                    params={"format": "json", "mrv": "3", "per_page": "3"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and len(data) > 1:
                        records = data[1] or []
                        for r in records:
                            val = r.get("value")
                            if val is not None:
                                logger.info(f"World Bank renewable % for {country}/{iso3}: {val:.1f}% (year {r.get('date')})")
                                return round(float(val), 1)
        except Exception as e:
            logger.debug(f"World Bank fetch failed for {country}: {e}")

    # Fall back to IEA/IRENA hardcoded data
    fallback = RENEWABLE_PCT_FALLBACK.get(country)
    if fallback is not None:
        logger.info(f"Using IEA fallback renewable % for {country}: {fallback}%")
    return fallback


def _compute_equivalents(total_co2e_kg: float, total_energy_kwh: float) -> dict:
    """
    Convert CO2 emissions into relatable real-world units.
    Sources: EPA Greenhouse Gas Equivalencies Calculator 2024,
             IEA, ICAO Carbon Emissions Calculator.
    """
    trees_year = total_co2e_kg / EPA_TREE_KG_CO2_YEAR
    car_miles = total_co2e_kg * 1000.0 / EPA_CAR_G_CO2_PER_MILE
    phone_charges = total_energy_kwh * 1000.0 / EPA_PHONE_WH_PER_CHARGE
    home_days = total_energy_kwh / EPA_HOME_KWH_PER_DAY
    bulb_60w_hours = total_energy_kwh / BULB_60W_KW
    led_hours = total_energy_kwh / LED_EQUIV_9W_KW
    flights = total_co2e_kg / FLIGHT_NYC_LONDON_KG_CO2
    coal_kg = total_co2e_kg * COAL_KG_PER_KG_CO2

    return {
        "trees_absorb_1yr":      round(trees_year, 1),
        "car_miles_driven":      round(car_miles, 0),
        "smartphone_charges":    round(phone_charges, 0),
        "home_electricity_days": round(home_days, 1),
        "bulb_60w_hours":        round(bulb_60w_hours, 0),
        "led_9w_hours":          round(led_hours, 0),
        "flights_nyc_london":    round(flights, 2),
        "coal_burned_kg":        round(coal_kg, 1),
    }


async def estimate_carbon_footprint(
    process_node_name: str,
    die_area_mm2: float,
    volume: int = 10000,
    fab_country: str = "Taiwan",
    assembly_country: str = "Taiwan",
    shipping_distance_km: float = 10000.0,
    electricity_maps_api_key: str | None = None,
) -> dict:
    """
    Estimate CO2 footprint with live grid data and real-world equivalents.

    Live data sources:
      - Electricity Maps API: real-time grid carbon intensity (if key configured)
      - World Bank Open Data: renewable energy % by country (free, no key)
    """
    pn = get_process_node(process_node_name)
    node_key = process_node_name.lower().replace(" ", "")

    fab_energy_kwh = ENERGY_PER_WAFER_KWH.get(node_key, 300.0)
    fallback_intensity = GRID_CARBON_INTENSITY_FALLBACK.get(fab_country, 0.5)

    dpw = estimate_dies_per_wafer(die_area_mm2, pn.wafer_diameter_mm, pn.typical_die_edge_exclusion_mm)
    wafers_needed = max(1, -(-volume // max(dpw, 1)))

    # Fetch live data in parallel
    live_intensity, renewable_pct = await asyncio.gather(
        _fetch_live_carbon_intensity(fab_country, electricity_maps_api_key),
        _fetch_renewable_pct(fab_country),
    )

    carbon_intensity = live_intensity if live_intensity is not None else fallback_intensity
    carbon_intensity_live = live_intensity is not None

    # ── Emissions calc ────────────────────────────────────────────────────────
    fab_co2e_total   = fab_energy_kwh * carbon_intensity * wafers_needed
    process_gas_co2e = fab_co2e_total * 0.30          # NF3/CF4/SF6 — 30% of fab (IRDS)
    assembly_intensity = GRID_CARBON_INTENSITY_FALLBACK.get(assembly_country, 0.5)
    packaging_co2e   = PACKAGING_ENERGY_KWH * assembly_intensity * wafers_needed
    test_co2e        = TEST_ENERGY_KWH * carbon_intensity * wafers_needed
    chip_weight_kg   = die_area_mm2 * 0.0001
    total_weight_tons = (chip_weight_kg * volume) / 1000.0
    shipping_co2e    = total_weight_tons * shipping_distance_km * 0.6  # air freight kg/ton-km

    total_co2e = fab_co2e_total + process_gas_co2e + packaging_co2e + test_co2e + shipping_co2e
    co2e_per_chip = total_co2e / max(volume, 1)
    co2e_per_wafer = total_co2e / max(wafers_needed, 1)

    # Total energy consumed across the full production run
    total_energy_kwh = (fab_energy_kwh + PACKAGING_ENERGY_KWH + TEST_ENERGY_KWH) * wafers_needed

    intensity_label = "LOW" if carbon_intensity < 0.35 else "MEDIUM" if carbon_intensity < 0.50 else "HIGH"

    equivalents = _compute_equivalents(total_co2e, total_energy_kwh)

    return {
        "total_co2e_kg":       round(total_co2e, 1),
        "co2e_per_chip_kg":    round(co2e_per_chip, 4),
        "co2e_per_wafer_kg":   round(co2e_per_wafer, 1),
        "total_energy_kwh":    round(total_energy_kwh, 0),
        "breakdown": {
            "fabrication_kg":   round(fab_co2e_total, 1),
            "process_gases_kg": round(process_gas_co2e, 1),
            "packaging_kg":     round(packaging_co2e, 1),
            "testing_kg":       round(test_co2e, 1),
            "shipping_kg":      round(shipping_co2e, 1),
        },
        "fab_country":          fab_country,
        "carbon_intensity_kwh": round(carbon_intensity, 4),
        "carbon_intensity_label": intensity_label,
        "carbon_intensity_live":  carbon_intensity_live,
        "renewable_pct":        renewable_pct,
        "wafers_needed":        wafers_needed,
        "volume":               volume,
        "energy_per_wafer_kwh": fab_energy_kwh,
        "equivalents":          equivalents,
    }
