# REVIEW_PACKET.md
## BHIV-ECC Dashboard Kit v3 — Reviewer Entry Point

**Candidate:** Rahil Mulani | Data Science & AI Intern
**Sprint:** Live Federation Proof and VM Certification
**Submission target:** APPROVED FOR INDEPENDENT TESTING

---

## Entry Point

### Frontend entry
```
File:    src/main.jsx
Purpose: Mounts BHIVDashboardKit — the root React component
Start:   npm install && npm run dev → http://localhost:5173
```

### Backend / API entry
```
All services called via fetch() from the browser.
No dashboard backend exists. Service URLs are constants in:
  src/runtime-services-widget.jsx  (lines 19-29)
  src/bucket-integration.jsx       (line 7)
```

### System start (local)
```bash
git clone https://github.com/rahilmulani025/Bhiv-Master.git
cd Bhiv-Master
npm install
npm run dev
# → http://localhost:5173
```

### Production start
```bash
npm run build
# Deploy dist/ to Vercel / any static host
# No server-side code required
```

---

## Core Execution Flow — Maximum 3 Critical Files

### File 1: `src/bhiv-dashboard-kit.jsx`
**Purpose:** Main dashboard shell. 9 tabs, 19 components, SHAKTI Master Gateway,
command engine, 4 React Contexts, dark/light theme, design token system.
**Key sections:**
- Lines 1-30: Design tokens (DS object) — single source of all visual values
- Lines 31-120: Mock data (MOCK) — used only by 7 demo tabs
- Lines 121-600: Primitive + widget components
- Lines 601-900: Chart wrapper components + Command system
- Lines 901-1400: 7 demo dashboard pages + ShaktiMasterDashboard
- Lines 1401-1868: Sidebar, Topbar, Root App

### File 2: `src/runtime-services-widget.jsx`
**Purpose:** Live runtime integration. All 7 service panels, real API calls,
8-second timeout, retry on failure, deterministic health classification.
**Key sections:**
- Lines 19-29: Service URL constants (change URL_HARSHA here when received)
- Lines 60-100: `apiGet()` and `apiPost()` with timeout
- Lines 200-350: PranaPanel (3 tabs: health/system/propagation)
- Lines 351-450: KarmaPanel (3 tabs: health/chain/verify)
- Lines 451-530: RajyaPanel (ALLOW/DENY/ABSTAIN validation)
- Lines 531-600: TantraPanel (raw response)
- Lines 601-680: BucketPanel + SanskarPanel
- Lines 681-820: HarshaPanel (6 endpoints wired, awaiting URL)
- Lines 821-880: ReplayPanel (PRANA trace replay)
- Lines 881-1146: OverviewStrip + Root RuntimeServicesWidget

### File 3: `src/bucket-integration.jsx`
**Purpose:** Full Bucket artifact browser. Health panel, 100-artifact list with
search and type filters, per-artifact detail view with chain_verified display.
**Key sections:**
- Line 7: BASE_URL constant (`https://bhiv-bucket-i1l6.onrender.com`)
- Lines 150-220: HealthPanel (3 parallel calls: /health, /chain-state, /storage-stats)
- Lines 221-350: ArtifactList (100 artifacts, filter tabs, search)
- Lines 351-530: ArtifactDetail (unwraps `data.artifact`, shows all fields)
- Line 530+: Root BucketWidget export

---

## Live Flow — What a Real Execution Looks Like

### Flow 1: Karma chain verification
```
User action:   Click "Runtime Services" in sidebar
System path:   RuntimeServicesWidget mounts
               → parallel health checks on all 7 services
               → KarmaPanel fetches GET /karma/latest-hash
               → displays real chain hash + sequence number

User action:   Click "Verify" tab → click "Run Chain Verification"
System path:   POST http://163.128.209.18:8102/karma/verify
               body: {}
Real response: { "status": "MATCH", "chain_valid": true, "matches": N, "mismatches": 0 }
               or   { "status": "MISMATCH", "chain_valid": false, ... }
Dashboard:     Shows MATCH/MISMATCH badge + hash comparison
```

### Flow 2: RAJYA governance validation
```
User action:   RAJYA panel → select DENY → click "Run RAJYA Validation"
System path:   POST https://text-risk-scoring-service.onrender.com/api/v1/rajya/validate
               body: { execution_id, sarathi_decision: "DENY", enforcement_verdict: { ... } }
Real response: { "status": "REJECT", "rejection_code": "RAJYA_SARATHI_NOT_ALLOW", "rejection_reason": "..." }
Dashboard:     Shows red REJECT banner + rejection_code + rejection_reason
```

### Flow 3: Bucket artifact drill-down
```
User action:   Click "Bucket / Evidence" in sidebar
System path:   GET https://bhiv-bucket-i1l6.onrender.com/bucket/artifacts?limit=100
Real response: Array of 100 items, each: { artifact: { artifact_id, artifact_type, ... }, chain_verified: true }
Dashboard:     100 rows render with type badges and timestamps

User action:   Click row "sub-1"
System path:   GET https://bhiv-bucket-i1l6.onrender.com/bucket/artifact/sub-1
Real response: { artifact: { artifact_id: "sub-1", artifact_type: "task_submit", payload: {...} },
                 storage_type: "append_only", chain_verified: true }
Dashboard:     Shows Type, Storage Type, Timestamp, Source Module, chain_verified banner
```

---

## What Changed in This Sprint

### Added
- `src/runtime-services-widget.jsx` — entire file, all 7 service panels, live
- `ShaktiMasterDashboard` component — SHAKTI Master federation hub
- `GovernmentDashboard` component — was missing from Test 3 delivery
- `TelemetryCard`, `WorkflowCard`, `ReplayCard`, `ExecutiveMetricCard` components
- `review_packets/REVIEW_PACKET.md` — this file
- `evidence_packet/` folder structure
- `DEP/` folder — Daily Engineering Packet
- `INTEGRATION.md`, `HANDOVER.md`, `CHANGELOG.md` at repo root
- Full `docs/` package (12 files)

### Modified
- `src/bucket-integration.jsx` — critical fix: unwrap `data.artifact` nested object
- `src/bhiv-dashboard-kit.jsx` — added SHAKTI Master, Government, 4 missing components,
  fixed CommandPanel implicit global bug, removed unused imports

### Untouched
- `vite.config.js` — no change needed
- `package.json` — no new dependencies
- `index.html` — no change needed
- `src/App.css` — not used (inline styles throughout)

---

## Failure Cases — How Each Is Handled

| Failure | Input/Condition | Expected | Actual |
|---|---|---|---|
| Backend down | Service returns error | Error card + Retry button | ✅ Implemented |
| API timeout | Request takes >8s | Timeout error + Retry | ✅ Implemented (AbortController) |
| Empty response | API returns empty/null | Empty state with message | ✅ Implemented |
| Malformed response | Unexpected JSON shape | Field shows "—", raw JSON toggle | ✅ Implemented |
| HARSHA unavailable | URL_HARSHA = null | Waiting state with endpoint list | ✅ Implemented |
| Node offline | Service unreachable | Red error card, other panels unaffected | ✅ Implemented (Promise.allSettled) |
| Auth failure | 401/403 response | HTTP error code shown | ✅ Partially (no auth headers yet) |
| Stale data | source.freshness = "stale" | Orange "stale" badge on source | ✅ Implemented in Bucket |
| Chain unverified | chain_verified: false | Red "verification failed" banner | ✅ Implemented in Bucket |
| ABSTAIN from RAJYA | status: REJECT | Red REJECT banner + rejection_code | ✅ Implemented |

---

## Proof References

| Evidence | Location |
|---|---|
| Screenshots | `evidence_packet/screenshots/` |
| API samples | `evidence_packet/api_samples/` |
| Runtime logs | `evidence_packet/runtime_logs/` |
| Deployment proof | `evidence_packet/deployment_proof/` |
| Code packet | `evidence_packet/code_packet/` |

---

## Integration Status

| Service | Live | Verified | Blocker |
|---|---|---|---|
| PRANA | ✅ | ✅ | HTTP only |
| KARMA | ✅ | ✅ | HTTP only |
| RAJYA | ✅ | ✅ | None |
| BUCKET | ✅ | ✅ | None |
| SANSKAR | ✅ | Partial | Schema unknown |
| TANTRA | ⚠️ | Partial | No endpoint docs |
| HARSHA | 🔄 | No | URL not received |
| InsightFlow | ❌ | No | No endpoints received |
| SHAKTI API | ⚠️ | UI only | API format not received |

---

## Security Checklist

- [x] No hardcoded credentials in source files
- [x] No secrets in frontend bundle (confirmed — only public API URLs)
- [x] `URL_HARSHA = null` — intentional, not a secret
- [x] All API calls use fetch() with explicit headers only
- [x] No eval(), no innerHTML with user data
- [x] Dashboard observes and displays — does not create execution authority
- [x] RAJYA validation goes through canonical runtime, not dashboard logic
- [ ] Authentication headers — not implemented (services currently open)
- [ ] HTTPS for PRANA/KARMA — blocked on Rukayya

---

## HARSHA Status

**HARSHA: BLOCKED**

```
Dependency:        Harsha Pawar's KSML/CET/SUM-SCRIPT service base URL
Current state:     All 6 endpoints wired in HarshaPanel component
                   URL_HARSHA = null (line 29, runtime-services-widget.jsx)
Missing:           Base URL (e.g. https://harsha-service.onrender.com)
Impact:            HarshaPanel shows informational waiting state
                   6 endpoints listed, request body editor shown but inactive
Next action:       Harsha Pawar to provide URL
Effort to resolve: 30 seconds after URL received
Owner:             Harsha Pawar
```

The federation must not be described as 100% complete while HARSHA genuinely
remains unintegrated. It is explicitly BLOCKED with the above evidence.

---

## SHAKTI Federation Status

**SHAKTI: UI-LEVEL ONLY — API PENDING**

```
What is implemented:
  - ShaktiMasterDashboard component with 9-node registry
  - Click-to-navigate from SHAKTI Master to each sub-dashboard
  - Topbar breadcrumb: SHAKTI Master > [Active Tab]
  - Synchronize Federation button (UI log, not a real API call)
  - Node cards showing link to each service

What is NOT implemented:
  - Real-time node health from a SHAKTI Master API endpoint
  - API-driven node hash/metric verification (currently hardcoded values)
  - Actual backend federation synchronization
  - Pratik's widget registration protocol

Reason:  Pratik has not shared the SHAKTI Master widget registration format
         or the federation API endpoint.
Owner:   Pratik
Impact:  Federation is UI-navigable but not API-verified
```

---

## Commit SHA

**[To be filled after git push]**

```
Commit SHA: [run: git log --oneline -1]
Branch:     main
Pushed:     [date]
```
