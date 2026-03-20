from contextlib import asynccontextmanager
import asyncio
import os

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from backend.config import get_settings
from backend.database import init_db
from backend.limiter import limiter


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

# Rate-limiting middleware — default 200 req/min per IP, tighter limits on expensive endpoints
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    # allow_credentials requires explicit origin list, not ["*"].
    # We do not send cookies or Authorization headers cross-origin, so False is correct.
    allow_credentials=False,
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
    except Exception as e:
        return f"ERROR {type(e).__name__}"


async def _probe_watson_orchestrate(settings) -> str:
    if not settings.watson_orchestrate_api_key:
        return "NO KEY"
    if not settings.watson_orchestrate_url:
        return "NO KEY"
    orch_url = settings.watson_orchestrate_url.rstrip("/")
    wxo_saas = "watson-orchestrate." in orch_url.lower()
    # Normalize IBM WxO SaaS base URL to match IBM docs patterns.
    # Some configs use https://api.<region>.watson-orchestrate.cloud.ibm.com which
    # can break /api/v1/... paths; removing the leading `api.` fixes it.
    if "://" in orch_url:
        scheme, rest = orch_url.split("://", 1)
        if rest.lower().startswith("api."):
            orch_url = f"{scheme}://{rest[4:]}"
    if wxo_saas:
        if not (settings.watson_orchestrate_agent_id or "").strip():
            return "NO AGENT ID"
    elif not settings.watson_orchestrate_instance_id:
        return "NO KEY"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            if wxo_saas:
                alive = await client.get(f"{orch_url}/api/v1/health/alive")
                # Some IBM deployments require auth on /health/alive and return 401/403.
                # If the host is reachable and the service responds, we treat that as ONLINE.
                if alive.status_code not in (200, 401, 403):
                    return f"ERROR {alive.status_code}"
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
    except Exception as e:
        return f"ERROR {type(e).__name__}"


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
    from backend.services.nexar_client import check_nexar_status
    settings = get_settings()
    tts_status, orch_status, gemini_status, nexar_status = await asyncio.gather(
        _probe_watson_tts(settings),
        _probe_watson_orchestrate(settings),
        _probe_gemini(settings),
        check_nexar_status(),
    )

    return {
        "backend": "ONLINE",
        "gemini": gemini_status,
        "watson_orchestrate": orch_status,
        "watson_tts": tts_status,
        "simulation_core": "ONLINE",
        "component_catalog": "ONLINE",
        "supply_chain_db": "ONLINE",
        "live_component_pricing": nexar_status,
    }
