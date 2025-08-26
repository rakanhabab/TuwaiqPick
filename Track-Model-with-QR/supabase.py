import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv
import psycopg2

dotenv_path = find_dotenv(usecwd=True) or str(Path(__file__).with_name(".env"))
load_dotenv(dotenv_path)

def _env(key: str, default: str = "") -> str:
    val = os.getenv(key, default)
    return (val or "").strip()

def get_connection():
    host = _env("DB_HOST")
    port = _env("DB_PORT", "5432")
    name = _env("DB_NAME")
    user = _env("DB_USER")
    pw   = _env("DB_PASS")
    fullstring = _env("connectionURL")

    # Fail fast if host is missing; prevents accidental localhost fallback
    if not host or host.lower() in ("localhost", "127.0.0.1", "::1"):
        raise RuntimeError(
            f"Invalid DB_HOST={host!r}. Check your .env is loaded and points to the Pooler host."
        )

    return psycopg2.connect(fullstring)