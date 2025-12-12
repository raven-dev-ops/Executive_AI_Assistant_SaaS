import os

import pytest
from fastapi.testclient import TestClient

from app import config, deps, main
from app.db import SQLALCHEMY_AVAILABLE, SessionLocal
from app.db_models import BusinessDB


def _fresh_client(env: dict[str, str]) -> TestClient:
    for k, v in env.items():
        os.environ[k] = v
    config.get_settings.cache_clear()
    deps.get_settings.cache_clear()
    app = main.create_app()
    return TestClient(app)


def _ensure_business():
    if not (SQLALCHEMY_AVAILABLE and SessionLocal is not None):
        return
    session = SessionLocal()
    try:
        row = session.get(BusinessDB, "default_business")
        if row is None:
            row = BusinessDB(  # type: ignore[call-arg]
                id="default_business", name="Default", status="ACTIVE"
            )
            session.add(row)
        session.commit()
    finally:
        session.close()


def test_rate_limit_blocks_after_burst(monkeypatch):
    client = _fresh_client(
        {
            "RATE_LIMIT_PER_MINUTE": "1",
            "RATE_LIMIT_BURST": "1",
            "RATE_LIMIT_DISABLED": "false",
        }
    )
    _ensure_business()
    first = client.post("/v1/widget/start", json={})
    assert first.status_code == 200

    second = client.post("/v1/widget/start", json={})
    assert second.status_code == 429
    assert "Retry-After" in second.headers


@pytest.mark.skipif(
    not (SQLALCHEMY_AVAILABLE and SessionLocal is not None),
    reason="Lockdown flag requires database support",
)
def test_lockdown_blocks_widget_requests(monkeypatch):
    client = _fresh_client(
        {
            "RATE_LIMIT_PER_MINUTE": "120",
            "RATE_LIMIT_BURST": "20",
            "RATE_LIMIT_DISABLED": "false",
        }
    )
    _ensure_business()
    session = SessionLocal()
    try:
        row = session.get(BusinessDB, "default_business")
        if row is None:
            row = BusinessDB(  # type: ignore[call-arg]
                id="default_business", name="LockdownBiz", status="ACTIVE"
            )
            session.add(row)
            session.flush()
        row.lockdown_mode = True  # type: ignore[assignment]
        session.commit()
    finally:
        session.close()

    resp = client.post("/v1/widget/start", json={})
    assert resp.status_code == 423
    assert "lockdown" in resp.text.lower()

    # Reset lockdown to avoid affecting other tests.
    session = SessionLocal()
    try:
        row = session.get(BusinessDB, "default_business")
        if row:
            row.lockdown_mode = False  # type: ignore[assignment]
            session.commit()
    finally:
        session.close()
