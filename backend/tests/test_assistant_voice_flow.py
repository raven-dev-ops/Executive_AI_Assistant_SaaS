from fastapi.testclient import TestClient

from app.main import app
from app.repositories import conversations_repo
from app.services.twilio_state import twilio_state_store
from app.services import sessions


client = TestClient(app)


def test_twilio_voice_flow_keeps_context_and_records_conversation():
    twilio_state_store.clear_call_session("CALL_E2E")
    # Initial webhook to start the gather/assistant flow.
    resp1 = client.post(
        "/twilio/voice",
        data={
            "CallSid": "CALL_E2E",
            "From": "+15556667777",
            "CallStatus": "in-progress",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp1.status_code == 200
    assert "<Gather" in resp1.text

    # Send a speech turn; this should be bridged into the assistant and keep the same session.
    resp2 = client.post(
        "/twilio/voice",
        data={
            "CallSid": "CALL_E2E",
            "From": "+15556667777",
            "CallStatus": "in-progress",
            "SpeechResult": "book me tomorrow morning",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp2.status_code == 200
    assert "<Gather" in resp2.text

    link = twilio_state_store.get_call_session("CALL_E2E")
    assert link is not None
    session = sessions.session_store.get(link.session_id)
    assert session is not None
    conv = conversations_repo.get_by_session(link.session_id)
    assert conv is not None
    # Expect at least a user + assistant message captured.
    assert len(conv.messages) >= 2
    assert any(m.role == "user" for m in conv.messages)
    assert any(m.role == "assistant" for m in conv.messages)
