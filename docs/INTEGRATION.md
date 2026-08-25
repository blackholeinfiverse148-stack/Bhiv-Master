# INTEGRATION.md
## BHIV-ECC Dashboard Kit v3 — Live Integration Status

**Last updated:** August 2026
**Author:** Rahil Mulani

---

## Integration Summary

| Service | Base URL | Method | Endpoints Used | Status | Verified |
|---|---|---|---|---|---|
| PRANA | `http://163.128.209.18:8103` | GET | `/health`, `/prana/system/health`, `/prana/propagation-log`, `/replay/{id}` | ✅ Live | Yes |
| KARMA | `http://163.128.209.18:8102` | GET/POST | `/health`, `/karma/latest-hash`, `/karma/verify` | ✅ Live | Yes |
| RAJYA | `https://text-risk-scoring-service.onrender.com` | POST | `/api/v1/rajya/validate` | ✅ Live | Yes |
| BUCKET | `https://bhiv-bucket-i1l6.onrender.com` | GET | `/health`, `/bucket/artifacts`, `/bucket/artifact/{id}`, `/bucket/chain-state`, `/bucket/storage-stats` | ✅ Live | Yes |
| SANSKAR | `https://full-tantra-constitutional-convergence.onrender.com` | GET | `/health` | ✅ Live | Partial schema |
| TANTRA | `https://tantra-gated-bridge-infrastructure.onrender.com` | GET | `/health` (raw) | ⚠️ Partial | URL only |
| HARSHA | `null` | POST | `/compile_execution`, `/cet/compile`, `/forward_to_sarathi`, `/enforce_execution`, `/validate_execution`, `/execute` | 🔄 Blocked | Awaiting URL |
| InsightFlow | Not received | — | — | ❌ Blocked | Not started |
| SHAKTI Fed. | N/A | UI | click-to-navigate, breadcrumb, sync log | ⚠️ UI only | No API |

---

## PRANA Integration

**Owner:** Rukayya Ansari
**Base URL:** `http://163.128.209.18:8103`
**Component:** `PranaPanel` in `src/runtime-services-widget.jsx`

### Endpoints
```
GET /health                          → service status, MongoDB connection, forwarding state
GET /prana/system/health             → mode, replay_records_count, last_replay_timestamp, core_services
GET /prana/propagation-log?limit=20  → last 20 forwarding events
GET /replay/{trace_id}               → full execution replay by trace ID
```

### Sample real response — GET /health
```json
{
  "status": "healthy",
  "service": "bhiv-prana",
  "forwarding_enabled": true,
  "mongodb": {
    "mongodb_connected": true,
    "database_name": "prana",
    "connection_status": "connected"
  }
}
```

### Known issue
PRANA runs on HTTP (`163.128.209.18`). When dashboard is deployed on HTTPS, browsers
block the request due to mixed content policy. CORS resolution needed from Rukayya.

---

## KARMA Integration

**Owner:** Rukayya Ansari
**Base URL:** `http://163.128.209.18:8102`
**Component:** `KarmaPanel` in `src/runtime-services-widget.jsx`

### Endpoints
```
GET  /health              → service health
GET  /karma/latest-hash   → latest chain hash, sequence number
POST /karma/verify        → live chain verification — returns MATCH/MISMATCH
POST /karma/ingest        → (not used in dashboard — write operation)
POST /karma/replay        → (not used in dashboard — write operation)
```

### Sample real response — GET /karma/latest-hash
```json
{
  "chain": "main",
  "sequence": 1,
  "latest_hash": "sha256_hash_value",
  "event_id": "event-001"
}
```

---

## RAJYA Integration

**Owner:** Rajaryan Verma
**Base URL:** `https://text-risk-scoring-service.onrender.com`
**Component:** `RajyaPanel` in `src/runtime-services-widget.jsx`

### Endpoint
```
POST /api/v1/rajya/validate
```

### Request contract
```json
{
  "execution_id": "c8f2b77a-2454-4712-baea-35b8696d744f",
  "sarathi_decision": "ALLOW",
  "sarathi_execution_id": "c8f2b77a-2454-4712-baea-35b8696d744f",
  "enforcement_verdict": {
    "execution_id": "c8f2b77a-2454-4712-baea-35b8696d744f",
    "enforcement_decision": "ALLOW",
    "trace_hash": "a75eace926f5277e27b8da32a22c56436ed80086f2f221627a3ef74a5adde68c",
    "risk_score": 0.15,
    "confidence": 0.95
  }
}
```

### Response — ALLOW
```json
{ "status": "EXECUTION_APPROVED" }
```

### Response — DENY
```json
{
  "status": "REJECT",
  "rejection_code": "RAJYA_SARATHI_NOT_ALLOW",
  "rejection_reason": "Sarathi decision is not ALLOW"
}
```

---

## BUCKET Integration

**Owner:** Siddhesh Narkar
**Base URL:** `https://bhiv-bucket-i1l6.onrender.com`
**Components:** `BucketPanel` (runtime widget) + `BucketWidget` (full artifact browser)

### Critical API note
The API wraps every artifact in a nested `"artifact"` key:
```json
{
  "artifact": {
    "artifact_id": "sub-1",
    "artifact_type": "task_submit",
    "timestamp_utc": "2026-08-01T10:00:00Z",
    "payload": {},
    "parent_hash": "..."
  },
  "storage_type": "append_only",
  "chain_verified": true
}
```
Code unwraps `data.artifact` before reading fields. This was the critical fix
applied after observing raw JSON from the live API response.

---

## TANTRA Integration

**Owner:** Ranjit Patil
**Base URL:** `https://tantra-gated-bridge-infrastructure.onrender.com`
**Status:** PARTIAL — URL received, endpoint contract not received

The panel tries `/health`, `/`, `/status` in parallel and shows the raw JSON response
of whichever succeeds. Structured display pending Ranjit's endpoint documentation.

---

## HARSHA Integration

**Owner:** Harsha Pawar
**Status:** BLOCKED — base URL not received as of August 2026

### All 6 endpoints are wired and ready in `HarshaPanel`:
```
POST /compile_execution    → KSML: compile input into deterministic SUM-SCRIPT
POST /cet/compile          → CET: compiler, returns SUM-SCRIPT + contract hash
POST /forward_to_sarathi   → Forward compiled SUM-SCRIPT to Sarathi stage
POST /enforce_execution    → Sarathi enforcement, generate enforcement token
POST /validate_execution   → Bridge validation before execution
POST /execute              → Execute the validated SUM-SCRIPT
```

**To activate:** Set `URL_HARSHA = "https://actual-url"` in `src/runtime-services-widget.jsx` line 29.
Estimated effort once URL received: 30 seconds.

---

## SHAKTI Master Federation

**Owner:** Pratik
**Status:** UI federation implemented. API-level federation pending Pratik's widget registration format.

**What is implemented:**
- `ShaktiMasterDashboard` component in `src/bhiv-dashboard-kit.jsx`
- 9-node registry table with click-to-navigate to each sub-dashboard
- Topbar breadcrumb (`SHAKTI Master > Active Dashboard`)
- Synchronize Federation button (UI-level, logs update on click)
- Node status display

**What is NOT implemented (pending):**
- Real-time node health from a SHAKTI API endpoint
- API-driven node hash verification (currently hardcoded hashes)
- Actual federation synchronization via Pratik's backend
- Node metrics (events verified, security index) from live data

---

## InsightFlow

**Owner:** Vijay Dhawan
**Status:** BLOCKED — no endpoints received

No integration. No placeholder panel. Marked BLOCKED with evidence.

---

## HTTP/HTTPS Known Constraint

PRANA (`163.128.209.18:8103`) and KARMA (`163.128.209.18:8102`) run on HTTP.
When the dashboard is deployed to an HTTPS domain, browsers enforce mixed content
policy and block these requests.

**Impact:** Both panels show connection errors on any HTTPS deployment.
**Resolution needed from:** Rukayya Ansari (add HTTPS or set up reverse proxy).
**Current workaround:** Run dashboard on HTTP locally — all panels work correctly.
