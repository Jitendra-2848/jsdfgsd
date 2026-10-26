import logging
from typing import List, Dict, Any
import httpx
from app.config import FUELHH_STREAM_URL, WINDFOR_STREAM_URL, HTTP_TIMEOUT

logger = logging.getLogger(__name__)

async def fetch_wind_actuals(start_date: str, end_date: str) -> List[Dict[str, Any]]:
    """
    Fetch actual half-hourly generation outturn from Elexon BMRS FUELHH stream.
    Filters specifically for fuelType == 'WIND'.
    Dates should be in format 'YYYY-MM-DD'.
    """
    params = {
        "settlementDateFrom": start_date,
        "settlementDateTo": end_date,
    }
    logger.info(f"Fetching FUELHH wind actuals from {start_date} to {end_date}...")
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        response = await client.get(FUELHH_STREAM_URL, params=params)
        response.raise_for_status()
        raw_data = response.json()

    wind_records = []
    for item in raw_data:
        if item.get("fuelType") == "WIND":
            wind_records.append({
                "startTime": item.get("startTime"),
                "settlementDate": item.get("settlementDate"),
                "settlementPeriod": item.get("settlementPeriod"),
                "generation": float(item.get("generation", 0)),
                "publishTime": item.get("publishTime")
            })

    # Sort chronologically by startTime
    wind_records.sort(key=lambda x: (x["settlementDate"], x["settlementPeriod"]))
    logger.info(f"Retrieved {len(wind_records)} WIND actual records.")
    return wind_records


async def fetch_wind_forecasts(publish_from_iso: str, publish_to_iso: str) -> List[Dict[str, Any]]:
    """
    Fetch wind forecasts from Elexon BMRS WINDFOR stream.
    Filter by publishTime window (ISO 8601 string, e.g. '2025-12-31T00:00:00Z').
    """
    params = {
        "publishDateTimeFrom": publish_from_iso,
        "publishDateTimeTo": publish_to_iso,
    }
    logger.info(f"Fetching WINDFOR forecasts published between {publish_from_iso} and {publish_to_iso}...")
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        response = await client.get(WINDFOR_STREAM_URL, params=params)
        response.raise_for_status()
        raw_data = response.json()

    forecast_records = []
    for item in raw_data:
        forecast_records.append({
            "publishTime": item.get("publishTime"),
            "startTime": item.get("startTime"),
            "generation": float(item.get("generation", 0))
        })

    logger.info(f"Retrieved {len(forecast_records)} WINDFOR forecast records.")
    return forecast_records
