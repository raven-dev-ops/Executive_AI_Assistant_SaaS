from datetime import datetime, UTC

import pytest
from fastapi.testclient import TestClient

from app.db import SQLALCHEMY_AVAILABLE, SessionLocal
from app.db_models import BusinessDB
from app.main import app, get_settings
from app.repositories import customers_repo

client = TestClient(app)

pytestmark = pytest.mark.skipif(
    not SQLALCHEMY_AVAILABLE, reason="Context switching tests require database support"
)


def _cleanup_business(business_id: str) -> None:
    if SessionLocal is None:
        return
    session = SessionLocal()
    try:
        row = session.get(BusinessDB, business_id)
        if row:
            session.delete(row)
            session.commit()
    finally:
        session.close()


def _reset_customers():
    # Tests use the in-memory repository by default; clear it between runs.
    for attr in ("_by_id", "_by_phone", "_by_business"):
        if hasattr(customers_repo, attr):
            store = getattr(customers_repo, attr)
            if isinstance(store, dict):
                store.clear()


def test_business_context_switch_isolates_data(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "owner_dashboard_token", "dash-token")

    # Clean slate.
    for biz_id in ("biz_a", "biz_b"):
        _cleanup_business(biz_id)
    _reset_customers()

    # Seed two businesses.
    assert SessionLocal is not None
    session = SessionLocal()
    now = datetime.now(UTC)
    try:
        for biz_id, name in (("biz_a", "Alpha"), ("biz_b", "Beta")):
            session.add(
                BusinessDB(
                    id=biz_id,
                    name=name,
                    status="ACTIVE",
                    created_at=now,
                )  # type: ignore[call-arg]
            )
        session.commit()
    finally:
        session.close()

    customers_repo.upsert(name="Alice", phone="+1000", business_id="biz_a")
    customers_repo.upsert(name="Bob", phone="+2000", business_id="biz_b")

    resp_a = client.get(
        "/v1/crm/customers",
        headers={"X-Owner-Token": "dash-token", "X-Business-ID": "biz_a"},
    )
    resp_b = client.get(
        "/v1/crm/customers",
        headers={"X-Owner-Token": "dash-token", "X-Business-ID": "biz_b"},
    )

    assert resp_a.status_code == 200
    assert resp_b.status_code == 200
    names_a = {c["name"] for c in resp_a.json()}
    names_b = {c["name"] for c in resp_b.json()}

    assert "Alice" in names_a and "Bob" not in names_a
    assert "Bob" in names_b and "Alice" not in names_b

    for biz_id in ("biz_a", "biz_b"):
        _cleanup_business(biz_id)
