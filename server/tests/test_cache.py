import pytest
import time
from unittest.mock import patch
from app.cache import InMemoryStore

@pytest.mark.asyncio
async def test_cache_actuals_hit():
    """Verify that actuals are cached and subsequent calls hit the memory cache without re-fetching."""
    store = InMemoryStore(ttl_seconds=10)

    # Mock fetch_wind_actuals
    mock_data = [{"settlementDate": "2026-01-01", "generation": 10500}]
    with patch("app.cache.fetch_wind_actuals", return_value=mock_data) as mock_fetch:
        # First call -> triggers network fetch
        res1 = await store.get_actuals("2026-01-01", "2026-01-01")
        assert res1 == mock_data
        assert mock_fetch.call_count == 1

        # Second call within TTL -> must serve from memory cache (call_count remains 1)
        res2 = await store.get_actuals("2026-01-01", "2026-01-01")
        assert res2 == mock_data
        assert mock_fetch.call_count == 1

@pytest.mark.asyncio
async def test_cache_force_refresh():
    """Verify that force_refresh bypasses the memory cache."""
    store = InMemoryStore(ttl_seconds=10)
    mock_data = [{"generation": 10000}]
    with patch("app.cache.fetch_wind_actuals", return_value=mock_data) as mock_fetch:
        await store.get_actuals("2026-01-01", "2026-01-01")
        assert mock_fetch.call_count == 1

        await store.get_actuals("2026-01-01", "2026-01-01", force_refresh=True)
        assert mock_fetch.call_count == 2

@pytest.mark.asyncio
async def test_cache_clear():
    """Verify that store.clear() flushes internal caches."""
    store = InMemoryStore(ttl_seconds=10)
    mock_data = [{"generation": 10000}]
    with patch("app.cache.fetch_wind_actuals", return_value=mock_data) as mock_fetch:
        await store.get_actuals("2026-01-01", "2026-01-01")
        assert mock_fetch.call_count == 1

        store.clear()

        await store.get_actuals("2026-01-01", "2026-01-01")
        assert mock_fetch.call_count == 2

@pytest.mark.asyncio
async def test_cache_expiration():
    """Verify that records expire after TTL seconds."""
    store = InMemoryStore(ttl_seconds=1)
    mock_data = [{"generation": 10000}]
    with patch("app.cache.fetch_wind_actuals", return_value=mock_data) as mock_fetch:
        await store.get_actuals("2026-01-01", "2026-01-01")
        assert mock_fetch.call_count == 1

        # Wait past TTL
        time.sleep(1.1)

        await store.get_actuals("2026-01-01", "2026-01-01")
        assert mock_fetch.call_count == 2
