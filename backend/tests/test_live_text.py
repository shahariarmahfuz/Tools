import secrets

import psycopg
import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(monkeypatch):
    import app.config as config
    import app.db as db

    test_schema = f"test_{secrets.token_hex(4)}"
    monkeypatch.setattr(config, "PG_SCHEMA", test_schema)
    db.close_pool()
    db.init_db()

    from app.main import app
    from app.ws_manager import room_manager

    room_manager.rooms.clear()
    try:
        with TestClient(app) as tc:
            yield tc
    finally:
        db.close_pool()
        with psycopg.connect(config.DATABASE_URL, connect_timeout=15) as conn:
            conn.execute(f"DROP SCHEMA IF EXISTS {test_schema} CASCADE")
            conn.commit()
        monkeypatch.setattr(config, "PG_SCHEMA", "public")


def test_open_room_creation_and_listing(client: TestClient):
    live = client.get("/api/tools/live-text/endpoints/live")
    assert live.status_code == 200
    assert live.json()["endpoint"]["slug"] == "live"
    assert live.json()["endpoint"]["can_edit"] is True

    created = client.post(
        "/api/tools/live-text/endpoints",
        json={"title": "VM Box", "slug": "my-vm"},
    )
    assert created.status_code == 201, created.text
    assert created.json()["endpoint"]["slug"] == "my-vm"

    listed = client.get("/api/tools/live-text/endpoints")
    assert listed.status_code == 200
    slugs = [ep["slug"] for ep in listed.json()["endpoints"]]
    assert "live" in slugs
    assert "my-vm" in slugs


def test_open_websocket_live_typing_and_persistence(client: TestClient):
    client.post(
        "/api/tools/live-text/endpoints",
        json={"title": "Cloud Sync", "slug": "cloud-sync"},
    )

    with (
        client.websocket_connect("/ws/tools/live-text/cloud-sync?client_id=c1&name=Phone") as ws1,
        client.websocket_connect("/ws/tools/live-text/cloud-sync?client_id=c2&name=CloudVM") as ws2,
    ):
        assert ws1.receive_json()["type"] == "sync"
        assert ws2.receive_json()["type"] == "sync"

        presence_msg = ws1.receive_json()
        assert presence_msg["type"] == "presence"
        assert presence_msg["presence"]["active_count"] == 2

        ws1.send_json({"type": "text_update", "content": "docker compose up -d", "is_typing": True})

        assert ws1.receive_json()["type"] == "saved"
        vm_update = ws2.receive_json()
        assert vm_update["type"] == "text_update"
        assert vm_update["content"] == "docker compose up -d"
        assert vm_update["sender_name"] == "Phone"

        ws2.send_json({"type": "text_update", "content": "done!", "is_typing": False})
        assert ws2.receive_json()["type"] == "saved"
        phone_update = ws1.receive_json()
        assert phone_update["content"] == "done!"
        assert phone_update["sender_name"] == "CloudVM"

    raw = client.get("/api/tools/live-text/endpoints/cloud-sync/raw")
    assert raw.status_code == 200
    assert raw.text == "done!"

    snap = client.post("/api/tools/live-text/endpoints/cloud-sync/snapshots", json={})
    assert snap.status_code == 201
    assert snap.json()["snapshot"]["content"] == "done!"
