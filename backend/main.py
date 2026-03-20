from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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
