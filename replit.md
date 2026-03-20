# SiliconSentinel Pro

AI-assisted semiconductor design platform with an 8-step workflow covering architecture generation, digital twin simulation, optimization, BOM/cost analysis, supply chain intelligence, manufacturing forecast, and quality control.

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind CSS, port 5173 (proxied via Vite dev server)
- **Backend**: FastAPI (Python), port 8000, auto-reload with uvicorn
- **Database**: SQLite via SQLAlchemy async (`siliconsentinel.db`)

## Workflows

- `Start application` — `npm run dev` (Vite, port 5173)
- `Start Backend` — `python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload`

## AI Integrations

| Service | Env Var | Status |
|---------|---------|--------|
| Google Gemini | `GEMINI_API_KEY` | Optional — physics fallback if missing |
| IBM watsonx Orchestrate | `WATSON_ORCHESTRATE_API_KEY`, `WATSON_ORCHESTRATE_URL`, `WATSON_ORCHESTRATE_INSTANCE_ID`, `WATSON_ORCHESTRATE_AGENT_ID` | Chat endpoint — falls back to AI Co-Pilot |
| IBM Watson Neural TTS | `WATSON_TTS_API_KEY`, `WATSON_TTS_URL` | Text-to-speech in AccessibilityToolbar |

## Key Files

```
backend/
  main.py                        # FastAPI app, CORS, routes
  config.py                      # Settings (pydantic-settings, reads env vars)
  database.py                    # Async SQLite setup
  models/                        # SQLAlchemy ORM models
  schemas/                       # Pydantic request/response schemas
  routers/
    designs.py                   # POST /api/designs, simulate, optimize, BOM, supply-chain
    orchestration.py             # Watson Orchestrate chat + AI Co-Pilot fallback
    predictions.py               # Yield/manufacturing forecast
    accessibility.py             # TTS, accessibility prefs
  services/
    ai_provider.py               # Gemini + PhysicsProvider fallback (8 domain templates)
    supply_chain.py              # Supply chain intelligence
    orchestrator.py              # Pipeline orchestration status

src/
  App.tsx                        # 8-step wizard — main orchestrator
  types.ts                       # All TypeScript interfaces
  services/api.ts                # Axios API client
  components/
    ArchitectureViewer.tsx       # D3 SVG floorplan — drag (zoom-aware dx/dy), bezier wiring
    ThermalHeatmap.tsx           # Canvas heatmap — normalized block positions, hover tooltip
    BOMTable.tsx                 # BOM table + Budget/Balanced/Premium scenario tabs
    SimulationResults.tsx        # Simulation metrics + industry benchmark bars by process node
    OptimizationView.tsx         # PPCA before/after visualization
    YieldForecast.tsx            # Yield prediction + defect zones
    ChatPanel.tsx                # Chat UI using /api/orchestration/chat
    OrchestrationStatus.tsx      # Pipeline step progress
    RiskMap.tsx                  # Leaflet geopolitical risk map
    SupplierCards.tsx            # Fab recommendation cards
    QualityControl.tsx           # Step 8 — image upload for defect detection
    AccessibilityToolbar.tsx     # TTS, color modes
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/designs` | Generate chip architecture (step 1) |
| POST | `/api/designs/{id}/simulate` | Run digital twin simulation (step 3) |
| POST | `/api/designs/{id}/optimize` | AI optimization (step 4) |
| POST | `/api/designs/{id}/bom` | Bill of Materials & cost (step 5) |
| GET | `/api/designs/{id}/supply-chain` | Supply chain analysis (step 6) |
| GET | `/api/designs/{id}/predictions` | Manufacturing forecast / yield (step 7) |
| POST | `/api/orchestration/chat` | AI Co-Pilot chat (Watson Orchestrate + fallback) |
| GET | `/api/health/detailed` | System health status |

## Watson Orchestrate Chat

The chat endpoint tries Watson Orchestrate at:
`{WATSON_ORCHESTRATE_URL}/instances/{WATSON_ORCHESTRATE_INSTANCE_ID}/v2/assistants/{WATSON_ORCHESTRATE_AGENT_ID}/sessions`

If Watson Orchestrate is unavailable (wrong URL format, network error, etc.), it falls back to the "AI Co-Pilot" — a physics-based context-aware response engine that covers power, thermal, yield, BOM, timing, optimization, and supply chain questions using actual design data from the session context.

**Note**: The configured `WATSON_ORCHESTRATE_URL` should be the **API endpoint**, not the web UI URL. For IBM Watson Orchestrate SaaS, the correct API URL format is typically `https://api.{region}.assistant.watson.cloud.ibm.com`.

## Industry Benchmarks (SimulationResults)

Process-node benchmark comparisons are built in for: 5nm, 7nm, 14nm, 28nm, 65nm, 180nm.
Metrics compared: power density (mW/mm²), max clock (MHz), static leakage %, junction temperature.

## Physics Fallback (ai_provider.py)

`PhysicsProvider` generates realistic chip architectures without Gemini API key, using 7 domain templates (IoT, Mobile, Automotive, AI/ML, RF, Server, General). All 8 pipeline steps work without any external API keys.
