import assert from 'assert';
import { dashboardCache } from '../src/services/cacheService.js';

console.log("=== RUNNING FRONTEND CACHE SERVICE TESTS ===");

// Test 1: Generate composite key
const key1 = dashboardCache.generateKey('dashboard', {
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  cutoffHour: 11,
  resolution: 'hourly'
});

const key2 = dashboardCache.generateKey('dashboard', {
  resolution: 'hourly',
  cutoffHour: 11,
  endDate: '2026-01-31',
  startDate: '2026-01-01'
});

assert.strictEqual(key1, key2, "Cache key generation must be deterministic regardless of object key order");
console.log("✓ Test 1: Deterministic key generation passed");

// Test 2: Set and Get
dashboardCache.set(key1, { points: 744, mae: 2122.8 });
const retrieved = dashboardCache.get(key1);
assert.notStrictEqual(retrieved, null);
assert.strictEqual(retrieved.points, 744);
assert.strictEqual(retrieved.mae, 2122.8);
console.log("✓ Test 2: In-memory set and get passed");

// Test 3: Cache Miss
assert.strictEqual(dashboardCache.get("non-existent-key"), null);
console.log("✓ Test 3: Cache miss handling passed");

// Test 4: Clear
dashboardCache.clear();
assert.strictEqual(dashboardCache.get(key1), null);
console.log("✓ Test 4: Cache clear passed");

// Test 5: Latency benchmark of client-side cache
const benchData = { timeseries: new Array(744).fill({ actualMW: 12000, forecastMW: 13500 }) };
dashboardCache.set("bench_key", benchData);

const iterations = 10000;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  const d = dashboardCache.get("bench_key");
  if (!d) throw new Error("Expected cache hit");
}
const elapsed = performance.now() - start;
const avgUs = (elapsed / iterations) * 1000;

console.log(`✓ Test 5: Client Cache Retrieval Speed: ${avgUs.toFixed(3)} microseconds per hit (${iterations} iterations in ${elapsed.toFixed(2)} ms)`);
console.log("ALL FRONTEND TESTS PASSED!\n");
