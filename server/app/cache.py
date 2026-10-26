import time
import logging
from typing import Dict, Any, List, Optional
from app.elexon_client import fetch_wind_actuals, fetch_wind_forecasts

logger = logging.getLogger(__name__)

# In-memory transient store (No database used, stored purely in process memory)
class InMemoryStore:
    def __init__(self, ttl_seconds: int = 3600):
        self.ttl = ttl_seconds
        self._actuals_cache: Dict[str, Dict[str, Any]] = {}
        self._forecasts_cache: Dict[str, Dict[str, Any]] = {}
        self._matched_cache: Dict[str, Dict[str, Any]] = {}

    def _is_valid(self, entry: Optional[Dict[str, Any]]) -> bool:
        if not entry:
            return False
        return (time.time() - entry["timestamp"]) < self.ttl

    async def get_actuals(self, start_date: str, end_date: str, force_refresh: bool = False) -> List[Dict[str, Any]]:
        key = f"{start_date}_{end_date}"
        if not force_refresh and key in self._actuals_cache and self._is_valid(self._actuals_cache[key]):
            logger.info(f"Serving actuals from memory cache for key {key}")
            return self._actuals_cache[key]["data"]

        data = await fetch_wind_actuals(start_date, end_date)
        self._actuals_cache[key] = {
            "timestamp": time.time(),
            "data": data
        }
        return data

    async def get_forecasts(self, pub_from: str, pub_to: str, force_refresh: bool = False) -> List[Dict[str, Any]]:
        key = f"{pub_from}_{pub_to}"
        if not force_refresh and key in self._forecasts_cache and self._is_valid(self._forecasts_cache[key]):
            logger.info(f"Serving forecasts from memory cache for key {key}")
            return self._forecasts_cache[key]["data"]

        data = await fetch_wind_forecasts(pub_from, pub_to)
        self._forecasts_cache[key] = {
            "timestamp": time.time(),
            "data": data
        }
        return data

    def get_matched(self, key: str) -> Optional[List[Dict[str, Any]]]:
        if key in self._matched_cache and self._is_valid(self._matched_cache[key]):
            logger.info(f"Serving matched records from memory cache for key {key}")
            return self._matched_cache[key]["data"]
        return None

    def set_matched(self, key: str, data: List[Dict[str, Any]]):
        self._matched_cache[key] = {
            "timestamp": time.time(),
            "data": data
        }

    def clear(self):
        self._actuals_cache.clear()
        self._forecasts_cache.clear()
        self._matched_cache.clear()
        logger.info("In-memory cache cleared.")

store = InMemoryStore()
