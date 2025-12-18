from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.db import SQLALCHEMY_AVAILABLE, SessionLocal
from app.db_models import FeedbackDB
from app.main import app


client = TestClient(app)


def _require_db() -> None:
    if not (SQLALCHEMY_AVAILABLE and SessionLocal is not None):
        pytest.skip("SQLAlchemy not available for feedback tests")


def _clear_feedback() -> None:
    _require_db()
    session = SessionLocal()
    try:
        session.query(FeedbackDB).delete()
        session.commit()
    finally:
        session.close()


def test_submit_feedback_records_entry():
    _clear_feedback()
    summary = f"Beta bug {uuid4()}"
    resp = client.post(
        "/v1/feedback",
        json={
            "summary": summary,
            "category": "bug",
            "expected": "works",
            "actual": "fails",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["submitted"] is True

    session = SessionLocal()
    try:
        row = (
            session.query(FeedbackDB)
            .filter(FeedbackDB.summary == summary)
            .one_or_none()
        )
        assert row is not None
        assert row.category == "bug"
        assert row.business_id == "default_business"
    finally:
        session.close()


def test_admin_export_feedback():
    _clear_feedback()
    now = datetime.now(UTC)
    session = SessionLocal()
    try:
        session.add(
            FeedbackDB(  # type: ignore[call-arg]
                created_at=now,
                business_id="default_business",
                source="test",
                category="bug",
                summary="Export test",
                steps=None,
                expected=None,
                actual=None,
                call_sid=None,
                conversation_id=None,
                session_id=None,
                request_id=None,
                url=None,
                contact=None,
                user_agent=None,
            )
        )
        session.commit()
    finally:
        session.close()

    settings = get_settings()
    headers = (
        {"X-Admin-API-Key": settings.admin_api_key}
        if getattr(settings, "admin_api_key", None)
        else {}
    )
    resp = client.get("/v1/admin/feedback", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "feedback" in data
    assert any(item["summary"] == "Export test" for item in data["feedback"])
