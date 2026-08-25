# BHIV Master — Developer Handover & Operations Guide

> **SUBMISSION TARGET**: APPROVED FOR INDEPENDENT TESTING
> **DATE**: 2026-08-26 IST

This document provides complete instructions for engineering teams inheriting the `bhiv-master` codebase. It outlines repository structure, operational flows, testing standards, runtime dependencies, and outstanding integration requirements.

---

## 1. System Overview

BHIV Master is a React single-page application built on Vite. It functions as the executive control plane and runtime monitoring widget interface for BHIV microservices.

Key operational areas:
- **SHAKTI Master Dashboard**: Local navigation hub and telemetry topology viewer.
- **Runtime Services Widget**: Embedded monitor for PRANA, KARMA, RAJYA, TANTRA, BUCKET, SANSKAR, HARSHA.
- **Bucket Integration**: Artifact viewer and provenance chain inspector.
- **UI Demonstration Dashboards**: Executive, Operations, Engineering, SOC, Finance, Analytics, Government.

---

## 2. Architecture Flow

```text
User Browser
    │
    ├──> SHAKTI Master UI (Navigation & Topology State)
    │
    ├──> Runtime Services Widget
    │       ├──> PRANA API (http://163.128.209.18:8103)
    │       ├──> KARMA API (http://163.128.209.18:8102)
    │       ├──> RAJYA API (https://text-risk-scoring-service.onrender.com)
    │       ├──> SANSKAR API (https://full-tantra-constitutional-convergence.onrender.com)
    │       ├──> TANTRA API (https://tantra-gated-bridge-infrastructure.onrender.com) [503]
    │       ├──> BUCKET API (https://bhiv-bucket-i1l6.onrender.com) [503]
    │       └──> HARSHA API (https://sl-validator-cet.onrender.com) [Timeout]
    │
    └──> UI Demonstration Mode (Executive, Ops, SOC, Finance, Analytics, Gov)
```

---

## 3. Repository Map

```text
bhiv-master/
├── .gitignore
├── README.md                      # Authoritative root overview & quickstart
├── INTEGRATION.md                 # Complete service integration matrix & verification status
├── HANDOVER.md                    # This developer handover & operations guide
├── CHANGELOG.md                   # Chronological audit log of repository changes
├── package.json                   # Project dependencies and npm scripts
├── vite.config.js                 # Vite build configuration
├── eslint.config.js               # ESLint configuration
├── public/                        # Static web assets
├── src/
│   ├── main.jsx                   # React application entry point
│   ├── App.jsx                    # Root app component
│   ├── bhiv-dashboard-kit.jsx     # SHAKTI Master & UI demonstration dashboards
│   ├── runtime-services-widget.jsx# Runtime services health widget (PRANA/KARMA/etc.)
│   └── bucket-integration.jsx     # Bucket provenance & artifact viewer
├── review_packets/
│   ├── REVIEW_PACKET.md           # Reviewer guide, entry points, & runtime map
│   └── CODE_PACKET.md             # Code review map of core implementation files
└── evidence_packet/
    ├── review_packet.md           # Executive summary review packet
    ├── api_samples/               # Sanitized live API JSON outputs
    ├── runtime_logs/              # Automated build & lint verification logs
    └── deployment_proof/          # VM deployment status documentation
```

---

## 4. Environment Setup

### Prerequisites
- Node.js `v18.0.0+`
- npm `v9.0.0+`

### Setup Instructions

```bash
# 1. Clone repository
git clone https://github.com/rahilmulani025/Bhiv-Master.git
cd bhiv-master

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

---

## 5. Deployment Commands

```bash
# Verify ESLint (Target: 0 errors)
npm run lint

# Build production bundle (Output: dist/)
npm run build

# Preview production build locally
npm run preview
```

---

## 6. Runtime Dependencies Summary

| Service | Host | Status | Action Required |
| :--- | :--- | :--- | :--- |
| **PRANA** | Static IP (`163.128.209.18:8103`) | **LIVE / VERIFIED** | Monitor MongoDB storage capacity |
| **KARMA** | Static IP (`163.128.209.18:8102`) | **LIVE / VERIFIED** | None |
| **RAJYA** | Render (`text-risk-scoring-service`) | **LIVE / VERIFIED** | None |
| **SANSKAR** | Render (`full-tantra-constitutional-convergence`) | **LIVE / VERIFIED** | Cold start monitoring |
| **TANTRA** | Render (`tantra-gated-bridge-infrastructure`) | **CONFIGURED / DEGRADED** | Wake up container on Render |
| **BUCKET** | Render (`bhiv-bucket-i1l6`) | **CONFIGURED / DEGRADED** | Wake up container on Render |
| **HARSHA** | Render (`sl-validator-cet`) | **CONFIGURED / UNVERIFIED** | Check server availability |

---

## 7. Known Issues & Unresolved Items

1. **Render Free Tier Sleep**: Services hosted on Render sleep after 15 minutes of inactivity. First request may return 503 or take ~20s.
2. **HARSHA Timeout**: `https://sl-validator-cet.onrender.com/health` does not respond within 20 seconds.

---

## 8. HARSHA Status

- **Configured URL**: `https://sl-validator-cet.onrender.com`
- **Current Status**: `CONFIGURED / UNVERIFIED`
- **Reason**: Live health probes timeout. Documented consistently across project files.

---

## 9. SHAKTI Status

- **Current Status**: `UI-ONLY DEMONSTRATION`
- **Reason**: Canonical federation backend registry API unavailable. Node topology displays local metadata and sync button updates local UI navigation state.

---

## 10. InsightFlow Status

- **Current Status**: `BLOCKED / UNKNOWN`
- **Reason**: No canonical API endpoint or contract provided by BHIV team.

---

## 11. Rollback Procedure

### Application Bundle Rollback
If a deployment of `bhiv-master` exhibits runtime errors:
1. Identify previous known-good commit SHA (`git log -n 5 --oneline`).
2. Revert to known-good SHA: `git checkout <COMMIT_SHA>`.
3. Re-run verification: `npm run lint && npm run build`.
4. Redeploy generated `dist/` directory to static web host.

### VM Rollback Status
- **VM Rollback Execution**: `BLOCKED — VM deployment access unavailable`.

---

## 12. Testing & Verification Procedure

```bash
# Step 1: Run linter
npm run lint
# Expected output: 0 errors

# Step 2: Build bundle
npm run build
# Expected output: dist/index.html & dist/assets/ generated successfully
```

---

## 13. Build History

- **Pass 1**: Initial audit & component imports.
- **Pass 2**: Fix `bhiv-dashboard-kit.jsx` syntax error around `SituationBar` and restore Section 8 widget components.
- **Pass 3**: Clean up unused ESLint errors (Target: 0 errors).
- **Pass 4**: Implement deterministic health state classification (`HEALTHY`, `DEGRADED`, `OFFLINE`, `TIMEOUT`, `AUTH_FAILED`, `EMPTY_RESPONSE`, `INVALID_RESPONSE`, `UNKNOWN`) in `runtime-services-widget.jsx`.
- **Pass 5**: Add `UI-ONLY DEMONSTRATION` banners across mock-driven dashboards.
- **Pass 6**: Author documentation, review packets, and evidence packet.

---

## 14. Evidence Location

- Live API Samples: [`/evidence_packet/api_samples/`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples)
- Build Logs: [`/evidence_packet/runtime_logs/`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/runtime_logs)
- Review Packets: [`/review_packets/`](file:///c:/Users/Rahil%20Mulani/bhiv-master/review_packets)

---

## 15. Pending Work for Next Release

1. Obtain canonical SHAKTI Master Federation Registry backend API contract.
2. Obtain canonical InsightFlow observability endpoint.
3. Verify HARSHA validator service availability with Harsha Pawar.
4. Set up VM deployment target and automated deployment pipeline.
