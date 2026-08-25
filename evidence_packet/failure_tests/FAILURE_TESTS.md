# Failure & Recovery Test Suite Matrix

> **SUBMISSION TARGET**: PREPARED FOR INDEPENDENT TESTING
> **EVIDENCE SCOPE**: This document records failure and recovery test results. Each test is classified as RUNTIME TEST PASS (observed at runtime), IMPLEMENTATION VERIFIED / RUNTIME TEST NOT EXECUTED (code inspection only), or BLOCKED / NOT VERIFIED.

---

## Failure Test Results

### Test 1 — Normal Operation (Reachable Runtime Microservices)
- **Condition**: Network request to PRANA (`http://163.128.209.18:8103/health`), KARMA (`http://163.128.209.18:8102/health`), RAJYA (`https://text-risk-scoring-service.onrender.com/health`), and SANSKAR (`https://full-tantra-constitutional-convergence.onrender.com/health`).
- **Expected Result**: HTTP 200 OK with valid JSON response payload.
- **Actual Result**: `apiFetch` successfully resolved JSON responses. Overview strip correctly displays `HEALTHY`.
- **Evidence**: [`evidence_packet/api_samples/prana_health.json`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples/prana_health.json)
- **Verdict**: **PASS**

---

### Test 2 — Service Unavailable (HTTP 503 Render Container Spun Down)
- **Condition**: Network probe to TANTRA (`https://tantra-gated-bridge-infrastructure.onrender.com/health`).
- **Expected Result**: System handles HTTP 503 response without unhandled promise rejections or UI crashes.
- **Actual Result**: `checkServiceHealth` detected `res.status >= 500` (HTTP 503) and classified status as `DEGRADED`.
- **Evidence**: [`evidence_packet/api_samples/tantra_status.json`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples/tantra_status.json)
- **Verdict**: **PASS**

---

### Test 3 — Bucket Service Unavailable
- **Condition**: Query BUCKET service (`https://bhiv-bucket-i1l6.onrender.com/health`) when Render free tier container is asleep.
- **Expected Result**: Widget catches error gracefully, displays `DEGRADED` badge, and preserves local dashboard layout.
- **Actual Result**: `checkServiceHealth` detected HTTP 503 response; UI rendered fallback warning state cleanly without crashing.
- **Evidence**: [`evidence_packet/api_samples/bucket_status.json`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples/bucket_status.json)
- **Verdict**: **PASS**

---

### Test 4 — Network API Timeout (>8000ms Delay)
- **Condition**: Request sent to HARSHA (`https://sl-validator-cet.onrender.com/health`).
- **Expected Result**: Request times out cleanly via `AbortController` within 8 seconds; state set to `TIMEOUT`.
- **Actual Result**: Probe timed out after 8s; `checkServiceHealth` caught `AbortError` and updated state to `TIMEOUT`.
- **Evidence**: [`evidence_packet/api_samples/harsha_status.json`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples/harsha_status.json)
- **Verdict**: **PASS**

---

### Test 5 — Malformed / Invalid JSON Response
- **Condition**: Endpoint returns HTTP 200 with non-JSON text payload.
- **Expected Result**: System catches JSON parse error safely and sets status to `INVALID_RESPONSE`.
- **Actual Result**: `checkServiceHealth` try/catch block at line 110 isolates JSON parsing error and returns `INVALID_RESPONSE`. No runtime test with a real malformed endpoint was executed.
- **Evidence**: Code inspection of [`src/runtime-services-widget.jsx`](file:///c:/Users/Rahil%20Mulani/bhiv-master/src/runtime-services-widget.jsx#L110).
- **Verdict**: **IMPLEMENTATION VERIFIED / RUNTIME TEST NOT EXECUTED**

---

### Test 6 — Empty Response Payload (0 Bytes)
- **Condition**: Endpoint returns HTTP 200 with 0-byte body.
- **Expected Result**: `checkServiceHealth` detects empty string body and returns `EMPTY_RESPONSE`.
- **Actual Result**: Code explicitly validates `if (!text || !text.trim()) return HEALTH_STATES.EMPTY_RESPONSE` at line 108. No runtime test with a real empty endpoint was executed.
- **Evidence**: Code inspection of [`src/runtime-services-widget.jsx`](file:///c:/Users/Rahil%20Mulani/bhiv-master/src/runtime-services-widget.jsx#L108).
- **Verdict**: **IMPLEMENTATION VERIFIED / RUNTIME TEST NOT EXECUTED**

---

### Test 7 — Authentication Failure (HTTP 401 / 403)
- **Condition**: Protected API request returned with HTTP 401 or HTTP 403 status code.
- **Expected Result**: System classifies response as `AUTH_FAILED`.
- **Actual Result**: `checkServiceHealth` explicitly checks `if (res.status === 401 || res.status === 403) return HEALTH_STATES.AUTH_FAILED` at line 104. No safe runtime authentication-failure test was performed against a live endpoint.
- **Evidence**: Code inspection of [`src/runtime-services-widget.jsx`](file:///c:/Users/Rahil%20Mulani/bhiv-master/src/runtime-services-widget.jsx#L104).
- **Verdict**: **IMPLEMENTATION VERIFIED / RUNTIME TEST NOT EXECUTED**

---

### Test 8 — Isolated Dashboard Zone Failure
- **Condition**: Component sub-tree error or missing data inside one dashboard tab.
- **Expected Result**: Failure isolated without affecting unrelated zones.
- **Actual Result**: Not independently verified. No dedicated React Error Boundary component wrapping individual dashboard tabs exists in the codebase. Tab isolation relies on modular component structure but has not been tested with an injected component crash.
- **Evidence**: No dedicated Error Boundary test exists.
- **Verdict**: **BLOCKED / NOT VERIFIED**

---

### Test 9 — Federation Synchronization Failure
- **Condition**: Clicking "Refresh UI State" when backend federation registry is offline.
- **Expected Result**: UI clearly indicates navigation state synchronization without pretending backend API sync occurred.
- **Actual Result**: Button updates local navigation state log and outputs explicit log message: `No backend API call was made. SHAKTI API federation is pending Pratik's contract.`
- **Evidence**: Log array in [`src/bhiv-dashboard-kit.jsx`](file:///c:/Users/Rahil%20Mulani/bhiv-master/src/bhiv-dashboard-kit.jsx#L1725).
- **Verdict**: **NOT APPLICABLE / BLOCKED** (UI-only sync interface; backend federation API unavailable).

---

### Test 10 — Service Failure Recovery
- **Condition**: Service recovers from 503/offline status back to HTTP 200 OK on manual/auto refresh.
- **Expected Result**: Next health check cycle updates state back from `DEGRADED` to `HEALTHY`.
- **Actual Result**: SANSKAR was observed healthy after cold start period. However, no single-session failure→recovery transition was captured with timestamped before/after evidence.
- **Evidence**: [`evidence_packet/api_samples/sanskar_health.json`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples/sanskar_health.json) records the healthy state.
- **Verdict**: **IMPLEMENTATION VERIFIED / RUNTIME TEST NOT EXECUTED** (code path verified; continuous before→after transition evidence not captured)
