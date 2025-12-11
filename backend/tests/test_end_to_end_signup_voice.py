import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.db import SessionLocal
from app.db_models import BusinessDB
from app.services.twilio_state import twilio_state_store
from app.services import sessions
from app.repositories import conversations_repo


client = TestClient(app)


def test_signup_to_voice_assistant_flow():
    """End-to-end: signup -> set owner contact -> Twilio voice call -> assistant responses recorded."""
    email = f"voice-{uuid.uuid4().hex[:8]}@example.com"
    password = "VoicePass!1"

    reg = client.post("/v1/auth/register", json={"email": email, "password": password})
    assert reg.status_code == 200
    login = client.post("/v1/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200

    # Ensure owner contact info exists for alerts (not strictly required for the flow).
    session = SessionLocal()
    try:
        row = session.get(BusinessDB, "default_business")
        if row is None:
            row = BusinessDB(  # type: ignore[call-arg]
                id="default_business", name="Voice Tenant", status="ACTIVE"
            )
            session.add(row)
        row.owner_phone = "+15551234567"
        row.owner_email = email
        session.add(row)
        session.commit()
    finally:
        session.close()

    # Start a Twilio voice call; should return a Gather and create a session link.
    call_sid = "CALL_E2E_VOICE"
    twilio_state_store.clear_call_session(call_sid)

    resp1 = client.post(
        "/twilio/voice",
        data={
            "CallSid": call_sid,
            "From": "+15550123456",
            "CallStatus": "in-progress",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp1.status_code == 200
    assert "<Gather" in resp1.text

    # Send a speech result; conversation should capture user + assistant.
    resp2 = client.post(
        "/twilio/voice",
        data={
            "CallSid": call_sid,
            "From": "+15550123456",
            "CallStatus": "in-progress",
            "SpeechResult": "book an appointment tomorrow",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp2.status_code == 200
    assert "<Gather" in resp2.text

    link = twilio_state_store.get_call_session(call_sid)
    assert link is not None
    session_obj = sessions.session_store.get(link.session_id)
    assert session_obj is not None
    conv = conversations_repo.get_by_session(link.session_id)
    assert conv is not None
    assert any(m.role == "user" for m in conv.messages)
    assert any(m.role == "assistant" for m in conv.messages)
