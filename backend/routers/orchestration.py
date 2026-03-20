from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Any
import asyncio
import base64
import httpx
import json
import logging
import time

from backend.database import get_db
from backend.config import get_settings
from backend.limiter import limiter
from backend.models.orchestration import OrchestrationOrder
from backend.schemas.orchestration import OrchestrationOrderResponse, PipelineStatusResponse
from backend.services.orchestrator import OrchestratorService
from backend.semiconductor.process_nodes import PROCESS_NODES

router = APIRouter()
logger = logging.getLogger(__name__)


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


async def _get_iam_token(api_key: str) -> str:
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            "https://iam.cloud.ibm.com/identity/token",
            data={"apikey": api_key, "grant_type": "urn:ibm:params:oauth:grant-type:apikey"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


def _orch_is_wxo_saas_host(orch_url: str) -> bool:
    """True for IBM watsonx Orchestrate SaaS (WxO Server API), not legacy Watson Assistant v2."""
    return "watson-orchestrate." in orch_url.lower()


def _normalize_wxo_url(orch_url: str) -> str:
    """
    Accept both:
      - https://us-south.watson-orchestrate.cloud.ibm.com
      - https://api.us-south.watson-orchestrate.cloud.ibm.com

    IBM docs use the former as the {api_endpoint}; the latter often breaks
    health/proxy paths.
    """
    u = orch_url.strip()
    if "://" not in u:
        return u
    scheme, rest = u.split("://", 1)
    if rest.lower().startswith("api."):
        rest = rest[4:]
    return f"{scheme}://{rest}"


def _wxo_api_base(orch_url: str) -> str:
    orch_url = _normalize_wxo_url(orch_url)
    return f"{orch_url.rstrip('/')}/api"


def _text_from_wxo_content_blocks(content: list[Any]) -> str:
    parts: list[str] = []
    for block in content:
        if not isinstance(block, dict):
            continue
        if block.get("response_type") == "text":
            for key in ("text", "message", "body", "plain_text", "value"):
                v = block.get(key)
                if isinstance(v, str) and v.strip():
                    parts.append(v.strip())
                    break
            fd = block.get("form_data")
            if isinstance(fd, dict):
                for key in ("text", "message", "content", "answer"):
                    v = fd.get(key)
                    if isinstance(v, str) and v.strip():
                        parts.append(v.strip())
        for key in ("text", "message"):
            v = block.get(key)
            if isinstance(v, str) and v.strip():
                parts.append(v.strip())
    return " ".join(parts).strip()


def _reply_from_wxo_thread_messages(messages: list[Any]) -> str:
    best = ""
    for msg in reversed(messages):
        if not isinstance(msg, dict):
            continue
        role = (msg.get("role") or "").lower()
        if role not in ("assistant", "agent", "system", "bot"):
            continue
        raw = msg.get("content")
        if isinstance(raw, str) and raw.strip():
            candidate = raw.strip()
        elif isinstance(raw, list):
            candidate = _text_from_wxo_content_blocks(raw)
        else:
            candidate = ""
        if len(candidate) > len(best):
            best = candidate
    return best


def _reply_from_wxo_run_result(result: Any) -> str:
    if result is None:
        return ""
    if isinstance(result, str) and result.strip():
        return result.strip()
    if isinstance(result, dict):
        for key in ("text", "message", "answer", "output", "content"):
            v = result.get(key)
            if isinstance(v, str) and v.strip():
                return v.strip()
            if isinstance(v, list):
                t = _text_from_wxo_content_blocks(v)
                if t:
                    return t
    return ""


async def _wxo_fetch_run_status(
    client: httpx.AsyncClient,
    base_api: str,
    headers: dict[str, str],
    assistant_id: str,
    run_id: str,
) -> tuple[dict[str, Any] | None, int]:
    """GET run status; WxO may expose either assistants or orchestrate path."""
    urls = [
        f"{base_api}/v1/assistants/{assistant_id}/runs/{run_id}",
        f"{base_api}/v1/orchestrate/runs/{run_id}",
    ]
    last_status = 404
    for url in urls:
        resp = await client.get(url, headers=headers)
        last_status = resp.status_code
        if resp.status_code == 404:
            continue
        if resp.status_code != 200:
            return None, resp.status_code
        data = resp.json()
        if isinstance(data, dict):
            return data, 200
    return None, last_status


async def _poll_wxo_assistant_run(
    client: httpx.AsyncClient,
    base_api: str,
    headers: dict[str, str],
    assistant_id: str,
    run_id: str,
    *,
    max_wait_s: float = 90.0,
    interval_s: float = 0.75,
) -> dict[str, Any]:
    deadline = time.monotonic() + max_wait_s
    while time.monotonic() < deadline:
        data, http_st = await _wxo_fetch_run_status(client, base_api, headers, assistant_id, run_id)
        if data is None:
            if http_st not in (404,):
                logger.warning(f"WxO get run: HTTP {http_st}")
            await asyncio.sleep(interval_s)
            continue
        status = str(data.get("status") or "").lower()
        if status in ("completed", "async_completed"):
            return data
        if status in ("failed", "cancelled", "expired"):
            err = data.get("last_error") or str(data.get("result"))[:500]
            raise ValueError(f"Watson Orchestrate run {status}: {err}")
        await asyncio.sleep(interval_s)
    raise ValueError("Watson Orchestrate run timed out — no completed status from assistant run")


async def _poll_wxo_thread_for_reply(
    client: httpx.AsyncClient,
    base_api: str,
    headers: dict[str, str],
    thread_id: str,
    *,
    max_wait_s: float = 75.0,
    interval_s: float = 1.0,
) -> str:
    deadline = time.monotonic() + max_wait_s
    while time.monotonic() < deadline:
        resp = await client.get(
            f"{base_api}/v1/threads/{thread_id}/messages",
            headers=headers,
        )
        if resp.status_code == 200:
            msg_list = resp.json()
            if isinstance(msg_list, list):
                reply = _reply_from_wxo_thread_messages(msg_list)
                if reply:
                    return reply
        await asyncio.sleep(interval_s)
    return ""


async def _call_wxo_server_api(
    client: httpx.AsyncClient,
    orch_url: str,
    token: str,
    agent_id: str,
    full_message: str,
) -> str:
    """
    IBM watsonx Orchestrate SaaS (WxO Server API under /api/v1/...).
    See: https://developer.watson-orchestrate.ibm.com/
    """
    base_api = _wxo_api_base(orch_url)
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    body: dict[str, Any] = {"message": {"role": "user", "content": full_message}}

    run_url = f"{base_api}/v1/assistants/{agent_id}/runs"
    run_resp = await client.post(run_url, headers=headers, json=body)
    if run_resp.status_code not in (200, 201):
        orch = await client.post(
            f"{base_api}/v1/orchestrate/runs",
            headers=headers,
            json={**body, "agent_id": agent_id},
            params={"stream": "false"},
        )
        if orch.status_code not in (200, 201):
            raise ValueError(
                f"WxO run failed: assistants HTTP {run_resp.status_code}, "
                f"orchestrate HTTP {orch.status_code} — {orch.text[:350]}"
            )
        run_resp = orch

    run_data = run_resp.json() if run_resp.content else {}
    if not isinstance(run_data, dict):
        raise ValueError("WxO run: unexpected non-JSON response")

    run_id = run_data.get("run_id") or run_data.get("id")
    thread_id = run_data.get("thread_id")

    if run_id:
        try:
            final = await _poll_wxo_assistant_run(client, base_api, headers, agent_id, str(run_id))
            reply = _reply_from_wxo_run_result(final.get("result"))
            if reply:
                return reply
            thread_id = final.get("thread_id") or thread_id
        except ValueError as e:
            logger.warning(f"WxO run polling ended without inline result: {e}")

    if thread_id:
        reply = await _poll_wxo_thread_for_reply(client, base_api, headers, str(thread_id))
        if reply:
            return reply

    raise ValueError("WxO returned no assistant text — check agent_id and IBM Cloud IAM access to Orchestrate")


async def _call_watson_orchestrate(message: str, context_prefix: str, history: list, settings) -> str:
    api_key = settings.watson_orchestrate_api_key
    orch_url = settings.watson_orchestrate_url.rstrip("/")
    instance_id = settings.watson_orchestrate_instance_id
    agent_id = (settings.watson_orchestrate_agent_id or "").strip()

    if not api_key:
        raise ValueError("Watson Orchestrate API key not configured")
    if not orch_url:
        raise ValueError("Watson Orchestrate URL not configured")

    wxo_saas = _orch_is_wxo_saas_host(orch_url)
    if wxo_saas:
        if not agent_id:
            raise ValueError(
                "WATSON_ORCHESTRATE_AGENT_ID is required for *.watson-orchestrate.* URLs (registered agent UUID)"
            )
    elif not instance_id:
        raise ValueError("Watson Orchestrate Instance ID not configured")

    token = await _get_iam_token(api_key)
    full_message = f"{context_prefix}\nUser question: {message}"

    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        if wxo_saas:
            return await _call_wxo_server_api(client, orch_url, token, agent_id, full_message)

        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        assistant_id = agent_id if agent_id else "default"

        region = "us-south"
        if "us-east" in orch_url:
            region = "us-east"
        elif "eu-de" in orch_url:
            region = "eu-de"
        elif "eu-gb" in orch_url:
            region = "eu-gb"
        elif "au-syd" in orch_url:
            region = "au-syd"

        base_candidates = [
            f"https://api.{region}.assistant.watson.cloud.ibm.com/instances/{instance_id}",
            f"{orch_url}/instances/{instance_id}",
            orch_url,
        ]

        session_id: str | None = None
        working_base: str | None = None

        for base in base_candidates:
            sess_path = f"{base}/v2/assistants/{assistant_id}/sessions"
            try:
                sess_resp = await client.post(sess_path, headers=headers)
                if sess_resp.status_code in (200, 201):
                    data = sess_resp.json()
                    if isinstance(data, dict) and "session_id" in data:
                        session_id = data["session_id"]
                        working_base = base
                        logger.info(f"Watson Assistant v2 session created at {sess_path}")
                        break
                    logger.warning(
                        f"Assistant v2 session {sess_path}: HTTP 200 but no session_id — body: {sess_resp.text[:200]}"
                    )
                else:
                    logger.warning(
                        f"Assistant v2 session {sess_path}: HTTP {sess_resp.status_code} — {sess_resp.text[:200]}"
                    )
            except ValueError as e:
                logger.warning(f"Assistant v2 session {sess_path}: JSON parse error — {e}")
            except Exception as e:
                logger.warning(f"Assistant v2 session {sess_path}: {e}")
                continue

        if not session_id or not working_base:
            raise ValueError("Could not create Watson Assistant session — check URL, instance ID, and agent ID")

        msg_path = f"{working_base}/v2/assistants/{assistant_id}/sessions/{session_id}/message"
        msg_payload = {
            "input": {
                "message_type": "text",
                "text": full_message,
                "options": {"return_context": True},
            }
        }

        msg_resp = await client.post(msg_path, headers=headers, json=msg_payload)
        logger.info(f"Assistant v2 message response: HTTP {msg_resp.status_code}")

        if msg_resp.status_code != 200:
            raise ValueError(
                f"Watson Orchestrate message failed: HTTP {msg_resp.status_code} — {msg_resp.text[:300]}"
            )

        data = msg_resp.json()
        output = data.get("output", {})

        texts = []
        for r in output.get("generic", []):
            if r.get("response_type") == "text" and r.get("text"):
                texts.append(r["text"])

        reply = " ".join(texts).strip()
        if not reply:
            reply = output.get("text", "")
        if not reply:
            reply = "I processed your request but received an empty response from the agent."

        return reply


def _smart_fallback_response(message: str, ctx: dict[str, Any]) -> str:
    """
    Intelligent physics-based fallback when Watson Orchestrate is unavailable.
    Provides detailed, context-aware answers about the chip design.
    """
    msg_lower = message.lower()
    arch = ctx.get("architecture", {})

    if any(
        w in msg_lower
        for w in (
            "process node",
            "process nodes",
            "technology node",
            "what nodes",
            "supported node",
            "which nodes",
            "pdk",
        )
    ):
        nodes = sorted(
            PROCESS_NODES.keys(),
            key=lambda k: float(k[:-2]) if k.endswith("nm") and k[:-2].replace(".", "").isdigit() else 9999.0,
        )
        return (
            "SiliconSentinel supports these process nodes for architecture, simulation, and yield models: "
            f"{', '.join(nodes)}. "
            "Finer nodes (smaller nm) improve density and performance but increase cost and leakage sensitivity; "
            "mature nodes are better for cost-sensitive, analog-heavy, or high-voltage designs."
        )

    sim = ctx.get("simulation", {})
    opt = ctx.get("optimization", {})
    bom_ctx = ctx.get("bom", {})
    yield_ctx = ctx.get("yield", {})
    sc = ctx.get("supply_chain", {})

    blocks = arch.get("blocks", [])
    process_node = arch.get("process_node", "N/A")
    total_power = arch.get("total_power_mw") or sim.get("total_power_mw", 0)

    # Power questions
    if any(w in msg_lower for w in ["power", "watt", "mw", "energy", "leakage", "dynamic"]):
        dyn = sim.get("dynamic_power_mw", "N/A")
        static = sim.get("static_power_mw", "N/A")
        eff = sim.get("power_efficiency_pct")
        hungry = sorted(blocks, key=lambda b: b.get("power_mw", 0), reverse=True)[:2]
        hungry_str = ", ".join(f"{b.get('name')} ({b.get('power_mw', 0):.0f} mW)" for b in hungry)
        response = (
            f"Your {process_node} design draws {total_power:.0f} mW total — "
            f"{dyn} mW dynamic + {static} mW static leakage. "
        )
        if eff:
            response += f"Power efficiency is {eff:.0f}%. "
        if hungry_str:
            response += f"Largest consumers: {hungry_str}. "
        response += (
            "To reduce power: apply clock gating on idle blocks, reduce VDD by 10% "
            f"(cuts dynamic power ∝ V²), or gate the memory array when not accessed."
        )
        return response

    # Thermal questions
    if any(w in msg_lower for w in ["thermal", "temperature", "heat", "hot", "junction", "cooling"]):
        zones = sim.get("thermal_zones", [])
        critical = [z for z in zones if z.get("status") in ("CRITICAL", "WARNING")]
        max_temp = max((z.get("temp_c", 0) for z in zones), default=0)
        if critical:
            hotspot = critical[0]
            return (
                f"Thermal alert: {hotspot.get('block')} is at {hotspot.get('temp_c')}°C "
                f"({hotspot.get('status')}). Max junction temperature across the die is {max_temp:.0f}°C. "
                "Mitigation: add copper heat spreader, reduce block activity during thermal throttle, "
                "or increase metal layer thermal vias under the hot block. "
                "For automotive/industrial designs, target <125°C junction per AEC-Q100."
            )
        return (
            f"Thermal profile is healthy — max temperature {max_temp:.0f}°C across {len(zones)} monitored zones. "
            f"All blocks within operating limits for {process_node}."
        )

    # Yield questions
    if any(w in msg_lower for w in ["yield", "defect", "wafer", "manufacturing", "fabrication"]):
        y_pct = yield_ctx.get("yield_pct", "N/A")
        y_low = yield_ctx.get("yield_low_pct", "?")
        y_high = yield_ctx.get("yield_high_pct", "?")
        dpw = yield_ctx.get("good_dies_per_wafer", "N/A")
        dd = yield_ctx.get("defect_density_per_cm2", "N/A")
        return (
            f"Predicted manufacturing yield: {y_pct}% (confidence range {y_low}–{y_high}%). "
            f"Expect {dpw} good dies per {process_node} wafer at defect density {dd}/cm². "
            "Yield is primarily limited by die area — smaller dies pack more per wafer. "
            "To improve: reduce redundant routing, apply DFM rules, or use a more mature process node."
        )

    # Cost / BOM questions
    if any(w in msg_lower for w in ["cost", "bom", "price", "budget", "expensive", "cheap", "component"]):
        comp_count = bom_ctx.get("component_count", "N/A")
        per_unit = bom_ctx.get("cost_per_unit", "N/A")
        bom_total = bom_ctx.get("total_bom_cost", "N/A")
        long_lead = bom_ctx.get("long_lead_parts", [])
        response = (
            f"The BOM covers {comp_count} components. "
            f"Per-unit cost (including fab, packaging, test, overhead): ${per_unit}. "
            f"Raw BOM cost is ${bom_total}. "
        )
        if long_lead:
            top = long_lead[0]
            response += (
                f"Critical lead-time bottleneck: {top.get('description')} "
                f"({top.get('lead_time_days')} days, {top.get('availability')}). "
                "Order long-lead parts immediately to avoid schedule slip."
            )
        return response

    # Optimization / PPCA questions
    if any(w in msg_lower for w in ["optim", "improv", "better", "ppca", "tradeoff", "reduce"]):
        imp = opt.get("improvement_pct", 0)
        changes = opt.get("changes_summary", [])
        ppca_b = opt.get("ppca_before", {})
        ppca_a = opt.get("ppca_after", {})
        response = f"Optimization achieved {imp:.1f}% overall improvement. "
        if ppca_b and ppca_a:
            response += (
                f"PPCA shift: power {ppca_b.get('power', '?')}→{ppca_a.get('power', '?')} | "
                f"performance {ppca_b.get('performance', '?')}→{ppca_a.get('performance', '?')} | "
                f"cost {ppca_b.get('cost', '?')}→{ppca_a.get('cost', '?')} | "
                f"area {ppca_b.get('area', '?')}→{ppca_a.get('area', '?')}. "
            )
        if changes:
            response += "Applied changes: " + "; ".join(changes[:3]) + "."
        else:
            response += "Run optimization with a specific focus (power, area, or performance) to see targeted improvements."
        return response

    # Timing / frequency questions
    if any(w in msg_lower for w in ["timing", "clock", "frequency", "mhz", "delay", "slack", "setup", "hold"]):
        max_clk = sim.get("max_clock_mhz", "N/A")
        cp_delay = sim.get("critical_path_delay_ns", "N/A")
        timing_met = sim.get("timing_met", None)
        slack = sim.get("setup_slack_ns", None)
        response = (
            f"Maximum achievable clock: {max_clk} MHz (critical path delay: {cp_delay} ns). "
            f"Timing constraints are {'✓ met' if timing_met else '✗ violated'}. "
        )
        if slack is not None:
            response += f"Setup slack: {'+' if slack >= 0 else ''}{slack:.3f} ns. "
        if not timing_met:
            response += (
                "To fix timing: reduce combinational logic depth on critical paths, "
                "add pipeline registers to break long chains, or reduce target clock frequency."
            )
        return response

    # Architecture / blocks questions
    if any(w in msg_lower for w in ["architecture", "block", "floorplan", "design", "structure", "layout"]):
        name = arch.get("name", "your chip")
        area = arch.get("total_area_mm2", "N/A")
        metal = arch.get("metal_layers", "N/A")
        return (
            f"{name} is a {process_node} design with {len(blocks)} functional blocks "
            f"across {area} mm² die area and {metal} metal routing layers. "
            f"Blocks: {', '.join(b.get('name', '') for b in blocks[:5])}{'...' if len(blocks) > 5 else ''}. "
            "The architecture was generated to match your domain and constraints. "
            "Use the floorplan viewer to drag blocks and explore timing-critical routing paths."
        )

    # Supply chain questions
    if any(w in msg_lower for w in ["supply", "fab", "foundry", "tsmc", "geopolit", "risk", "sourcing"]):
        fabs = sc.get("fab_recommendations", [])
        geo = sc.get("geo_risks", [])
        if fabs:
            top_fab = fabs[0]
            return (
                f"Top recommended fab: {top_fab.get('name')} ({top_fab.get('location')}) — "
                f"overall score {top_fab.get('overall_score')}/100, risk score {top_fab.get('risk_score')}/100. "
                + (f"Geopolitical risks: {', '.join(g.get('region') + ' (' + g.get('risk_level') + ')' for g in geo[:3])}. " if geo else "")
                + "Dual-sourcing between geographically diverse fabs mitigates concentration risk."
            )
        return "Run the supply chain analysis step to get fab recommendations and geopolitical risk assessment."

    # General / no context
    if not ctx:
        return (
            "I'm your SiliconSentinel AI Co-Pilot. "
            "Generate a chip architecture first, then ask me about:\n"
            "• Power consumption and efficiency\n"
            "• Thermal hotspots and cooling\n"
            "• Manufacturing yield and defect risk\n"
            "• BOM costs and lead times\n"
            "• Timing closure and critical paths\n"
            "• Supply chain and fab recommendations"
        )

    return (
        "I can analyze your chip design in detail. Ask me about power, thermals, yield, "
        "BOM costs, timing closure, architecture trade-offs, or supply chain risks."
    )


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/minute")
async def orchestrate_chat(request: Request, req: ChatRequest):
    settings = get_settings()

    # Guard against very large inputs to reduce prompt injection surface
    if len(req.message) > 2000:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Message too long — maximum 2000 characters.")

    try:
        context_prefix = build_context_prefix(req.context)
    except Exception as e:
        logger.warning("Chat context build failed, continuing without prefix: %s", e)
        context_prefix = ""

    try:
        reply = await _call_watson_orchestrate(req.message, context_prefix, req.history, settings)
        return ChatResponse(reply=reply, source="watson_orchestrate")
    except Exception as e:
        logger.warning(f"Watson Orchestrate unavailable, using fallback: {e}")
        try:
            reply = _smart_fallback_response(req.message, req.context)
        except Exception as fb_e:
            logger.warning(f"Fallback chat failed: {fb_e}")
            reply = (
                "I'm running in limited mode. Generate a design, then ask about power, thermals, "
                "yield, BOM, timing, or supply chain — or configure IBM watsonx Orchestrate in .env."
            )
        return ChatResponse(reply=reply, source="ai_co_pilot")


# ─── Watson STT transcription ─────────────────────────────────────────────────

class TranscribeResponse(BaseModel):
    transcript: str
    confidence: float
    source: str


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio using IBM Watson Speech-to-Text.
    Accepts WebM/Opus (browser MediaRecorder default) or WAV.
    Falls back gracefully if Watson STT is not configured.
    """
    settings = get_settings()
    api_key = settings.watson_stt_api_key
    stt_url = settings.watson_stt_url.rstrip("/") if settings.watson_stt_url else ""

    audio_bytes = await audio.read()

    if api_key and stt_url:
        try:
            content_type = audio.content_type or "audio/webm"
            if "webm" in content_type or "ogg" in content_type:
                watson_content_type = "audio/webm;codecs=opus"
            elif "wav" in content_type:
                watson_content_type = "audio/wav"
            elif "mp4" in content_type or "mp3" in content_type:
                watson_content_type = "audio/mp3"
            else:
                watson_content_type = "audio/webm;codecs=opus"

            credentials = base64.b64encode(f"apikey:{api_key}".encode()).decode()

            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{stt_url}/v1/recognize",
                    headers={
                        "Authorization": f"Basic {credentials}",
                        "Content-Type": watson_content_type,
                    },
                    content=audio_bytes,
                    params={
                        "model": "en-US_BroadbandModel",
                        "smart_formatting": "true",
                        "profanity_filter": "false",
                        "max_alternatives": "1",
                    },
                )
                resp.raise_for_status()
                data = resp.json()

            results = data.get("results", [])
            if results:
                alt = results[0].get("alternatives", [{}])[0]
                transcript = alt.get("transcript", "").strip()
                confidence = float(alt.get("confidence", 0.9))
                return TranscribeResponse(
                    transcript=transcript,
                    confidence=confidence,
                    source="watson_stt",
                )
            return TranscribeResponse(transcript="", confidence=0.0, source="watson_stt")

        except Exception as e:
            logger.warning(f"Watson STT error: {e} — returning empty transcript")
            return TranscribeResponse(transcript="", confidence=0.0, source="watson_stt_error")

    # Watson not configured — inform the client to use browser Web Speech API
    return TranscribeResponse(
        transcript="",
        confidence=0.0,
        source="browser_fallback",
    )
