import os
from pathlib import Path
from dotenv import load_dotenv

# Explicitly load .env from the server root directory
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

PORT = int(os.getenv("PORT", 5000))
HOST = os.getenv("HOST", "0.0.0.0")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",") if os.getenv("CORS_ORIGINS") else ["*"]

ELEXON_BASE_URL = os.getenv("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
FUELHH_STREAM_URL = f"{ELEXON_BASE_URL}/datasets/FUELHH/stream"
WINDFOR_STREAM_URL = f"{ELEXON_BASE_URL}/datasets/WINDFOR/stream"

DEFAULT_START_DATE = os.getenv("DEFAULT_START_DATE", "2026-01-01")
DEFAULT_END_DATE = os.getenv("DEFAULT_END_DATE", "2026-01-31")

DEFAULT_CUTOFF_HOUR = int(os.getenv("DEFAULT_CUTOFF_HOUR", 11))
DEFAULT_CUTOFF_MINUTE = int(os.getenv("DEFAULT_CUTOFF_MINUTE", 0))

HTTP_TIMEOUT = float(os.getenv("HTTP_TIMEOUT", 60.0))
