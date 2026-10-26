import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchDayAhead,
  fetchMetrics,
  fetchDailyMetrics,
  fetchHourlyProfile,
  fetchCutoffComparison,
  triggerServerCacheRefresh,
} from '../services/energyApi';
import { dashboardCache } from '../services/cacheService';

export function useDashboardData({
  startDate = '2026-01-01',
  endDate = '2026-01-31',
  cutoffHour = 11,
  resolution = 'hourly',
}) {
  const [data, setData] = useState({
    dayAhead: null,
    metrics: null,
    dailyMetrics: null,
    hourlyProfile: null,
    cutoffComparison: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Track latest request to avoid race conditions if params change quickly
  const requestIdRef = useRef(0);

  const loadData = useCallback(async (forceRefresh = false) => {
    const currentRequestId = ++requestIdRef.current;
    const filterParams = { startDate, endDate, cutoffHour, resolution };
    const cacheKey = dashboardCache.generateKey('dashboard', filterParams);

    // 1. Check client-side in-memory cache first if not forced
    if (!forceRefresh) {
      const cached = dashboardCache.get(cacheKey);
      if (cached) {
        setData(cached.data);
        setLastUpdated(cached.timestamp);
        setLoading(false);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (forceRefresh) {
        dashboardCache.clear();
        await triggerServerCacheRefresh().catch(() => {});
      }

      // 2. Fetch all 5 endpoints concurrently using Promise.all for lowest latency
      const [dayAhead, metrics, dailyMetrics, hourlyProfile, cutoffComparison] = await Promise.all([
        fetchDayAhead(filterParams),
        fetchMetrics(filterParams),
        fetchDailyMetrics(filterParams),
        fetchHourlyProfile(filterParams),
        fetchCutoffComparison({ startDate, endDate }),
      ]);

      // Guard against stale responses from rapid filter changes
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      const payload = {
        dayAhead,
        metrics,
        dailyMetrics,
        hourlyProfile,
        cutoffComparison,
      };

      const timestamp = new Date();
      // Store in memory cache
      dashboardCache.set(cacheKey, { data: payload, timestamp });

      setData(payload);
      setLastUpdated(timestamp);
      setLoading(false);
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError(err.message || 'Failed to fetch energy dashboard data');
        setLoading(false);
      }
    }
  }, [startDate, endDate, cutoffHour, resolution]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const refresh = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  return {
    ...data,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
