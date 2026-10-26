import pytest
from app.matcher import match_day_ahead_data

def test_cutoff_strict_inclusion():
    """
    Verify that a forecast published AT or BEFORE the cutoff on D-1 is selected,
    and a forecast published AFTER the cutoff is rejected (not available at decision time).
    """
    actuals = [
        {
            "startTime": "2026-01-02T14:00:00Z",
            "settlementDate": "2026-01-02",
            "settlementPeriod": 29,
            "generation": 12000.0,
            "publishTime": "2026-01-03T00:00:00Z"
        },
        {
            "startTime": "2026-01-02T14:30:00Z",
            "settlementDate": "2026-01-02",
            "settlementPeriod": 30,
            "generation": 12000.0,
            "publishTime": "2026-01-03T00:00:00Z"
        }
    ]

    # Two forecasts for the same target delivery hour 14:00:
    # 1. Published 10:45 on D-1 (eligible for 11:00 cutoff)
    # 2. Published 11:15 on D-1 (ineligible for 11:00 cutoff, eligible for 12:00)
    forecasts = [
        {
            "publishTime": "2026-01-01T10:45:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 11000.0
        },
        {
            "publishTime": "2026-01-01T11:15:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 11800.0
        }
    ]

    # Test Cutoff 11:00 -> MUST pick the 10:45 forecast (11000 MW)
    matched_11 = match_day_ahead_data(
        actuals=actuals,
        forecasts=forecasts,
        start_date="2026-01-02",
        end_date="2026-01-02",
        cutoff_hour=11,
        cutoff_minute=0,
        resolution="hourly"
    )
    assert len(matched_11) == 1
    assert matched_11[0]["forecastPublishTime"] == "2026-01-01T10:45:00Z"
    assert matched_11[0]["forecastMW"] == 11000.0
    assert matched_11[0]["actualMW"] == 12000.0
    assert matched_11[0]["errorMW"] == -1000.0 # under-forecast by 1000 MW

    # Test Cutoff 12:00 -> MUST pick the newer 11:15 forecast (11800 MW)
    matched_12 = match_day_ahead_data(
        actuals=actuals,
        forecasts=forecasts,
        start_date="2026-01-02",
        end_date="2026-01-02",
        cutoff_hour=12,
        cutoff_minute=0,
        resolution="hourly"
    )
    assert len(matched_12) == 1
    assert matched_12[0]["forecastPublishTime"] == "2026-01-01T11:15:00Z"
    assert matched_12[0]["forecastMW"] == 11800.0
    assert matched_12[0]["errorMW"] == -200.0

def test_hourly_resolution_averaging():
    """
    Verify that two 30-min actuals in the same hour are averaged correctly.
    Period 1 (10:00) = 8000 MW, Period 2 (10:30) = 10000 MW -> Average = 9000 MW.
    """
    actuals = [
        {"startTime": "2026-01-05T10:00:00Z", "settlementDate": "2026-01-05", "settlementPeriod": 21, "generation": 8000.0},
        {"startTime": "2026-01-05T10:30:00Z", "settlementDate": "2026-01-05", "settlementPeriod": 22, "generation": 10000.0},
    ]
    forecasts = [
        {"publishTime": "2026-01-04T10:00:00Z", "startTime": "2026-01-05T10:00:00Z", "generation": 9200.0}
    ]

    matched = match_day_ahead_data(
        actuals=actuals,
        forecasts=forecasts,
        start_date="2026-01-05",
        end_date="2026-01-05",
        cutoff_hour=11,
        cutoff_minute=0,
        resolution="hourly"
    )
    assert len(matched) == 1
    assert matched[0]["actualMW"] == 9000.0
    assert matched[0]["forecastMW"] == 9200.0
    assert matched[0]["errorMW"] == 200.0

def test_settlement_resolution_preserves_half_hours():
    """Verify that resolution='settlement' preserves 48 half-hour records without collapsing."""
    actuals = []
    forecasts = []
    for sp in range(1, 49):
        h = (sp - 1) // 2
        m = 0 if sp % 2 != 0 else 30
        actuals.append({
            "startTime": f"2026-01-10T{h:02d}:{m:02d}:00Z",
            "settlementDate": "2026-01-10",
            "settlementPeriod": sp,
            "generation": 10000.0 + sp * 10
        })
        forecasts.append({
            "publishTime": "2026-01-09T10:00:00Z",
            "startTime": f"2026-01-10T{h:02d}:{m:02d}:00Z",
            "generation": 10000.0
        })

    matched = match_day_ahead_data(
        actuals=actuals,
        forecasts=forecasts,
        start_date="2026-01-10",
        end_date="2026-01-10",
        cutoff_hour=11,
        cutoff_minute=0,
        resolution="settlement"
    )
    assert len(matched) == 48
    assert matched[0]["settlementPeriod"] == 1
    assert matched[47]["settlementPeriod"] == 48
