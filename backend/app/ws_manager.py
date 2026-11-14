from dataclasses import dataclass
from typing import Dict, List

from fastapi import WebSocket


@dataclass
class ConnectedClient:
    client_id: str
    display_name: str
    user_id: int | None
    websocket: WebSocket
    is_typing: bool = False


class LiveTextRoomManager:
    """Manages active WebSocket clients per live-text endpoint slug."""

    def __init__(self) -> None:
        self.rooms: Dict[str, Dict[str, ConnectedClient]] = {}

    async def connect(
        self,
        slug: str,
        client_id: str,
        display_name: str,
        user_id: int | None,
        websocket: WebSocket,
    ) -> ConnectedClient:
        await websocket.accept()
        room = self.rooms.setdefault(slug, {})
        client = ConnectedClient(
            client_id=client_id,
            display_name=display_name,
            user_id=user_id,
            websocket=websocket,
        )
        room[client_id] = client
        return client

    def disconnect(self, slug: str, client_id: str) -> None:
        room = self.rooms.get(slug)
        if not room:
            return
        room.pop(client_id, None)
        if not room:
            self.rooms.pop(slug, None)

    def set_typing(self, slug: str, client_id: str, is_typing: bool) -> None:
        room = self.rooms.get(slug)
        if room and client_id in room:
            room[client_id].is_typing = is_typing

    def get_presence(self, slug: str) -> dict:
        room = self.rooms.get(slug, {})
        viewers: List[dict] = [
            {
                "client_id": c.client_id,
                "name": c.display_name,
                "is_typing": c.is_typing,
            }
            for c in room.values()
        ]
        return {
            "active_count": len(viewers),
            "viewers": viewers,
        }

    async def send_personal(self, websocket: WebSocket, payload: dict) -> None:
        await websocket.send_json(payload)

    async def broadcast(self, slug: str, payload: dict, exclude_client_id: str | None = None) -> None:
        room = self.rooms.get(slug)
        if not room:
            return
        stale: List[str] = []
        for cid, client in list(room.items()):
            if exclude_client_id and cid == exclude_client_id:
                continue
            try:
                await client.websocket.send_json(payload)
            except Exception:
                stale.append(cid)
        for cid in stale:
            self.disconnect(slug, cid)


room_manager = LiveTextRoomManager()
