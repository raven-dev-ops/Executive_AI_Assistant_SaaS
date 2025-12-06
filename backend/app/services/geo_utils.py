from __future__ import annotations

import re
import os
from typing import Tuple
import httpx
import math


ZIP_RE = re.compile(r"\b(\d{5})\b")
_GEOCODE_CACHE: dict[str, Tuple[float, float] | None] = {}


def derive_neighborhood_label(address: str | None) -> str:
    """Return a coarse neighborhood label derived from a free-form address.

    This is intentionally simple and used only for aggregated analytics:
    - Prefer a 5-digit sequence that looks like a postal/ZIP code.
    - Otherwise, if there is a comma, use the text after the last comma.
    - Fallback to "unspecified" when nothing reasonable can be inferred.
    """
    if not address:
        return "unspecified"
    text = str(address).strip()
    if not text:
        return "unspecified"

    m = ZIP_RE.search(text)
    if m:
        return m.group(1)

    if "," in text:
        tail = text.split(",")[-1].strip()
        if tail:
            return tail

    return "unspecified"


def geocode_address(address: str | None) -> Tuple[float, float] | None:
    """Best-effort geocoding using Google Maps Geocoding API if configured.

    Returns (lat, lng) on success, or None on failure/misconfiguration. Results
    are cached in-process to avoid repeated external calls for the same address.
    """
    if not address:
        return None
    addr = address.strip()
    if not addr:
        return None
    if addr in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[addr]

    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        _GEOCODE_CACHE[addr] = None
        return None

    try:
        resp = httpx.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": addr, "key": api_key},
            timeout=5.0,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != "OK":
            _GEOCODE_CACHE[addr] = None
            return None
        results = data.get("results") or []
        if not results:
            _GEOCODE_CACHE[addr] = None
            return None
        loc = results[0].get("geometry", {}).get("location", {})
        lat = loc.get("lat")
        lng = loc.get("lng")
        if lat is None or lng is None:
            _GEOCODE_CACHE[addr] = None
            return None
        coords = (float(lat), float(lng))
        _GEOCODE_CACHE[addr] = coords
        return coords
    except Exception:
        _GEOCODE_CACHE[addr] = None
        return None


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Return approximate kilometers between two (lat, lng) pairs."""
    (lat1, lon1), (lat2, lon2) = a, b
    R = 6371  # Earth radius km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    h = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    )
    return 2 * R * math.asin(math.sqrt(h))
