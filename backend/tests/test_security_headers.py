from fastapi.testclient import TestClient

from app.main import create_app


def test_security_headers_present_on_ok_response():
    app = create_app()
    client = TestClient(app)
    resp = client.get("/healthz")
    assert resp.status_code == 200
    headers = resp.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "Content-Security-Policy" in headers
    assert "Strict-Transport-Security" in headers


def test_security_headers_present_on_rate_limited_response():
    settings = create_app.__globals__["get_settings"]()
    settings.rate_limit_per_minute = 1
    settings.rate_limit_burst = 1
    settings.rate_limit_whitelist_ips = []
    app = create_app()
    client = TestClient(app, raise_server_exceptions=False)
    # Hit rate limit quickly with burst=1 default.
    client.post("/telephony/inbound", json={})
    resp = client.post("/telephony/inbound", json={})
    # Depending on burst/timing a second call may pass; force another immediately.
    if resp.status_code != 429:
        resp = client.post("/telephony/inbound", json={})
    assert resp.status_code == 429
    assert resp.headers.get("Retry-After")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert "Content-Security-Policy" in resp.headers
