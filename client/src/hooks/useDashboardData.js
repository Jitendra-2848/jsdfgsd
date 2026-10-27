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

// In-memory master stores by (cutoffHour + '_' + resolution)
const masterStore = new Map();

function computeSummaryFromRecords(records) {
  const n = records.length;
  if (!n) return null;

  let sumAbs = 0;
  let sumErr = 0;
  let sumSq = 0;
  let sumAct = 0;
  let sumFc = 0;
  let overCount = 0;
  let underCount = 0;
  let exactCount = 0;
  let maxOver = 0;
  let maxUnder = 0;

  for (const d of records) {
    const err = d.errorMW ?? 0;
    const absErr = Math.abs(err);
    sumAbs += absErr;
    sumErr += err;
    sumSq += err * err;
    sumAct += (d.actualMW ?? 0);
    sumFc += (d.forecastMW ?? 0);

    if (err > 0) {
      overCount++;
      if (err > maxOver) maxOver = err;
    } else if (err < 0) {
      underCount++;
      if (err < maxUnder) maxUnder = err;
    } else {
      exactCount++;
    }
  }

  return {
    totalPoints: n,
    mae: sumAbs / n,
    rmse: Math.sqrt(sumSq / n),
    mbe: sumErr / n,
    mape: sumAct > 0 ? (sumAbs / sumAct) * 100 : 0,
    maxOverForecastMW: maxOver,
    maxUnderForecastMW: maxUnder,
    overForecastPct: (overCount / n) * 100,
    underForecastPct: (underCount / n) * 100,
    exactForecastPct: (exactCount / n) * 100,
    avgActualMW: sumAct / n,
    avgForecastMW: sumFc / n,
  };
}

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Track latest request to avoid race conditions if params change quickly
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    const currentRequestId = ++requestIdRef.current;
    const filterParams = { startDate, endDate, cutoffHour, resolution };
    const cacheKey = dashboardCache.generateKey('dashboard', filterParams);
    const masterKey = `${cutoffHour}_${resolution}`;

    // 1. Instant Cache Check: If client cache has this exact query
    if (!forceRefresh) {
      const cached = dashboardCache.get(cacheKey);
      if (cached) {
        setData(cached.data);
        setLastUpdated(cached.timestamp);
        setLoading(false);
        setInitialLoading(false);
        hasLoadedRef.current = true;
        setError(null);
        return;
      }

      // 2. Instant Master Slicing: If we already have the full month for this cutoff & resolution in memory
      const master = masterStore.get(masterKey);
      if (master && master.data?.length) {
        const slicedRecords = master.data.filter(
          (d) => d.deliveryDate >= startDate && d.deliveryDate <= endDate
        );
        if (slicedRecords.length > 0) {
          const slicedSummary = computeSummaryFromRecords(slicedRecords);
          const slicedPayload = {
            ...master.fullPayload,
            dayAhead: {
              ...master.fullPayload.dayAhead,
              data: slicedRecords,
              summary: slicedSummary || master.fullPayload.dayAhead?.summary,
            },
            metrics: {
              ...master.fullPayload.metrics,
              summary: slicedSummary || master.fullPayload.metrics?.summary,
            },
          };
          setData(slicedPayload);
          setLoading(false);
          setInitialLoading(false);
          hasLoadedRef.current = true;
          // Store sliced in cache for future hits
          dashboardCache.set(cacheKey, { data: slicedPayload, timestamp: new Date() });
          return;
        }
      }
    }

    // Only show initial skeleton if we have no data at all in memory
    if (!hasLoadedRef.current) {
      setInitialLoading(true);
    }
    setLoading(true);
    setError(null);

    try {
      if (forceRefresh) {
        dashboardCache.clear();
        masterStore.clear();
        await triggerServerCacheRefresh().catch(() => {});
      }

      // Fetch all 5 endpoints concurrently
      const [dayAhead, metrics, dailyMetrics, hourlyProfile, cutoffComparison] = await Promise.all([
        fetchDayAhead(filterParams),
        fetchMetrics(filterParams),
        fetchDailyMetrics(filterParams),
        fetchHourlyProfile(filterParams),
        fetchCutoffComparison({ startDate, endDate }),
      ]);

      if (currentRequestId !== requestIdRef.current) return;

      const payload = {
        dayAhead,
        metrics,
        dailyMetrics,
        hourlyProfile,
        cutoffComparison,
      };

      const timestamp = new Date();
      dashboardCache.set(cacheKey, { data: payload, timestamp });

      // If this is the full month, save as master store for instant sub-slicing
      if (startDate === '2026-01-01' && endDate === '2026-01-31' && dayAhead?.data?.length) {
        masterStore.set(masterKey, {
          data: dayAhead.data,
          fullPayload: payload,
        });
      }

      setData(payload);
      setLastUpdated(timestamp);
      setLoading(false);
      setInitialLoading(false);
      hasLoadedRef.current = true;
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError(err.message || 'Failed to fetch energy dashboard data');
        setLoading(false);
        setInitialLoading(false);
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
    initialLoading,
    error,
    lastUpdated,
    refresh,
  };
}
