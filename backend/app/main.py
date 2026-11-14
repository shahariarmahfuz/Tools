from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.db import close_pool, db_session, init_db
from app.routes.live_text import router as live_text_router
from app.routes.live_text import ws_router as live_text_ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield
    close_pool()


app = FastAPI(
    title="ToolBox Hub API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(live_text_router)
app.include_router(live_text_ws_router)


@app.get("/api/health")
def health():
    with db_session() as conn:
        conn.execute("SELECT 1").fetchone()
    return {"status": "ok", "database": "neon-postgresql"}
