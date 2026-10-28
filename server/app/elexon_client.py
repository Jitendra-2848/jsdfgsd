import logging
from typing import List, Dict, Any
import httpx
from app.config import FUELHH_STREAM_URL, WINDFOR_STREAM_URL, HTTP_TIMEOUT

logger = logging.getLogger(__name__)

async def fetch_wind_actuals(start_date: str, end_date: str) -> List[Dict[str, Any]]:
    params = {
        "settlementDateFrom": start_date,
        "settlementDateTo": end_date,
    }
    logger.info(f"Fetching FUELHH wind actuals from {start_date} to {end_date}...")
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        response = await client.get(FUELHH_STREAM_URL, params=params)
        response.raise_for_status()
        raw_data = response.json()

    if isinstance(raw_data, dict):
        raw_data = raw_data.get("data", [])

    wind_records = [
        {
            "startTime": item.get("startTime"),
            "settlementDate": item.get("settlementDate"),
            "settlementPeriod": item.get("settlementPeriod"),
            "generation": float(item.get("generation") or 0)
        }
        for item in raw_data
        if isinstance(item, dict) and item.get("fuelType") == "WIND"
    ]

    wind_records.sort(key=lambda x: (x.get("settlementDate", ""), x.get("settlementPeriod", 0)))
    logger.info(f"Retrieved {len(wind_records)} WIND actual records.")
    return wind_records


async def fetch_wind_forecasts(publish_from_iso: str, publish_to_iso: str) -> List[Dict[str, Any]]:
    params = {
        "publishDateTimeFrom": publish_from_iso,
        "publishDateTimeTo": publish_to_iso,
    }
    logger.info(f"Fetching WINDFOR forecasts published between {publish_from_iso} and {publish_to_iso}...")
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        response = await client.get(WINDFOR_STREAM_URL, params=params)
        response.raise_for_status()
        raw_data = response.json()

    if isinstance(raw_data, dict):
        raw_data = raw_data.get("data", [])

    forecast_records = [
        {
            "publishTime": item.get("publishTime"),
            "startTime": item.get("startTime"),
            "generation": float(item.get("generation") or 0)
        }
        for item in raw_data
        if isinstance(item, dict) and item.get("startTime") and item.get("publishTime")
    ]

    logger.info(f"Retrieved {len(forecast_records)} WINDFOR forecast records.")
    return forecast_records
