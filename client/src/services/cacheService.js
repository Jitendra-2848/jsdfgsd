/**
 * Client-side in-memory cache with TTL for dashboard data.
 * Avoids redundant network round-trips when switching between views or filters.
 */

class DashboardCache {
  constructor(defaultTtlMs = 10 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  generateKey(prefix, params = {}) {
    const sortedEntries = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
    return `${prefix}:${JSON.stringify(sortedEntries)}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key, data, ttlMs = this.defaultTtlMs) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  clear() {
    this.cache.clear();
  }
}

export const dashboardCache = new DashboardCache();
