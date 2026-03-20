<div align="center">

# SiliconSentinel Pro

### AI-Powered Semiconductor Design & Manufacturing Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash_Lite-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![IBM Watson](https://img.shields.io/badge/IBM-watsonx_Orchestrate-052FAD?style=flat-square&logo=ibm&logoColor=white)](https://www.ibm.com/watsonx)
[![SQLite](https://img.shields.io/badge/SQLite-aiosqlite-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)

**From natural language to a fully-analyzed, yield-predicted, supply-chain-optimized semiconductor design — in under 2 minutes.**

*Built for the AI Semiconductor Manufacturing Track — addressing predictive insights, process automation, digital twin simulation, supply chain resilience, and agentic AI throughout the IC design lifecycle.*

</div>

---

## Table of Contents

1. [What Is SiliconSentinel Pro?](#what-is-siliconsentinel-pro)
2. [Why It Matters: The Manufacturing Track Problem](#why-it-matters-the-manufacturing-track-problem)
3. [Quick Feature Summary](#quick-feature-summary)
4. [System Architecture](#system-architecture)
5. [The 8-Step Design Pipeline](#the-8-step-design-pipeline)
6. [AI Integrations](#ai-integrations)
7. [Physics Engines (Digital Twin)](#physics-engines-digital-twin)
8. [Frontend Components](#frontend-components)
9. [Physical Layout Viewer — Pin-to-Pin](#physical-layout-viewer--pin-to-pin)
10. [Carbon Footprint Estimator](#carbon-footprint-estimator)
11. [Quality Control & AI Defect Analysis](#quality-control--ai-defect-analysis)
12. [Supply Chain Intelligence & Risk Map](#supply-chain-intelligence--risk-map)
13. [Accessibility Features](#accessibility-features)
14. [Supported Process Nodes](#supported-process-nodes)
15. [Foundry & Supplier Database](#foundry--supplier-database)
16. [Environment Setup — .env File](#environment-setup--env-file)
17. [How to Run the App](#how-to-run-the-app)
18. [API Reference](#api-reference)
19. [Repository Structure](#repository-structure)
20. [Tech Stack](#tech-stack)
21. [Sample Prompts](#sample-prompts)
22. [Roadmap & Future Extensions](#roadmap--future-extensions)

---

## What Is SiliconSentinel Pro?

SiliconSentinel Pro is a full-stack AI platform that covers the entire semiconductor design-to-manufacture lifecycle. It accepts a plain-English chip description and autonomously generates:

- A complete multi-block architecture floorplan with power, area, and connectivity specs
- A physics-accurate digital twin simulation (thermal, power, signal integrity, timing)
- An AI-driven optimization pass that improves the design against bottlenecks
- A real-time yield forecast using Murphy's Law and Poisson statistics
- A costed Bill of Materials matched against a real component catalog
- Geopolitical supply chain risk scoring across 7 global foundries
- An AI visual defect inspector for wafer and die imagery
- A live carbon footprint estimate using World Bank and IEA grid data
- A manufacturability score (DFM/DFT/DFY weighted) with actionable recommendations
- An interactive VLSI-style physical layout with pin-to-pin routing visualization

All physics engines run locally without any API key, so the platform is fully functional even in air-gapped environments. AI providers (Gemini, IBM watsonx Orchestrate) enhance every step when credentials are present.

---

## Why It Matters: The Manufacturing Track Problem

The semiconductor industry faces five structural crises that this platform is designed to address:

### 1. Design-to-Manufacturing Knowledge Gap
Most EDA tools require months of training and cost tens of thousands of dollars per seat. Junior engineers, startups, and academic teams struggle to translate a chip concept into a manufacturable design. SiliconSentinel Pro closes that gap with AI co-piloting that enforces real semiconductor physics at every step.

### 2. Predictive Yield Loss
Yield loss is the dominant cost driver in semiconductor manufacturing. A 5 nm chip with 1 cm² die area and 0.09/cm² defect density achieves only ~91% yield. A 28 nm design at 2 cm² falls to ~67%. Without predictive modeling, teams discover yield problems after expensive tape-out. The platform runs Murphy's Law yield models at design time, before a single wafer is processed.

### 3. Supply Chain Brittleness
TSMC Taiwan produces approximately 90% of the world's advanced (sub-10 nm) chips. A geopolitical event, earthquake, or pandemic that disrupts Taiwan impacts virtually every technology product on earth. SiliconSentinel Pro quantifies this risk numerically (0–100 score per foundry), ranks alternative suppliers by capability and cost, and highlights multi-region diversification strategies.

### 4. Carbon Blind Spots in Semiconductor Manufacturing
Semiconductor fabrication is one of the most energy-intensive industrial processes. A 300 mm wafer run at TSMC consumes approximately 4,000 kWh of electricity. Without grid-aware carbon modeling, sustainability teams cannot benchmark processes, compare foundry locations, or set meaningful Scope 3 targets. The platform pulls live grid carbon intensity (Electricity Maps API) and cross-references renewable energy percentages (World Bank Open Data) to produce per-die and per-wafer CO2 estimates with EPA equivalency translations.

### 5. Reactive Quality Control
Defect detection in traditional fabs is reactive: wafers fail electrical test, are cross-sectioned, and the root cause is identified days later. AI-assisted visual inspection can flag yield-killing patterns (particle contamination, lithography defects, etch anomalies) from optical micrographs in seconds. The platform's QC module accepts any wafer or die image and produces a structured defect report with confidence scores.

---

## Quick Feature Summary

| Category | Feature | Status |
|---|---|---|
| **AI Co-Pilot** | Natural language → architecture JSON | Live |
| **AI Co-Pilot** | IBM watsonx Orchestrate conversational agent | Live |
| **AI Co-Pilot** | IBM Watson Text-to-Speech (voice readback) | Live |
| **AI Co-Pilot** | IBM Watson Speech-to-Text (voice input) | Configured |
| **AI Co-Pilot** | Google Gemini 2.5 Flash Lite structured output | Live |
| **AI Co-Pilot** | Physics-based fallback (no API key required) | Live |
| **Architecture** | Interactive D3 floorplan (drag/zoom/pan) | Live |
| **Architecture** | VLSI physical layout — pin-to-pin | Live |
| **Architecture** | Blueprint / Physical Layout toggle | Live |
| **Architecture** | Multi-layer metal routing (M1/M2/M3) | Live |
| **Architecture** | I/O pad ring with signal naming | Live |
| **Architecture** | Standard-cell row hatching | Live |
| **Architecture** | VDD/VSS power rail visualization | Live |
| **Simulation** | Fourier 2D thermal model + Jacobi relaxation | Live |
| **Simulation** | 2D thermal heatmap canvas | Live |
| **Simulation** | CMOS dynamic + static power model | Live |
| **Simulation** | Elmore delay + crosstalk signal integrity | Live |
| **Simulation** | Pass/Warning/Fail with bottleneck list | Live |
| **Optimization** | Gemini bottleneck analysis + fix proposals | Live |
| **Optimization** | Physics re-score (before/after verified) | Live |
| **Optimization** | PPCA radar chart (Power/Performance/Cost/Area) | Live |
| **Yield** | Murphy's Law yield model | Live |
| **Yield** | Poisson confidence interval cross-check | Live |
| **Yield** | Interactive yield curve (area vs. yield%) | Live |
| **Yield** | Defect zone identification | Live |
| **BOM** | Real component catalog matching | Live |
| **BOM** | Cost breakdown per block type | Live |
| **BOM** | Lead time estimates | Live |
| **BOM** | BOM export table | Live |
| **Supply Chain** | 7-foundry database (TSMC, Samsung, Intel, GF, UMC, SMIC, Tower) | Live |
| **Supply Chain** | Geopolitical risk scoring (0–100) | Live |
| **Supply Chain** | Interactive SVG world risk map | Live |
| **Supply Chain** | Diversification recommendations | Live |
| **Quality** | Image-based AI defect analysis | Live |
| **Quality** | Defect classification (particle/lithography/etch/CMP) | Live |
| **Quality** | Confidence scores per defect type | Live |
| **Carbon** | World Bank API — live renewable % data | Live |
| **Carbon** | Electricity Maps API — real-time grid intensity | Optional |
| **Carbon** | IEA/IRENA 2022 fallback for all regions | Live |
| **Carbon** | EPA equivalencies (trees, car miles, flights) | Live |
| **Carbon** | Per-die and per-wafer CO2 estimate | Live |
| **Manufacturability** | DFM/DFT/DFY/DFR weighted score | Live |
| **Manufacturability** | Actionable improvement recommendations | Live |
| **Orchestration** | Pipeline stage tracking (8 stages) | Live |
| **Orchestration** | Per-stage duration and status display | Live |
| **Accessibility** | High contrast / Protanopia / Deuteranopia modes | Live |
| **Accessibility** | TTS voice readback (Watson Neural TTS) | Live |
| **Accessibility** | Text selection reader | Live |
| **Accessibility** | Adjustable font size | Live |
| **Accessibility** | Reduced motion mode | Live |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       BROWSER (React 19 + Vite 6)                        │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Step 1  │  │  Step 2  │  │  Step 3  │  │  Step 4  │  │  Step 5  │  │
│  │ Describe │→ │Architect │→ │ Simulate │→ │ Optimize │→ │   BOM    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                               │
│  │  Step 6  │  │  Step 7  │  │  Step 8  │                               │
│  │  Supply  │→ │ Forecast │→ │ Quality  │                               │
│  └──────────┘  └──────────┘  └──────────┘                               │
│                                                                          │
│  IBM Watson TTS · IBM Watson STT · Accessibility Toolbar · Chat Panel   │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │ HTTP/REST (Vite proxy → :8000)
                            │ JSON  ·  multipart/form-data
┌───────────────────────────▼──────────────────────────────────────────────┐
│                      FastAPI Backend (Python 3.11)                        │
│                                                                          │
│  ┌─────────────────────┐   ┌──────────────────────────────────────────┐  │
│  │    AI Providers      │   │            Physics Engines               │  │
│  │                     │   │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  Google Gemini 2.5  │   │  │ Thermal  │ │  Power   │ │  Signal  │  │  │
│  │  IBM watsonx Orch.  │   │  │ (Fourier)│ │  (CMOS)  │ │(Elmore)  │  │  │
│  │  IBM Watson TTS     │   │  └──────────┘ └──────────┘ └──────────┘  │  │
│  │  IBM Watson STT     │   │  ┌──────────┐ ┌──────────┐               │  │
│  │  Physics fallback   │   │  │  Yield   │ │ Process  │               │  │
│  └─────────────────────┘   │  │(Murphy's)│ │  Node DB │               │  │
│                            │  └──────────┘ └──────────┘               │  │
│  ┌─────────────────────┐   └──────────────────────────────────────────┘  │
│  │ SQLAlchemy + SQLite │                                                 │
│  │  (async / aiosqlite)│   ┌──────────────────────────────────────────┐  │
│  │  7 ORM tables        │   │          External APIs (optional)        │  │
│  └─────────────────────┘   │  World Bank · Electricity Maps · EPA     │  │
│                            └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## The 8-Step Design Pipeline

Each step builds on the previous. The platform tracks every stage in the database with timestamps, durations, and status codes so teams can monitor pipeline health across multiple parallel design iterations.

### Step 1 — Describe (AI Co-Pilot)

The engineer types a natural language chip description. Gemini (or the physics fallback) generates a complete `ArchitectureBlueprint` JSON containing:

- All functional blocks (CPU, memory, I/O, power, RF, analog, DSP, accelerator)
- Per-block: `power_mw`, `area_mm2`, `x/y` coordinates, clock frequency, connection list
- Die-level: process node, metal layer count, substrate, interconnect material
- Material recommendations: gate oxide, dielectric, contact metal
- Constraint satisfaction scores for power, area, temperature, and cost

```
  Natural Language
       │
       ▼
  ┌────────────────────────────────────────────────────────┐
  │  AI Co-Pilot (Gemini 2.5 Flash Lite)                   │
  │  • Parses NL constraints (max power, area, temp, cost) │
  │  • Generates block topology and connectivity graph     │
  │  • Assigns realistic power/area from process node data │
  │  • Scores constraint satisfaction 0–100                │
  └────────────────────────────────────────────────────────┘
       │  ArchitectureBlueprint JSON
       ▼
  IBM watsonx Orchestrate chat agent available for
  follow-up Q&A, design refinement, and explanation
```

**IBM watsonx Orchestrate** is embedded as a persistent conversational agent in the sidebar. It has full context of the current design state (architecture, simulation results, optimization changes, BOM, supply chain data) and can answer engineering questions, explain trade-offs, and suggest improvements throughout the entire session.

**IBM Watson Speech-to-Text** accepts voice input from the engineer's microphone. Audio is streamed to the Watson STT API (US South endpoint) via the backend proxy to avoid browser CORS issues, and the transcript is injected into the chip description field.

**IBM Watson Neural Text-to-Speech** reads any result aloud. The Accessibility Toolbar exposes a TTS toggle; the Chat Panel also uses Watson Neural TTS for agent responses.

### Step 2 — Architect (Architecture Review)

The generated architecture is rendered as two interactive views the engineer can switch between:

**Blueprint View** (D3 interactive floorplan)
- Draggable blocks with snap-to-grid clamping
- Zoom + pan (scroll wheel / pinch)
- Animated wiring overlay (curved bezier buses, colored by block type)
- Hover to highlight connected nets, dim unconnected blocks
- Click to inspect per-block metrics
- Process node metadata overlay

**Physical Layout View** (VLSI-style pin-to-pin)
- I/O pad ring (dense cyan bond-pad squares on all 4 die edges)
- Signal labels on pads: CLK, SDA, JTAG, GPIO, VDD, VSS, etc.
- Gold bond wire stubs from pad to core edge
- Block shapes with type-accurate aspect ratios (memory = tall/narrow, I/O = wide strip)
- Standard-cell row hatching inside every block
- N-well banding (top third of each block)
- Multi-layer orthogonal routing: M1 (red/horizontal) → via → M2 (green/vertical) → via → M3 (yellow/horizontal) → via → M2 entry stub
- White via markers at every metal-layer transition
- VDD/VSS horizontal power rail stripes with toggle control
- Hover to highlight connected routes and dim unrelated blocks
- Routing ON/OFF and Power Rail ON/OFF toggles
- Zoom + pan (scroll to zoom)

### Step 3 — Simulate (Digital Twin)

Four physics engines run concurrently against the architecture:

| Engine | Model | Key Output |
|---|---|---|
| Thermal | Fourier 2D + Jacobi relaxation | Junction temps, hotspot list, thermal resistance |
| Power | CMOS dynamic + static | Dynamic/static breakdown, power density per block |
| Signal Integrity | Elmore delay + crosstalk | Critical path delay, setup/hold slack, crosstalk risk |
| Timing | Clock tree + margin analysis | Max clock frequency, timing margin |

Results are presented as:
- Color-coded thermal heatmap (canvas 2D rendering, gradient from cool blue to critical red)
- Per-block temperature badges with PASS/WARNING/CRITICAL threshold indicators
- Bottleneck list ranked by severity × category
- Overall simulation score (0–100) with weighted sub-scores

### Step 4 — Optimize (AI Optimization Loop)

Gemini receives the simulation bottleneck list and proposes concrete architectural changes. The physics engines re-score the optimized architecture to produce verified before/after metrics.

```
  Simulation Bottlenecks (ranked)
       │
       ▼
  ┌────────────────────────────────┐
  │  Gemini Bottleneck Analyzer    │
  │  Suggests:                     │
  │  • Floor-plan block moves      │
  │  • Clock gating strategies     │
  │  • Voltage domain partitioning │
  │  • Block type consolidation    │
  │  • Metal layer count changes   │
  └──────────────┬─────────────────┘
                 │  optimized architecture JSON
                 ▼
  ┌────────────────────────────────┐
  │  Physics Re-Score              │
  │  Before → After (verified)     │
  │  Power   ████░  ███░           │
  │  Perf    ████░  █████          │
  │  Cost    ███░░  ████░          │
  │  Area    ████░  ████░          │
  └────────────────────────────────┘
```

**PPCA Scoring Model**

| Dimension | Inputs | Weight |
|---|---|---|
| Power | total_power_mw, static/dynamic ratio | 25% |
| Performance | critical_path_delay_ns, max_clock_mhz | 25% |
| Cost | estimated cost/unit, yield %, wafer cost | 25% |
| Area | total_area_mm², die utilization | 25% |

Results shown as a Recharts radar chart with labeled axes and before/after polygon overlay.

### Step 5 — BOM & Cost

The BOM engine matches every block against a real component catalog database. For each entry:

- Supplier name and part number
- Unit cost at target volume (quantity price breaks applied)
- Lead time in days
- Availability status
- Alternative part suggestions

Total cost is broken down by block type with a stacked bar chart. The BOM table supports sorting, filtering by availability, and displays a cost-per-unit vs. volume curve.

### Step 6 — Supply Chain Intelligence

The supply chain router queries the foundry database and ranks fabs by:

- Node capability match (exact and nearest-node fallback)
- Geopolitical risk score (0–100, sourced from country-level risk indexes)
- Estimated wafer cost
- Lead time
- Geographic diversification score

**Risk Map**: An interactive SVG world map colors each country by risk level. Hovering shows the foundry name, supported nodes, cost estimate, and risk breakdown. Clicking a supplier card loads detailed information.

Geopolitical risk factors weighted:
- Country political stability index
- Natural disaster frequency (earthquakes, typhoons)
- Export control exposure
- Single-source concentration risk

### Step 7 — Manufacturing Forecast

Three forecasting engines run in parallel:

**Yield Predictor (Murphy's Law)**
```
Y = (1 - exp(-D₀ · A)) / (D₀ · A)

D₀ = defect density (cm⁻²) from process node database
A  = die area (cm²)
```
Confidence intervals are derived from a Poisson cross-check. The interactive yield curve plots yield% against die area, highlighting the current design's operating point. Critical defect zones are overlaid as colored bands.

**Carbon Footprint Estimator**
- Calculates total electrical energy for wafer fabrication (process-node-specific kWh/wafer)
- Pulls renewable energy % from World Bank Open Data API (free, no key)
- Falls back to IEA/IRENA 2022 data for countries outside World Bank coverage
- Optionally uses Electricity Maps API for real-time grid carbon intensity
- Outputs kg CO2e per wafer and per die
- Translates to EPA equivalencies: trees to absorb equivalent CO2, car miles, 60W bulb hours, smartphone charges, home energy days, NYC→London flights

**Manufacturability Score (DFM/DFT/DFY/DFR)**
- Design for Manufacturing (DFM): metal density rules, via redundancy, spacing rules
- Design for Test (DFT): scan chain coverage, BIST availability, test access port
- Design for Yield (DFY): critical area analysis, pattern density balance
- Design for Reliability (DFR): electromigration margins, ESD protection, thermal cycling
- Weighted composite score 0–100 with per-dimension breakdown and specific recommendations

### Step 8 — Quality Control & Feedback

The QC module accepts a wafer or die photograph (JPEG/PNG/TIFF) and runs AI defect analysis:

- **Defect classification**: particle contamination, lithography defects, etch anomalies, CMP scratches, edge die failures, pattern collapse
- **Confidence scores** per defect type (0–1)
- **Severity rating**: PASS / MONITOR / CRITICAL
- **Recommended actions**: re-inspection intervals, process adjustments, lot holds
- **Comparison to baseline**: if a previous QC scan exists for the same design, delta analysis is shown

---

## AI Integrations

### Google Gemini 2.5 Flash Lite

Used for all generative AI tasks:

| Task | Prompt Template File | Output Schema |
|---|---|---|
| Architecture generation | `prompts/architecture.py` | `ArchitectureBlueprint` JSON |
| Simulation analysis | `prompts/simulation_analysis.py` | Bottleneck list + fix suggestions |
| AI optimization | `prompts/optimization.py` | Optimized `ArchitectureBlueprint` JSON |
| BOM generation | `prompts/bom_generation.py` | `BOMEntry[]` JSON |
| Supply chain analysis | `prompts/supply_chain.py` | Fab ranking + risk narrative |
| Defect analysis | `prompts/defect_analysis.py` | Defect classification JSON |

All Gemini calls use structured JSON output mode with Pydantic v2 validation. If the output fails validation, the backend retries once with a corrected prompt before falling back to the physics engine.

**Physics Fallback**: Every step has a physics-based fallback that runs entirely locally. The fallback uses real semiconductor equations (listed in the Physics Engines section below) and the process node database. It produces results that are numerically accurate for the specified process node even without a Gemini API key.

### IBM watsonx Orchestrate

The conversational AI agent embedded in the right sidebar panel. It:

- Maintains a full context object containing the live architecture, simulation results, optimization changes, BOM, supply chain analysis, and predictions
- Answers open-ended engineering questions ("Why is my thermal score low?", "What process node should I use for automotive?")
- Compares multiple designs if more than one has been generated in the session
- Falls back gracefully to Gemini if the watsonx Orchestrate endpoint is unreachable
- Routes through the backend at `/api/orchestration/chat` to keep API credentials server-side

**Endpoint**: `https://api.us-south.speech-to-text.watson.cloud.ibm.com`
**Auth**: Bearer token (WATSON_ORCHESTRATE_API_KEY)

### IBM Watson Neural Text-to-Speech

Converts any text in the application to natural-sounding speech:

- Invoked from the Accessibility Toolbar TTS toggle or the Chat Panel play button
- Uses the Watson Neural TTS REST API (POST /v1/synthesize)
- Returns audio/ogg;codecs=opus, played via the browser Audio API
- Falls back to browser-native Web Speech API if Watson TTS is unavailable

**Endpoint**: `https://api.us-south.text-to-speech.watson.cloud.ibm.com`
**Auth**: Basic auth (user=apikey, pass=WATSON_TTS_API_KEY)

### IBM Watson Speech-to-Text

Voice input for chip descriptions and chat:

- The frontend captures audio via `MediaRecorder` API
- Audio is sent as multipart/form-data to the backend at `/api/orchestration/transcribe`
- The backend forwards to Watson STT using Basic auth (apikey + WATSON_STT_API_KEY)
- The transcript is injected into the chip description textarea or the chat input field

**Endpoint**: `https://api.us-south.speech-to-text.watson.cloud.ibm.com/instances/{INSTANCE_ID}`
**Auth**: Basic auth (user=apikey, pass=WATSON_STT_API_KEY)
**Model**: `en-US_BroadbandModel`

### Electricity Maps API (Optional)

If `ELECTRICITY_MAPS_API_KEY` is provided, the carbon estimator queries the real-time grid carbon intensity for the selected fab's country zone. Without the key, the IEA 2022 fallback values are used and the UI shows a "Live data unavailable" badge.

### World Bank Open Data API (Free, No Key Required)

The carbon estimator always queries the World Bank API for the renewable electricity percentage (`EG.ELC.RNEW.ZS` indicator) for each foundry country. Results are cached in memory for the session. Taiwan uses the IEA hardcoded fallback because Taiwan is not a World Bank member state.

---

## Physics Engines (Digital Twin)

### Thermal Model — Fourier's Law + Jacobi Relaxation

```
Step 1 — Block-level junction temperature:
  T_j = T_amb + P_block × (R_die + R_pkg + R_heatsink)

  R_die     = thickness / (k_Si × area)   k_Si = 150 W/m·K
  R_pkg     = package-specific (FCBGA, QFP, etc.)
  R_heatsink = 0 (bare die) or user-specified

Step 2 — 2D spatial Jacobi relaxation:
  T[i,j] = ¼ (T[i-1,j] + T[i+1,j] + T[i,j-1] + T[i,j+1]) + Q[i,j] / (4k)
  iterate until max |ΔT| < 0.01 °C  (typically < 200 iterations)

Thresholds:
  T_j > 95 °C  → WARNING
  T_j > 110 °C → CRITICAL
```

### Power Model — CMOS Equations

```
P_dynamic = α × C_eff × V_DD² × f

α (activity factor) by block type:
  RF / Analog: 0.80   CPU: 0.35   DSP: 0.45
  Memory:      0.15   I/O: 0.25   Power: 0.10

C_eff: estimated from block area and process node gate capacitance density
V_DD:  from process node database (0.75V @ 5nm → 1.80V @ 180nm)
f:     from block clock_mhz field

P_static = I_leak × V_DD
I_leak: interpolated from process node leakage current density

P_total = P_dynamic + P_static
```

### Yield Model — Murphy's Law + Poisson

```
Murphy's Law:
  Y = [(1 - exp(-D₀ × A)) / (D₀ × A)]²

Poisson cross-check:
  Y_poisson = exp(-D₀ × A)

D₀ (defect density by process node):
  5nm:  0.09/cm²   7nm:  0.12/cm²   14nm: 0.15/cm²
  28nm: 0.20/cm²   65nm: 0.30/cm²   180nm: 0.50/cm²

Confidence interval: ± 1σ from binomial distribution on defect count
```

### Signal Integrity — Elmore Delay

```
Propagation delay:
  t_pd = R_driver × C_wire + Σ(R_i × C_i)  [sum over RC segments]

Wire resistance: R = ρ × L / (W × H)    [Cu: ρ = 1.72 μΩ·cm]
Wire capacitance: C = ε₀ × ε_r × L × W / t_ox

Crosstalk estimation:
  V_noise = C_coupling / (C_coupling + C_victim) × ΔV_aggressor

Timing slack analysis:
  Setup slack = T_clk - t_pd - t_su
  Hold slack  = t_pd - t_hold

Critical path: longest chain of delays from input register to output register
```

### Process Node Database (5 nm → 180 nm)

Physical parameters encoded for 6 nodes and used by all physics engines:

| Node | V_DD | Gate Oxide | k_eff | Defect Density | Leakage | Wafer Cost |
|---|---|---|---|---|---|---|
| 5 nm | 0.75 V | HfO₂ (HKMG) | 3.9 | 0.09 /cm² | Very High | ~$17,000 |
| 7 nm | 0.80 V | HfO₂ (HKMG) | 3.9 | 0.12 /cm² | High | ~$10,000 |
| 14 nm | 0.85 V | HfO₂ | 3.9 | 0.15 /cm² | Medium-High | ~$5,800 |
| 28 nm | 0.90 V | HfO₂ / SiO₂ | 4.1 | 0.20 /cm² | Medium | ~$3,500 |
| 65 nm | 1.10 V | SiO₂ | 3.9 | 0.30 /cm² | Low | ~$1,800 |
| 180 nm | 1.80 V | SiO₂ | 3.9 | 0.50 /cm² | Very Low | ~$700 |

### Materials Database

The materials module encodes real dielectric and metal properties:

- **Substrates**: Bulk silicon, SOI, GaN-on-Si, SiGe, Glass
- **Gate dielectrics**: SiO₂, HfO₂, Al₂O₃, SiON with ε_r and leakage current density
- **Interconnect metals**: Copper (bulk ρ = 1.72 μΩ·cm), Aluminum (ρ = 2.82 μΩ·cm), Cobalt, Ruthenium
- **Inter-layer dielectrics**: SiO₂, SiCOH (low-k), Air gap with k values

---

## Frontend Components

### ArchitectureViewer

D3.js interactive floorplan with Blueprint and Physical Layout modes.

- **Blueprint mode**: Draggable blocks, bezier wiring, color-coded by block type (CPU=red, Memory=blue, I/O=green, Power=amber, RF=violet, Analog=pink, DSP=cyan, Accelerator=orange)
- **Physical Layout mode**: Full VLSI layout as described in the next section
- Zoom/pan on both modes
- Block selection inspector panel (power, area, clock, power density, connection count)
- Wiring ON/OFF toggle

### ThermalHeatmap

Canvas 2D rendering of the 2D thermal grid from the Jacobi solver:

- Gradient from cool blue (ambient) → yellow (warning) → red (critical)
- Temperature isoline contours
- Per-block peak temperature labels
- Hotspot crosshair marker
- Animated gradient update when new simulation data arrives

### SimulationResults

Tabular and visual display of all four physics engine outputs:

- Per-engine score bar (0–100)
- Bottleneck list with severity badges (CRITICAL / HIGH / MEDIUM / LOW)
- Timing slack histogram
- Power breakdown pie chart (dynamic vs. static)

### OptimizationView

Before/after comparison of the AI optimization pass:

- PPCA radar chart (Recharts RadarChart) with labeled before/after polygons
- Percentage improvement per dimension
- Change summary list (what Gemini changed and why)
- Optimized architecture forwarded automatically to subsequent steps

### YieldForecast

Interactive yield analysis:

- Murphy's Law yield curve (Recharts LineChart, yield% vs. die area mm²)
- Current design operating point highlighted on curve
- Poisson confidence band overlay
- Defect zone table with probability estimates
- Wafer yield = dies per wafer × yield%

### BOMTable

Full Bill of Materials display:

- Supplier, part number, description, unit cost, lead time, availability
- Sortable columns
- Filterable by availability status
- Total cost summary with volume-break pricing
- Block type cost breakdown (Recharts BarChart)

### SupplierCards

Ranked foundry cards for the supply chain step:

- Foundry name, country, supported nodes
- Risk score badge (0–100, color-coded green → yellow → red)
- Estimated wafer cost
- Lead time
- Node match indicator (exact / nearest alternative)
- "Select this foundry" action updates the pipeline

### RiskMap

Interactive SVG world map:

- Countries colored by foundry risk level (green = LOW, yellow = MEDIUM, orange = HIGH, red = CRITICAL)
- Hover tooltip: foundry name, risk score, supported nodes, cost range
- Risk score legend
- Diversification score across currently selected suppliers

### CarbonEstimator

Live carbon footprint with data source indicators:

- World Bank renewable % (live badge if API succeeded, fallback badge if not)
- Electricity Maps real-time intensity (live badge if key provided)
- kg CO2e per wafer and per die
- EPA equivalency translation panel:
  - Trees required to absorb the CO2 (60 kg CO2/tree/year)
  - Car miles equivalent (404 g CO2/mile)
  - 60 W bulb hours
  - Smartphone charges (11.4 Wh/charge)
  - Home energy days (28.9 kWh/day)
  - NYC → London economy flights (585 kg CO2)
- Comparison bar between different foundry locations

### ManufacturabilityScore

DFM/DFT/DFY/DFR composite score:

- Overall score (0–100) with color-coded gauge
- Per-dimension breakdown (Recharts RadialBarChart)
- Issue list with severity and specific fix recommendations
- Comparison against process-node-specific industry benchmarks

### QualityControl

AI defect analysis module:

- Drag-and-drop or click-to-upload wafer/die image
- Pillow preprocessing (contrast enhancement, normalization) before AI analysis
- Gemini vision analysis with domain-specific defect classification prompt
- Defect report: type, confidence, location description, severity
- Recommended next actions
- Historical comparison if previous scan exists for the design

### OrchestrationStatus

Pipeline stage tracker:

- 8 stage rows with icon, name, duration, status badge
- Animated progress indicators
- Timestamp of each stage start/complete
- Failed stage error message display

### ChatPanel

IBM watsonx Orchestrate conversational interface:

- Persistent chat history in session
- Full design context injected into every message
- Watson Neural TTS playback button per assistant message
- Fallback to Gemini with transparent indicator
- Suggested starter questions (What can you help me with?, How does the workflow work?, What process nodes are supported?)

### AccessibilityToolbar

Persistent top-right toolbar:

- Color mode selector: Normal / High Contrast / Protanopia (red-green blind) / Deuteranopia (green-weak)
- Font size: Small / Medium / Large
- TTS toggle (Watson Neural TTS)
- Reduced motion toggle (disables all CSS animations and D3 transitions)

### TextSelectionReader

Floating action button that appears when text is selected anywhere in the app. Clicking it reads the selected text aloud via Watson TTS.

### ConstraintForm

Step 1 design constraint inputs:

- Max power (mW)
- Max area (mm²)
- Max junction temperature (°C)
- Budget per unit ($)
- Target production volume (units)

---

## Physical Layout Viewer — Pin-to-Pin

The Physical Layout view renders a VLSI-accurate die layout using D3.js with the following layers drawn in order:

### Layer Stack (bottom to top)

1. **Silicon substrate** — very dark brown-black (`#030508`)
2. **Die boundary** — amber/orange border, simulating the die edge under scanning electron microscope
3. **I/O pad ring area** — slightly lighter substrate color around the perimeter
4. **VDD/VSS power rails** — red (VDD) and blue dashed (VSS) horizontal stripes across the core, spaced by metal layer count
5. **I/O bond pads** — dense 7×7 px cyan squares (`#00d8ff`) on all 4 die edges, one per PAD_GAP pitch, with bond wire stubs in gold
6. **Signal labels** on pads: CLK, RSTn, SDA, SCL, TX, RX, VREF, IRQ, CS, MOSI, MISO, SCK, EN, INT, PWM, ADC0/1, DAC, GPIO0–3, JTAG_TDI/TDO/TCK, VDD, VSS, GND, AVDD, AVSS
7. **Corner pad blocks** — large cyan-bordered squares at die corners (ESD pad cells)
8. **Routing — M1 (horizontal, red)** — source exit stubs and target entry segments
9. **Routing — M2 (vertical, green)** — vertical trunk segments connecting M1 horizontal runs
10. **Routing — M3 (horizontal, yellow)** — long horizontal connection segments at second routing level
11. **Via markers** — white 2.2 px radius circles at every metal layer transition point
12. **Pin markers** — 5×5 px colored squares at exact pin locations on block edges
13. **Block bodies** — colored rectangles with type-specific aspect ratios
14. **Standard-cell row hatching** — thin horizontal lines at 5 px pitch (cell row height)
15. **N-well banding** — semi-transparent dark green fill on top third of each block
16. **Block type header stripe** — thin colored bar at top of each block
17. **Block name and type labels** — monospace, auto-truncated to block width
18. **Area/power metrics** — small monospace text at block bottom

### Block Aspect Ratios

| Block Type | Width/Height | Rationale |
|---|---|---|
| CPU | 1.05 | Roughly square, like a real CPU core |
| Memory | 0.42 | Tall narrow SRAM columns (bitline direction) |
| I/O | 3.80 | Wide strip along die edge |
| Power | 1.60 | Wide PMIC/LDO block |
| RF | 1.15 | Slightly wide RF transceiver |
| Analog | 0.85 | Slightly tall analog front-end |
| DSP | 1.70 | Wide fixed-function DSP |
| Accelerator | 1.35 | Wide systolic array or ML accelerator |

### Routing Algorithm

For each connection A → B in the block connectivity graph:

1. Determine the facing edge of A toward B (left/right/top/bottom)
2. Determine the facing edge of B toward A
3. Place source pin on A's facing edge at a fractional position along the edge (distributed to avoid overlap)
4. Place target pin on B's facing edge
5. Route three orthogonal segments:
   - **Exit stub** (M1 or M2, depending on exit edge direction), 10 px from block edge
   - **Vertical trunk** (M2), connecting exit stub Y to target entry Y
   - **Horizontal entry** (M1 or M3), from trunk X to target pin X
   - **Entry stub** (M2), from entry segment to target pin
6. Place via markers at all three segment junctions

### Interactive Controls

- Scroll to zoom (0.2× to 8×)
- Hover a block to: highlight its connected routing lines (full opacity, 1.8 px), dim all other blocks to 30% opacity, show block details bar at bottom
- Routing ON/OFF toggle (hides/shows all metal layer lines and vias)
- VDD/VSS ON/OFF toggle (hides/shows power rail stripes)
- Fit button (scale to 0.95× with centering)
- 1:1 button (reset to identity transform)

---

## Carbon Footprint Estimator

### Data Sources (in priority order)

1. **Electricity Maps API** (optional, requires `ELECTRICITY_MAPS_API_KEY`): Real-time grid carbon intensity in g CO2e/kWh for the foundry country's grid zone. Refreshed on each estimate request.

2. **World Bank Open Data API** (free, no key): Queries indicator `EG.ELC.RNEW.ZS` (renewable electricity as % of total) for each foundry country's ISO3 code. Taiwan uses IEA fallback because Taiwan is not a World Bank member state.

3. **IEA/IRENA 2022 fallback**: Hardcoded grid carbon intensity values for all supported foundry countries, used when neither live source is available.

### Estimation Model

```
Energy per wafer (kWh) = base_energy × process_scale_factor
  base_energy:          ~4,000 kWh for 300 mm wafer at 28 nm
  process_scale_factor: 1.0 (28nm) → 2.2 (5nm)  [more process steps]

CO2 per wafer (kg) = energy_per_wafer × grid_intensity (kg CO2e/kWh)
                   × (1 - renewable_fraction)  [renewable energy offsets]

Dies per wafer = (π × (wafer_radius)² - π × wafer_radius × √(2 × die_area))
                 / die_area - 2 × π × wafer_radius / √(2 × die_area)
  [standard semiconductor industry formula]

CO2 per die (kg) = CO2 per wafer / dies per wafer
```

### EPA Equivalencies (2024 constants)

| Equivalent | Value | Source |
|---|---|---|
| Trees (CO2 absorption) | 60 kg CO2/tree/year | EPA GHG Equivalencies |
| Car miles | 404 g CO2/mile | EPA fleet average |
| 60 W light bulb | 0.060 kWh/hour × grid intensity | EPA |
| Smartphone charges | 11.4 Wh/charge | EPA |
| Home energy | 28.9 kWh/day average US home | EPA |
| NYC → London flight | 585 kg CO2 economy | ICAO |
| Coal combustion | 2.21 kg CO2/kg coal | EPA |

---

## Quality Control & AI Defect Analysis

### Defect Classification Categories

| Category | Description | Process Stage |
|---|---|---|
| Particle contamination | Foreign material on wafer surface | Any stage |
| Lithography defects | Pattern transfer errors, bridging, opens | Photolithography |
| Etch anomalies | Over/under-etch, lateral etch | RIE/wet etch |
| CMP scratches | Mechanical planarization damage | CMP |
| Edge die failures | Stress cracking near die edge | Post-CMP |
| Pattern collapse | Aspect-ratio-dependent structural failure | Advanced nodes |
| Metal void | Copper void in damascene | Metallization |
| Oxide pinhole | Dielectric breakdown path | Gate oxide |

### Processing Pipeline

```
Image upload (JPEG/PNG/TIFF)
       │
       ▼
Pillow preprocessing:
  • Convert to RGB if RGBA/grayscale
  • Normalize contrast (ImageEnhance.Contrast × 1.2)
  • Resize to max 2048 px on longest side (memory management)
       │
       ▼
Gemini vision analysis:
  • Domain-specific defect prompt (prompts/defect_analysis.py)
  • Structured JSON output with defect_type, confidence, location, severity
       │
       ▼
QualityCheckResponse:
  • overall_result: PASS / MONITOR / CRITICAL
  • defects[]: type, confidence, bounding description, severity
  • recommendations[]: actionable next steps
  • comparison_to_baseline (if prior scan exists for this design_id)
```

---

## Supply Chain Intelligence & Risk Map

### Foundry Database

| Foundry | Nodes | Country | Risk | Est. Wafer Cost |
|---|---|---|---|---|
| TSMC | 5, 7, 14, 28, 65, 180 nm | Taiwan | HIGH (72/100) | $700–$17,000 |
| Samsung Foundry | 5, 7, 14, 28, 65 nm | South Korea | MEDIUM (45/100) | $600–$12,000 |
| Intel Foundry Services | 7, 14 nm | United States | LOW (22/100) | $5,000–$9,000 |
| GlobalFoundries | 14, 28, 65, 180 nm | United States | LOW (18/100) | $600–$5,000 |
| UMC | 28, 65, 180 nm | Taiwan | HIGH (68/100) | $500–$3,000 |
| SMIC | 14, 28, 65, 180 nm | China | CRITICAL (91/100) | $400–$4,500 |
| Tower Semiconductor | 65, 180 nm | Israel | MEDIUM (52/100) | $400–$1,600 |

### Geopolitical Risk Factors

```
Risk Score (0–100) composed of:
  • Political stability index   (weight: 30%)
  • Natural disaster exposure   (weight: 20%)
  • Export control risk         (weight: 25%)
  • Single-source concentration (weight: 25%)

Taiwan risk premium: high earthquake/typhoon frequency + geopolitical tension
  → even a 2-week disruption at TSMC has global multi-billion-dollar impact

SMIC critical rating: US Commerce Department Entity List restrictions
  → access to advanced EDA tools and foreign equipment is legally constrained
```

### Diversification Strategy Engine

The supply chain service calculates a portfolio risk score for any combination of selected foundries:

```
Diversification_score = 1 - Σ(market_share_i²)  [Herfindahl-Hirschman Index]

A single-source (TSMC only) portfolio scores 0.00
A two-source balanced split scores 0.50
A four-source equal split scores 0.75
```

---

## Accessibility Features

SiliconSentinel Pro is built to WCAG 2.1 AA standards. The Accessibility Toolbar persists across all 8 steps.

| Feature | Details |
|---|---|
| **High Contrast** | Dark background forced to #000, text forced to #fff, interactive elements outlined in #ffff00 |
| **Protanopia** | Red→Blue/Yellow color substitution across all charts, blocks, and badges |
| **Deuteranopia** | Green→Blue/Yellow color substitution |
| **Font Size** | Small (0.875rem base), Medium (1rem), Large (1.25rem). All units are rem-relative. |
| **Reduced Motion** | Disables all CSS transitions, Framer Motion animations, and D3 transition delays |
| **TTS** | Watson Neural TTS reads any text. Falls back to Web Speech API if Watson is unavailable. |
| **Text Selection Reader** | Floating button on any text selection → immediate TTS readback |
| **Keyboard Navigation** | All interactive elements reachable by Tab, all buttons have aria-label |
| **Screen Reader** | aria-live regions on loading states, role="img" + aria-label on all SVGs |

---

## Environment Setup — .env File

Create a `.env` file in the project root. All variables are optional except where noted for specific features.

```env
# ─── REQUIRED for AI features ────────────────────────────────────────────────
# Without this, the app runs physics-only fallback mode (no AI generation)
GEMINI_API_KEY=your_google_ai_studio_key
# Get free key at: https://aistudio.google.com/app/apikey

# ─── IBM watsonx Orchestrate (conversational AI agent in sidebar) ─────────────
WATSON_ORCHESTRATE_API_KEY=your_watsonx_orchestrate_api_key
WATSON_ORCHESTRATE_URL=https://api.us-south.watson-orchestrate.ibm.com/instances/YOUR_INSTANCE_ID
WATSON_ORCHESTRATE_INSTANCE_ID=your_instance_id
WATSON_ORCHESTRATE_AGENT_ID=your_agent_id
# Obtain from: IBM Cloud → watsonx Orchestrate → Credentials

# ─── IBM Watson Text-to-Speech ────────────────────────────────────────────────
WATSON_TTS_API_KEY=your_watson_tts_api_key
WATSON_TTS_URL=https://api.us-south.text-to-speech.watson.cloud.ibm.com/instances/YOUR_INSTANCE_ID
# Obtain from: IBM Cloud → Watson Text to Speech → Manage → Credentials

# ─── IBM Watson Speech-to-Text ────────────────────────────────────────────────
WATSON_STT_API_KEY=your_watson_stt_api_key
WATSON_STT_URL=https://api.us-south.speech-to-text.watson.cloud.ibm.com/instances/YOUR_INSTANCE_ID
# Obtain from: IBM Cloud → Watson Speech to Text → Manage → Credentials

# ─── IBM watsonx.ai (optional — for direct foundation model access) ───────────
WATSONX_API_KEY=your_watsonx_ai_key
WATSONX_PROJECT_ID=your_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
# Set AI_PROVIDER=watsonx to use this instead of Gemini

# ─── Carbon Estimator — optional live grid data ───────────────────────────────
ELECTRICITY_MAPS_API_KEY=your_electricity_maps_key
# Without this, IEA 2022 fallback values are used (still functional)
# Free tier at: https://app.electricitymaps.com/map → API

# ─── Database ─────────────────────────────────────────────────────────────────
# Default: SQLite (no setup required)
DATABASE_URL=sqlite+aiosqlite:///./siliconsentinel.db
# For PostgreSQL (production): postgresql+asyncpg://user:pass@host:5432/dbname

# ─── File uploads (quality control images) ───────────────────────────────────
UPLOAD_DIR=./uploads

# ─── AI provider selection ────────────────────────────────────────────────────
AI_PROVIDER=gemini
# Options: "gemini" | "watsonx"

# ─── CORS (comma-separated origins) ──────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Replit Secrets

When running on Replit, do not create a `.env` file. Instead, set each variable as a Replit Secret (Tools → Secrets):

| Secret Name | Required For |
|---|---|
| `GEMINI_API_KEY` | AI architecture generation, optimization, defect analysis, BOM |
| `WATSON_ORCHESTRATE_API_KEY` | Conversational AI sidebar agent |
| `WATSON_TTS_API_KEY` | Voice readback (TTS) |
| `WATSON_STT_API_KEY` | Voice input (STT) |
| `ELECTRICITY_MAPS_API_KEY` | Live real-time grid carbon intensity |
| `WATSONX_API_KEY` | Direct watsonx.ai foundation model access |
| `WATSONX_PROJECT_ID` | Required if WATSONX_API_KEY is set |

The application works without any API keys using physics-based simulation fallback. Features degrade gracefully with informative "NO KEY" badges on the system health panel.

---

## How to Run the App

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.11 or later | 3.12+ recommended |
| Node.js | 18 or later | 20 LTS recommended |
| npm | 9+ | Bundled with Node.js |
| Git | Any | For cloning |

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-org/siliconsentinel-pro
cd siliconsentinel-pro
```

### Step 2 — Configure environment

```bash
cp .env.example .env
# Open .env and fill in at minimum GEMINI_API_KEY
# All IBM Watson keys are optional — the app works without them
```

### Step 3 — Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

The main dependencies are:

```
fastapi==0.115.*
uvicorn[standard]
sqlalchemy[asyncio]
aiosqlite
pydantic-settings
google-genai
httpx
numpy
pillow
python-multipart
```

### Step 4 — Install frontend dependencies

```bash
npm install
```

### Step 5 — Start the backend

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend starts at `http://localhost:8000`.
Interactive API docs (Swagger UI): `http://localhost:8000/docs`
ReDoc: `http://localhost:8000/redoc`

The database (SQLite) is created automatically at `./siliconsentinel.db` on first run. No migrations needed — SQLAlchemy creates all tables via `create_all()`.

### Step 6 — Start the frontend

```bash
# In a second terminal, from the project root:
npm run dev
```

The Vite dev server starts at `http://localhost:5173` and proxies all `/api/` requests to `:8000`.

### Step 7 — Open the app

Open `http://localhost:5173` in your browser.

You should see the System Health panel on the right showing:
- Backend API: **ONLINE**
- AI Engine (Gemini): **ONLINE** or **NO KEY** depending on your .env
- IBM watsonx Orchestrate: **ONLINE** or **NO KEY**
- IBM Watson TTS: **ONLINE** or **NO KEY**
- Simulation Core: **ONLINE** (always — runs locally)
- Component Catalog: **ONLINE** (always — runs locally)
- Supply Chain DB: **ONLINE** (always — runs locally)

### Running on Replit

On Replit, two workflows are pre-configured:

| Workflow | Command | Port |
|---|---|---|
| Start Backend | `python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload` | 8000 |
| Start application | `npm run dev` | 5173 |

Start both workflows. The frontend Vite dev server proxies API requests to the backend automatically. The Replit preview pane shows the frontend at the `.replit.app` domain.

### Production Build

```bash
# Build frontend
npm run build
# Output: ./dist/

# Serve frontend via FastAPI static files (optional)
# Add StaticFiles mount to backend/main.py pointing to ./dist/

# Or serve with any static host (Vercel, Netlify, etc.)
# Set VITE_API_BASE_URL to your backend URL in the build environment
```

---

## API Reference

### Designs

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| POST | `/api/designs` | `{description, process_node, domain, constraints}` | Generate architecture from natural language |
| GET | `/api/designs/{id}` | — | Retrieve design by ID |
| GET | `/api/designs` | — | List all designs |
| DELETE | `/api/designs/{id}` | — | Delete design and associated data |

### Simulation

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| POST | `/api/designs/{id}/simulate` | `{architecture}` | Run full digital twin simulation |
| GET | `/api/designs/{id}/simulation` | — | Retrieve last simulation result |

### Optimization

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| POST | `/api/designs/{id}/optimize` | `{simulation_result}` | Run AI optimization pass |
| GET | `/api/designs/{id}/optimization` | — | Retrieve last optimization result |

### Predictions

| Method | Endpoint | Params | Description |
|---|---|---|---|
| GET | `/api/designs/{id}/predict` | — | Yield forecast + defect zones + delay prediction |

### Bill of Materials

| Method | Endpoint | Params | Description |
|---|---|---|---|
| GET | `/api/designs/{id}/bom` | — | Generate and cost BOM |

### Supply Chain

| Method | Endpoint | Params | Description |
|---|---|---|---|
| GET | `/api/designs/{id}/supply-chain` | — | Fab matching, risk scoring, diversification |

### Quality Control

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/designs/{id}/quality-check` | `multipart/form-data` with `file` | Upload image, run AI defect analysis |

### Extended Analysis

| Method | Endpoint | Params | Description |
|---|---|---|---|
| GET | `/api/designs/{id}/carbon` | — | Carbon footprint (World Bank + IEA + EPA equivalencies) |
| GET | `/api/designs/{id}/manufacturability` | — | DFM/DFT/DFY/DFR weighted score |

### Orchestration & Chat

| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET | `/api/orchestration/{id}/status` | — | Pipeline stage status for design |
| GET | `/api/orchestration/{id}/orders` | — | List all orchestration orders for design |
| POST | `/api/orchestration/chat` | `{message, context, history}` | Watson Orchestrate / Gemini chat |
| POST | `/api/orchestration/tts` | `{text}` | Watson Neural TTS synthesis |
| POST | `/api/orchestration/transcribe` | `multipart/form-data` audio | Watson STT transcription |

### Accessibility

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/accessibility/prefs` | `{color_mode, font_size, tts_enabled, reduced_motion}` | Save accessibility preferences |
| GET | `/api/accessibility/prefs` | — | Retrieve stored preferences |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend + all service health status |
| GET | `/docs` | Swagger UI (interactive API explorer) |
| GET | `/redoc` | ReDoc API documentation |

---

## Repository Structure

```
siliconsentinel-pro/
│
├── backend/
│   ├── main.py                       FastAPI application entry point, CORS, router mounting
│   ├── config.py                     pydantic-settings env management (all API keys)
│   ├── database.py                   SQLAlchemy async engine + session factory
│   │
│   ├── models/                       SQLAlchemy ORM table definitions
│   │   ├── design.py                 Design, DesignBlock
│   │   ├── simulation.py             SimulationResult
│   │   ├── optimization.py           OptimizationResult
│   │   ├── bom.py                    BOMEntry, BOMReport
│   │   ├── quality.py                QualityCheckResult
│   │   ├── orchestration.py          OrchestrationOrder (pipeline stage tracker)
│   │   └── accessibility.py          AccessibilityPrefs
│   │
│   ├── schemas/                      Pydantic v2 request/response models
│   │   ├── design.py                 DesignRequest, DesignResponse, ArchitectureBlueprint
│   │   ├── simulation.py             SimulationRequest/Response, BlockThermal, etc.
│   │   ├── optimization.py           OptimizationRequest/Response, PPCAScores
│   │   ├── bom.py                    BOMEntryResponse, BOMResponse
│   │   ├── supply_chain.py           SupplyChainResponse, FoundryInfo, GeoRisk
│   │   ├── prediction.py             PredictionsResponse, YieldData, DefectZone
│   │   ├── quality.py                QualityCheckResponse, DefectItem
│   │   ├── orchestration.py          PipelineStatusResponse, ChatRequest/Response
│   │   └── accessibility.py          AccessibilityPrefs
│   │
│   ├── routers/                      FastAPI route handlers
│   │   ├── designs.py                POST /designs, GET /designs/{id}
│   │   ├── simulation.py             POST /designs/{id}/simulate
│   │   ├── optimization.py           POST /designs/{id}/optimize
│   │   ├── prediction.py             GET /designs/{id}/predict
│   │   ├── bom.py                    GET /designs/{id}/bom
│   │   ├── supply_chain.py           GET /designs/{id}/supply-chain
│   │   ├── quality.py                POST /designs/{id}/quality-check
│   │   ├── orchestration.py          Pipeline status + Watson chat/TTS/STT
│   │   ├── accessibility.py          GET/POST /accessibility/prefs
│   │   └── extended.py               GET /carbon, GET /manufacturability
│   │
│   ├── services/                     Business logic layer
│   │   ├── ai_provider.py            Gemini / watsonx.ai abstraction layer
│   │   ├── design_copilot.py         NL → ArchitectureBlueprint generation
│   │   ├── simulation_engine.py      Orchestrates all 4 physics engines
│   │   ├── optimizer.py              Bottleneck analysis + Gemini optimization loop
│   │   ├── yield_predictor.py        Murphy's Law + Poisson yield calculations
│   │   ├── bom_engine.py             Component catalog matching + cost calculation
│   │   ├── supply_chain.py           Foundry ranking + geopolitical risk scoring
│   │   ├── quality_inspector.py      Pillow preprocessing + Gemini vision analysis
│   │   ├── carbon_estimator.py       World Bank + Electricity Maps + EPA equivalencies
│   │   └── orchestrator.py           Pipeline stage tracking and status management
│   │
│   ├── semiconductor/                Real-physics engine implementations
│   │   ├── process_nodes.py          Node database: 5nm–180nm parameters
│   │   ├── thermal_model.py          Fourier 2D + Jacobi relaxation solver
│   │   ├── power_model.py            CMOS dynamic + static power equations
│   │   ├── yield_model.py            Murphy's Law + Poisson statistics
│   │   ├── signal_integrity.py       Elmore delay + crosstalk + timing slack
│   │   ├── materials.py              Substrate, dielectric, metal property database
│   │   └── component_db.py           Real BOM component catalog
│   │
│   ├── prompts/                      Domain-specific AI prompt templates
│   │   ├── architecture.py           NL → architecture generation prompt
│   │   ├── simulation_analysis.py    Bottleneck ranking and explanation prompt
│   │   ├── optimization.py           Architecture optimization prompt
│   │   ├── bom_generation.py         BOM component selection prompt
│   │   ├── supply_chain.py           Fab ranking and risk narrative prompt
│   │   └── defect_analysis.py        Wafer/die image defect classification prompt
│   │
│   └── requirements.txt              Python package dependencies
│
├── src/
│   ├── App.tsx                       8-step wizard shell, state management
│   ├── main.tsx                      React 19 root mount
│   ├── index.css                     Tailwind CSS + custom chip theme variables
│   ├── vite-env.d.ts                 Vite environment type declarations
│   │
│   ├── types.ts                      Complete TypeScript type surface (all API types)
│   │
│   ├── services/
│   │   └── api.ts                    Typed REST client (fetch wrapper, all endpoints)
│   │
│   └── components/
│       ├── ArchitectureViewer.tsx    D3 interactive floorplan + mode toggle
│       ├── PhysicalLayoutViewer.tsx  VLSI physical layout, pin-to-pin routing
│       ├── ThermalHeatmap.tsx        Canvas 2D thermal gradient heatmap
│       ├── SimulationResults.tsx     Physics engine output display
│       ├── OptimizationView.tsx      PPCA radar chart + before/after comparison
│       ├── YieldForecast.tsx         Murphy curve + defect zone visualization
│       ├── BOMTable.tsx              Bill of materials table + cost breakdown
│       ├── SupplierCards.tsx         Ranked foundry cards
│       ├── RiskMap.tsx               Interactive SVG geopolitical risk world map
│       ├── CarbonEstimator.tsx       Carbon footprint + EPA equivalencies
│       ├── ManufacturabilityScore.tsx DFM/DFT/DFY/DFR composite score
│       ├── QualityControl.tsx        Image upload + AI defect analysis
│       ├── OrchestrationStatus.tsx   Pipeline stage tracker
│       ├── ChatPanel.tsx             Watson Orchestrate / Gemini chat interface
│       ├── AccessibilityToolbar.tsx  Color mode, font size, TTS, motion
│       ├── TextSelectionReader.tsx   Floating TTS button for selected text
│       └── ConstraintForm.tsx        Step 1 design constraint inputs
│
├── .env.example                      Environment variable template
├── package.json                      Node.js dependencies and scripts
├── vite.config.ts                    Vite configuration (proxy to :8000)
├── tailwind.config.ts                Tailwind CSS configuration
├── tsconfig.json                     TypeScript compiler configuration
└── replit.md                         Platform-specific documentation
```

---

## Tech Stack

### Backend

| Library | Version | Purpose |
|---|---|---|
| FastAPI | 0.115 | Async REST API framework, auto-generated OpenAPI |
| Uvicorn | latest | ASGI server with hot reload |
| SQLAlchemy | 2.x async | Non-blocking ORM with relationship support |
| aiosqlite | latest | Async SQLite driver for development/production |
| Pydantic v2 | latest | Strict request/response validation, JSON serialization |
| pydantic-settings | latest | .env file parsing into typed Settings class |
| google-genai | latest | Official Google Gemini SDK with structured output |
| httpx | latest | Async HTTP client for IBM Watson and World Bank APIs |
| NumPy | latest | Jacobi relaxation arrays for thermal solver |
| Pillow | latest | Image preprocessing for quality control |
| python-multipart | latest | Multipart form upload handling for image and audio |

### Frontend

| Library | Version | Purpose |
|---|---|---|
| React | 19 | Component tree |
| TypeScript | 5.8 | Strict typing across entire frontend |
| Vite | 6 | HMR dev server, API proxy, production build |
| Tailwind CSS | 4 | Utility-first styling |
| D3.js | 7 | SVG architecture floorplan, physical layout, risk map |
| Recharts | latest | PPCA radar, yield curves, power breakdowns, BOM charts |
| Framer Motion / motion | latest | Page transitions, block entrance animations |
| Lucide React | latest | Icon library (all step icons and UI icons) |

---

## Sample Prompts

Use these in Step 1 to see the full pipeline in action:

**Edge AI Accelerator — 7 nm**
> Design a high-performance edge inference SoC for embedded vision. ARM Cortex-A55 at 1.2 GHz, 512 KB SRAM, ML inference engine for 8-bit CNNs, LPDDR4 interface, SPI/I2C sensor bus. 7nm process, 3W power budget, 20mm² die area, target volume 500,000 units.

**BLE Wearable SoC — 28 nm**
> Low-power wearable health monitor SoC. ARM Cortex-M0+ at 64 MHz, 64 KB SRAM, BLE 5.3 transceiver, PPG analog front-end for heart rate, OLED display driver. 28nm, sub-5mW active power, under 4mm² die, 2 USD target cost at 1M units.

**Automotive Radar MCU — 65 nm**
> Safety-critical automotive radar signal processor. Dual-core lockstep ARM Cortex-R5, 256 KB SRAM, CAN-FD controller, Ethernet AVB MAC, ADC for 77 GHz radar front-end. 65nm, AEC-Q100 Grade 1, 150°C max junction temperature, ISO 26262 ASIL-D target.

**Data Center Network Chip — 5 nm**
> High-bandwidth network processor for data center switching. 400G Ethernet MAC/PCS, TCAM for 4M route entries, HBM2e memory controller, PCIe Gen5 host interface, ARM Neoverse N2 management core. 5nm, 150W TDP, 800mm² max die area, 500 units/year.

**Industrial Motor Controller — 180 nm**
> Mixed-signal industrial motor drive controller. ARM Cortex-M3 at 72 MHz, 16-bit delta-sigma ADC for current sensing, 3-phase PWM gate driver, CAN 2.0B, RS-485, -40°C to 125°C operation. 180nm BCD process, 5V supply tolerance, under 1.50 USD at 100K units.

---

## How This Addresses the Semiconductor Manufacturing Track

The challenge statement calls for AI solutions that enhance semiconductor manufacturing or supply chain through predictive insights, automation, or agentic AI — making production more efficient and resilient. Here is how each track criteria maps to SiliconSentinel Pro features:

**Predictive Insights**
- Murphy's Law yield prediction before tape-out eliminates post-silicon yield surprises
- Power, thermal, and signal integrity prediction flags design violations before they become silicon defects
- Supply chain risk scoring predicts disruption probability for any foundry
- Carbon footprint forecasting enables proactive Scope 3 reporting before production starts

**Automation**
- The full 8-step pipeline runs autonomously from a single text description
- The AI optimization loop automatically analyzes bottlenecks and generates verified-improvement design changes
- BOM generation and costing runs without any manual component lookup
- The QC defect inspector analyzes wafer images automatically in seconds vs. days for traditional lab analysis

**Agentic AI**
- IBM watsonx Orchestrate maintains a stateful agent with full design context across the entire session
- The agent can answer engineering questions, propose design alternatives, and explain trade-off reasoning
- Voice input (Watson STT) enables hands-free design querying on the fab floor
- The pipeline orchestrator tracks and coordinates all 8 stages with dependency management

**Digital Twin Simulation**
- The Fourier thermal model + Jacobi relaxation solver is a true physics-based digital twin of the chip thermal behavior
- Power, signal, and timing models run concurrently and feed the optimization loop
- Before-after verification ensures optimization changes actually improve the physics score — no hallucinated improvements

**Supply Chain Resilience**
- Geopolitical risk scoring quantifies concentration risk (TSMC Taiwan dependency)
- Diversification strategy engine calculates portfolio HHI and recommends multi-region fab splits
- Nearest-node alternative fab suggestions ensure designs can be routed to alternative foundries if primary is disrupted

**Process Optimization**
- DFM/DFT/DFY/DFR scoring identifies manufacturability improvements before design handoff
- The physical layout view reveals routing congestion patterns that cause yield loss in advanced nodes
- Carbon estimation by foundry location enables green manufacturing decisions

---

## Roadmap & Future Extensions

| Feature | Description | Priority |
|---|---|---|
| Real-time Watson STT mic button | Live voice transcription with streaming display | High |
| GDS-II export | Export the physical layout as a GDSII-compatible JSON | High |
| LVS/DRC rule check | Run layout-vs-schematic and design-rule checks on the physical layout | High |
| Multi-design comparison dashboard | Side-by-side PPCA radar for up to 4 designs | Medium |
| SPICE netlist generation | Export block-level SPICE netlist for circuit simulation | Medium |
| Timing closure assistant | Iterative Gemini loop targeting specific timing slack requirements | Medium |
| Foundry PDK integration | Pull real design rules from TSMC/GF open PDK for accurate DRC | Medium |
| Wafer map visualization | Render full wafer yield map from per-die simulation results | Medium |
| Cost optimization mode | Automatically resize blocks to minimize cost at target yield | Low |
| PostgreSQL production mode | Switch from SQLite to PostgreSQL for multi-user deployment | Low |
| Historical design database | Track designs over time, compare yield trends across iterations | Low |
| CI/CD integration | GitHub Action that runs the pipeline on every design file commit | Low |

---

## License

MIT — see `LICENSE` for details.

---

<div align="center">

Built with Google Gemini · IBM watsonx Orchestrate · IBM Watson TTS/STT · FastAPI · React 19 · D3.js

*Making semiconductor design intelligence accessible to every engineer.*

</div>
