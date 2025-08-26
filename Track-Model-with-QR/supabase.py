import os
import psycopg2
from dotenv import load_dotenv

# If .env is not in the same folder as this script, do:
# from dotenv import find_dotenv
# load_dotenv(find_dotenv())
load_dotenv()

def env(name, default=""):
    return (os.getenv(name, default) or "").strip()

DB_USER = env("DB_USER")
DB_PASS = env("DB_PASS")
DB_HOST = env("DB_HOST")
DB_PORT = env("DB_PORT")
DB_NAME = env("DB_NAME")

# Option A: DSN string (includes SSL)
dsn = (
    f"dbname={DB_NAME} "
    f"user={DB_USER} "
    f"password={DB_PASS} "
    f"host={DB_HOST} "
    f"port={DB_PORT} "
    f"sslmode=require"
)

print(dsn)

try:
    conn = psycopg2.connect(dsn)
    print("Connection successful!")

    with conn.cursor() as cur:
        cur.execute("SELECT NOW();")
        print("Current Time:", cur.fetchone())

    conn.close()
    print("Connection closed.")
except Exception as e:
    print("Failed to connect:", e)
    print("Debug vars:", repr(DB_HOST), repr(DB_PORT))  # helps catch stray spaces/newlines
