# HANDOVER.md
## BHIV-ECC Dashboard Kit v3 — Zero-Context Handover Guide

**Purpose:** A fresh developer must be able to continue without Rahil's memory.
**Author:** Rahil Mulani | Data Science & AI Intern, Blackhole Infiverse

---

## System Overview

The BHIV Executive Control Center (ECC) is a React single-page application.
It has no backend of its own. It calls external BHIV runtime service APIs directly
from the browser. It displays live operational data across 9 dashboard tabs federated
under a SHAKTI Master Gateway.

Two tabs are fully live (Runtime Services, Bucket/Evidence).
Seven tabs use demo data from Tests 1-3.

---

## Architecture Flow

```
Browser (React App)
    │
    ├── src/main.jsx              → mounts BHIVDashboardKit
    ├── src/bhiv-dashboard-kit.jsx
    │       ├── SHAKTI Master Dashboard (federation hub, UI-level)
    │       ├── Executive / Operations / Engineering / SOC / Finance / Analytics / Government
    │       ├── imports → RuntimeServicesWidget → 7 live service API calls
    │       └── imports → BucketWidget → 5 live Bucket API calls
    │
    └── External APIs (called directly from browser)
            ├── PRANA   http://163.128.209.18:8103
            ├── KARMA   http://163.128.209.18:8102
            ├── RAJYA   https://text-risk-scoring-service.onrender.com
            ├── BUCKET  https://bhiv-bucket-i1l6.onrender.com
            ├── SANSKAR https://full-tantra-constitutional-convergence.onrender.com
            └── TANTRA  https://tantra-gated-bridge-infrastructure.onrender.com
```

---

## Repository Map

```
Bhiv-Master/
├── src/
│   ├── main.jsx                          Entry point — mounts BHIVDashboardKit
│   ├── bhiv-dashboard-kit.jsx            Main app (1,868 lines)
│   │   ├── Design tokens (DS object)
│   │   ├── Mock data (MOCK object) — used by 7 demo tabs only
│   │   ├── 19 UI components
│   │   ├── Command system (useCommand + CommandDialog)
│   │   ├── 4 React Contexts (Theme, Audit, Panel, Notif)
│   │   ├── ShaktiMasterDashboard component
│   │   ├── 7 demo dashboard pages
│   │   └── Root BHIVDashboardKit component
│   ├── runtime-services-widget.jsx       Live runtime panel (1,146 lines)
│   │   ├── URL constants for all services (lines 19-29)
│   │   ├── apiGet() + apiPost() helpers (8s timeout)
│   │   ├── PranaPanel, KarmaPanel, RajyaPanel
│   │   ├── TantraPanel, BucketPanel, SanskarPanel
│   │   ├── HarshaPanel (wired, awaiting URL)
│   │   ├── ReplayPanel (PRANA replay by trace_id)
│   │   └── RuntimeServicesWidget (root export)
│   └── bucket-integration.jsx            Bucket browser (761 lines)
│       ├── HealthPanel
│       ├── ArtifactList (100 artifacts)
│       └── ArtifactDetail (full artifact view)
│
├── docs/                                 12 documentation files
├── evidence_packet/                      Screenshots, API samples, logs, deployment proof
├── DEP/                                  Daily Engineering Packet (7 files)
├── review_packets/REVIEW_PACKET.md       Reviewer entry point
├── README.md                             Project overview
├── INTEGRATION.md                        This file's sibling — integration status
├── HANDOVER.md                           This file
└── CHANGELOG.md                          Change history
```

---

## Environment Setup

```bash
# Requirements: Node.js 18+
node --version   # must be 18+

# Install
git clone https://github.com/rahilmulani025/Bhiv-Master.git
cd Bhiv-Master
npm install

# Run locally
npm run dev
# Open http://localhost:5173

# Build for production
npm run build
# Deploy dist/ folder to any static host
```

---

## Deployment Commands

### Vercel (recommended — free, automatic)
1. Go to vercel.com
2. Sign in with GitHub
3. Click "Add New Project" → select Bhiv-Master
4. Click Deploy — no configuration needed
5. Live URL will be `bhiv-master-[hash].vercel.app`

### Manual (nginx)
```bash
npm run build
# Copy dist/ to your server
# Serve with nginx pointing root to dist/
```

---

## Runtime Dependencies

All external. No database. No server. No environment variables required.

| Service | URL | Required header |
|---|---|---|
| PRANA | `http://163.128.209.18:8103` | None |
| KARMA | `http://163.128.209.18:8102` | None |
| RAJYA | `https://text-risk-scoring-service.onrender.com` | None |
| BUCKET | `https://bhiv-bucket-i1l6.onrender.com` | None |
| SANSKAR | `https://full-tantra-constitutional-convergence.onrender.com` | None |
| TANTRA | `https://tantra-gated-bridge-infrastructure.onrender.com` | None |

---

## Known Issues

1. **HARSHA URL missing** — Set `URL_HARSHA` in `runtime-services-widget.jsx:29`
2. **PRANA/KARMA on HTTP** — Mixed content blocks them on HTTPS deployments
3. **TANTRA partial** — No endpoint contract from Ranjit Patil
4. **InsightFlow missing** — Vijay Dhawan never sent endpoints
5. **SHAKTI API pending** — UI federation done, API federation needs Pratik's format
6. **7 demo tabs use mock data** — Not connected to live services yet

---

## Rollback Procedure

```bash
# View commit history
git log --oneline

# Roll back to a previous commit
git checkout <commit-sha>
npm install
npm run dev

# Or revert to previous commit on main
git revert HEAD
git push origin main
```

---

## Testing Procedure

### Live integration test (manual)
1. `npm run dev` → open http://localhost:5173
2. Click "Runtime Services" → verify overview strip shows dots
3. Expand KARMA → Chain tab → verify real hash appears
4. Click "Run Chain Verification" → verify live MATCH result
5. Expand RAJYA → select DENY → click validate → verify REJECT with rejection_code
6. Click "Bucket / Evidence" → verify 100 artifacts load
7. Click any artifact → verify Type, Stored at, Hash display (not "—")
8. Kill network (DevTools → Offline) → verify error states appear with Retry buttons

### Failure state test
- Disconnect from internet → Runtime Services tab → all panels show error + retry
- This proves failure is detected, not silently hidden

---

## Build History

| Version | Date | Key changes |
|---|---|---|
| 3.1.0 | Aug 2026 | SHAKTI Master, runtime integrations, bucket browser, full docs |
| 3.0.0 | Aug 2026 | Test 3 component library — 7 dashboards, 19 components |
| 2.0.0 | Aug 2026 | Test 2 command layer |
| 1.0.0 | Aug 2026 | Test 1 foundation dashboard |

---

## Evidence Location

```
evidence_packet/
├── screenshots/     → Screenshot proof of each live panel
├── api_samples/     → Real JSON responses from each service
├── runtime_logs/    → Browser network logs and console output
└── deployment_proof/ → Build logs, health checks, live URL proof
```

---

## Pending Work

1. Receive HARSHA base URL → activate HarshaPanel (30 min)
2. Receive TANTRA endpoint contract from Ranjit (2 hrs)
3. Receive SHAKTI widget format from Pratik → implement API federation (3 hrs)
4. Receive InsightFlow endpoints from Vijay (3 hrs)
5. Coordinate with Rukayya to add HTTPS to PRANA/KARMA
6. Replace demo data in 7 tabs with live service data
7. Full VM deployment with health checks and rollback proof

---

## Who to Contact

| Question | Contact |
|---|---|
| PRANA / KARMA | Rukayya Ansari |
| RAJYA | Rajaryan Verma |
| BUCKET | Siddhesh Narkar |
| TANTRA | Ranjit Patil |
| SANSKAR | Sakshi |
| HARSHA (KSML/CET) | Harsha Pawar |
| SHAKTI federation | Pratik |
| InsightFlow | Vijay Dhawan |
| Integration sessions | Karan |
| Production certification | Vinayak Tiwari |
| This codebase | Rahil Mulani |
