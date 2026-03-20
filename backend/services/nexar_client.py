"""
Live component pricing via Nexar (Octopart) API and Mouser Electronics API.

Nexar API (free tier — 1 000 queries/month):
  Sign up at https://nexar.com/api
  Set environment variables: NEXAR_CLIENT_ID, NEXAR_CLIENT_SECRET

Mouser Electronics API (free — API key only):
  Sign up at https://www.mouser.com/api-search/
  Set environment variable: MOUSER_API_KEY

If neither key is present the functions return None and the BOM engine
continues with its static catalog prices.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional

import httpx

from backend.config import get_settings

logger = logging.getLogger(__name__)

# ── Nexar (Octopart GraphQL) ──────────────────────────────────────────────────

_NEXAR_TOKEN_URL = "https://identity.nexar.com/connect/token"
_NEXAR_GRAPHQL   = "https://api.nexar.com/graphql"

_nexar_token: str = ""
_nexar_token_expires: float = 0.0
_nexar_lock = asyncio.Lock()

_NEXAR_QUERY = """
query ComponentSearch($mpn: String!) {
  supSearch(q: $mpn, limit: 1) {
    results {
      part {
        mpn
        manufacturer { name }
        shortDescription
        sellers(authorizedOnly: false) {
          company { name }
          offers {
            inventoryLevel
            prices {
              quantity
              price
              currency
            }
          }
        }
      }
    }
  }
}
"""


async def _get_nexar_token() -> Optional[str]:
    global _nexar_token, _nexar_token_expires
    settings = get_settings()
    if not settings.nexar_client_id or not settings.nexar_client_secret:
        return None

    async with _nexar_lock:
        if _nexar_token and time.time() < _nexar_token_expires - 30:
            return _nexar_token
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    _NEXAR_TOKEN_URL,
                    data={
                        "client_id":     settings.nexar_client_id,
                        "client_secret": settings.nexar_client_secret,
                        "grant_type":    "client_credentials",
                    },
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
            if resp.status_code != 200:
                logger.warning(f"Nexar token fetch failed: {resp.status_code}")
                return None
            data = resp.json()
            _nexar_token = data["access_token"]
            _nexar_token_expires = time.time() + data.get("expires_in", 3600)
            return _nexar_token
        except Exception as exc:
            logger.warning(f"Nexar token error: {exc}")
            return None


async def nexar_get_price(mpn: str) -> Optional[dict]:
    """
    Return {"unit_price": float, "availability": str, "supplier": str} or None.
    Picks the lowest 1-unit price from all sellers.
    """
    token = await _get_nexar_token()
    if not token:
        return None
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.post(
                _NEXAR_GRAPHQL,
                json={"query": _NEXAR_QUERY, "variables": {"mpn": mpn}},
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            )
        if resp.status_code != 200:
            logger.warning(f"Nexar query failed for {mpn}: {resp.status_code}")
            return None
        data = resp.json()
        results = data.get("data", {}).get("supSearch", {}).get("results", [])
        if not results:
            return None

        part = results[0]["part"]
        best_price: Optional[float] = None
        best_supplier = ""
        total_stock = 0

        for seller in part.get("sellers", []):
            company = seller.get("company", {}).get("name", "")
            for offer in seller.get("offers", []):
                total_stock += offer.get("inventoryLevel", 0)
                for price_tier in offer.get("prices", []):
                    if price_tier.get("currency") == "USD" and price_tier.get("quantity", 0) <= 10:
                        p = float(price_tier["price"])
                        if best_price is None or p < best_price:
                            best_price = p
                            best_supplier = company

        if best_price is None:
            return None

        availability = (
            "In Stock"   if total_stock > 1000 else
            "Low Stock"  if total_stock > 0    else
            "Out of Stock"
        )
        return {
            "unit_price":   round(best_price, 4),
            "availability": availability,
            "supplier":     best_supplier or "Nexar",
            "source":       "nexar_live",
        }

    except Exception as exc:
        logger.warning(f"Nexar price fetch error for {mpn}: {exc}")
        return None


# ── Mouser Electronics REST API ───────────────────────────────────────────────

_MOUSER_URL = "https://api.mouser.com/api/v1/search/partnumber"


async def mouser_get_price(mpn: str) -> Optional[dict]:
    """
    Return {"unit_price": float, "availability": str, "supplier": "Mouser"} or None.
    """
    settings = get_settings()
    if not settings.mouser_api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            resp = await client.post(
                _MOUSER_URL,
                params={"apiKey": settings.mouser_api_key},
                json={
                    "SearchByPartRequest": {
                        "mouserPartNumber": mpn,
                        "partSearchOptions": "string",
                    }
                },
                headers={"Content-Type": "application/json", "accept": "application/json"},
            )
        if resp.status_code != 200:
            return None
        data = resp.json()
        parts = data.get("SearchResults", {}).get("Parts", [])
        if not parts:
            return None

        part = parts[0]
        price_breaks = part.get("PriceBreaks", [])
        best_price: Optional[float] = None
        for pb in price_breaks:
            qty = int(pb.get("Quantity", 9999))
            if qty <= 10:
                raw = pb.get("Price", "").replace("$", "").replace(",", "").strip()
                try:
                    p = float(raw)
                    if best_price is None or p < best_price:
                        best_price = p
                except ValueError:
                    pass

        if best_price is None:
            return None

        availability_str = part.get("Availability", "")
        in_stock = int("".join(filter(str.isdigit, availability_str)) or "0")
        availability = (
            "In Stock"   if in_stock > 1000 else
            "Low Stock"  if in_stock > 0    else
            "Out of Stock"
        )
        return {
            "unit_price":   round(best_price, 4),
            "availability": availability,
            "supplier":     "Mouser",
            "source":       "mouser_live",
        }
    except Exception as exc:
        logger.warning(f"Mouser price fetch error for {mpn}: {exc}")
        return None


# ── Unified entry point ───────────────────────────────────────────────────────

async def get_live_price(mpn: str) -> Optional[dict]:
    """
    Try Nexar first, then Mouser.  Returns None if neither is configured or
    both fail — BOM engine will fall back to catalog price.
    """
    result = await nexar_get_price(mpn)
    if result is not None:
        return result
    return await mouser_get_price(mpn)


async def check_nexar_status() -> str:
    """Return 'ONLINE', 'NO KEY', or 'ERROR' for health checks."""
    settings = get_settings()
    if not settings.nexar_client_id:
        if settings.mouser_api_key:
            return "MOUSER_ONLY"
        return "NO KEY"
    token = await _get_nexar_token()
    return "ONLINE" if token else "ERROR"
