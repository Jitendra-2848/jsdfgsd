import time
import json
import statistics
import httpx

BASE_URL = "http://127.0.0.1:5000"

ENDPOINTS = [
    {
        "name": "Day-Ahead Timeseries",
        "path": "/api/energy/day-ahead?startDate=2026-01-01&endDate=2026-01-31&cutoffHour=11&resolution=hourly",
        "description": "Full month 744 hours hourly forecast vs actual with error metrics"
    },
    {
        "name": "Executive Metrics Summary",
        "path": "/api/energy/metrics?startDate=2026-01-01&endDate=2026-01-31&cutoffHour=11&resolution=hourly",
        "description": "MAE, RMSE, MAPE, MBE, bias distributions and net imbalance"
    },
    {
        "name": "Daily Metrics Breakdown",
        "path": "/api/energy/daily-metrics?startDate=2026-01-01&endDate=2026-01-31&cutoffHour=11&resolution=hourly",
        "description": "31-day daily reconciliation rows with MAE, RMSE, MBE"
    },
    {
        "name": "Hourly Diurnal Profile",
        "path": "/api/energy/hourly-profile?startDate=2026-01-01&endDate=2026-01-31&cutoffHour=11&resolution=hourly",
        "description": "24-hour diurnal error curves (00:00 to 23:00)"
    },
    {
        "name": "Cutoff Milestone Comparison",
        "path": "/api/energy/cutoff-comparison?startDate=2026-01-01&endDate=2026-01-31",
        "description": "Comparison of 5 decision milestones (09:00, 11:00, 12:00, 14:00, 17:00)"
    }
]

def run_benchmarks(iterations=10):
    client = httpx.Client(timeout=30.0)
    results = []

    print("=" * 70)
    print("STARTING LATENCY & PARAMETER BENCHMARK HARNESS")
    print(f"Target: {BASE_URL} | Warm Iterations per Endpoint: {iterations}")
    print("=" * 70)

    # 1. Clear cache first to test cold start
    print("\n[1/3] Clearing backend cache...")
    try:
        resp = client.post(f"{BASE_URL}/api/energy/refresh")
        assert resp.status_code == 200
        print("Backend cache successfully cleared.")
    except Exception as e:
        print(f"Warning: Could not clear cache: {e}")

    # 2. Benchmark each endpoint
    for ep in ENDPOINTS:
        url = f"{BASE_URL}{ep['path']}"
        print(f"\nBenchmarking: {ep['name']}...")

        # Measure Cold Latency (First Hit)
        t0 = time.perf_counter()
        cold_resp = client.get(url)
        t_cold = (time.perf_counter() - t0) * 1000.0
        assert cold_resp.status_code == 200, f"Error {cold_resp.status_code}"

        payload_bytes = len(cold_resp.content)
        data = cold_resp.json()

        # Measure Warm Latency across iterations
        warm_times = []
        for _ in range(iterations):
            t_start = time.perf_counter()
            r = client.get(url)
            elapsed_ms = (time.perf_counter() - t_start) * 1000.0
            assert r.status_code == 200
            warm_times.append(elapsed_ms)

        mean_warm = statistics.mean(warm_times)
        p50 = statistics.median(warm_times)
        min_warm = min(warm_times)
        max_warm = max(warm_times)
        # Approximate p95
        sorted_times = sorted(warm_times)
        p95_idx = int(0.95 * len(sorted_times))
        p95 = sorted_times[min(p95_idx, len(sorted_times) - 1)]

        speedup = t_cold / max(mean_warm, 0.001)

        metric_item = {
            "name": ep["name"],
            "path": ep["path"],
            "payload_kb": round(payload_bytes / 1024.0, 2),
            "cold_latency_ms": round(t_cold, 2),
            "warm_mean_ms": round(mean_warm, 2),
            "warm_min_ms": round(min_warm, 2),
            "warm_max_ms": round(max_warm, 2),
            "warm_p50_ms": round(p50, 2),
            "warm_p95_ms": round(p95, 2),
            "speedup_x": round(speedup, 1),
            "sample_data": data
        }
        results.append(metric_item)

        print(f"  Cold Latency: {t_cold:.1f} ms | Warm Mean: {mean_warm:.2f} ms (p95: {p95:.2f} ms)")
        print(f"  Payload: {payload_bytes / 1024:.1f} KB | Cache Speedup: {speedup:.1f}x")

    return results

if __name__ == "__main__":
    benchmark_data = run_benchmarks(iterations=10)
    with open("benchmark_results.json", "w") as f:
        json.dump(benchmark_data, f, indent=2)
    print("\nBenchmark results written to benchmark_results.json")
