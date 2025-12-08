from __future__ import annotations

import hmac
import time
from hashlib import sha256
from typing import Dict, Tuple

from ..config import get_settings

_seen_events: Dict[str, float] = {}


class StripeSignatureError(Exception):
    pass


class StripeReplayError(Exception):
    pass


def _parse_signature_header(header: str) -> Tuple[int, str]:
    parts = header.split(",")
    ts = None
    sig = None
    for part in parts:
        if part.startswith("t="):
            try:
                ts = int(part[2:])
            except ValueError:
                continue
        elif part.startswith("v1="):
            sig = part[3:]
    if ts is None or not sig:
        raise StripeSignatureError("missing_fields")
    return ts, sig


def verify_stripe_signature(raw_body: bytes, header: str, secret: str) -> None:
    ts, sig = _parse_signature_header(header)
    signed_payload = f"{ts}.{raw_body.decode()}".encode()
    expected = hmac.new(secret.encode(), signed_payload, sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise StripeSignatureError("signature_mismatch")

    # Basic timestamp tolerance (default 5 minutes).
    tolerance = 300
    settings = get_settings().stripe
    if getattr(settings, "replay_protection_seconds", None):
        tolerance = int(settings.replay_protection_seconds)
    if abs(time.time() - ts) > tolerance:
        raise StripeReplayError("timestamp_out_of_window")


def check_replay(event_id: str, window_seconds: int) -> None:
    now = time.time()
    # Purge old entries opportunistically.
    expired = [eid for eid, ts in _seen_events.items() if now - ts > window_seconds]
    for eid in expired:
        _seen_events.pop(eid, None)
    if event_id in _seen_events:
        raise StripeReplayError("replayed_event")
    _seen_events[event_id] = now
