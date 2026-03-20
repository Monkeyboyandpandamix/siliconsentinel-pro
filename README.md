<div align="center">

# ⚡ SiliconSentinel Pro

### AI-Powered Semiconductor Design Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash_Lite-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![SQLite](https://img.shields.io/badge/SQLite-aiosqlite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)

**From natural language to a fully-analyzed, yield-predicted, supply-chain-optimized semiconductor design — in under 2 minutes.**

</div>

---

## What Is It?

SiliconSentinel Pro turns a plain English chip description into a complete IC design dossier. It couples **Google Gemini AI** with **real semiconductor physics engines** (Fourier thermal, CMOS power, Murphy/Poisson yield, Elmore signal integrity) to produce analysis that would normally require a full EDA toolchain and weeks of engineering time.

Designed for engineers who know semiconductors — every metric, formula, and constraint is domain-accurate.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (React 19 + Vite)                   │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Step 1  │  │  Step 2  │  │  Step 3  │  │    Steps 4–8     │   │
│  │ AI       │→ │ Digital  │→ │ AI       │→ │ BOM / Supply /   │   │
│  │ Co-Pilot │  │ Twin Sim │  │ Optimize │  │ Yield / QC / ... │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                                     │
│  Accessibility Toolbar (color mode · TTS · font size · motion)      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP / REST  (Vite proxy → :8000)
┌───────────────────────────▼─────────────────────────────────────────┐
│                     FastAPI Backend (Python)                         │
│                                                                     │
│  ┌─────────────┐   ┌──────────────────────────────────────────────┐ │
│  │ AI Provider │   │           Physics Engines                    │ │
│  │  (Gemini /  │   │  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │ │
│  │   watsonx)  │   │  │ Thermal  │ │  Power   │ │   Signal    │  │ │
│  │             │   │  │ (Fourier)│ │  (CMOS)  │ │  Integrity  │  │ │
│  └─────────────┘   │  └──────────┘ └──────────┘ │  (Elmore)   │  │ │
│                    │  ┌──────────┐ ┌──────────┐ └─────────────┘  │ │
│  ┌─────────────┐   │  │  Yield   │ │ Process  │                  │ │
│  │  SQLAlchemy │   │  │(Murphy's)│ │  Node DB │                  │ │
│  │   + SQLite  │   │  └──────────┘ └──────────┘                  │ │
│  └─────────────┘   └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The 8-Step Design Pipeline

```
 NL Description
      │
      ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  STEP 1 — AI Co-Pilot                                       │
 │  • Gemini generates full ArchitectureBlueprint JSON         │
 │  • Blocks: id, type, power_mw, area_mm², x/y coords        │
 │  • Material recommendations (substrate, gate oxide, metal)  │
 │  • Constraint satisfaction scores (power/area/temp/cost)    │
 └───────────────────────────┬─────────────────────────────────┘
                             │ architecture JSON
                             ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  STEP 2 — Digital Twin Simulation                           │
 │  • Thermal: Fourier 2D grid + Jacobi relaxation             │
 │  • Power: dynamic (C·V²·f·α) + static (I_leak · VDD)       │
 │  • Signal: Elmore delay, crosstalk risk, timing slack       │
 │  • Pass / Warning / Fail score with bottleneck list         │
 └───────────────────────────┬─────────────────────────────────┘
                             │ simulation results
                             ▼
 ┌─────────────────────────────────────────────────────────────┐
 │  STEP 3 — AI Optimization   (see diagram below)             │
 └───────────────────────────┬─────────────────────────────────┘
                             │ optimized architecture
                             ▼
 ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐
 │  STEP 4          │  │  STEP 5           │  │  STEP 6        │
 │  Predictive Mfg  │  │  BOM Engine       │  │  Supply Chain  │
 │  Yield · Defects │  │  Cost · Catalog   │  │  Fabs · Risk   │
 └──────────────────┘  └──────────────────┘  └────────────────┘
 ┌──────────────────┐  ┌──────────────────────────────────────┐
 │  STEP 7          │  │  STEP 8                               │
 │  QC System       │  │  Carbon Estimate · Manufacturability  │
 │  Defect Analysis │  │  Multi-Design Compare                 │
 └──────────────────┘  └──────────────────────────────────────┘
```

---

## Step 3 Deep-Dive: AI Optimization Loop

This is the core intelligence loop. Gemini analyses the simulation bottlenecks and proposes concrete changes; the physics engines re-score the new architecture to produce verified before/after metrics.

```
                    ┌─────────────────────────┐
                    │   Simulation Results     │
                    │  (thermal / power /      │
                    │   signal / timing)       │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Bottleneck Ranking     │
                    │                         │
                    │  severity × category    │
                    │  ─────────────────────  │
                    │  CRITICAL  thermal      │
                    │  HIGH      timing       │
                    │  MEDIUM    power        │
                    └────────────┬────────────┘
                                 │  prompt + bottleneck list
                    ┌────────────▼────────────┐
                    │   Gemini Optimizer       │
                    │   (domain-specific       │
                    │    prompt template)      │
                    │                         │
                    │  Suggests:               │
                    │  • Floor-plan moves      │
                    │  • Clock gating          │
                    │  • Voltage scaling       │
                    │  • Block consolidation   │
                    └────────────┬────────────┘
                                 │  optimized architecture JSON
                    ┌────────────▼────────────┐
                    │   Physics Re-Score       │
                    │                         │
                    │  Before → After          │
                    │  ─────────────────────  │
                    │  Power   ████░  ███░    │
                    │  Perf    ████░  █████   │
                    │  Cost    ███░░  ████░   │
                    │  Area    ████░  ████░   │
                    │                         │
                    │  PPCA radar chart        │
                    │  improvement %           │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Optimized Blueprint    │
                    │   stored + forwarded     │
                    │   to Step 4–8 pipeline   │
                    └─────────────────────────┘
```

### PPCA Scoring Model

| Dimension   | Inputs Used                                    | Weight |
|-------------|------------------------------------------------|--------|
| **Power**   | total_power_mw, static/dynamic ratio           | 25 %   |
| **Performance** | critical_path_delay_ns, max_clock_mhz      | 25 %   |
| **Cost**    | est. cost/unit, yield %, wafer cost            | 25 %   |
| **Area**    | total_area_mm², die utilisation                | 25 %   |

---

## Physics Engines

### Thermal Model — Fourier's Law + Jacobi Relaxation

```
T_j = T_amb + P_block × (R_die + R_pkg + R_heatsink)

Grid solve:
  T[i,j] = ¼ (T[i-1,j] + T[i+1,j] + T[i,j-1] + T[i,j+1]) + Q[i,j]/(4k)
  iterate until max |ΔT| < 0.01°C
```

Hotspot threshold: **T_j > 95 °C → WARNING**, **> 110 °C → CRITICAL**

### Power Model — CMOS Equations

```
P_dynamic = α · C_eff · V_DD² · f
P_static  = I_leak · V_DD   (leakage current from process node data)
P_total   = P_dynamic + P_static
```

Activity factors (α) are block-type specific: CPU 0.35, RF 0.80, Memory 0.15, Analog 0.60.

### Yield Model — Murphy's Law

```
Y = (1 - exp(-D₀ · A)) / (D₀ · A)

D₀  = defect density (cm⁻²), scaled per process node
A   = die area (cm²)
```

Confidence interval derived from Poisson model as cross-check.

### Signal Integrity — Elmore Delay

```
t_pd = R_driver · C_wire + Σ R_i · C_i   (sum over RC segments)

Crosstalk: estimated from aggressor/victim wire spacing and coupling capacitance
Setup slack: t_clk - t_pd - t_su
Hold  slack: t_pd - t_hold
```

---

## Repository Structure

```
siliconsentinel-pro/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # pydantic-settings env management
│   ├── database.py              # SQLAlchemy async + SQLite
│   ├── models/                  # ORM models (7 tables)
│   ├── schemas/                 # Pydantic request/response models
│   ├── routers/                 # 10 API router modules
│   │   ├── designs.py           # Module 1 — AI Co-Pilot
│   │   ├── simulation.py        # Module 2 — Digital Twin
│   │   ├── optimization.py      # Module 3 — AI Optimizer
│   │   ├── prediction.py        # Module 4 — Predictive Mfg
│   │   ├── bom.py               # Module 5 — BOM Engine
│   │   ├── supply_chain.py      # Module 6 — Supply Chain
│   │   ├── quality.py           # Module 7 — QC System
│   │   ├── orchestration.py     # Pipeline orchestrator
│   │   ├── accessibility.py     # Module 0 — A11y prefs
│   │   └── extended.py          # Module 8 — Extended features
│   ├── services/                # Business logic (9 services)
│   ├── semiconductor/           # Physics engines
│   │   ├── process_nodes.py     # Node DB: 5nm–180nm specs
│   │   ├── thermal_model.py     # Fourier / Jacobi thermal
│   │   ├── power_model.py       # CMOS dynamic + static
│   │   ├── yield_model.py       # Murphy's + Poisson
│   │   ├── signal_integrity.py  # Elmore delay + crosstalk
│   │   ├── materials.py         # Substrate / metal / dielectric
│   │   └── component_db.py      # Real BOM catalog
│   └── prompts/                 # Domain-specific AI prompt templates
│
├── src/
│   ├── App.tsx                  # 8-step wizard shell
│   ├── services/api.ts          # Typed REST client
│   ├── types.ts                 # Full TypeScript type surface
│   └── components/
│       ├── ArchitectureViewer   # D3 interactive floorplan
│       ├── ThermalHeatmap       # 2D heat map canvas
│       ├── SimulationResults    # Pass/fail + bottlenecks
│       ├── OptimizationView     # PPCA radar + before/after
│       ├── YieldForecast        # Murphy curve + defect zones
│       ├── BOMTable             # Cost breakdown + lead times
│       ├── SupplierCards        # Ranked fab cards
│       ├── QualityControl       # Image upload + AI defect scan
│       ├── ManufacturabilityScore
│       └── AccessibilityToolbar # Color mode / TTS / font size
│
├── .env.example
├── backend/requirements.txt
└── package.json
```

---

## Supported Process Nodes

| Node  | V_DD  | Gate Oxide | Interconnect | Defect Density | Wafer Cost  |
|-------|-------|------------|--------------|----------------|-------------|
| 5 nm  | 0.75V | HfO₂       | Copper       | 0.09 /cm²      | ~$17,000    |
| 7 nm  | 0.80V | HfO₂       | Copper       | 0.12 /cm²      | ~$10,000    |
| 14 nm | 0.85V | HfO₂       | Copper       | 0.15 /cm²      | ~$5,800     |
| 28 nm | 0.90V | HfO₂/SiO₂ | Copper       | 0.20 /cm²      | ~$3,500     |
| 65 nm | 1.10V | SiO₂       | Copper       | 0.30 /cm²      | ~$1,800     |
| 180 nm| 1.80V | SiO₂       | Aluminum     | 0.50 /cm²      | ~$700       |

---

## Foundry Database

| Foundry                  | Supported Nodes          | Country       | Risk Level |
|--------------------------|--------------------------|---------------|------------|
| TSMC                     | 5 · 7 · 14 · 28 · 65 · 180 nm | Taiwan   | HIGH       |
| Samsung Foundry          | 5 · 7 · 14 · 28 · 65 nm  | South Korea   | MEDIUM     |
| Intel Foundry Services   | 7 · 14 nm                | United States | LOW        |
| GlobalFoundries          | 14 · 28 · 65 · 180 nm    | United States | LOW        |
| UMC                      | 28 · 65 · 180 nm         | Taiwan        | HIGH       |
| SMIC                     | 14 · 28 · 65 · 180 nm    | China         | CRITICAL   |
| Tower Semiconductor      | 65 · 180 nm              | Israel        | MEDIUM     |

---

## Quickstart

### Prerequisites

| Requirement          | Version     |
|----------------------|-------------|
| Python               | 3.11+       |
| Node.js              | 18+         |
| Google Gemini API key| (free tier) |

### 1 — Clone & configure

```bash
git clone https://github.com/your-org/siliconsentinel-pro
cd siliconsentinel-pro
cp .env.example .env
# Fill in GEMINI_API_KEY in .env
```

### 2 — Backend

```bash
cd siliconsentinel-pro
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be live at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 3 — Frontend

```bash
# In a second terminal, from the project root:
npm install
npm run dev
```

Open `http://localhost:5173`.

### Environment Variables

```env
# Required
GEMINI_API_KEY=your_google_ai_key

# Optional — defaults shown
AI_PROVIDER=gemini          # or "watsonx" (stub, ready for integration)
DATABASE_URL=sqlite+aiosqlite:///./siliconsentinel.db
UPLOAD_DIR=./uploads
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## API Reference

| Method | Endpoint                          | Description                        |
|--------|-----------------------------------|------------------------------------|
| POST   | `/api/designs`                    | Generate architecture from NL      |
| POST   | `/api/designs/{id}/simulate`      | Run digital twin simulation        |
| POST   | `/api/designs/{id}/optimize`      | AI optimization pass               |
| GET    | `/api/designs/{id}/predict`       | Yield + defect + delay forecast    |
| GET    | `/api/designs/{id}/bom`           | Generate & cost BOM                |
| GET    | `/api/designs/{id}/supply-chain`  | Fab matching + geopolitical risk   |
| POST   | `/api/designs/{id}/quality-check` | AI defect analysis on image upload |
| GET    | `/api/designs/{id}/carbon`        | Carbon footprint estimate          |
| GET    | `/api/designs/{id}/manufacturability` | Weighted DFM score             |
| GET    | `/api/designs/{id}/pipeline`      | Orchestration / stage status       |

Full interactive docs: **`http://localhost:8000/docs`**

---

## Tech Stack

### Backend
- **FastAPI** — async REST API, auto-generated OpenAPI docs
- **SQLAlchemy 2 (async)** + **aiosqlite** — non-blocking ORM over SQLite
- **NumPy** — Jacobi relaxation for thermal grids
- **google-genai** — Gemini 2.5 Flash Lite with structured JSON output
- **Pydantic v2** — strict request/response validation
- **Pillow** — image preprocessing for QC defect analysis

### Frontend
- **React 19** + **TypeScript 5.8** — strict typed component tree
- **Vite 6** — HMR dev server, proxy to `:8000`
- **Tailwind CSS 4** — utility styling
- **D3.js v7** — interactive SVG architecture floorplan (drag, zoom, pan)
- **Recharts** — PPCA radar, yield curves, power breakdowns
- **Lucide React** — icon library

---

## Sample Prompts

**Edge AI Accelerator (7 nm)**
> *"Design a high-performance edge inference SoC for embedded vision. ARM Cortex-A55 at 1.2 GHz, 512 KB SRAM, ML inference engine for CNNs, LPDDR4 interface, SPI/I2C sensor bus. 7nm, 3W power budget, 20 mm² die area."*

**BLE Wearable SoC (28 nm)**
> *"Low-power wearable health monitor SoC. ARM Cortex-M0+ at 64 MHz, 64 KB SRAM, BLE 5.3 transceiver, PPG analog front-end, OLED display driver. 28nm, sub-5mW active power, under 4mm² die."*

**Automotive Radar MCU (65 nm)**
> *"Safety-critical automotive radar signal processor. Dual-core lockstep ARM Cortex-R5, 256 KB SRAM, CAN-FD controller, Ethernet AVB MAC, ADC for 77 GHz radar front-end. 65nm, AEC-Q100 Grade 1, 150°C max junction."*

---

## License

MIT — see `LICENSE` for details.
