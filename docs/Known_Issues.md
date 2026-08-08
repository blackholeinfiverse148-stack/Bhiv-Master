# Known Issues & Limitations

This document lists the currently identified constraints, placeholders, and connection warnings within the BHIV-ECC Dashboard.

## 1. Missing Endpoint Configuration

*   **URL_HARSHA Placeholder:** The base URL for Harsha Pawar's CET, KSML, and SUM-SCRIPT services is set to `null` in `runtime-services-widget.jsx:L29`.
    *   *Symptom:* The HARSHA panel displays a warning banner: `⚠ Waiting for Harsha's base URL`.
    *   *Workaround:* The base URL must be set in `runtime-services-widget.jsx` once provided.

## 2. Network and CORS Failures

*   **Service Degradation / Failed to Fetch:** PRANA, TANTRA, and SANSKAR backend services hosted on Render go to sleep when inactive.
    *   *Symptom:* The health dashboard displays a red "degraded" dot next to PRANA or SANSKAR.
    *   *Mitigation:* Click "Retry" or "Refresh" to wake up the Render instance.

## 3. Telemetry Replay Limitations

*   **Offline Telemetry:** The replay feature in the Runtime Services widget utilizes local mocks when backend history is unavailable.
    *   *Symptom:* Traces may show synthetic data when replaying logs if the target service connection times out.
