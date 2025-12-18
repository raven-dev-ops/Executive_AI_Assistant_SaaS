from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_dashboard_index_served() -> None:
    resp = client.get("/dashboard/index.html")
    assert resp.status_code == 200
    assert "AI Telephony" in resp.text


def test_dashboard_owner_assets_served() -> None:
    resp = client.get("/dashboard/owner/main.js")
    assert resp.status_code == 200
    assert "DEFAULT_BACKEND_BASE" in resp.text

    resp = client.get("/dashboard/owner/i18n.js")
    assert resp.status_code == 200
    assert "i18nStrings" in resp.text

    resp = client.get("/dashboard/owner/cards/subscription.js")
    assert resp.status_code == 200
    assert "initSubscriptionCard" in resp.text


def test_admin_dashboard_served() -> None:
    resp = client.get("/dashboard/admin.html")
    assert resp.status_code == 200
    assert "Admin Dashboard" in resp.text


def test_planner_dashboard_served() -> None:
    resp = client.get("/dashboard/planner.html")
    assert resp.status_code == 200
    assert "Investor Planner" in resp.text


def test_root_redirects_to_dashboard() -> None:
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code in (301, 302, 307, 308)
    assert resp.headers["location"].endswith("/dashboard/index.html")
