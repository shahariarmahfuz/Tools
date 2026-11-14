#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  echo ""
  echo "Stopping ToolBox Hub servers..."
  kill "${BACKEND_PID:-}" "${FRONTEND_PID:-}" "${PROXY_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting FastAPI backend on http://127.0.0.1:8000 ..."
cd "$ROOT_DIR/backend"
"$ROOT_DIR/backend/.venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Starting Next.js frontend on http://127.0.0.1:3000 ..."
cd "$ROOT_DIR/frontend"
npm run start -- --hostname 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

echo "Starting unified reverse proxy on http://127.0.0.1:8080 ..."
cd "$ROOT_DIR"
node "$ROOT_DIR/proxy.mjs" &
PROXY_PID=$!

echo ""
echo "ToolBox Hub is running:"
echo "  Unified App (for tunnel/browser): http://localhost:8080"
echo "  Frontend Direct:                  http://localhost:3000"
echo "  Backend Docs:                     http://localhost:8000/docs"
echo ""
wait
