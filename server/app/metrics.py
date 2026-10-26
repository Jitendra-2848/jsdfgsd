import math
from typing import List, Dict, Any
from collections import defaultdict

def compute_summary_metrics(matched_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute quantitative forecast error metrics across all matched records.
    """
    if not matched_records:
        return {
            "totalPoints": 0,
            "mae": 0.0,
            "rmse": 0.0,
            "mape": 0.0,
            "mbe": 0.0,
            "maxOverForecastMW": 0.0,
            "maxUnderForecastMW": 0.0,
            "overForecastPct": 0.0,
            "underForecastPct": 0.0,
            "exactForecastPct": 0.0,
            "netImbalanceMWh": 0.0,
            "avgActualMW": 0.0,
            "avgForecastMW": 0.0
        }

    n = len(matched_records)
    total_abs_error = 0.0
    total_sq_error = 0.0
    total_pct_error = 0.0
    total_bias = 0.0
    total_actual = 0.0
    total_forecast = 0.0
    total_imbalance_mwh = 0.0

    max_over = 0.0
    max_under = 0.0
    over_count = 0
    under_count = 0
    exact_count = 0

    valid_pct_count = 0

    for r in matched_records:
        err = r["errorMW"]
        abs_err = r["absErrorMW"]
        pct_err = r["percentageError"]
        actual = r["actualMW"]
        fc = r["forecastMW"]

        total_abs_error += abs_err
        total_sq_error += (err ** 2)
        total_bias += err
        total_actual += actual
        total_forecast += fc

        # Assuming 1 hour for hourly, or 0.5 hour for half-hourly
        interval_hrs = 0.5 if "30:00" in r["timestamp"] else 1.0
        total_imbalance_mwh += (err * interval_hrs)

        if err > 0:
            over_count += 1
            if err > max_over:
                max_over = err
        elif err < 0:
            under_count += 1
            if err < max_under:
                max_under = err
        else:
            exact_count += 1

        if actual > 0:
            total_pct_error += pct_err
            valid_pct_count += 1

    mae = round(total_abs_error / n, 1)
    rmse = round(math.sqrt(total_sq_error / n), 1)
    mape = round(total_pct_error / valid_pct_count, 2) if valid_pct_count > 0 else 0.0
    mbe = round(total_bias / n, 1)

    return {
        "totalPoints": n,
        "mae": mae,
        "rmse": rmse,
        "mape": mape,
        "mbe": mbe,
        "maxOverForecastMW": round(max_over, 1),
        "maxUnderForecastMW": round(max_under, 1),
        "overForecastPct": round((over_count / n) * 100, 1),
        "underForecastPct": round((under_count / n) * 100, 1),
        "exactForecastPct": round((exact_count / n) * 100, 1),
        "netImbalanceMWh": round(total_imbalance_mwh, 1),
        "avgActualMW": round(total_actual / n, 1),
        "avgForecastMW": round(total_forecast / n, 1)
    }


def compute_daily_metrics(matched_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Compute daily aggregated metrics for each delivery date.
    """
    grouped_by_date: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for r in matched_records:
        grouped_by_date[r["deliveryDate"]].append(r)

    daily_list = []
    for date_str in sorted(grouped_by_date.keys()):
        day_records = grouped_by_date[date_str]
        metrics = compute_summary_metrics(day_records)
        daily_list.append({
            "deliveryDate": date_str,
            "decisionDate": day_records[0]["decisionDate"] if day_records else "",
            "points": len(day_records),
            "mae": metrics["mae"],
            "rmse": metrics["rmse"],
            "mape": metrics["mape"],
            "mbe": metrics["mbe"],
            "avgActualMW": metrics["avgActualMW"],
            "avgForecastMW": metrics["avgForecastMW"],
            "maxOverForecastMW": metrics["maxOverForecastMW"],
            "maxUnderForecastMW": metrics["maxUnderForecastMW"],
            "overForecastPct": metrics["overForecastPct"],
            "underForecastPct": metrics["underForecastPct"],
            "netImbalanceMWh": metrics["netImbalanceMWh"]
        })

    return daily_list


def compute_hourly_profile(matched_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Compute error profile aggregated by hour of the day (0 to 23).
    Reveals systemic intraday forecasting bias (e.g., morning or evening ramps).
    """
    grouped_by_hour: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
    for r in matched_records:
        grouped_by_hour[r["hour"]].append(r)

    hourly_profile = []
    for h in range(24):
        records = grouped_by_hour.get(h, [])
        if not records:
            continue
        metrics = compute_summary_metrics(records)
        hourly_profile.append({
            "hour": h,
            "hourLabel": f"{h:02d}:00",
            "points": len(records),
            "mae": metrics["mae"],
            "rmse": metrics["rmse"],
            "mape": metrics["mape"],
            "mbe": metrics["mbe"],
            "avgActualMW": metrics["avgActualMW"],
            "avgForecastMW": metrics["avgForecastMW"]
        })

    return hourly_profile
