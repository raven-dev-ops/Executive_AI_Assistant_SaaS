from __future__ import annotations

import json
import logging
import os
import sys
from typing import Any, Dict

from .context import request_id_ctx


class RequestIdFilter(logging.Filter):
    """Attach request_id from contextvar when available."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            rid = request_id_ctx.get()
        except Exception:
            rid = None
        record.request_id = rid or "-"
        return True


def _ensure_request_id_filter(handler: logging.Handler) -> None:
    """Attach a single RequestIdFilter to the given handler."""

    if any(isinstance(f, RequestIdFilter) for f in handler.filters):
        return
    handler.addFilter(RequestIdFilter())


class JsonFormatter(logging.Formatter):
    """Lightweight JSON formatter for stdout logs."""

    def format(self, record: logging.LogRecord) -> str:  # type: ignore[override]
        payload: Dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        # Include request id if present (added by RequestIdFilter).
        if hasattr(record, "request_id"):
            payload["request_id"] = getattr(record, "request_id")
        # Include extra simple fields (ints/str/bool) if provided in log records.
        for key, value in record.__dict__.items():
            if key in payload or key.startswith("_"):
                continue
            if isinstance(value, (str, int, float, bool)):
                payload[key] = value
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    """Configure basic structured logging for the backend.

    This keeps things simple (stdout, single formatter) while including
    useful fields like level and logger name. In a real deployment,
    logs would typically be shipped to a central system.
    """
    root = logging.getLogger()
    if root.handlers:
        for handler in root.handlers:
            _ensure_request_id_filter(handler)
        return

    handler = logging.StreamHandler(sys.stdout)
    log_format = os.getenv("LOG_FORMAT", "plain").lower()
    if log_format == "json":
        formatter = JsonFormatter()
    else:
        formatter = logging.Formatter(
            fmt="%(asctime)s %(levelname)s %(name)s [request_id=%(request_id)s] %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
    handler.setFormatter(formatter)
    _ensure_request_id_filter(handler)
    root.addHandler(handler)
    root.setLevel(logging.INFO)
