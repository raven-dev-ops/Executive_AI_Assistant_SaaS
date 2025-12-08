import os
from functools import lru_cache
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from google.cloud import storage


@lru_cache
def get_bucket_name() -> str:
    bucket = os.getenv("DASH_BUCKET", "ai-telephony-dash-poc-mpf-dmxmytcubly9")
    if not bucket:
        raise RuntimeError("DASH_BUCKET not configured")
    return bucket


@lru_cache
def get_storage_client() -> storage.Client:
    return storage.Client()


def authorize(request: Request) -> None:
    # Require at least one of the existing app auth headers.
    allowed_headers = ("x-admin-api-key", "x-owner-token", "x-api-key")
    for hdr in allowed_headers:
        if request.headers.get(hdr):
            return
    raise HTTPException(status_code=401, detail="Missing required auth header")


app = FastAPI(title="Dashboard Proxy", version="1.0.0")


def _fetch_object(path: str) -> bytes:
    client = get_storage_client()
    bucket = client.bucket(get_bucket_name())
    blob = bucket.blob(path)
    if not blob.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return blob.download_as_bytes()


def _content_type(path: str) -> str:
    if path.endswith(".html"):
        return "text/html; charset=utf-8"
    if path.endswith(".js"):
        return "application/javascript; charset=utf-8"
    if path.endswith(".css"):
        return "text/css; charset=utf-8"
    if path.endswith(".json"):
        return "application/json; charset=utf-8"
    if path.endswith(".svg"):
        return "image/svg+xml"
    if path.endswith(".png"):
        return "image/png"
    if path.endswith(".jpg") or path.endswith(".jpeg"):
        return "image/jpeg"
    return "application/octet-stream"


def _serve(path: str) -> Response:
    data = _fetch_object(path)
    return Response(content=data, media_type=_content_type(path))


@app.get("/")
async def root(request: Request):
    authorize(request)
    return _serve("index.html")


@app.get("/owner")
async def owner(request: Request):
    authorize(request)
    return _serve("index.html")


@app.get("/admin")
async def admin(request: Request):
    authorize(request)
    return _serve("admin.html")


@app.get("/{path:path}")
async def catch_all(path: str, request: Request):
    authorize(request)
    # prevent directory traversal
    cleaned = path.lstrip("/").replace("..", "")
    if not cleaned:
        cleaned = "index.html"
    return _serve(cleaned)
