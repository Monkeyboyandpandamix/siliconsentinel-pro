from contextlib import asynccontextmanager
import os

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    upload_dir = get_settings().upload_dir
    os.makedirs(upload_dir, exist_ok=True)
    yield


app = FastAPI(
    title="SiliconSentinel Pro API",
    description="End-to-end semiconductor design & manufacturing platform",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.routers import designs, simulation, optimization, prediction, bom, supply_chain, quality, orchestration, accessibility, extended  # noqa: E402

app.include_router(designs.router, prefix="/api/designs", tags=["Designs"])
app.include_router(simulation.router, prefix="/api/designs", tags=["Simulation"])
app.include_router(optimization.router, prefix="/api/designs", tags=["Optimization"])
app.include_router(prediction.router, prefix="/api/designs", tags=["Prediction"])
app.include_router(bom.router, prefix="/api/designs", tags=["BOM"])
app.include_router(supply_chain.router, prefix="/api/designs", tags=["Supply Chain"])
app.include_router(quality.router, prefix="/api/designs", tags=["Quality"])
app.include_router(extended.router, prefix="/api/designs", tags=["Extended"])
app.include_router(orchestration.router, prefix="/api/orchestration", tags=["Orchestration"])
app.include_router(accessibility.router, prefix="/api/accessibility", tags=["Accessibility"])


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "SiliconSentinel Pro",
        "version": "2.0.0",
        "ai_provider": get_settings().ai_provider,
    }


async def _probe_watson_tts(settings) -> str:
    if not settings.watson_tts_api_key or not settings.watson_tts_url:
        return "NO KEY"
    try:
        tts_url = settings.watson_tts_url.rstrip("/")
        async with httpx.AsyncClient(timeout=6) as client:
            resp = await client.get(
                f"{tts_url}/v1/voices",
                auth=("apikey", settings.watson_tts_api_key),
            )
        return "ONLINE" if resp.status_code == 200 else f"ERROR {resp.status_code}"
    except Exception:
        return "ERROR"


async def _probe_watson_orchestrate(settings) -> str:
    if not settings.watson_orchestrate_api_key:
        return "NO KEY"
    if not settings.watson_orchestrate_url or not settings.watson_orchestrate_instance_id:
        return "NO KEY"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            iam_resp = await client.post(
                "https://iam.cloud.ibm.com/identity/token",
                data={
                    "apikey": settings.watson_orchestrate_api_key,
                    "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        if iam_resp.status_code != 200:
            return "AUTH ERROR"
        return "ONLINE"
    except Exception:
        return "ERROR"


async def _probe_gemini(settings) -> str:
    if not settings.gemini_api_key:
        return "NO KEY"
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            resp = await client.get(
                "https://generativelanguage.googleapis.com/v1beta/models",
                params={"key": settings.gemini_api_key},
            )
        return "ONLINE" if resp.status_code == 200 else "ERROR"
    except Exception:
        return "ERROR"


@app.get("/api/health/detailed")
async def health_detailed():
    settings = get_settings()
    tts_status, orch_status, gemini_status = await _probe_watson_tts(settings), \
        await _probe_watson_orchestrate(settings), \
        await _probe_gemini(settings)

    return {
        "backend": "ONLINE",
        "gemini": gemini_status,
        "watson_orchestrate": orch_status,
        "watson_tts": tts_status,
        "simulation_core": "ONLINE",
        "component_catalog": "ONLINE",
        "supply_chain_db": "ONLINE",
    }
