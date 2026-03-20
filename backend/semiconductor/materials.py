"""
Semiconductor material properties for simulation accuracy.

Thermal conductivity, resistivity, and dielectric data from standard
semiconductor physics references (Sze & Ng, "Physics of Semiconductor Devices").
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Material:
    name: str
    thermal_conductivity_w_mk: float  # W/(m·K)
    resistivity_ohm_cm: float  # Ω·cm (for metals) or typical doping level
    dielectric_constant: float
    density_g_cm3: float
    max_current_density_ma_um2: float  # electromigration limit for metals


SUBSTRATE_MATERIALS = {
    "silicon": Material("Bulk Silicon", 148.0, 1.0e4, 11.7, 2.33, 0.0),
    "soi": Material("Silicon-on-Insulator", 148.0, 1.0e4, 11.7, 2.33, 0.0),
    "gan": Material("Gallium Nitride", 130.0, 1.0e10, 9.0, 6.15, 0.0),
    "sige": Material("Silicon-Germanium", 80.0, 1.0e3, 13.5, 4.20, 0.0),
}

METAL_LAYERS = {
    "copper": Material("Copper", 401.0, 1.7e-6, 1.0, 8.96, 2.0),
    "aluminum": Material("Aluminum", 237.0, 2.7e-6, 1.0, 2.70, 1.0),
    "tungsten": Material("Tungsten (via fill)", 173.0, 5.3e-6, 1.0, 19.3, 5.0),
    "cobalt": Material("Cobalt (local interconnect)", 100.0, 6.2e-6, 1.0, 8.90, 3.0),
}

DIELECTRICS = {
    "sio2": Material("Silicon Dioxide", 1.4, 1.0e16, 3.9, 2.2, 0.0),
    "hfo2": Material("Hafnium Dioxide (high-k)", 1.1, 1.0e14, 25.0, 9.68, 0.0),
    "sin": Material("Silicon Nitride", 30.0, 1.0e14, 7.5, 3.17, 0.0),
    "low_k": Material("Low-k SiCOH", 0.3, 1.0e15, 2.7, 1.3, 0.0),
}

PACKAGE_THERMAL_RESISTANCE = {
    "bare_die": 0.5,      # °C/W — flip-chip bare die
    "qfn": 15.0,          # °C/W — typical QFN
    "bga": 8.0,           # °C/W — typical BGA
    "fcbga": 4.0,         # °C/W — flip-chip BGA
    "wlcsp": 35.0,        # °C/W — wafer-level chip-scale package
}


BLOCK_TYPE_DEFAULTS = {
    "cpu": {
        "activity_factor": 0.30,
        "capacitance_pf_per_mm2": 15.0,
        "leakage_ua_per_mm2": 50.0,
    },
    "memory": {
        "activity_factor": 0.10,
        "capacitance_pf_per_mm2": 5.0,
        "leakage_ua_per_mm2": 20.0,
    },
    "io": {
        "activity_factor": 0.25,
        "capacitance_pf_per_mm2": 20.0,
        "leakage_ua_per_mm2": 30.0,
    },
    "power": {
        "activity_factor": 0.05,
        "capacitance_pf_per_mm2": 2.0,
        "leakage_ua_per_mm2": 10.0,
    },
    "rf": {
        "activity_factor": 0.50,
        "capacitance_pf_per_mm2": 25.0,
        "leakage_ua_per_mm2": 80.0,
    },
    "analog": {
        "activity_factor": 0.15,
        "capacitance_pf_per_mm2": 10.0,
        "leakage_ua_per_mm2": 15.0,
    },
    "dsp": {
        "activity_factor": 0.35,
        "capacitance_pf_per_mm2": 18.0,
        "leakage_ua_per_mm2": 55.0,
    },
    "accelerator": {
        "activity_factor": 0.40,
        "capacitance_pf_per_mm2": 20.0,
        "leakage_ua_per_mm2": 60.0,
    },
}
