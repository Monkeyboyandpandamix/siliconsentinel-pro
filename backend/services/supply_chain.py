"""
Module 6: Supply Chain Intelligence — real foundry capabilities and constraints.

Foundry data sourced from: TSMC Technology Overview, Samsung Foundry PDK briefs,
GlobalFoundries process portfolio, Intel IFS public disclosures, UMC technology
roadmap, SMIC annual reports, Tower Semiconductor product briefs, and Skywater
open-source PDK documentation. Pricing validated against IBS/IC Insights surveys.
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.models.design import Design
from backend.models.bom import BOMEntry
from backend.semiconductor.process_nodes import get_process_node

logger = logging.getLogger(__name__)


# ─── Comprehensive real foundry database ─────────────────────────────────────

FOUNDRY_DATABASE = [
    {
        "name": "TSMC",
        "full_name": "Taiwan Semiconductor Manufacturing Company",
        "location": "Hsinchu, Taiwan (+ Tainan, Taichung, Kumamoto JP, Phoenix AZ)",
        "country": "Taiwan",
        "founded_year": 1987,
        "wafer_diameter_mm": [300, 200],
        "process_nodes": ["3nm", "5nm", "7nm", "10nm", "14nm", "22nm", "28nm", "40nm", "65nm", "90nm", "130nm", "180nm"],
        "capacity_status": "Constrained",
        "cost_tier": "premium",
        "lead_time_weeks_base": 14,
        "nre_mask_set_usd": {
            "5nm": 15_000_000,
            "7nm": 8_000_000,
            "14nm": 4_000_000,
            "28nm": 2_000_000,
            "65nm": 800_000,
            "180nm": 300_000,
        },
        "min_wafer_run": {
            "5nm": 25,
            "7nm": 25,
            "14nm": 25,
            "28nm": 10,
            "65nm": 5,
            "180nm": 5,
        },
        "eda_tools_qualified": ["Cadence Virtuoso/Innovus", "Synopsys IC Compiler II / Fusion Compiler", "Mentor Calibre DRC/LVS"],
        "process_specialties": {
            "3nm": "N3E variant for better yield; first FinFET N3, GAA not until N2",
            "5nm": "N5P enhanced variant; 7% perf gain over N5; CoWoS-S/CoWoS-R integration",
            "7nm": "N7P and N7+ (EUV) variants; most mature EUV node at TSMC",
            "14nm": "N12FFC+ variant with improved leakage; Intel 18A competitor",
            "22nm": "22ULP ultra-low-power for IoT; 22ULL for wearables",
            "28nm": "28HPC+ (high-perf), 28HLP (low-power), 28HPCP (mobile); very cost-stable",
            "40nm": "40LP/40G for embedded applications; display driver IC popular",
            "65nm": "65LP/65GP; large established PDK ecosystem; analog/mixed-signal",
            "90nm": "90G; mixed-signal, automotive Tier 2 supply; 200mm wafer",
            "130nm": "130BCDs BCD process for motor drivers; well-established",
            "180nm": "0.18µm CMOS; 6T SRAM density 3.0µm²; widely used for power management",
        },
        "key_design_rules": {
            "5nm": {
                "min_poly_pitch_nm": 48,
                "min_metal1_width_nm": 14,
                "min_metal1_space_nm": 14,
                "min_via_size_nm": 20,
                "max_metal_layers": 13,
                "drc_rule_count": "~10,000",
                "requires_euv": True,
                "euv_layers": "M2, M3, M4, V1, V2, V3",
            },
            "7nm": {
                "min_poly_pitch_nm": 54,
                "min_metal1_width_nm": 18,
                "min_metal1_space_nm": 18,
                "min_via_size_nm": 24,
                "max_metal_layers": 12,
                "drc_rule_count": "~8,000",
                "requires_euv": True,
                "euv_layers": "M2, M3 (N7+)",
            },
            "28nm": {
                "min_poly_pitch_nm": 117,
                "min_metal1_width_nm": 45,
                "min_metal1_space_nm": 45,
                "min_via_size_nm": 60,
                "max_metal_layers": 9,
                "drc_rule_count": "~3,500",
                "requires_euv": False,
                "euv_layers": "None",
            },
        },
        "packaging_options": ["CoWoS-S (2.5D)", "CoWoS-R (2.5D)", "InFO (Fan-Out WLP)", "InFO-POP (stacked)", "SoIC (3D)", "WLCSP", "QFN", "BGA"],
        "notable_customers": ["Apple", "NVIDIA", "AMD", "Qualcomm", "MediaTek", "Broadcom", "Marvell"],
        "strengths": [
            "World's leading-edge node capability (N3/N5/N7)",
            "Largest 300mm capacity globally (~14.5M 300mm-equiv wafers/year)",
            "Broadest PDK ecosystem (thousands of qualified IPs)",
            "Best-in-class yield at advanced nodes",
            "Advanced packaging via CoWoS, InFO, SoIC",
            "Automotive-qualified variants (ISO 26262 ASIL-B/D)",
        ],
        "limitations": [
            "Single-geography risk (Taiwan ~90% of advanced node capacity)",
            "Longest lead times at 5/7nm due to constrained EUV capacity",
            "Premium pricing vs. Samsung/GF at mature nodes",
            "NRE for advanced nodes can exceed $15M",
            "Minimum production run 25 wafers at advanced nodes",
            "ITAR/EAR export controls apply to some customers",
        ],
        "certifications": ["ISO 9001", "ISO 14001", "IATF 16949", "AEC-Q100 qualified processes"],
        "ip_ecosystem": "3,000+ qualified IP providers (Arm, Synopsys, Cadence, Silicon Creations)",
    },

    {
        "name": "Samsung Foundry",
        "full_name": "Samsung Electronics Foundry Business",
        "location": "Hwaseong & Pyeongtaek, South Korea (+ Taylor TX)",
        "country": "South Korea",
        "founded_year": 2017,
        "wafer_diameter_mm": [300],
        "process_nodes": ["3nm", "5nm", "7nm", "14nm", "28nm", "65nm"],
        "capacity_status": "Available",
        "cost_tier": "premium",
        "lead_time_weeks_base": 12,
        "nre_mask_set_usd": {
            "3nm": 20_000_000,
            "5nm": 14_000_000,
            "7nm": 7_000_000,
            "14nm": 3_500_000,
            "28nm": 1_800_000,
        },
        "min_wafer_run": {
            "3nm": 50,
            "5nm": 50,
            "7nm": 25,
            "14nm": 20,
            "28nm": 10,
        },
        "eda_tools_qualified": ["Cadence", "Synopsys", "Siemens EDA Calibre"],
        "process_specialties": {
            "3nm": "SF3 = world's first commercial GAA (MBCFET) — 45% area reduction vs 5nm",
            "4nm": "SF4A enhanced — 3% perf improvement vs SF4; Qualcomm Snapdragon 8 Gen 2 & 3",
            "5nm": "SF5 FinFET — comparable to TSMC N5 but ~10% lower yield historically",
            "7nm": "SF7LPP EUV; 7LPP+ improved variant",
            "14nm": "14LPE (low-power early), 14LPP (high-perf); widely used for Exynos/Snapdragon",
            "28nm": "28FDS FD-SOI variant for ultra-low-power; 28SLP for standard HKMG",
        },
        "key_design_rules": {
            "3nm": {
                "min_poly_pitch_nm": 45,
                "min_metal1_width_nm": 12,
                "gate_architecture": "MBC-GAA (Multi-Bridge-Channel FET)",
                "requires_euv": True,
                "euv_layers": "Multiple layers",
            },
            "5nm": {
                "min_poly_pitch_nm": 48,
                "min_metal1_width_nm": 14,
                "gate_architecture": "FinFET",
                "requires_euv": True,
                "euv_layers": "M1, M2, V1",
            },
        },
        "packaging_options": ["I-Cube (2.5D HBM)", "X-Cube (3D stacking)", "Fan-Out", "FOWLP", "WLCSP", "BGA", "QFN"],
        "notable_customers": ["Qualcomm", "Nvidia", "IBM", "Tesla", "Baidu"],
        "strengths": [
            "First and only volume GAA (3nm SF3/SF3E) in production",
            "Strong vertical integration (memory + logic on same campus)",
            "Competitive pricing vs. TSMC at some nodes",
            "Korea CHIPS Act incentives",
            "Significant new Pyeongtaek and Taylor TX capacity expansion",
        ],
        "limitations": [
            "Historically lower yields at leading-edge vs. TSMC (SF5 yield challenges reported)",
            "Smaller IP ecosystem than TSMC",
            "Higher minimum production run requirement at 3nm (50 wafers)",
            "US-Korea trade friction and supply chain exposure",
            "Less mature at EUV vs. TSMC based on historical shipment data",
        ],
        "certifications": ["ISO 9001", "ISO 14001", "IATF 16949"],
        "ip_ecosystem": "1,200+ qualified IP providers via SAFE (Samsung Advanced Foundry Ecosystem)",
    },

    {
        "name": "GlobalFoundries",
        "full_name": "GlobalFoundries Inc.",
        "location": "Malta NY USA + Dresden Germany + Singapore",
        "country": "United States",
        "founded_year": 2009,
        "wafer_diameter_mm": [300, 200],
        "process_nodes": ["12nm", "14nm", "22nm", "28nm", "40nm", "65nm", "90nm", "130nm", "180nm"],
        "capacity_status": "Available",
        "cost_tier": "mid",
        "lead_time_weeks_base": 10,
        "nre_mask_set_usd": {
            "12nm": 3_000_000,
            "14nm": 3_200_000,
            "22nm": 1_500_000,
            "28nm": 1_200_000,
            "65nm": 450_000,
            "180nm": 180_000,
        },
        "min_wafer_run": {
            "12nm": 15,
            "14nm": 15,
            "22nm": 10,
            "28nm": 5,
            "65nm": 5,
            "180nm": 5,
        },
        "eda_tools_qualified": ["Cadence", "Synopsys", "Siemens Calibre", "Ansys"],
        "process_specialties": {
            "12nm": "12LP+ FinFET; competitive with TSMC N16; used in AMD Ryzen (historical)",
            "22nm": "22FDX FD-SOI — body-bias tunable Vt; ideal for IoT/wearable; 22FDX+ enhanced",
            "28nm": "28SLP (standard low-power) and 28HPP (high-perf); widely available",
            "40nm": "40LP for embedded MCU, display driver IC",
            "55nm": "55BCDLite BCD (Bipolar-CMOS-DMOS) for power management ICs",
            "65nm": "65LPe extended low-power; large analog IP library",
            "90nm": "90RFSOI RF-SOI for cellular PA/switches; GF Dresden specialty",
            "130nm": "130BCDlite BCD for motor drivers, Class-D amplifiers",
            "180nm": "180BCD 700V BCD for high-voltage power management",
        },
        "key_design_rules": {
            "22nm": {
                "gate_architecture": "FD-SOI (Fully-Depleted Silicon-on-Insulator)",
                "body_bias_range_mv": "−300 to +300 (RVT), −600 to +600 (LVT)",
                "min_poly_pitch_nm": 90,
                "min_metal1_width_nm": 32,
                "requires_euv": False,
                "special_features": "Back-gate body bias for dynamic Vt tuning",
            },
            "28nm": {
                "min_poly_pitch_nm": 117,
                "min_metal1_width_nm": 45,
                "requires_euv": False,
                "process_variants": ["28SLP", "28HPP", "28HPPe"],
            },
        },
        "packaging_options": ["Fan-Out", "Flip-Chip BGA", "WLCSP", "QFN", "SO", "BGA"],
        "notable_customers": ["Qualcomm (RF)", "Broadcom", "STMicro", "Infineon", "Skyworks", "Qorvo", "AMD (historical)"],
        "strengths": [
            "Only leading ITAR-compliant US fab with advanced capabilities",
            "22FDX FD-SOI — unique ultra-low-power body-bias technology",
            "Specialty nodes: RF-SOI, BCD, SiGe BiCMOS",
            "CHIPS Act recipient (~$1.5B GF Malta expansion)",
            "AEC-Q100 Grade 0 automotive processes (28nm, 55nm)",
            "ITAR/DFARS compliance for defense programs",
            "US, Europe, Singapore geographic diversity",
        ],
        "limitations": [
            "Exited leading-edge (<12nm) in 2018 — no EUV",
            "Premium vs. SMIC/UMC for mature nodes outside specialty",
            "22FDX requires FD-SOI wafer substrate (unique supply chain)",
            "Smaller IP ecosystem at advanced nodes vs. TSMC",
            "Dresden fab (300mm) limited capacity vs. Malta",
        ],
        "certifications": ["ISO 9001", "ISO 14001", "IATF 16949", "AS9100D (aerospace)", "MIL-PRF-38534"],
        "ip_ecosystem": "500+ qualified IP providers; strong RF/analog ecosystem",
    },

    {
        "name": "Intel Foundry",
        "full_name": "Intel Foundry Services (IFS)",
        "location": "Chandler AZ, Hillsboro OR, Leixlip Ireland",
        "country": "United States",
        "founded_year": 2021,
        "wafer_diameter_mm": [300],
        "process_nodes": ["3nm", "7nm", "10nm", "14nm"],
        "capacity_status": "Available",
        "cost_tier": "premium",
        "lead_time_weeks_base": 18,
        "nre_mask_set_usd": {
            "3nm": 22_000_000,
            "7nm": 9_000_000,
            "10nm": 6_000_000,
            "14nm": 4_000_000,
        },
        "min_wafer_run": {
            "3nm": 25,
            "7nm": 25,
            "10nm": 25,
            "14nm": 20,
        },
        "eda_tools_qualified": ["Cadence", "Synopsys", "Siemens"],
        "process_specialties": {
            "3nm": "Intel 18A = RibbonFET (GAA) + PowerVia (backside power delivery); target 2025 HVM",
            "7nm": "Intel 4 — EUV; 20% density improvement over Intel 7; used for Meteor Lake tiles",
            "10nm": "Intel 7 (fka 10nm ESF3) — FinFET; density ~100 MTr/mm²; used for Sapphire Rapids Xeon",
            "14nm": "Intel 16 — FinFET; used for external customers (Tower Semiconductor era IFS)",
        },
        "key_design_rules": {
            "3nm": {
                "gate_architecture": "RibbonFET (GAA)",
                "power_delivery": "PowerVia (backside power delivery network)",
                "min_poly_pitch_nm": 45,
                "requires_euv": True,
                "notable": "First commercial backside power delivery; expected 15% power reduction",
            },
            "7nm": {
                "gate_architecture": "FinFET + EUV",
                "min_poly_pitch_nm": 54,
                "requires_euv": True,
            },
        },
        "packaging_options": ["Foveros (3D stacking)", "EMIB (2.5D bridge)", "Foveros Direct (3D Cu-Cu bonding)", "Co-EMIB", "ODI (Omni-Directional Interconnect)"],
        "notable_customers": ["Qualcomm (announced)", "Amazon AWS (announced)", "Microsoft (announced)", "Ericsson (Intel 18A)"],
        "strengths": [
            "US-based — strongest CHIPS Act positioning (~$8.5B IFS award)",
            "RibbonFET (GAA) + PowerVia (backside power) combo at Intel 18A",
            "Advanced packaging: Foveros, EMIB, Co-EMIB, Foveros Direct",
            "DOD Trusted Foundry partner (DMEA accredited)",
            "Integrated IDM2.0 model — fab + package + test under one roof",
            "Large established EDA relationships",
        ],
        "limitations": [
            "IFS still maturing as external foundry — limited track record vs. TSMC",
            "Longest tapeout-to-silicon lead time (~18–24 weeks)",
            "Very high NRE at leading nodes (Intel 18A ~$22M mask set)",
            "Limited IP ecosystem for external customers vs. TSMC",
            "Intel 7 / Intel 4 density claims use different measurement methodology vs. TSMC",
            "Historical yield challenges ramping advanced nodes (12th gen Ice Lake)",
        ],
        "certifications": ["ISO 9001", "ISO 14001", "DMEA Trusted Foundry", "ITAR registered"],
        "ip_ecosystem": "Growing — Arm partnership announced; Cadence/Synopsys full PDK access",
    },

    {
        "name": "UMC",
        "full_name": "United Microelectronics Corporation",
        "location": "Hsinchu, Taiwan (+ Singapore, Japan)",
        "country": "Taiwan",
        "founded_year": 1980,
        "wafer_diameter_mm": [300, 200],
        "process_nodes": ["12nm", "22nm", "28nm", "40nm", "55nm", "65nm", "90nm", "130nm", "180nm"],
        "capacity_status": "Available",
        "cost_tier": "economy",
        "lead_time_weeks_base": 8,
        "nre_mask_set_usd": {
            "22nm": 1_200_000,
            "28nm": 900_000,
            "40nm": 500_000,
            "65nm": 300_000,
            "180nm": 120_000,
        },
        "min_wafer_run": {
            "22nm": 5,
            "28nm": 5,
            "40nm": 5,
            "65nm": 3,
            "180nm": 3,
        },
        "eda_tools_qualified": ["Cadence", "Synopsys", "Siemens Calibre"],
        "process_specialties": {
            "12nm": "12LP+ FinFET — competitive mature node",
            "22nm": "22HLP high-leakage-performance for mobile",
            "28nm": "28HLP (low-power), 28HPC (high-perf-compact); widely available; excellent cost",
            "40nm": "40LP for embedded systems, connectivity chips, display drivers",
            "55nm": "55LPx for IoT — extended temperature −40 to +125°C AEC-Q100",
            "65nm": "65LP/65G — large analog IP library; popular for timing chips",
            "90nm": "90nm G/LP for microcontrollers; 200mm wafer",
            "180nm": "0.18µm CMOS — 200mm; power management, analog, industrial sensors",
        },
        "key_design_rules": {
            "28nm": {
                "min_poly_pitch_nm": 117,
                "min_metal1_width_nm": 45,
                "process_variants": ["28HLP", "28HPC", "28HPC+"],
                "requires_euv": False,
                "automotive": "AEC-Q100 Grade 2 available (28HPC-A)",
            },
            "55nm": {
                "automotive_grade": "AEC-Q100 Grade 1 (−40 to +125°C)",
                "voltage_options": ["1.8V", "3.3V", "5V"],
                "min_poly_pitch_nm": 220,
            },
        },
        "packaging_options": ["QFN", "BGA", "SOIC", "TSSOP", "Flip-Chip BGA"],
        "notable_customers": ["Realtek", "MediaTek (historical)", "Marvell", "Richtek", "ASMedia"],
        "strengths": [
            "Extremely cost-competitive at 28nm and mature nodes",
            "Wide voltage range processes (1.2V to 5V multi-VT)",
            "AEC-Q100 certified automotive processes (55nm, 28nm)",
            "Low minimum wafer run (3–5 wafers) — great for prototyping",
            "Multiple fab locations reduce single-point risk",
            "Fast lead times (6–8 weeks) vs. 12–14 weeks at TSMC",
        ],
        "limitations": [
            "No leading-edge (<12nm) capability",
            "Less mature PDK ecosystem than TSMC at advanced nodes",
            "Lower transistor density than TSMC/Samsung at equivalent node",
            "Limited advanced packaging options",
            "12nm FinFET still ramping — limited external customer experience",
        ],
        "certifications": ["ISO 9001", "ISO 14001", "IATF 16949", "AEC-Q100"],
        "ip_ecosystem": "400+ qualified IP providers; strong analog/mixed-signal",
    },

    {
        "name": "SMIC",
        "full_name": "Semiconductor Manufacturing International Corporation",
        "location": "Shanghai, Beijing, Shenzhen, China",
        "country": "China",
        "founded_year": 2000,
        "wafer_diameter_mm": [300, 200],
        "process_nodes": ["14nm", "28nm", "40nm", "55nm", "65nm", "90nm", "130nm", "180nm"],
        "capacity_status": "Available",
        "cost_tier": "economy",
        "lead_time_weeks_base": 10,
        "nre_mask_set_usd": {
            "14nm": 2_500_000,
            "28nm": 700_000,
            "65nm": 250_000,
            "180nm": 100_000,
        },
        "min_wafer_run": {
            "14nm": 25,
            "28nm": 5,
            "65nm": 3,
            "180nm": 3,
        },
        "eda_tools_qualified": ["Cadence (limited)", "Synopsys", "Empyrean (domestic EDA)"],
        "process_specialties": {
            "14nm": "N+1 (self-developed FinFET using DUV immersion, ~7nm-class density claims); US export restrictions limit EUV access",
            "28nm": "28HKC+ gate-last HKMG; similar specs to TSMC N28; widely available; very competitive pricing",
            "40nm": "40nm LP/G for embedded controllers, display drivers",
            "55nm": "55nm LP/ULP for IoT, industrial",
            "65nm": "65LP/G for analog, RF, power management; large Chinese customer base",
            "90nm": "90G for automotive sensors, MEMS",
            "130nm": "0.13µm — industrial, automotive sensors",
            "180nm": "0.18µm CMOS — BCD, power management, analog",
        },
        "key_design_rules": {
            "14nm": {
                "gate_architecture": "FinFET (DUV immersion — no EUV)",
                "density_note": "Uses multi-patterning DUV vs. EUV — slightly lower density than TSMC N7",
                "requires_euv": False,
                "us_export_restrictions": "Cannot use ASML EUV (US export control BIS Entity List)",
            },
            "28nm": {
                "min_poly_pitch_nm": 117,
                "min_metal1_width_nm": 45,
                "process_variants": ["28HKC", "28HKC+", "28LP"],
                "requires_euv": False,
            },
        },
        "packaging_options": ["QFN", "BGA", "SOIC", "QFP", "Flip-Chip"],
        "notable_customers": ["Huawei HiSilicon", "SMIC domestic Chinese fabless", "Unisoc", "Biren"],
        "strengths": [
            "Lowest cost structure — 20–40% below TSMC at equivalent mature nodes",
            "Large capacity in China — serves growing domestic fabless market",
            "No US export restrictions at 28nm and above (EAR99/no license required)",
            "Fast quoting and lower bureaucracy for Chinese customers",
            "Heavily subsidized by Chinese government",
        ],
        "limitations": [
            "Entity List: cannot receive ASML EUV scanners — hard cap at ~14nm with DUV multi-patterning",
            "US/EU export restrictions limit some customer designs (US-origin IP/software)",
            "CRITICAL geopolitical risk for US-market products — potential sanctions",
            "Lower IP ecosystem quality and quantity vs. TSMC/GF",
            "Technology lag: ~2 generations behind TSMC at equivalent node naming",
            "Cannot serve US defense/government programs",
            "Quality consistency historically below TSMC/Samsung at advanced nodes",
        ],
        "certifications": ["ISO 9001", "ISO 14001", "IATF 16949 (limited processes)"],
        "ip_ecosystem": "Limited at advanced nodes; improving domestic IP library",
    },

    {
        "name": "Tower Semiconductor",
        "full_name": "Tower Semiconductor Ltd. (Intel subsidiary since 2022 acquisition attempt failed; remains independent)",
        "location": "Migdal HaEmek, Israel (+ Newport Beach CA, Uozu Japan/Panasonic JV)",
        "country": "Israel",
        "founded_year": 1993,
        "wafer_diameter_mm": [300, 200],
        "process_nodes": ["65nm", "90nm", "130nm", "180nm", "350nm"],
        "capacity_status": "Available",
        "cost_tier": "mid",
        "lead_time_weeks_base": 10,
        "nre_mask_set_usd": {
            "65nm": 350_000,
            "130nm": 200_000,
            "180nm": 150_000,
        },
        "min_wafer_run": {
            "65nm": 5,
            "130nm": 5,
            "180nm": 5,
            "350nm": 3,
        },
        "eda_tools_qualified": ["Cadence", "Synopsys", "Siemens", "Keysight ADS (RF)"],
        "process_specialties": {
            "65nm": "65nm RF CMOS — fT >160GHz; used for 60GHz mmWave, radar; SiGe available",
            "90nm": "90nm SiGe BiCMOS — fT >200GHz; 77GHz automotive radar (TowerJazz specialty)",
            "130nm": "SiGe BiCMOS 0.13µm — fT/fmax >230/280GHz; 5G mmWave, satellite",
            "180nm": "0.18µm CMOS with SPAD (Single-Photon Avalanche Diode) for LiDAR; also BCD, RF",
            "350nm": "0.35µm CMOS for high-voltage power, displays",
        },
        "key_design_rules": {
            "130nm": {
                "technology": "SiGe HBT BiCMOS",
                "fT_GHz": ">230",
                "fmax_GHz": ">280",
                "nfmin_db_at_60GHz": "~2.5",
                "specialty": "Automotive radar 77GHz, 5G FR2 mmWave front-end",
            },
            "65nm": {
                "technology": "RF CMOS",
                "fT_GHz": ">160",
                "specialty": "60GHz WiFi 802.11ay, mmWave phased array",
            },
            "180nm": {
                "technology": "CMOS + SPAD",
                "specialty": "LiDAR time-of-flight sensors, medical imaging",
                "high_voltage_option": "up to 5V I/O",
            },
        },
        "packaging_options": ["QFN", "BGA", "WLCSP", "Wafer-level", "Flip-Chip"],
        "notable_customers": ["Mobileye", "Broadcom", "MediaTek", "Marvell", "STMicro"],
        "strengths": [
            "World leader in SiGe BiCMOS for RF/mmWave applications",
            "Unique SPAD process for LiDAR and medical imaging",
            "BCD process for power management (motor drivers, PMIC)",
            "Analog/mixed-signal excellence — deep expertise",
            "Panasonic JV (Japan) provides geographic diversification",
            "Automotive radar expertise (AEC-Q100 Grade 0 at some processes)",
        ],
        "limitations": [
            "No leading-edge digital logic (<65nm for digital)",
            "Limited capacity vs. TSMC/Samsung for high-volume pure digital",
            "Middle East geopolitical risk (Israel regional conflicts)",
            "Specialty-focused — not suitable for high-density SoC",
            "Intel acquisition attempt (2021–2022) created uncertainty; remains independent",
        ],
        "certifications": ["ISO 9001", "ISO 14001", "IATF 16949", "AEC-Q100 (select processes)"],
        "ip_ecosystem": "Specialty RF/analog IP library; unique SiGe and SPAD PDKs",
    },

    {
        "name": "Skywater Technology",
        "full_name": "SkyWater Technology Foundry",
        "location": "Bloomington, Minnesota, USA",
        "country": "United States",
        "founded_year": 2017,
        "wafer_diameter_mm": [200],
        "process_nodes": ["90nm", "130nm", "180nm"],
        "capacity_status": "Available",
        "cost_tier": "mid",
        "lead_time_weeks_base": 12,
        "nre_mask_set_usd": {
            "130nm": 150_000,
            "180nm": 100_000,
        },
        "min_wafer_run": {
            "130nm": 5,
            "180nm": 5,
        },
        "eda_tools_qualified": ["Cadence", "Synopsys", "OpenROAD (open-source PDK)"],
        "process_specialties": {
            "130nm": "SKY130 — world's first open-source PDK (Google/efabless partnership); free shuttles via Efabless",
            "90nm": "90nm RF CMOS for wireless, IoT",
            "180nm": "0.18µm — analog, MEMS, sensors; aerospace and defense qualified",
        },
        "key_design_rules": {
            "130nm": {
                "pdk_type": "Open-source (Apache 2.0 license)",
                "free_shuttle": "Efabless chipIgnite — $10,000 fixed cost for 40 dies",
                "max_die_size_mm2": 9.88,
                "min_poly_width_nm": 150,
                "metal_layers": 5,
            },
        },
        "packaging_options": ["QFN", "DIP", "SOIC", "Custom"],
        "notable_customers": ["Google/Efabless open-source", "Sandia National Labs", "DARPA", "US Air Force"],
        "strengths": [
            "Only open-source PDK foundry (SKY130) — ideal for research/prototyping",
            "US-based — ITAR compliant, DoD trusted foundry eligible",
            "Low-cost shuttles via Efabless (~$10k for 40 dies at 130nm)",
            "Academic/research community focus",
            "Government program experience (DARPA, Air Force Research Lab)",
        ],
        "limitations": [
            "Limited to 130nm and above — no advanced digital capability",
            "200mm wafers only (smaller than 300mm industry standard)",
            "Not suitable for high-volume production",
            "SKY130 open PDK has fewer IP cores vs. commercial PDKs",
            "Primarily US defense/research customers — limited commercial track record",
        ],
        "certifications": ["ISO 9001", "ITAR registered", "CMMC Level 2"],
        "ip_ecosystem": "Open-source via Efabless/GitHub; community-driven IP library",
    },
]


GEOPOLITICAL_RISK = {
    "Taiwan": {
        "risk_level": "HIGH",
        "risk_score": 65,
        "factors": [
            "Cross-strait tensions — PLA military exercises near Taiwan (2022, 2023)",
            "Concentrated ~90% of leading-edge (<7nm) wafer capacity",
            "High earthquake/typhoon risk in western Taiwan (Hsinchu)",
            "Single point of failure for global advanced semiconductor supply",
            "US-China technology decoupling pressure may accelerate",
        ],
        "mitigation": (
            "Dual-source: qualify a US (GF, IFS) or Korean (Samsung) fab for critical designs. "
            "Build 12–26 week inventory buffer for advanced node components. "
            "TSMC is building Phoenix AZ (N4), Kumamoto JP (N12/N16), and Dresden DE (N28) to reduce Taiwan concentration."
        ),
        "insurance_programs": "Export controls (CHIPS Act) require fabs receiving US subsidies to limit China sales",
    },
    "South Korea": {
        "risk_level": "MEDIUM",
        "risk_score": 78,
        "factors": [
            "North Korean ballistic missile tests increase regional instability",
            "US-China semiconductor trade friction affects Samsung/SK Hynix exports",
            "Reliance on US EUV scanners (ASML) — export control vulnerability",
            "Labor relations — Samsung fab strikes historically rare but possible",
        ],
        "mitigation": (
            "Maintain secondary source in geographically distinct region. "
            "Korean CHIPS Act (K-Chips Act) provides significant fab investment incentives. "
            "Samsung expanding Taylor TX as risk diversification."
        ),
    },
    "United States": {
        "risk_level": "LOW",
        "risk_score": 92,
        "factors": [
            "CHIPS and Science Act ($52B) significantly expanding domestic capacity",
            "Higher labor and operating costs vs. Asia",
            "Environmental permitting timelines can delay fab construction",
            "Limited fab worker talent pool vs. Taiwan/Korea",
        ],
        "mitigation": (
            "Leverage CHIPS Act manufacturing investment tax credit (25%) to offset cost premium. "
            "GF Malta, Intel Chandler/Hillsboro, TSMC Phoenix, Samsung Taylor all expanding. "
            "DOD Trusted Foundry program for defense-critical designs."
        ),
    },
    "China": {
        "risk_level": "CRITICAL",
        "risk_score": 30,
        "factors": [
            "BIS Entity List: SMIC cannot access EUV tools — hard technology ceiling at ~14nm",
            "US Export Administration Regulations (EAR) restrict US-origin IP/software use at Chinese fabs",
            "Potential future sanctions could freeze existing engagements",
            "OFAC designation risk for downstream products",
            "Technology transfer restrictions for US-market products",
            "Chinese government pressure on domestic fabless customers",
        ],
        "mitigation": (
            "AVOID for designs containing US-origin IP, EAR-controlled technology, or destined for US markets. "
            "Acceptable only for non-EAR designs targeting China-domestic market. "
            "Consult export control counsel before tapeout at SMIC."
        ),
    },
    "Israel": {
        "risk_level": "MEDIUM",
        "risk_score": 70,
        "factors": [
            "Ongoing regional conflict (Gaza war 2023–2024) increases operational risk",
            "Limited volume capacity vs. TSMC/Samsung",
            "Recruitment challenges for fab technicians during military service periods",
            "Geopolitical boycott risk from Middle East customers",
        ],
        "mitigation": (
            "Tower Semiconductor (Migdal HaEmek) maintained production during recent conflicts. "
            "Panasonic JV in Uozu, Japan provides geographic backup for Tower capacity. "
            "Suitable for specialty RF/analog designs where Tower has unique process advantages."
        ),
    },
    "Germany": {
        "risk_level": "LOW",
        "risk_score": 90,
        "factors": [
            "TSMC Dresden fab (N28, N16) opening 2027 — EU CHIPS Act recipient",
            "Bosch/Infineon/NXP domestic fab presence",
            "EU semiconductor independence strategy provides long-term stability",
        ],
        "mitigation": "Strong regulatory environment; EU CHIPS Act €43B investment commitment.",
    },
    "Japan": {
        "risk_level": "LOW",
        "risk_score": 88,
        "factors": [
            "TSMC Kumamoto fab (N12, N16) operational since 2024",
            "Earthquake risk in western Japan (Kumamoto region — 2016 Kumamoto earthquake precedent)",
            "Rapid Semiconductor (Rapidus) 2nm fab planned for 2027 (high risk unproven)",
        ],
        "mitigation": "TSMC JASM (Japan Advanced Semiconductor Manufacturing) has METI government backing. Earthquake-resistant facility design standard in Japan.",
    },
}


class SupplyChainService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze(self, design: Design) -> dict:
        import re
        arch = design.architecture_json
        process_node_name = arch.get("process_node", design.process_node or "28nm")
        pn = get_process_node(process_node_name)

        _m = re.search(r'(\d+\s*nm)', process_node_name, re.IGNORECASE)
        node_key = _m.group(1).replace(" ", "").lower() if _m else process_node_name.replace(" ", "").lower()

        matching_fabs = self._match_fabs(node_key, pn)
        geo_risks = self._assess_geopolitical_risks(matching_fabs)
        diversity_plan = self._create_diversification_plan(matching_fabs)

        result = await self.db.execute(
            select(BOMEntry).where(BOMEntry.design_id == design.id)
        )
        bom_entries = result.scalars().all()
        supplier_analysis = self._analyze_suppliers(bom_entries)

        return {
            "fab_recommendations": matching_fabs,
            "geopolitical_risks": geo_risks,
            "diversification_plan": diversity_plan,
            "supplier_analysis": supplier_analysis,
        }

    def _match_fabs(self, node_key: str, pn) -> list[dict]:
        results = []
        for fab in FOUNDRY_DATABASE:
            supported_keys = [
                n.replace(" ", "").lower()
                for n in fab["process_nodes"]
            ]
            if node_key not in supported_keys:
                continue

            node_idx = supported_keys.index(node_key)
            capability_match = 95 if node_idx == 0 else (85 if node_idx <= 2 else 70)

            cost_multiplier = {"premium": 1.2, "mid": 1.0, "economy": 0.78}.get(fab["cost_tier"], 1.0)
            estimated_cost = int(pn.fab_cost_per_wafer_usd * cost_multiplier)

            country = fab["country"]
            geo = GEOPOLITICAL_RISK.get(country, {"risk_level": "MEDIUM", "risk_score": 70})
            risk_score = geo.get("risk_score", 70)

            cost_score = max(0, min(100, int(100 - (cost_multiplier - 0.7) * 120)))
            overall = int(capability_match * 0.35 + cost_score * 0.30 + risk_score * 0.35)

            lead_time = fab["lead_time_weeks_base"]
            nre_usd = fab.get("nre_mask_set_usd", {}).get(node_key, None)
            min_run = fab.get("min_wafer_run", {}).get(node_key, 5)
            specialties = fab.get("process_specialties", {})
            node_specialty = specialties.get(node_key, "Standard process")
            design_rules = fab.get("key_design_rules", {}).get(node_key, {})

            results.append({
                "name": fab["name"],
                "full_name": fab["full_name"],
                "location": fab["location"],
                "country": country,
                "process_nodes": fab["process_nodes"],
                "capacity_status": fab["capacity_status"],
                "estimated_cost_per_wafer": estimated_cost,
                "lead_time_weeks": lead_time,
                "nre_mask_set_usd": nre_usd,
                "min_wafer_run": min_run,
                "capability_match": capability_match,
                "cost_score": cost_score,
                "risk_score": risk_score,
                "overall_score": overall,
                "strengths": fab["strengths"][:4],
                "limitations": fab["limitations"][:3],
                "risk_factors": geo.get("factors", [])[:3],
                "node_specialty": node_specialty,
                "design_rules": design_rules,
                "packaging_options": fab.get("packaging_options", [])[:5],
                "certifications": fab.get("certifications", []),
                "eda_tools": fab.get("eda_tools_qualified", []),
                "notable_customers": fab.get("notable_customers", [])[:4],
                "ip_ecosystem": fab.get("ip_ecosystem", ""),
            })

        results.sort(key=lambda f: f["overall_score"], reverse=True)
        return results

    def _assess_geopolitical_risks(self, fabs: list[dict]) -> list[dict]:
        seen_countries: set[str] = set()
        risks = []
        for fab in fabs:
            country = fab["country"]
            if country in seen_countries:
                continue
            seen_countries.add(country)
            geo = GEOPOLITICAL_RISK.get(country, {
                "risk_level": "MEDIUM",
                "risk_score": 70,
                "factors": ["No specific intelligence available"],
                "mitigation": "Standard due diligence recommended",
            })
            risks.append({
                "region": country,
                "risk_level": geo["risk_level"],
                "risk_score": geo.get("risk_score", 70),
                "factors": geo.get("factors", []),
                "mitigation": geo.get("mitigation", ""),
            })
        risks.sort(key=lambda r: r["risk_score"])
        return risks

    def _create_diversification_plan(self, fabs: list[dict]) -> dict:
        if not fabs:
            return {
                "primary_fab": "None available",
                "secondary_fab": "None available",
                "rationale": "No fabs found supporting this process node.",
            }
        if len(fabs) < 2:
            return {
                "primary_fab": fabs[0]["name"],
                "secondary_fab": "No alternative found for this node",
                "rationale": "Limited fab options at this process node — evaluate node migration for dual-sourcing.",
            }

        primary = fabs[0]
        secondary = next(
            (f for f in fabs[1:] if f["country"] != primary["country"]),
            fabs[1],
        )

        risk_warning = ""
        if primary["country"] == "China":
            risk_warning = " ⚠ PRIMARY FAB IS IN CHINA — verify EAR/ITAR compliance before tapeout."
        elif primary["country"] == "Taiwan":
            risk_warning = " ⚠ Taiwan concentration risk — qualify secondary US/Korean fab for business continuity."

        return {
            "primary_fab": primary["name"],
            "secondary_fab": secondary["name"],
            "rationale": (
                f"Primary: {primary['name']} ({primary['country']}) — highest overall score "
                f"({primary['overall_score']}/100). "
                f"Secondary: {secondary['name']} ({secondary['country']}) — geographic diversification "
                f"reducing {primary['country']} concentration risk."
                f"{risk_warning}"
            ),
        }

    def _analyze_suppliers(self, bom_entries: list) -> dict:
        if not bom_entries:
            return {"suppliers": [], "concentration_risk": "N/A"}

        supplier_map: dict[str, list] = {}
        for e in bom_entries:
            s = e.supplier or "Unknown"
            supplier_map.setdefault(s, []).append({
                "part_number": e.part_number,
                "category": e.category,
            })

        total = len(bom_entries)
        suppliers = []
        for name, parts in supplier_map.items():
            share = len(parts) / total * 100
            suppliers.append({
                "name": name,
                "component_count": len(parts),
                "share_pct": round(share, 1),
                "categories": list({p["category"] for p in parts if p.get("category")}),
            })

        suppliers.sort(key=lambda s: s["share_pct"], reverse=True)
        top_share = suppliers[0]["share_pct"] if suppliers else 0
        concentration = "HIGH" if top_share > 40 else "MEDIUM" if top_share > 25 else "LOW"

        return {
            "suppliers": suppliers,
            "concentration_risk": concentration,
            "total_suppliers": len(suppliers),
        }
