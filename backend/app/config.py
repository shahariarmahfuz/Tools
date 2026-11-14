import os
import re
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
DATABASE_URL_POOLED = os.getenv("DATABASE_URL_POOLED", "").strip() or DATABASE_URL

_raw_schema = os.getenv("TOOLBOX_PG_SCHEMA", "public").strip()
if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", _raw_schema):
    raise ValueError("Invalid TOOLBOX_PG_SCHEMA")
PG_SCHEMA = _raw_schema

MAX_TEXT_LENGTH = 1_000_000  # 1M chars safety cap

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "TOOLBOX_CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080",
    ).split(",")
    if origin.strip()
]
