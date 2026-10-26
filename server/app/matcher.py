from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

def parse_iso_utc(ts_str: str) -> datetime:
    """Parse ISO timestamp string to UTC datetime."""
    # Handles strings like '2026-01-01T02:30:00Z' or '+00:00'
    clean_str = ts_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(clean_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def match_day_ahead_data(
    actuals: List[Dict[str, Any]],
    forecasts: List[Dict[str, Any]],
    start_date: str,
    end_date: str,
    cutoff_hour: int = 11,
    cutoff_minute: int = 0,
    resolution: str = "hourly"
) -> List[Dict[str, Any]]:
    """
    Match wind generation forecasts to actuals based on day-ahead decision cutoff timing.

    For each delivery day D in [start_date, end_date]:
    - Cutoff timestamp = (D - 1 day) at cutoff_hour:cutoff_minute UTC
    - For each target timestamp in day D:
      - Filter candidate forecasts where startTime == target and publishTime <= Cutoff(D)
      - Select latest published forecast
      - Match with corresponding actual wind generation
    """
    start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
    end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()

    # Pre-index actuals by (settlementDate, settlementPeriod) and by hour prefix
    # Actuals have 30-min resolution: e.g. '2026-01-01T10:00:00Z' and '2026-01-01T10:30:00Z'
    actuals_by_hour: Dict[str, List[Dict[str, Any]]] = {}
    actuals_by_half_hour: Dict[str, Dict[str, Any]] = {}

    for act in actuals:
        st = act["startTime"]
        actuals_by_half_hour[st] = act
        hour_key = st[:13] # e.g. '2026-01-01T10'
        if hour_key not in actuals_by_hour:
            actuals_by_hour[hour_key] = []
        actuals_by_hour[hour_key].append(act)

    matched_records: List[Dict[str, Any]] = []

    curr_date = start_dt
    while curr_date <= end_dt:
        delivery_date_str = curr_date.strftime("%Y-%m-%d")
        decision_date = curr_date - timedelta(days=1)
        decision_date_str = decision_date.strftime("%Y-%m-%d")

        # Market gate closure timestamp on D-1
        cutoff_dt = datetime(
            decision_date.year,
            decision_date.month,
            decision_date.day,
            cutoff_hour,
            cutoff_minute,
            0,
            tzinfo=timezone.utc
        )
        cutoff_iso = cutoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        # Find all forecasts targeting this delivery date that were published <= cutoff
        candidate_fc = [
            f for f in forecasts
            if f["startTime"].startswith(delivery_date_str) and f["publishTime"] <= cutoff_iso
        ]

        # For each target hour in delivery date (00:00 to 23:00), select the latest forecast
        latest_fc_by_hour: Dict[str, Dict[str, Any]] = {}
        for f in candidate_fc:
            st = f["startTime"]
            if st not in latest_fc_by_hour or f["publishTime"] > latest_fc_by_hour[st]["publishTime"]:
                latest_fc_by_hour[st] = f

        # Generate matched records for 24 hours
        for h in range(24):
            hour_str = f"{delivery_date_str}T{h:02d}:00:00Z"
            hour_prefix = f"{delivery_date_str}T{h:02d}"

            fc_item = latest_fc_by_hour.get(hour_str)
            if not fc_item:
                # If no forecast was published prior to cutoff covering this hour, record as missing
                continue

            forecast_mw = round(fc_item["generation"], 1)
            pub_time = fc_item["publishTime"]
            lead_time_hrs = round((parse_iso_utc(hour_str) - parse_iso_utc(pub_time)).total_seconds() / 3600.0, 1)

            if resolution == "hourly":
                # Average the 2 half-hourly actual periods in this hour
                matching_acts = actuals_by_hour.get(hour_prefix, [])
                if matching_acts:
                    actual_mw = round(sum(a["generation"] for a in matching_acts) / len(matching_acts), 1)
                    settlement_periods = [a["settlementPeriod"] for a in matching_acts]
                else:
                    actual_mw = 0.0
                    settlement_periods = [h * 2 + 1, h * 2 + 2]

                err_mw = round(forecast_mw - actual_mw, 1)
                abs_err = round(abs(err_mw), 1)
                pct_err = round((abs_err / actual_mw * 100), 2) if actual_mw > 0 else 0.0

                matched_records.append({
                    "timestamp": hour_str,
                    "deliveryDate": delivery_date_str,
                    "decisionDate": decision_date_str,
                    "hour": h,
                    "settlementPeriod": settlement_periods[0] if settlement_periods else h * 2 + 1,
                    "settlementPeriods": settlement_periods,
                    "forecastMW": forecast_mw,
                    "actualMW": actual_mw,
                    "errorMW": err_mw,
                    "absErrorMW": abs_err,
                    "percentageError": pct_err,
                    "forecastPublishTime": pub_time,
                    "cutoffTime": cutoff_iso,
                    "leadTimeHours": lead_time_hrs,
                    "errorDirection": "OVER" if err_mw > 0 else ("UNDER" if err_mw < 0 else "EXACT")
                })

            else:
                # Half-hourly resolution (48 settlement periods per day)
                for period_idx in range(2):
                    period_num = h * 2 + period_idx + 1
                    min_str = "00" if period_idx == 0 else "30"
                    hh_ts = f"{delivery_date_str}T{h:02d}:{min_str}:00Z"

                    matching_act = actuals_by_half_hour.get(hh_ts)
                    actual_mw = round(matching_act["generation"], 1) if matching_act else 0.0

                    err_mw = round(forecast_mw - actual_mw, 1)
                    abs_err = round(abs(err_mw), 1)
                    pct_err = round((abs_err / actual_mw * 100), 2) if actual_mw > 0 else 0.0

                    matched_records.append({
                        "timestamp": hh_ts,
                        "deliveryDate": delivery_date_str,
                        "decisionDate": decision_date_str,
                        "hour": h,
                        "settlementPeriod": period_num,
                        "forecastMW": forecast_mw,
                        "actualMW": actual_mw,
                        "errorMW": err_mw,
                        "absErrorMW": abs_err,
                        "percentageError": pct_err,
                        "forecastPublishTime": pub_time,
                        "cutoffTime": cutoff_iso,
                        "leadTimeHours": lead_time_hrs + (0.5 if period_idx == 1 else 0.0),
                        "errorDirection": "OVER" if err_mw > 0 else ("UNDER" if err_mw < 0 else "EXACT")
                    })

        curr_date += timedelta(days=1)

    return matched_records
