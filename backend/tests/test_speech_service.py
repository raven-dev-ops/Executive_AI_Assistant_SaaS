import asyncio

from app.services.stt_tts import SpeechProvider, speech_service, StubSpeechProvider


class FailingProvider(SpeechProvider):
    name = "failing"

    async def transcribe(self, audio: str | None) -> str:
        raise RuntimeError("boom")

    async def synthesize(self, text: str, voice: str | None = None) -> str:
        raise RuntimeError("boom")


def test_speech_service_fallback_to_stub_on_failure():
    original_until = getattr(speech_service, "_circuit_open_until", None)
    speech_service._circuit_open_until = None
    speech_service.override_provider(FailingProvider())
    try:
        text = asyncio.run(speech_service.transcribe(None))
        assert text == ""
        diag = speech_service.diagnostics()
        assert diag["used_fallback"] is True
        assert diag["last_provider"] == "failing"
        assert diag["circuit_open"] is True

        # Reset circuit for next call so we also exercise synthesize fallback.
        speech_service._circuit_open_until = None
        audio = asyncio.run(speech_service.synthesize("hi"))
        assert audio.startswith("audio://")
        diag = speech_service.diagnostics()
        assert diag["used_fallback"] is True
        assert diag["last_provider"] == "failing"
        assert diag["circuit_open"] is True
    finally:
        speech_service.override_provider(None)
        speech_service._circuit_open_until = original_until


def test_speech_service_health_stub_provider():
    speech_service.override_provider(StubSpeechProvider())
    try:
        health = asyncio.run(speech_service.health())
        assert health["healthy"] is True
        assert health["provider"] == "stub"
    finally:
        speech_service.override_provider(None)
