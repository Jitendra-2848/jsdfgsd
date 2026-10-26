import pytest
import math
from app.metrics import compute_summary_metrics, compute_daily_metrics, compute_hourly_profile

def test_summary_metrics_empty():
    """Verify empty input handling returns zeroed structure without throwing."""
    res = compute_summary_metrics([])
    assert res["totalPoints"] == 0
    assert res["mae"] == 0.0
    assert res["rmse"] == 0.0
    assert res["mape"] == 0.0
    assert res["mbe"] == 0.0
    assert res["netImbalanceMWh"] == 0.0

def test_summary_metrics_exact_calculations():
    """
    Test with 4 controlled synthetic intervals:
    1. Act = 1000, Fc = 1200 -> err = +200, abs_err = 200, sq = 40000, pct = 20%
    2. Act = 1000, Fc = 800  -> err = -200, abs_err = 200, sq = 40000, pct = 20%
    3. Act = 2000, Fc = 2300 -> err = +300, abs_err = 300, sq = 90000, pct = 15%
    4. Act = 2000, Fc = 1700 -> err = -300, abs_err = 300, sq = 90000, pct = 15%

    Expected:
    - totalPoints: 4
    - MAE: (200 + 200 + 300 + 300) / 4 = 1000 / 4 = 250.0 MW
    - RMSE: sqrt((40000 + 40000 + 90000 + 90000) / 4) = sqrt(260000 / 4) = sqrt(65000) = 254.95 -> 255.0 MW
    - MAPE: (20 + 20 + 15 + 15) / 4 = 17.5%
    - MBE: (+200 - 200 + 300 - 300) / 4 = 0.0 MW (perfectly unbiased overall)
    - overForecastPct: 50.0%
    - underForecastPct: 50.0%
    - maxOverForecastMW: 300.0 MW
    - maxUnderForecastMW: -300.0 MW
    """
    records = [
        {"timestamp": "2026-01-01T01:00:00Z", "actualMW": 1000.0, "forecastMW": 1200.0, "errorMW": 200.0, "absErrorMW": 200.0, "percentageError": 20.0},
        {"timestamp": "2026-01-01T02:00:00Z", "actualMW": 1000.0, "forecastMW": 800.0, "errorMW": -200.0, "absErrorMW": 200.0, "percentageError": 20.0},
        {"timestamp": "2026-01-01T03:00:00Z", "actualMW": 2000.0, "forecastMW": 2300.0, "errorMW": 300.0, "absErrorMW": 300.0, "percentageError": 15.0},
        {"timestamp": "2026-01-01T04:00:00Z", "actualMW": 2000.0, "forecastMW": 1700.0, "errorMW": -300.0, "absErrorMW": 300.0, "percentageError": 15.0},
    ]

    res = compute_summary_metrics(records)
    assert res["totalPoints"] == 4
    assert res["mae"] == 250.0
    assert res["rmse"] == 255.0
    assert res["mape"] == 17.5
    assert res["mbe"] == 0.0
    assert res["overForecastPct"] == 50.0
    assert res["underForecastPct"] == 50.0
    assert res["maxOverForecastMW"] == 300.0
    assert res["maxUnderForecastMW"] == -300.0
    assert res["avgActualMW"] == 1500.0
    assert res["avgForecastMW"] == 1500.0
    assert res["netImbalanceMWh"] == 0.0

def test_summary_metrics_zero_actual_handling():
    """Verify that zero actual generation does not crash with DivisionByZero in MAPE."""
    records = [
        {"timestamp": "2026-01-01T01:00:00Z", "actualMW": 0.0, "forecastMW": 100.0, "errorMW": 100.0, "absErrorMW": 100.0, "percentageError": 0.0},
        {"timestamp": "2026-01-01T02:00:00Z", "actualMW": 1000.0, "forecastMW": 1100.0, "errorMW": 100.0, "absErrorMW": 100.0, "percentageError": 10.0},
    ]
    res = compute_summary_metrics(records)
    assert res["totalPoints"] == 2
    assert res["mae"] == 100.0
    # MAPE should only average over points where actualMW > 0
    assert res["mape"] == 10.0

def test_daily_metrics_aggregation():
    """Verify daily aggregation groups by deliveryDate correctly."""
    records = [
        {"deliveryDate": "2026-01-01", "decisionDate": "2025-12-31", "timestamp": "2026-01-01T01:00:00Z", "actualMW": 5000, "forecastMW": 5500, "errorMW": 500, "absErrorMW": 500, "percentageError": 10},
        {"deliveryDate": "2026-01-01", "decisionDate": "2025-12-31", "timestamp": "2026-01-01T02:00:00Z", "actualMW": 5000, "forecastMW": 5500, "errorMW": 500, "absErrorMW": 500, "percentageError": 10},
        {"deliveryDate": "2026-01-02", "decisionDate": "2026-01-01", "timestamp": "2026-01-02T01:00:00Z", "actualMW": 8000, "forecastMW": 7000, "errorMW": -1000, "absErrorMW": 1000, "percentageError": 12.5},
    ]
    daily = compute_daily_metrics(records)
    assert len(daily) == 2
    assert daily[0]["deliveryDate"] == "2026-01-01"
    assert daily[0]["points"] == 2
    assert daily[0]["mae"] == 500.0
    assert daily[0]["mbe"] == 500.0 # over-forecast

    assert daily[1]["deliveryDate"] == "2026-01-02"
    assert daily[1]["points"] == 1
    assert daily[1]["mae"] == 1000.0
    assert daily[1]["mbe"] == -1000.0 # under-forecast

def test_hourly_profile_structure():
    """Verify diurnal profile always generates 24 hours (0-23)."""
    records = []
    for h in range(24):
        records.append({
            "hour": h,
            "timestamp": f"2026-01-01T{h:02d}:00:00Z",
            "actualMW": 10000 + h * 50,
            "forecastMW": 10200 + h * 50,
            "errorMW": 200.0,
            "absErrorMW": 200.0,
            "percentageError": 2.0
        })
    profile = compute_hourly_profile(records)
    assert len(profile) == 24
    assert [p["hour"] for p in profile] == list(range(24))
    assert profile[0]["mae"] == 200.0
    assert profile[18]["mbe"] == 200.0
