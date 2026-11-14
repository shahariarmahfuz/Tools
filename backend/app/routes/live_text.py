import re
import secrets
import string
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from app.config import MAX_TEXT_LENGTH
from app.db import db_session, utc_now
from app.ws_manager import room_manager

router = APIRouter(prefix="/api/tools/live-text", tags=["live-text"])
ws_router = APIRouter(tags=["live-text-ws"])

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-_]{1,48}[a-z0-9]$")


def _generate_slug() -> str:
    alphabet = string.ascii_lowercase + string.digits
    suffix = "".join(secrets.choice(alphabet) for _ in range(6))
    return f"room-{suffix}"


def _normalize_slug(raw: str) -> str:
    return raw.strip().lower().replace(" ", "-")


def _iso(value) -> str:
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _serialize_endpoint(row: dict) -> dict:
    presence = room_manager.get_presence(row["slug"])
    return {
        "id": row["id"],
        "slug": row["slug"],
        "title": row["title"],
        "content": row["content"],
        "access_mode": "public_rw",
        "owner_id": 0,
        "owner_username": "Open",
        "is_owner": False,
        "can_edit": True,
        "active_count": presence["active_count"],
        "updated_at": _iso(row["updated_at"]),
        "created_at": _iso(row["created_at"]),
    }


def _serialize_snapshot(row: dict) -> dict:
    return {
        "id": row["id"],
        "content": row["content"],
        "saved_by": row["saved_by"],
        "created_at": _iso(row["created_at"]),
    }


class CreateEndpointRequest(BaseModel):
    title: str = Field(default="Live Text Room", min_length=1, max_length=80)
    slug: Optional[str] = Field(default=None, max_length=50)
    initial_content: str = Field(default="", max_length=MAX_TEXT_LENGTH)


class UpdateContentRequest(BaseModel):
    content: str = Field(..., max_length=MAX_TEXT_LENGTH)
    sender_name: Optional[str] = Field(default=None, max_length=32)


class SaveSnapshotRequest(BaseModel):
    content: Optional[str] = Field(default=None, max_length=MAX_TEXT_LENGTH)
    saved_by: Optional[str] = Field(default=None, max_length=32)


@router.get("/endpoints")
def list_recent_endpoints():
    with db_session() as conn:
        rows = conn.execute(
            """
            SELECT * FROM endpoints
            ORDER BY updated_at DESC
            LIMIT 25
            """
        ).fetchall()
    return {"endpoints": [_serialize_endpoint(row) for row in rows]}


@router.post("/endpoints", status_code=status.HTTP_201_CREATED)
def create_endpoint(body: CreateEndpointRequest):
    slug = _normalize_slug(body.slug) if body.slug and body.slug.strip() else _generate_slug()
    if not SLUG_RE.match(slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room slug must be 3-50 chars (lowercase letters, numbers, - or _)",
        )

    now = utc_now()
    title = body.title.strip()

    with db_session() as conn:
        existing = conn.execute(
            "SELECT * FROM endpoints WHERE slug = %s",
            (slug,),
        ).fetchone()
        if existing:
            return {"endpoint": _serialize_endpoint(existing)}

        row = conn.execute(
            """
            INSERT INTO endpoints (slug, title, content, access_mode, updated_at, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (slug, title, body.initial_content, "public_rw", now, now),
        ).fetchone()

    return {"endpoint": _serialize_endpoint(row)}


@router.get("/endpoints/{slug}")
def get_endpoint(slug: str):
    slug = _normalize_slug(slug)
    with db_session() as conn:
        row = conn.execute(
            "SELECT * FROM endpoints WHERE slug = %s",
            (slug,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
        snapshots = conn.execute(
            """
            SELECT id, content, saved_by, created_at
            FROM endpoint_snapshots
            WHERE endpoint_id = %s
            ORDER BY id DESC
            LIMIT 20
            """,
            (row["id"],),
        ).fetchall()

    return {
        "endpoint": _serialize_endpoint(row),
        "snapshots": [_serialize_snapshot(s) for s in snapshots],
    }


@router.get("/endpoints/{slug}/raw", response_class=PlainTextResponse)
def get_endpoint_raw(slug: str):
    slug = _normalize_slug(slug)
    with db_session() as conn:
        row = conn.execute("SELECT content FROM endpoints WHERE slug = %s", (slug,)).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return PlainTextResponse(content=row["content"])


@router.put("/endpoints/{slug}/content")
async def update_endpoint_content(slug: str, body: UpdateContentRequest):
    slug = _normalize_slug(slug)
    now = utc_now()
    with db_session() as conn:
        updated = conn.execute(
            "UPDATE endpoints SET content = %s, updated_at = %s WHERE slug = %s RETURNING *",
            (body.content, now, slug),
        ).fetchone()
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    sender_name = (body.sender_name or "").strip()[:24] or "Web / API"
    await room_manager.broadcast(
        slug,
        {
            "type": "text_update",
            "content": body.content,
            "sender_client_id": "rest-api",
            "sender_name": sender_name,
            "updated_at": now.isoformat(),
        },
    )
    return {"endpoint": _serialize_endpoint(updated)}


@router.post("/endpoints/{slug}/snapshots", status_code=status.HTTP_201_CREATED)
def save_snapshot(slug: str, body: SaveSnapshotRequest):
    slug = _normalize_slug(slug)
    now = utc_now()
    with db_session() as conn:
        row = conn.execute("SELECT * FROM endpoints WHERE slug = %s", (slug,)).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

        content_to_save = body.content if body.content is not None else row["content"]
        if not content_to_save.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot save empty snapshot")

        saved_by = (body.saved_by or "").strip()[:24] or "Anonymous"
        snap = conn.execute(
            """
            INSERT INTO endpoint_snapshots (endpoint_id, content, saved_by, created_at)
            VALUES (%s, %s, %s, %s)
            RETURNING id, content, saved_by, created_at
            """,
            (row["id"], content_to_save, saved_by, now),
        ).fetchone()

        conn.execute(
            """
            DELETE FROM endpoint_snapshots
            WHERE endpoint_id = %s
              AND id NOT IN (
                SELECT id FROM endpoint_snapshots
                WHERE endpoint_id = %s
                ORDER BY id DESC
                LIMIT 20
              )
            """,
            (row["id"], row["id"]),
        )

    return {"snapshot": _serialize_snapshot(snap)}


@router.delete("/endpoints/{slug}")
async def delete_endpoint(slug: str):
    slug = _normalize_slug(slug)
    if slug == "live":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Default live room cannot be deleted")
    with db_session() as conn:
        deleted = conn.execute("DELETE FROM endpoints WHERE slug = %s RETURNING id", (slug,)).fetchone()
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")

    await room_manager.broadcast(slug, {"type": "endpoint_deleted"})
    return {"deleted": True, "slug": slug}


@ws_router.websocket("/ws/tools/live-text/{slug}")
async def live_text_websocket(
    websocket: WebSocket,
    slug: str,
    client_id: Optional[str] = Query(default=None),
    name: Optional[str] = Query(default=None),
):
    slug = _normalize_slug(slug)
    cid = client_id or secrets.token_hex(8)

    with db_session() as conn:
        row = conn.execute("SELECT * FROM endpoints WHERE slug = %s", (slug,)).fetchone()

    if not row:
        await websocket.close(code=4004, reason="Room not found")
        return

    display_name = name.strip()[:24] if name and name.strip() else "Device"

    await room_manager.connect(
        slug=slug,
        client_id=cid,
        display_name=display_name,
        user_id=None,
        websocket=websocket,
    )

    await room_manager.send_personal(
        websocket,
        {
            "type": "sync",
            "slug": row["slug"],
            "title": row["title"],
            "content": row["content"],
            "access_mode": "public_rw",
            "can_edit": True,
            "updated_at": _iso(row["updated_at"]),
            "presence": room_manager.get_presence(slug),
        },
    )

    await room_manager.broadcast(
        slug,
        {"type": "presence", "presence": room_manager.get_presence(slug)},
        exclude_client_id=cid,
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await room_manager.send_personal(websocket, {"type": "pong"})
                continue

            if msg_type == "typing":
                is_typing = bool(data.get("is_typing", False))
                room_manager.set_typing(slug, cid, is_typing)
                await room_manager.broadcast(
                    slug,
                    {
                        "type": "presence",
                        "presence": room_manager.get_presence(slug),
                    },
                    exclude_client_id=cid,
                )
                continue

            if msg_type == "text_update":
                content = data.get("content", "")
                if not isinstance(content, str):
                    continue
                if len(content) > MAX_TEXT_LENGTH:
                    await room_manager.send_personal(
                        websocket,
                        {"type": "error", "detail": "Text exceeds 1MB limit"},
                    )
                    continue

                now = utc_now()
                with db_session() as conn:
                    latest = conn.execute(
                        "UPDATE endpoints SET content = %s, updated_at = %s WHERE slug = %s RETURNING id",
                        (content, now, slug),
                    ).fetchone()
                    if not latest:
                        await room_manager.send_personal(websocket, {"type": "endpoint_deleted"})
                        break

                is_typing = bool(data.get("is_typing", True))
                room_manager.set_typing(slug, cid, is_typing)

                await room_manager.broadcast(
                    slug,
                    {
                        "type": "text_update",
                        "content": content,
                        "sender_client_id": cid,
                        "sender_name": display_name,
                        "updated_at": now.isoformat(),
                        "presence": room_manager.get_presence(slug),
                    },
                    exclude_client_id=cid,
                )
                await room_manager.send_personal(
                    websocket,
                    {"type": "saved", "updated_at": now.isoformat()},
                )
    except WebSocketDisconnect:
        pass
    finally:
        room_manager.disconnect(slug, cid)
        await room_manager.broadcast(
            slug,
            {"type": "presence", "presence": room_manager.get_presence(slug)},
        )
