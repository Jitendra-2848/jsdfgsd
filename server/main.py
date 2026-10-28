import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.energy import router as energy_router
from app.config import PORT, HOST, CORS_ORIGINS

# Explicitly load .env from the server root directory
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("energy-api")

app = FastAPI(
    title="UK Day-Ahead Wind Forecast & Error Analytics API",
    description="Backend service for UK energy utility day-ahead wind generation forecasts and quantitative error evaluation against Elexon BMRS outturn.",
    version="1.0.0"
)

cors_origins = [o.strip() for o in CORS_ORIGINS if o.strip()]
has_wildcard = "*" in cors_origins or not cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if has_wildcard else cors_origins,
    allow_credentials=not has_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(energy_router, prefix="/api/energy", tags=["Energy Analytics"])

@app.get("/")
def root():
    return {
        "service": "UK Day-Ahead Wind Forecast & Error Analytics API",
        "status": "healthy",
        "docs": "/docs",
        "scope": "January 2026 Day-Ahead Power Procurement"
    }

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    debug_mode = os.getenv("DEBUG", "false").lower() == "true"
    logger.info(f"Starting server on {HOST}:{PORT} (debug={debug_mode})")
    uvicorn.run("main:app", host=HOST, port=PORT, reload=debug_mode)
