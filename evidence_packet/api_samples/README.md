# API Samples Evidence

This directory contains sanitized JSON outputs from live API health probes performed during the audit session.

Each JSON file contains a `_metadata` wrapper with:
- `service`: Service name
- `endpoint`: API endpoint path
- `url`: Full request URL
- `method`: HTTP method
- `http_status`: Response HTTP status code (null if no response received)
- `timestamp`: When probe was executed (or "Not captured" if exact time was not recorded)
- `verification`: Classification status

The `response` field contains the actual JSON payload returned by the service, or `null` if no valid response was received.

## Files

| File | Service | HTTP Status | Classification |
| :--- | :--- | :--- | :--- |
| `prana_health.json` | PRANA | 200 | LIVE / VERIFIED |
| `karma_health.json` | KARMA | 200 | LIVE / VERIFIED |
| `rajya_health.json` | RAJYA | 200 | LIVE / VERIFIED |
| `sanskar_health.json` | SANSKAR | 200 | LIVE / HEALTH VERIFIED |
| `tantra_status.json` | TANTRA | 503 | CONFIGURED / DEGRADED |
| `bucket_status.json` | BUCKET | 503 | CONFIGURED / DEGRADED |
| `harsha_status.json` | HARSHA | Timeout | CONFIGURED / UNVERIFIED |
| `prana_replay.json` | PRANA Replay | 200 | BLOCKED / UNVERIFIED |
