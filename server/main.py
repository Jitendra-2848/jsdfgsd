import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.energy import router as energy_router

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

# Enable CORS for React frontend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
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
    uvicorn.run("main:app", host="127.0.0.1", port=5000, reload=True)
