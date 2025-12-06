from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app import deps
from app.main import app
from app.repositories import appointments_repo, customers_repo


client = TestClient(app)


class _DummySettings:
    def __init__(self) -> None:
        self.owner_dashboard_token = "owner-token"
        self.require_business_api_key = False
        self.admin_api_key = None


def _seed_data() -> tuple[str, str]:
    appointments_repo._by_id.clear()
    appointments_repo._by_customer.clear()
    appointments_repo._by_business.clear()
    customers_repo._by_id.clear()
    customers_repo._by_phone.clear()
    customers_repo._by_business.clear()

    cust = customers_repo.upsert(
        name="Geo Customer",
        phone="555-0100",
        address="123 Main St, Kansas City, MO 64108",
        business_id="biz1",
    )
    start = datetime.now(UTC) + timedelta(hours=2)
    end = start + timedelta(hours=1)
    appt = appointments_repo.create(
        customer_id=cust.id,
        start_time=start,
        end_time=end,
        service_type="repair",
        is_emergency=True,
        business_id="biz1",
    )
    return cust.id, appt.id


def test_owner_geo_markers_returns_markers(monkeypatch) -> None:
    app.dependency_overrides[deps.require_owner_dashboard_auth] = lambda: None
    app.dependency_overrides[deps.ensure_business_active] = lambda: "biz1"
    monkeypatch.setattr(deps, "get_settings", lambda: _DummySettings())
    _seed_data()

    # Avoid real geocoding; return fixed coordinates.
    monkeypatch.setattr(
        "app.routers.owner.geocode_address", lambda addr: (39.0997, -94.5786)
    )

    try:
        resp = client.get(
            "/v1/owner/geo/markers?days=30",
            headers={"X-Owner-Token": "owner-token", "X-API-Key": "biz1"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["window_days"] == 30
        assert data["markers"]
        marker = data["markers"][0]
        assert marker["lat"] == 39.0997
        assert marker["is_emergency"] is True
    finally:
        app.dependency_overrides.clear()
