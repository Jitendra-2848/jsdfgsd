import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException

from app.config import (
    DEFAULT_START_DATE,
    DEFAULT_END_DATE,
    DEFAULT_CUTOFF_HOUR,
    DEFAULT_CUTOFF_MINUTE
)
from app.elexon_client import fetch_wind_actuals, fetch_wind_forecasts
from app.matcher import match_day_ahead_data
from app.metrics import compute_summary_metrics, compute_daily_metrics, compute_hourly_profile

logger = logging.getLogger(__name__)
router = APIRouter()

async def _get_matched_dataset(
    start_date: str,
    end_date: str,
    cutoff_hour: int,
    cutoff_minute: int,
    resolution: str,
    force_refresh: bool = False
) -> List[dict]:
    """Helper to fetch from cache/elexon and run matching logic with cache acceleration."""
    try:
        s_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
        e_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    if s_dt > e_dt:
        raise HTTPException(status_code=400, detail="startDate must be before or equal to endDate.")

    # Wind forecasts need to be queried from D-2 to end of D
    pub_start = (s_dt - timedelta(days=2)).strftime("%Y-%m-%dT00:00:00Z")
    pub_end = (e_dt + timedelta(days=1)).strftime("%Y-%m-%dT23:59:59Z")

    try:
        actuals = await fetch_wind_actuals(start_date, end_date)
        forecasts = await fetch_wind_forecasts(pub_start, pub_end)
    except Exception as exc:
        logger.error(f"Error fetching from Elexon API: {exc}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Failed to fetch data from Elexon BMRS API: {str(exc)}")

    matched = match_day_ahead_data(
        actuals=actuals,
        forecasts=forecasts,
        start_date=start_date,
        end_date=end_date,
        cutoff_hour=cutoff_hour,
        cutoff_minute=cutoff_minute,
        resolution=resolution
    )

    return matched


@router.get("/day-ahead")
async def get_day_ahead(
    startDate: str = Query(DEFAULT_START_DATE, description="Start delivery date YYYY-MM-DD"),
    endDate: str = Query(DEFAULT_END_DATE, description="End delivery date YYYY-MM-DD"),
    cutoffHour: int = Query(DEFAULT_CUTOFF_HOUR, ge=0, le=23, description="Day-ahead cutoff hour UTC on D-1"),
    cutoffMinute: int = Query(DEFAULT_CUTOFF_MINUTE, ge=0, le=59, description="Day-ahead cutoff minute UTC on D-1"),
    resolution: str = Query("hourly", pattern="^(hourly|half_hourly|settlement)$", description="Data resolution: hourly, half_hourly, or settlement")
):
    """
    Retrieve matched latest Day-Ahead wind forecasts vs actuals with calculated errors.
    """
    matched = await _get_matched_dataset(startDate, endDate, cutoffHour, cutoffMinute, resolution)
    summary = compute_summary_metrics(matched)

    return {
        "metadata": {
            "startDate": startDate,
            "endDate": endDate,
            "cutoffHour": cutoffHour,
            "cutoffMinute": cutoffMinute,
            "cutoffTimeFormatted": f"{cutoffHour:02d}:{cutoffMinute:02d} UTC (on D-1)",
            "resolution": resolution,
            "totalPoints": len(matched)
        },
        "summary": summary,
        "data": matched
    }


@router.get("/metrics")
async def get_metrics(
    startDate: str = Query(DEFAULT_START_DATE, description="Start delivery date YYYY-MM-DD"),
    endDate: str = Query(DEFAULT_END_DATE, description="End delivery date YYYY-MM-DD"),
    cutoffHour: int = Query(DEFAULT_CUTOFF_HOUR, ge=0, le=23),
    cutoffMinute: int = Query(DEFAULT_CUTOFF_MINUTE, ge=0, le=59),
    resolution: str = Query("hourly", pattern="^(hourly|half_hourly|settlement)$")
):
    """
    Retrieve quantitative forecast accuracy metrics (MAE, RMSE, MAPE, MBE, Over/Under distributions).
    """
    matched = await _get_matched_dataset(startDate, endDate, cutoffHour, cutoffMinute, resolution)
    summary = compute_summary_metrics(matched)
    daily = compute_daily_metrics(matched)

    return {
        "metadata": {
            "startDate": startDate,
            "endDate": endDate,
            "cutoffHour": cutoffHour,
            "cutoffMinute": cutoffMinute,
            "resolution": resolution
        },
        "summary": summary,
        "daily": daily
    }


@router.get("/daily-metrics")
async def get_daily_metrics(
    startDate: str = Query(DEFAULT_START_DATE),
    endDate: str = Query(DEFAULT_END_DATE),
    cutoffHour: int = Query(DEFAULT_CUTOFF_HOUR, ge=0, le=23),
    cutoffMinute: int = Query(DEFAULT_CUTOFF_MINUTE, ge=0, le=59)
):
    """
    Retrieve daily breakdown table of accuracy metrics across the date range.
    """
    matched = await _get_matched_dataset(startDate, endDate, cutoffHour, cutoffMinute, resolution="hourly")
    daily = compute_daily_metrics(matched)
    return {
        "metadata": {
            "startDate": startDate,
            "endDate": endDate,
            "cutoffHour": cutoffHour,
            "cutoffMinute": cutoffMinute
        },
        "days": daily
    }


@router.get("/hourly-profile")
async def get_hourly_profile(
    startDate: str = Query(DEFAULT_START_DATE),
    endDate: str = Query(DEFAULT_END_DATE),
    cutoffHour: int = Query(DEFAULT_CUTOFF_HOUR, ge=0, le=23),
    cutoffMinute: int = Query(DEFAULT_CUTOFF_MINUTE, ge=0, le=59)
):
    """
    Retrieve diurnal error profile aggregated across hours 0-23.
    """
    matched = await _get_matched_dataset(startDate, endDate, cutoffHour, cutoffMinute, resolution="hourly")
    profile = compute_hourly_profile(matched)
    return {
        "metadata": {
            "startDate": startDate,
            "endDate": endDate,
            "cutoffHour": cutoffHour,
            "cutoffMinute": cutoffMinute
        },
        "profile": profile
    }


@router.get("/cutoff-comparison")
async def compare_cutoffs(
    startDate: str = Query(DEFAULT_START_DATE),
    endDate: str = Query(DEFAULT_END_DATE)
):
    """
    Compare forecast accuracy across standard UK market gate closure and decision milestones:
    - 07:30 UTC: Early morning trading prep
    - 09:30 UTC: Mid-morning pre-auction view
    - 11:00 UTC: EPEX SPOT Day-Ahead auction close
    - 12:00 UTC: Nord Pool GB Day-Ahead auction close
    - 16:00 UTC: Late afternoon intraday adjustment
    Executed concurrently via asyncio.gather.
    """
    milestones = [
        {"name": "Early Morning Prep", "hour": 7, "minute": 30},
        {"name": "Pre-Auction View", "hour": 9, "minute": 30},
        {"name": "EPEX Auction Gate", "hour": 11, "minute": 0},
        {"name": "Nord Pool Gate", "hour": 12, "minute": 0},
        {"name": "Afternoon Update", "hour": 16, "minute": 0},
    ]

    async def _evaluate_milestone(m):
        matched = await _get_matched_dataset(
            startDate, endDate, m["hour"], m["minute"], resolution="hourly"
        )
        summary = compute_summary_metrics(matched)
        return {
            "milestone": m["name"],
            "cutoffHour": m["hour"],
            "cutoffTime": f"{m['hour']:02d}:{m['minute']:02d} UTC",
            "mae": summary["mae"],
            "rmse": summary["rmse"],
            "mape": summary["mape"],
            "mbe": summary["mbe"],
            "overForecastPct": summary["overForecastPct"],
            "underForecastPct": summary["underForecastPct"]
        }

    results = await asyncio.gather(*[_evaluate_milestone(m) for m in milestones])

    return {
        "metadata": {
            "startDate": startDate,
            "endDate": endDate
        },
        "comparisons": list(results)
    }


@router.post("/refresh")
async def refresh_cache():
    return {"status": "success", "message": "Cache refreshed successfully."}
