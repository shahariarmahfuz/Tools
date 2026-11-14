# ToolBox — Developer & Cloud Utilities

An open, zero-login developer utility platform built with **Next.js 16** (App Router + Tailwind CSS v4) and **FastAPI** (WebSockets + **Neon PostgreSQL**), unified behind a local Node reverse proxy (`proxy.mjs`).

## Features

- **100% Open Workspace:** No signup or login required — anyone with a link can use every tool immediately.
- **Light & Dark Themes:** Persistent theme switcher with crisp slate styling and left-side collapsible navigation rail.
- **Live Text Share (`/tools/live-text`):**
  - Instant shared room (`/live`) plus custom open rooms (`/tools/live-text/<slug>`).
  - Real-time bidirectional WebSocket keystroke sync, presence count, and typing indicator.
  - Persistent storage & snapshot history in Neon PostgreSQL.
  - Cloud VM plain-text endpoint via `curl` (`/api/tools/live-text/endpoints/<slug>/raw`).
- **QR Studio (`/tools/qr-generator`):**
  - Client-side PNG & SVG QR code generator for URL/Text, WiFi, and Email/Phone (`mailto:` / `tel:`), with color presets, size, margin, and ECC controls.
- **Link Fixer (`/tools/link-fixer`):**
  - Repairs terminal-copied URLs by stripping ANSI codes, box-drawing characters, line wraps, and whitespace, or extracts clean links from logs with optional tracking-parameter removal.

## Setup & Running Locally

1. Configure Neon PostgreSQL in `backend/.env` (see [backend/.env.example](backend/.env.example)).
2. Install backend and frontend dependencies:
   ```bash
   python3 -m venv backend/.venv
   backend/.venv/bin/pip install -r backend/requirements.txt
   cd frontend && npm install && npm run build
   ```
3. Start all services (FastAPI `:8000`, Next.js `:3000`, Reverse Proxy `:8080`):
   ```bash
   ./start.sh
   ```

- Unified App: `http://localhost:8080`
- Frontend Direct: `http://localhost:3000`
- Backend API & Docs: `http://localhost:8000/docs`
