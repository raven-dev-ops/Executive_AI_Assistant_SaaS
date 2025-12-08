from __future__ import annotations

import base64
import hmac
import json
import time
from hashlib import sha256
from typing import Tuple


def encode_state(business_id: str, provider: str, secret: str) -> str:
    payload = {"b": business_id, "p": provider, "ts": int(time.time())}
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    sig = hmac.new(secret.encode(), raw, sha256).digest()
    token = base64.urlsafe_b64encode(raw + b"." + sig).decode().rstrip("=")
    return token


def decode_state(state: str, secret: str) -> Tuple[str, str]:
    padded = state + "=" * (-len(state) % 4)
    raw = base64.urlsafe_b64decode(padded.encode())
    try:
        payload_raw, sig = raw.rsplit(b".", 1)
    except ValueError:
        raise ValueError("invalid_state_format")
    expected = hmac.new(secret.encode(), payload_raw, sha256).digest()
    if not hmac.compare_digest(expected, sig):
        raise ValueError("invalid_state_signature")
    payload = json.loads(payload_raw.decode())
    return payload.get("b"), payload.get("p")
