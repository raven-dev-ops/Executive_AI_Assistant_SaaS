from __future__ import annotations

import json
import logging
import os
import threading
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


@dataclass
class FeedbackEntry:
    created_at: datetime
    business_id: str
    source: str | None
    category: str | None
    summary: str
    steps: str | None
    expected: str | None
    actual: str | None
    call_sid: str | None
    conversation_id: str | None
    session_id: str | None
    request_id: str | None
    contact: str | None
    url: str | None
    user_agent: str | None


class FeedbackStore:
    """Thread-safe append-only feedback store with optional JSONL persistence."""

    def __init__(self, path: str | None = None) -> None:
        self._path = path or os.getenv("FEEDBACK_LOG_PATH", "feedback.jsonl")
        self._lock = threading.Lock()
        self._entries: List[FeedbackEntry] = []
        # Best-effort load existing entries if the file exists.
        if os.path.exists(self._path):
            try:
                with open(self._path, "r", encoding="utf-8") as f:
                    for line in f:
                        entry = self._parse_line(line)
                        if entry is not None:
                            self._entries.append(entry)
            except Exception:
                # Ignore load failures to avoid blocking requests.
                self._entries = []

    def _parse_line(self, line: str) -> FeedbackEntry | None:
        try:
            obj = json.loads(line)
            return FeedbackEntry(
                created_at=datetime.fromisoformat(obj.get("created_at")),
                business_id=obj.get("business_id") or "unknown",
                source=obj.get("source"),
                category=obj.get("category"),
                summary=obj.get("summary") or "",
                steps=obj.get("steps"),
                expected=obj.get("expected"),
                actual=obj.get("actual"),
                call_sid=obj.get("call_sid"),
                conversation_id=obj.get("conversation_id"),
                session_id=obj.get("session_id"),
                request_id=obj.get("request_id"),
                contact=obj.get("contact"),
                url=obj.get("url"),
                user_agent=obj.get("user_agent"),
            )
        except Exception:
            return None

    def append(self, entry: FeedbackEntry) -> None:
        with self._lock:
            self._entries.append(entry)
            try:
                with open(self._path, "a", encoding="utf-8") as f:
                    serializable = asdict(entry)
                    serializable["created_at"] = entry.created_at.isoformat()
                    f.write(json.dumps(serializable) + "\n")
            except Exception:
                # Persistence failures are logged by caller if needed; do not raise.
                logger.warning(
                    "feedback_persist_failed",
                    exc_info=True,
                    extra={"path": self._path, "business_id": entry.business_id},
                )

    def list(
        self,
        *,
        business_id: str | None = None,
        source: str | None = None,
        category: str | None = None,
        call_sid: str | None = None,
        conversation_id: str | None = None,
        session_id: str | None = None,
        request_id: str | None = None,
        since: datetime | None = None,
        limit: int = 200,
    ) -> List[Dict[str, Any]]:
        with self._lock:
            items = list(self._entries)
        if business_id:
            items = [e for e in items if e.business_id == business_id]
        if source:
            items = [e for e in items if (e.source or "") == source]
        if category:
            items = [e for e in items if (e.category or "") == category]
        if call_sid:
            items = [e for e in items if (e.call_sid or "") == call_sid]
        if conversation_id:
            items = [e for e in items if (e.conversation_id or "") == conversation_id]
        if session_id:
            items = [e for e in items if (e.session_id or "") == session_id]
        if request_id:
            items = [e for e in items if (e.request_id or "") == request_id]
        if since:
            items = [e for e in items if e.created_at >= since]
        items.sort(key=lambda e: e.created_at, reverse=True)
        return [
            {
                "created_at": e.created_at.isoformat(),
                "business_id": e.business_id,
                "source": e.source,
                "category": e.category,
                "summary": e.summary,
                "steps": e.steps,
                "expected": e.expected,
                "actual": e.actual,
                "call_sid": e.call_sid,
                "conversation_id": e.conversation_id,
                "session_id": e.session_id,
                "request_id": e.request_id,
                "contact": e.contact,
                "url": e.url,
                "user_agent": e.user_agent,
            }
            for e in items[:limit]
        ]


feedback_store = FeedbackStore()
