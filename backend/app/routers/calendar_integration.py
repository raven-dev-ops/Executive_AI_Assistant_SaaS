from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.calendar import calendar_service


router = APIRouter()


class CalendarWebhookPayload(BaseModel):
    business_id: str | None = None
    event_id: str
    status: str | None = None
    start: str | None = None
    end: str | None = None
    summary: str | None = None
    description: str | None = None
    updated_at: datetime | None = None


@router.post("/google/webhook")
async def google_calendar_webhook(payload: CalendarWebhookPayload) -> dict:
    """Handle inbound Google Calendar notifications (best-effort sync).

    This endpoint is designed to be used with Google push notifications or
    other webhook relays. It updates matching appointments when a calendar
    event changes or is cancelled. When no matching appointment is found,
    the request succeeds with processed=False to avoid retries.
    """
    if not payload.event_id:
        raise HTTPException(status_code=400, detail="event_id is required")

    processed = await calendar_service.handle_inbound_update(
        business_id=payload.business_id,
        event_id=payload.event_id,
        status=payload.status,
        start=payload.start,
        end=payload.end,
        summary=payload.summary,
        description=payload.description,
    )
    return {"processed": bool(processed)}
