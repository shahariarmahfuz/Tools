from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator, Optional

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app import config

_pool: Optional[ConnectionPool] = None


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        dsn = config.DATABASE_URL_POOLED or config.DATABASE_URL
        if not dsn:
            raise RuntimeError("DATABASE_URL_POOLED or DATABASE_URL must be configured")
        _pool = ConnectionPool(
            conninfo=dsn,
            min_size=1,
            max_size=10,
            open=True,
            check=ConnectionPool.check_connection,
            kwargs={"row_factory": dict_row, "connect_timeout": 15},
        )
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def db_session() -> Iterator[psycopg.Connection]:
    pool = get_pool()
    with pool.connection() as conn:
        if config.PG_SCHEMA != "public":
            conn.execute(f"SET search_path TO {config.PG_SCHEMA}, public")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def init_db() -> None:
    dsn = config.DATABASE_URL or config.DATABASE_URL_POOLED
    if not dsn:
        raise RuntimeError("DATABASE_URL must be configured")

    with psycopg.connect(dsn, row_factory=dict_row, connect_timeout=15) as conn:
        if config.PG_SCHEMA != "public":
            conn.execute(f"CREATE SCHEMA IF NOT EXISTS {config.PG_SCHEMA}")
            conn.execute(f"SET search_path TO {config.PG_SCHEMA}, public")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS endpoints (
                id SERIAL PRIMARY KEY,
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                access_mode TEXT NOT NULL DEFAULT 'public_rw',
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS endpoint_snapshots (
                id SERIAL PRIMARY KEY,
                endpoint_id INTEGER NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                saved_by TEXT NOT NULL DEFAULT 'Anonymous',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_endpoints_slug ON endpoints(slug);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_endpoints_updated ON endpoints(updated_at DESC);")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_snapshots_endpoint ON endpoint_snapshots(endpoint_id, id DESC);"
        )

        # Ensure default instant-access open room ("live") exists
        conn.execute(
            """
            INSERT INTO endpoints (slug, title, content, access_mode)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (slug) DO NOTHING
            """,
            ("live", "Live Text Share", "", "public_rw"),
        )
        conn.commit()
