from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

router = APIRouter()

PLANNER_PATH = Path(__file__).resolve().parents[3] / "PLANNER.md"


def _load_planner_html() -> str:
    try:
        return PLANNER_PATH.read_text(encoding="utf-8")
    except Exception:
        raise HTTPException(
            status_code=404, detail="Planner document not found or unreadable"
        )


@router.get("/planner", response_class=HTMLResponse, tags=["planner"])
async def planner_brief() -> HTMLResponse:
    """Serve the investor planner/brief as a static HTML page."""
    html = _load_planner_html()
    return HTMLResponse(content=html, media_type="text/html")
