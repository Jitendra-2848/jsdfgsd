import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_api_root():
    """Verify health status endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data

def test_api_health():
    """Verify dedicated /health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

def test_api_metrics_endpoint():
    """Verify GET /api/energy/metrics returns expected summary structure."""
    response = client.get("/api/energy/metrics?startDate=2026-01-01&endDate=2026-01-03&cutoffHour=11&resolution=hourly")
    assert response.status_code == 200
    body = response.json()
    assert "metadata" in body
    assert "summary" in body
    assert "daily" in body
    summary = body["summary"]
    assert "mae" in summary
    assert "rmse" in summary
    assert "mape" in summary
    assert "mbe" in summary
    assert summary["totalPoints"] == 72 # 3 days * 24 hours

def test_api_day_ahead_endpoint():
    """Verify GET /api/energy/day-ahead returns time series with error parameters."""
    response = client.get("/api/energy/day-ahead?startDate=2026-01-01&endDate=2026-01-02&cutoffHour=11&resolution=hourly")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    data = body["data"]
    assert len(data) == 48 # 2 days * 24 hours
    first = data[0]
    assert "actualMW" in first
    assert "forecastMW" in first
    assert "errorMW" in first
    assert "percentageError" in first

def test_api_cutoff_comparison_endpoint():
    """Verify GET /api/energy/cutoff-comparison returns 5 cutoff milestones."""
    response = client.get("/api/energy/cutoff-comparison?startDate=2026-01-01&endDate=2026-01-03")
    assert response.status_code == 200
    body = response.json()
    assert "comparisons" in body
    comparisons = body["comparisons"]
    assert len(comparisons) == 5
    cutoffs = [c["cutoffHour"] for c in comparisons]
    assert cutoffs == [7, 9, 11, 12, 16]

def test_api_cache_refresh_endpoint():
    """Verify POST /api/energy/refresh clears caches and returns success."""
    response = client.post("/api/energy/refresh")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
