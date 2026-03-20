from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Any
import httpx
import json

from backend.database import get_db
from backend.config import get_settings
from backend.models.orchestration import OrchestrationOrder
from backend.schemas.orchestration import OrchestrationOrderResponse, PipelineStatusResponse
from backend.services.orchestrator import OrchestratorService

router = APIRouter()


# ─── Pipeline status ─────────────────────────────────────────────────────────

@router.get("/{design_id}/status", response_model=PipelineStatusResponse)
async def get_pipeline_status(design_id: int, db: AsyncSession = Depends(get_db)):
    service = OrchestratorService(db)
    status = await service.get_pipeline_status(design_id)
    return status


@router.get("/{design_id}/orders", response_model=list[OrchestrationOrderResponse])
async def list_orders(design_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OrchestrationOrder)
        .where(OrchestrationOrder.design_id == design_id)
        .order_by(OrchestrationOrder.created_at)
    )
    orders = result.scalars().all()
    return [OrchestrationOrderResponse.model_validate(o) for o in orders]


# ─── Watson Orchestrate chat ─────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    context: dict[str, Any] = {}
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    source: str


def build_context_prefix(ctx: dict[str, Any]) -> str:
    lines: list[str] = ["=== CHIP DESIGN CONTEXT ==="]

    arch = ctx.get("architecture")
    if arch:
        lines.append(f"\n[ARCHITECTURE]")
        lines.append(f"Name: {arch.get('name', 'N/A')}")
        lines.append(f"Process Node: {arch.get('process_node', 'N/A')}")
        lines.append(f"Total Power: {arch.get('total_power_mw', 'N/A')} mW")
        lines.append(f"Die Area: {arch.get('total_area_mm2', 'N/A')} mm²")
        lines.append(f"Metal Layers: {arch.get('metal_layers', 'N/A')}")
        blocks = arch.get("blocks", [])
        if blocks:
            lines.append(f"Blocks ({len(blocks)}):")
            for b in blocks[:12]:
                conns = ", ".join(b.get("connections", [])[:4])
                lines.append(
                    f"  - {b.get('name')} [{b.get('type')}]: "
                    f"{b.get('power_mw')} mW, {b.get('area_mm2')} mm²"
                    + (f", connects→{conns}" if conns else "")
                )

    sim = ctx.get("simulation")
    if sim:
        lines.append(f"\n[SIMULATION]")
        lines.append(f"Overall Score: {sim.get('overall_score', 'N/A')}/100  Status: {sim.get('pass_fail', 'N/A')}")
        tz = sim.get("thermal_zones", [])
        if tz:
            lines.append(f"Thermal Zones ({len(tz)}):")
            for z in tz[:6]:
                lines.append(f"  - {z.get('block')}: {z.get('temp_c')}°C [{z.get('status')}]")
        lines.append(f"Power: total={sim.get('total_power_mw')} mW  dynamic={sim.get('dynamic_power_mw')} mW  static={sim.get('static_power_mw')} mW  efficiency={sim.get('power_efficiency_pct')}%")
        lines.append(f"Timing: max_clock={sim.get('max_clock_mhz')} MHz  critical_path={sim.get('critical_path_delay_ns')} ns  met={sim.get('timing_met')}")
        lines.append(f"Signal: worst_integrity={sim.get('worst_integrity_score')}")

    opt = ctx.get("optimization")
    if opt:
        lines.append(f"\n[OPTIMIZATION]")
        lines.append(f"Iteration: {opt.get('iteration')}  Improvement: {opt.get('improvement_pct')}%")
        ppca_b = opt.get("ppca_before", {})
        ppca_a = opt.get("ppca_after", {})
        if ppca_b or ppca_a:
            lines.append(
                f"PPCA Before → After: "
                f"power {ppca_b.get('power','?')}→{ppca_a.get('power','?')}  "
                f"perf {ppca_b.get('performance','?')}→{ppca_a.get('performance','?')}  "
                f"cost {ppca_b.get('cost','?')}→{ppca_a.get('cost','?')}  "
                f"area {ppca_b.get('area','?')}→{ppca_a.get('area','?')}"
            )
        changes = opt.get("changes_summary", [])
        if changes:
            lines.append("Changes:")
            for c in changes[:8]:
                lines.append(f"  - {c}")

    bom = ctx.get("bom")
    if bom:
        lines.append(f"\n[BILL OF MATERIALS]")
        lines.append(f"Components: {bom.get('component_count')}  Total BOM cost: ${bom.get('total_bom_cost')}  Per-unit: ${bom.get('cost_per_unit')}")
        long_lead = bom.get("long_lead_parts", [])
        if long_lead:
            lines.append("Long lead-time parts:")
            for p in long_lead[:5]:
                lines.append(f"  - {p.get('description')} ({p.get('part_number')}): {p.get('lead_time_days')} days [{p.get('availability')}]")

    sc = ctx.get("supply_chain")
    if sc:
        lines.append(f"\n[SUPPLY CHAIN]")
        fabs = sc.get("fab_recommendations", [])
        if fabs:
            lines.append("Top Fab Recommendations:")
            for f in fabs[:3]:
                lines.append(
                    f"  - {f.get('name')} ({f.get('location')}): "
                    f"score={f.get('overall_score')}  risk={f.get('risk_score')}  "
                    f"${f.get('cost_per_wafer')}/wafer"
                )
        geo = sc.get("geo_risks", [])
        if geo:
            lines.append("Geopolitical Risks:")
            for g in geo[:3]:
                lines.append(f"  - {g.get('region')}: {g.get('risk_level')} — {g.get('factors')}")

    yield_data = ctx.get("yield")
    if yield_data:
        lines.append(f"\n[YIELD & FORECAST]")
        lines.append(
            f"Yield: {yield_data.get('yield_pct')}% "
            f"(range {yield_data.get('yield_low_pct')}–{yield_data.get('yield_high_pct')}%)  "
            f"Defect density: {yield_data.get('defect_density_per_cm2')}/cm²  "
            f"Good dies/wafer: {yield_data.get('good_dies_per_wafer')}"
        )
        dzones = ctx.get("defect_zones", [])
        if dzones:
            lines.append("Defect Zone Risks:")
            for dz in dzones[:4]:
                lines.append(f"  - {dz.get('block_name')}: {dz.get('risk_level')} (score={dz.get('risk_score')})")

    lines.append("\n=== END CONTEXT ===\n")
    return "\n".join(lines)


async def _call_watson_orchestrate(message: str, context_prefix: str, settings) -> str:
    api_key = settings.watson_orchestrate_api_key
    orch_url = settings.watson_orchestrate_url
    instance_id = settings.watson_orchestrate_instance_id

    if not api_key or not orch_url or not instance_id:
        raise ValueError("Watson Orchestrate not configured")

    async with httpx.AsyncClient(timeout=30) as client:
        iam_resp = await client.post(
            "https://iam.cloud.ibm.com/identity/token",
            data={"apikey": api_key, "grant_type": "urn:ibm:params:oauth:grant-type:apikey"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        iam_resp.raise_for_status()
        token = iam_resp.json()["access_token"]

        base = orch_url.rstrip("/")
        sess_resp = await client.post(
            f"{base}/instances/{instance_id}/v2/assistants/default/sessions",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        )
        if sess_resp.status_code not in (200, 201):
            raise ValueError(f"Session error {sess_resp.status_code}: {sess_resp.text}")
        session_id = sess_resp.json()["session_id"]

        full_message = f"{context_prefix}\nUser question: {message}"
        msg_resp = await client.post(
            f"{base}/instances/{instance_id}/v2/assistants/default/sessions/{session_id}/message",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"input": {"text": full_message}},
        )
        msg_resp.raise_for_status()
        data = msg_resp.json()
        output = data.get("output", {})
        texts = [r.get("text", "") for r in output.get("generic", []) if r.get("response_type") == "text"]
        return " ".join(texts).strip() or "No response from agent."


def _physics_fallback_response(message: str, ctx: dict[str, Any]) -> str:
    msg_lower = message.lower()
    arch = ctx.get("architecture", {})
    sim = ctx.get("simulation", {})
    opt = ctx.get("optimization", {})
    bom = ctx.get("bom", {})

    if any(w in msg_lower for w in ["power", "watt", "mw", "energy"]):
        total = arch.get("total_power_mw") or sim.get("total_power_mw", "unknown")
        return (
            f"The current design consumes {total} mW total. "
            f"Dynamic power is {sim.get('dynamic_power_mw', 'N/A')} mW and "
            f"static leakage is {sim.get('static_power_mw', 'N/A')} mW. "
            "To reduce power, consider voltage scaling, clock gating, or reducing block frequencies."
        )
    if any(w in msg_lower for w in ["thermal", "temperature", "heat", "hot"]):
        zones = sim.get("thermal_zones", [])
        hot = next((z for z in zones if z.get("status") in ("CRITICAL", "WARNING")), None)
        if hot:
            return (
                f"The {hot.get('block')} block is running at {hot.get('temp_c')}°C ({hot.get('status')}). "
                "Consider adding heat spreading, reducing clock frequency for that block, or improving substrate thermal conductivity."
            )
        return "Thermal profile looks acceptable — no critical hotspots detected."
    if any(w in msg_lower for w in ["yield", "defect", "wafer"]):
        y = ctx.get("yield", {})
        return (
            f"Predicted yield is {y.get('yield_pct', 'N/A')}% "
            f"(range {y.get('yield_low_pct', '?')}–{y.get('yield_high_pct', '?')}%) "
            f"with defect density {y.get('defect_density_per_cm2', 'N/A')}/cm². "
            f"Expect {y.get('good_dies_per_wafer', 'N/A')} good dies per wafer."
        )
    if any(w in msg_lower for w in ["cost", "bom", "price", "budget", "expensive"]):
        return (
            f"The BOM covers {bom.get('component_count', 'N/A')} components. "
            f"Per-unit cost is ${bom.get('cost_per_unit', 'N/A')} with total BOM cost ${bom.get('total_bom_cost', 'N/A')}. "
            "Long lead-time parts are the main supply chain risk."
        )
    if any(w in msg_lower for w in ["optimiz", "improv", "better", "ppca"]):
        imp = opt.get("improvement_pct", 0)
        changes = opt.get("changes_summary", [])
        return (
            f"Optimization achieved {imp}% improvement. "
            + ("Key changes: " + "; ".join(changes[:3]) + "." if changes else "No optimization data yet.")
        )
    if any(w in msg_lower for w in ["timing", "clock", "frequency", "mhz", "delay"]):
        return (
            f"Max clock frequency is {sim.get('max_clock_mhz', 'N/A')} MHz. "
            f"Critical path delay is {sim.get('critical_path_delay_ns', 'N/A')} ns. "
            f"Timing constraints are {'met' if sim.get('timing_met') else 'violated'}."
        )
    if any(w in msg_lower for w in ["architecture", "block", "design"]):
        name = arch.get("name", "your design")
        blocks = arch.get("blocks", [])
        return (
            f"{name} uses {arch.get('process_node', 'N/A')} process with {len(blocks)} functional blocks "
            f"across {arch.get('total_area_mm2', 'N/A')} mm² die area. "
            f"Total power budget: {arch.get('total_power_mw', 'N/A')} mW."
        )
    return (
        "I can help you analyze your chip design. Ask me about power consumption, "
        "thermal profile, yield predictions, BOM costs, timing, or architecture trade-offs. "
        "For full AI-assisted answers, configure the IBM Watson Orchestrate integration."
    )


@router.post("/chat", response_model=ChatResponse)
async def orchestrate_chat(req: ChatRequest):
    settings = get_settings()
    context_prefix = build_context_prefix(req.context)

    try:
        reply = await _call_watson_orchestrate(req.message, context_prefix, settings)
        return ChatResponse(reply=reply, source="watson_orchestrate")
    except Exception as e:
        err = str(e)
        if "not configured" not in err.lower():
            pass
        reply = _physics_fallback_response(req.message, req.context)
        return ChatResponse(reply=reply, source="physics_fallback")
