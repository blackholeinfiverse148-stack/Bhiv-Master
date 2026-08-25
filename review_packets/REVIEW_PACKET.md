# REVIEW PACKET — BHIV Master

> **SUBMISSION TARGET**: APPROVED FOR INDEPENDENT TESTING
> **EVIDENCE SCOPE**: This review packet distinguishes empirically verified integrations, implementation-level validation, UI-only functionality, degraded dependencies, blocked external dependencies, and unverified capabilities.

---

## 1. Entry Points

### 1.1 Frontend Application Entry
- **Root HTML Entry**: [`index.html`](file:///c:/Users/Rahil%20Mulani/bhiv-master/index.html)
- **React Mounting Script**: [`src/main.jsx`](file:///c:/Users/Rahil%20Mulani/bhiv-master/src/main.jsx)
- **Root Application Router / Context**: [`src/bhiv-dashboard-kit.jsx`](file:///c:/Users/Rahil%20Mulani/bhiv-master/src/bhiv-dashboard-kit.jsx)

### 1.2 Development Execution Entry

```bash
npm run dev
# Launches Vite dev server at http://localhost:5173
```

### 1.3 Production Execution Entry

```bash
npm run build
# Compiles static bundle to dist/
```

*Note: No custom backend server exists in this repository. All backend interactions are client-side HTTP requests to remote BHIV service endpoints.*

---

## 2. Runtime System Flow Map

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                         SHAKTI Master Dashboard                          │
│                (Local UI Navigation Hub & Node Topology)                 │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    ┌───────────────────────────┐           ┌───────────────────────────┐
    │ SHAKTI Federation Registry│           │  Runtime Services Widget  │
    │   Status: BLOCKED/UNKNOWN │           │  (7-Service Monitor)      │
    └───────────────────────────┘           └─────────────┬─────────────┘
                                                          │
          ┌───────────────────────┬───────────────────────┼───────────────────────┬───────────────────────┐
          ▼                       ▼                       ▼                       ▼                       ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│    PRANA API     │    │    KARMA API     │    │    RAJYA API     │    │   SANSKAR API    │    │   TANTRA / BUCKET│
│ 163.128.209.18   │    │ 163.128.209.18   │    │ text-risk-scoring│    │ full-tantra-conv │    │ Render Services  │
│ [LIVE / VERIFIED]│    │ [LIVE / VERIFIED]│    │ [LIVE / VERIFIED]│    │ [LIVE / VERIFIED]│    │ [DEGRADED (503)] │
└─────────┬────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
          │
          ▼
┌──────────────────┐
│  PRANA Replay    │
│  GET /replay/{id}│
│ [BLOCKED/UNVERIFIED]  │
└──────────────────┘
```

---

## 3. Core Execution Flow Files (Top 3)

### File 1: [`src/bhiv-dashboard-kit.jsx`](file:///c:/Users/Rahil%20Mulani/bhiv-master/src/bhiv-dashboard-kit.jsx)
- **Purpose**: Defines main layout frame, SHAKTI Master dashboard hub, navigation tabs, UI context state providers (`ThemeCtx`, `AuditCtx`, `PanelCtx`, `NotifCtx`, `NavCtx`), and demonstration dashboard views.
- **Key Functions**: `BHIVDashboardKit`, `ShaktiMasterDashboard`, `SituationBar`, `ThreatCard`.

### File 2: [`src/runtime-services-widget.jsx`](file:///c:/Users/Rahil%20Mulani/bhiv-master/src/runtime-services-widget.jsx)
- **Purpose**: Implements real-time monitoring and execution panels for all 7 BHIV microservices (PRANA, KARMA, RAJYA, TANTRA, BUCKET, SANSKAR, HARSHA). Enforces deterministic health state classification (`checkServiceHealth`) and handles live API responses.
- **Key Functions**: `RuntimeServicesWidget`, `checkServiceHealth`, `OverviewStrip`, `PranaPanel`, `ReplayPanel`.

### File 3: [`src/bucket-integration.jsx`](file:///c:/Users/Rahil%20Mulani/bhiv-master/src/bucket-integration.jsx)
- **Purpose**: Provides provenance chain visualizer and artifact inspection interfaces connecting to BUCKET storage endpoints.
- **Key Functions**: `BucketWidget`, `ArtifactTable`, `ProvenanceChainViewer`.

---

## 4. Live Data Flow Example

1. **User Action**: User opens the **Runtime Services** tab in the dashboard and clicks **Refresh** on the PRANA panel.
2. **System Path**: `RuntimeServicesWidget` → `PranaPanel` → `apiGet(URL_PRANA, "/health")` → `fetch("http://163.128.209.18:8103/health")`.
3. **Real HTTP Response**:
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
4. **Evidence File**: [`evidence_packet/api_samples/prana_health.json`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples/prana_health.json)

---

## 5. Summary of Code Changes

### Added
- Created `README.md`, `INTEGRATION.md`, `HANDOVER.md`, `CHANGELOG.md` at repository root.
- Created `review_packets/REVIEW_PACKET.md` and `review_packets/CODE_PACKET.md`.
- Created live API samples in `evidence_packet/api_samples/`.
- Created `UiOnlyDemoBanner` in `bhiv-dashboard-kit.jsx`.

### Modified
- Repaired corrupted `SituationBar` and restored missing Section 8 widget components in `src/bhiv-dashboard-kit.jsx`.
- Refactored `src/runtime-services-widget.jsx` health handling to use deterministic state classification (`checkServiceHealth`) and initialized services as `CHECKING` instead of hardcoded `rajya: true`.
- Updated footer in `runtime-services-widget.jsx` to accurately reflect live vs configured endpoints.

### Untouched
- `src/App.jsx`
- `src/main.jsx`
- `src/bucket-integration.jsx` (retained existing provenance logic)

---

## 6. Failure Case Classification & System Behavior

| Failure Scenario | Trigger Condition | System Behavior | Display Status |
| :--- | :--- | :--- | :--- |
| **Invalid Input** | Malformed JSON sent to endpoint | Parsed safely; error box displays HTTP error details | `INVALID_RESPONSE` / Error Alert |
| **Backend Down** | Server unreachable / Connection refused | `fetch` throws network error | `OFFLINE` (Crit Red Dot) |
| **Empty Response** | Endpoint returns 200 with 0 bytes | `apiFetch` detects empty text | `EMPTY_RESPONSE` (Warning Badge) |
| **Node Unavailable** | Render container asleep / 503 | `res.status >= 500` detected | `DEGRADED` (503 Badge) |
| **Bucket Unavailable**| PRANA forward fails due to 503 | Propagation log records `http_status: 503` | Status: `failed` in PRANA log |
| **API Timeout** | Response time exceeds 8000ms | `AbortController` triggers timeout signal | `TIMEOUT` (Crit Red Dot) |
| **Auth Failure** | HTTP 401 / 403 response | `res.status === 401/403` detected | `AUTH_FAILED` |

---

## 7. Verification Evidence References

- **ESLint Output**: [`evidence_packet/runtime_logs/lint.log`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/runtime_logs/lint.log) (0 errors)
- **Build Output**: [`evidence_packet/runtime_logs/build.log`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/runtime_logs/build.log) (Success)
- **Live API Outputs**: [`evidence_packet/api_samples/`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples)
- **Deployment Status**: [`evidence_packet/deployment_proof/STATUS.md`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/deployment_proof/STATUS.md)
