"""
Realistic semiconductor component catalog for BOM generation.

Contains representative components from major suppliers with realistic
pricing at 10k+ volume. Part numbers follow standard industry conventions.
"""

COMPONENT_CATALOG = {
    "decoupling_cap_100nf": {
        "part_number": "GRM155R71C104KA88D",
        "description": "MLCC 100nF 16V X7R 0402",
        "category": "Passive",
        "unit_price": 0.008,
        "lead_time_days": 7,
        "supplier": "Murata",
        "alternate": {
            "part_number": "CGA2B3X7R1C104K050BB",
            "description": "MLCC 100nF 16V X7R 0402 (TDK)",
            "unit_price": 0.009,
            "lead_time_days": 10,
        },
    },
    "decoupling_cap_1uf": {
        "part_number": "GRM155R60J105ME15D",
        "description": "MLCC 1µF 6.3V X5R 0402",
        "category": "Passive",
        "unit_price": 0.012,
        "lead_time_days": 7,
        "supplier": "Murata",
        "alternate": {
            "part_number": "CL05A105KA5NQNC",
            "description": "MLCC 1µF 6.3V X5R 0402 (Samsung)",
            "unit_price": 0.011,
            "lead_time_days": 14,
        },
    },
    "bulk_cap_10uf": {
        "part_number": "GRM188R60J106ME47D",
        "description": "MLCC 10µF 6.3V X5R 0603",
        "category": "Passive",
        "unit_price": 0.035,
        "lead_time_days": 10,
        "supplier": "Murata",
        "alternate": {
            "part_number": "CL10A106KP8NNNC",
            "description": "MLCC 10µF 6.3V X5R 0603 (Samsung)",
            "unit_price": 0.032,
            "lead_time_days": 12,
        },
    },
    "bias_resistor_10k": {
        "part_number": "RC0402FR-0710KL",
        "description": "Resistor 10kΩ 1% 0402",
        "category": "Passive",
        "unit_price": 0.003,
        "lead_time_days": 5,
        "supplier": "Yageo",
        "alternate": {
            "part_number": "CRCW040210K0FKED",
            "description": "Resistor 10kΩ 1% 0402 (Vishay)",
            "unit_price": 0.004,
            "lead_time_days": 7,
        },
    },
    "esd_diode_usb": {
        "part_number": "TPD2E001DRLR",
        "description": "ESD Protection Diode, 2-ch, USB",
        "category": "ESD",
        "unit_price": 0.12,
        "lead_time_days": 14,
        "supplier": "Texas Instruments",
        "alternate": {
            "part_number": "PRTR5V0U2X",
            "description": "ESD Protection 2-ch (Nexperia)",
            "unit_price": 0.10,
            "lead_time_days": 10,
        },
    },
    "esd_diode_gpio": {
        "part_number": "ESD7004MUTAG",
        "description": "ESD Protection, 4-ch TVS, GPIO",
        "category": "ESD",
        "unit_price": 0.15,
        "lead_time_days": 14,
        "supplier": "ON Semiconductor",
        "alternate": {
            "part_number": "IP4234CZ6",
            "description": "ESD Protection 4-ch (Nexperia)",
            "unit_price": 0.14,
            "lead_time_days": 12,
        },
    },
    "crystal_32mhz": {
        "part_number": "ABM8-32.000MHZ-B2-T",
        "description": "Crystal 32MHz ±20ppm 18pF",
        "category": "Crystal",
        "unit_price": 0.45,
        "lead_time_days": 21,
        "supplier": "Abracon",
        "alternate": {
            "part_number": "NX3225GA-32M-EXS00A-CS08764",
            "description": "Crystal 32MHz ±10ppm (NDK)",
            "unit_price": 0.55,
            "lead_time_days": 28,
        },
    },
    "crystal_32khz": {
        "part_number": "ABS07-32.768KHZ-T",
        "description": "Crystal 32.768kHz ±20ppm RTC",
        "category": "Crystal",
        "unit_price": 0.25,
        "lead_time_days": 14,
        "supplier": "Abracon",
        "alternate": {
            "part_number": "CM7V-T1A-32.768kHz-6pF-20PPM-TA-QC",
            "description": "Crystal 32.768kHz RTC (Micro Crystal)",
            "unit_price": 0.30,
            "lead_time_days": 21,
        },
    },
    "ldo_regulator": {
        "part_number": "TLV75533PDBVR",
        "description": "LDO 3.3V 500mA SOT-23-5",
        "category": "PMIC",
        "unit_price": 0.28,
        "lead_time_days": 14,
        "supplier": "Texas Instruments",
        "alternate": {
            "part_number": "AP2112K-3.3TRG1",
            "description": "LDO 3.3V 600mA SOT-23-5 (Diodes Inc)",
            "unit_price": 0.22,
            "lead_time_days": 10,
        },
    },
    "buck_converter": {
        "part_number": "TPS62840DLCR",
        "description": "Buck Converter 60nA Iq, 750mA, SOT-23",
        "category": "PMIC",
        "unit_price": 0.95,
        "lead_time_days": 21,
        "supplier": "Texas Instruments",
        "alternate": {
            "part_number": "MAX38640AALT+",
            "description": "Buck 330nA Iq, 600mA (Analog Devices)",
            "unit_price": 1.10,
            "lead_time_days": 28,
        },
    },
    "antenna_ble": {
        "part_number": "2450AT18A100E",
        "description": "Chip Antenna 2.4GHz BLE/WiFi, 0402",
        "category": "RF",
        "unit_price": 0.18,
        "lead_time_days": 10,
        "supplier": "Johanson Technology",
        "alternate": {
            "part_number": "ANT016008LCS2442MA1",
            "description": "Chip Antenna 2.4GHz (TDK)",
            "unit_price": 0.22,
            "lead_time_days": 14,
        },
    },
    "balun_filter": {
        "part_number": "2450BM14G0011T",
        "description": "Balun/Filter 2.4GHz BLE, 0805",
        "category": "RF",
        "unit_price": 0.35,
        "lead_time_days": 14,
        "supplier": "Johanson Technology",
        "alternate": {
            "part_number": "DPX165950DT-8044A1",
            "description": "Balun 2.4GHz (TDK)",
            "unit_price": 0.40,
            "lead_time_days": 21,
        },
    },
    "test_pad_array": {
        "part_number": "CUSTOM-TP-ARRAY-50",
        "description": "Test Pad Array, 50-pin, probe card compatible",
        "category": "Test",
        "unit_price": 0.02,
        "lead_time_days": 3,
        "supplier": "Internal",
        "alternate": None,
    },
    "package_qfn_32": {
        "part_number": "QFN-32-5x5-0.5P",
        "description": "QFN-32 Package, 5x5mm, 0.5mm pitch, exposed pad",
        "category": "Package",
        "unit_price": 0.08,
        "lead_time_days": 14,
        "supplier": "ASE Group",
        "alternate": {
            "part_number": "QFN-32-5x5-AMKOR",
            "description": "QFN-32 Package (Amkor)",
            "unit_price": 0.09,
            "lead_time_days": 18,
        },
    },
    "package_bga_256": {
        "part_number": "FCBGA-256-17x17-1.0P",
        "description": "FCBGA-256, 17x17mm, 1.0mm pitch",
        "category": "Package",
        "unit_price": 0.85,
        "lead_time_days": 28,
        "supplier": "ASE Group",
        "alternate": {
            "part_number": "FCBGA-256-JCET",
            "description": "FCBGA-256 (JCET)",
            "unit_price": 0.72,
            "lead_time_days": 35,
        },
    },
    "inductor_power": {
        "part_number": "LQH2MCN2R2M02L",
        "description": "Inductor 2.2µH 1A Shielded 0806",
        "category": "Passive",
        "unit_price": 0.15,
        "lead_time_days": 10,
        "supplier": "Murata",
        "alternate": {
            "part_number": "XFL3012-222MEB",
            "description": "Inductor 2.2µH 1.2A (Coilcraft)",
            "unit_price": 0.18,
            "lead_time_days": 14,
        },
    },
}


def get_standard_bom_for_domain(domain: str, block_types: list[str]) -> list[dict]:
    """Generate a baseline BOM from the component catalog based on application domain."""
    entries = []

    # Every chip needs decoupling caps
    entries.append({**COMPONENT_CATALOG["decoupling_cap_100nf"], "quantity": 12})
    entries.append({**COMPONENT_CATALOG["decoupling_cap_1uf"], "quantity": 4})
    entries.append({**COMPONENT_CATALOG["bulk_cap_10uf"], "quantity": 2})
    entries.append({**COMPONENT_CATALOG["bias_resistor_10k"], "quantity": 8})

    if any(t in block_types for t in ["io", "cpu"]):
        entries.append({**COMPONENT_CATALOG["esd_diode_gpio"], "quantity": 2})

    if any(t in block_types for t in ["cpu", "dsp", "accelerator"]):
        entries.append({**COMPONENT_CATALOG["crystal_32mhz"], "quantity": 1})
        entries.append({**COMPONENT_CATALOG["crystal_32khz"], "quantity": 1})

    if "power" in block_types:
        entries.append({**COMPONENT_CATALOG["ldo_regulator"], "quantity": 1})
        entries.append({**COMPONENT_CATALOG["inductor_power"], "quantity": 1})

    if "rf" in block_types:
        entries.append({**COMPONENT_CATALOG["antenna_ble"], "quantity": 1})
        entries.append({**COMPONENT_CATALOG["balun_filter"], "quantity": 1})

    if domain and domain.lower() in ("iot", "wearable", "consumer"):
        entries.append({**COMPONENT_CATALOG["buck_converter"], "quantity": 1})

    entries.append({**COMPONENT_CATALOG["test_pad_array"], "quantity": 1})

    # Package selection based on block count
    if len(block_types) > 6:
        entries.append({**COMPONENT_CATALOG["package_bga_256"], "quantity": 1})
    else:
        entries.append({**COMPONENT_CATALOG["package_qfn_32"], "quantity": 1})

    return entries
