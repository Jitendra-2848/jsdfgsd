import os

# Elexon BMRS Public APIs
ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
FUELHH_STREAM_URL = f"{ELEXON_BASE_URL}/datasets/FUELHH/stream"
WINDFOR_STREAM_URL = f"{ELEXON_BASE_URL}/datasets/WINDFOR/stream"

# January 2026 Focus Window
DEFAULT_START_DATE = "2026-01-01"
DEFAULT_END_DATE = "2026-01-31"

# Default Day-Ahead Market Gate Closure (Cutoff Hour in UTC on D-1)
# In the UK, EPEX SPOT Day-Ahead auction gate closes at 11:00 UTC (12:00 CET).
# Nord Pool GB Day-Ahead gate closes at 12:00 UTC.
DEFAULT_CUTOFF_HOUR = 11
DEFAULT_CUTOFF_MINUTE = 0

# HTTP Request Timeout in seconds
HTTP_TIMEOUT = 60.0
