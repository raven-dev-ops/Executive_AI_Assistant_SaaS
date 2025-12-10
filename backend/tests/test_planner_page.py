from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_planner_page_served():
    resp = client.get("/planner")
    assert resp.status_code == 200
    text = resp.text.lower()
    assert "<!doctype html" in text
    assert "ai telephony executive assistant" in text
