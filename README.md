# SiliconSentinel Pro

SiliconSentinel Pro is a semiconductor manufacturing and supply chain intelligence demo built with React, Vite, and Express. It combines architecture planning with fab-oriented analysis such as predictive maintenance signals, process excursion tracking, digital twin operations metrics, BOM planning, and supply resilience scoring.

## What It Does

- Creates a semiconductor architecture from a product prompt and engineering constraints
- Simulates thermal and operational readiness metrics
- Surfaces richer benchmark data with targets, trends, deltas, and notes
- Adds manufacturing-track panels for:
  - Predictive maintenance
  - Process excursion intelligence
  - Fab digital twin operations
  - Supply resilience planning
- Embeds an IBM watsonx Orchestrate chat widget in the app shell

## Current Architecture

- Frontend: React 19 + Vite
- Host server: Express via [`server.mjs`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/server.mjs)
- Charts and visualization: Recharts, D3, Leaflet
- Chat UI: IBM watsonx Orchestrate embed
- Local analysis engine: deterministic manufacturing and architecture logic in:
  - [`src/services/geminiService.ts`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/services/geminiService.ts)
  - [`src/services/manufacturingInsights.ts`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/services/manufacturingInsights.ts)

## Main Screens

1. Define
   Capture product intent, node, and application domain.
2. Architect
   Generate and edit the architecture blueprint.
3. Simulate
   Review thermal behavior, benchmark detail, fab ops metrics, and process intelligence.
4. Supply
   Review BOM, supplier concentration, carbon impact, and supply resilience.

## Run Locally

### Prerequisites

- Node.js 20+ recommended
- npm

### Install

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Open:

- [http://localhost:3000](http://localhost:3000)

### Build Production Assets

```bash
npm run build
```

### Start Production Server

```bash
NODE_ENV=production npm start
```

## Verification Commands

```bash
npm run lint
npm run build
```

These verify:

- TypeScript validity
- Production bundle generation

## IBM Chat Integration

The app includes an IBM watsonx Orchestrate embedded chat panel in [`src/components/AIAssistant.tsx`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/components/AIAssistant.tsx).

### Important

The app shell is wired for IBM chat, but a fully working live IBM assistant still depends on your IBM tenant configuration. In practice you may still need:

- a valid `agentId`
- a valid `agentEnvironmentId`
- IBM embedded chat security setup
- a live deployed IBM agent

If the widget does not load, check the browser console first.

## Notable Files

- [`src/App.tsx`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/App.tsx)
- [`server.mjs`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/server.mjs)
- [`src/components/AIAssistant.tsx`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/components/AIAssistant.tsx)
- [`src/components/BenchpressList.tsx`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/components/BenchpressList.tsx)
- [`src/components/FabOpsPanel.tsx`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/components/FabOpsPanel.tsx)
- [`src/components/ProcessControlPanel.tsx`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/components/ProcessControlPanel.tsx)
- [`src/components/DigitalTwinOpsPanel.tsx`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/components/DigitalTwinOpsPanel.tsx)
- [`src/components/SupplyResiliencePanel.tsx`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/components/SupplyResiliencePanel.tsx)
- [`src/services/geminiService.ts`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/services/geminiService.ts)
- [`src/services/manufacturingInsights.ts`](/Users/mohammadaghamohammadi/Desktop/siliconsentinel-pro/src/services/manufacturingInsights.ts)

## Known Limitations

- The IBM chat embed is integrated, but live validation still depends on IBM-side configuration.
- The architecture and manufacturing analysis flows are local deterministic logic, not live fab data ingestion.
- The production bundle is still relatively large and could benefit from code splitting.

## Suggested Next Steps

- Add IBM env-based configuration instead of hardcoded chat values
- Add live manufacturing datasets or CSV ingestion for tool telemetry and lot history
- Add authentication and IBM chat security token handling
- Add exportable reports for fab ops and supply-chain review
