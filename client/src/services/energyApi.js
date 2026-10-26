/**
 * Energy API service for communicating with FastAPI backend.
 * Provides typed query parameter serialization and robust error handling.
 */

const API_BASE = '/api/energy';

async function fetchJson(endpoint, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      query.append(key, value);
    }
  }

  const url = `${API_BASE}${endpoint}${query.toString() ? `?${query.toString()}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let parsedMessage = errorBody;
    try {
      const errObj = JSON.parse(errorBody);
      parsedMessage = errObj.detail || errObj.message || errorBody;
    } catch {
      // Keep plain text
    }
    throw new Error(`API Error [${response.status}]: ${parsedMessage}`);
  }

  return response.json();
}

export async function fetchDayAhead({ startDate = '2026-01-01', endDate = '2026-01-31', cutoffHour = 11, resolution = 'hourly' } = {}) {
  return fetchJson('/day-ahead', { startDate, endDate, cutoffHour, resolution });
}

export async function fetchMetrics({ startDate = '2026-01-01', endDate = '2026-01-31', cutoffHour = 11, resolution = 'hourly' } = {}) {
  return fetchJson('/metrics', { startDate, endDate, cutoffHour, resolution });
}

export async function fetchDailyMetrics({ startDate = '2026-01-01', endDate = '2026-01-31', cutoffHour = 11, resolution = 'hourly' } = {}) {
  return fetchJson('/daily-metrics', { startDate, endDate, cutoffHour, resolution });
}

export async function fetchHourlyProfile({ startDate = '2026-01-01', endDate = '2026-01-31', cutoffHour = 11, resolution = 'hourly' } = {}) {
  return fetchJson('/hourly-profile', { startDate, endDate, cutoffHour, resolution });
}

export async function fetchCutoffComparison({ startDate = '2026-01-01', endDate = '2026-01-31' } = {}) {
  return fetchJson('/cutoff-comparison', { startDate, endDate });
}

export async function triggerServerCacheRefresh() {
  const response = await fetch(`${API_BASE}/refresh`, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Failed to refresh backend cache');
  }
  return response.json();
}
