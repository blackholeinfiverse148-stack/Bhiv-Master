# BHIV Master — Security & Observability Control Plane

> **SUBMISSION TARGET**: APPROVED FOR INDEPENDENT TESTING
> **EVIDENCE SCOPE**: This repository contains honest integration mappings and UI-demonstration boundaries. It is not self-certified production ready.

---

## Executive Overview

BHIV Master is the centralized web control plane and security dashboard for the BHIV ecosystem. It provides real-time telemetry monitoring, evidence provenance verification, and control interfaces across distributed BHIV services.

The platform integrates live runtime microservices with local governance demonstration dashboards to present an operational view of system health, security threats, risk scoring, and audit execution.

---

## Key Architecture & Core Components

```text
                                ┌───────────────────────────┐
                                │   SHAKTI Master Control   │
                                └─────────────┬─────────────┘
                                              │
            ┌─────────────────────────────────┼─────────────────────────────────┐
            ▼                                 ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐         ┌───────────────────────┐
│   Runtime Services    │         │  Bucket Provenance    │         │ UI-Demonstration Hub  │
│  (PRANA/KARMA/RAJYA)  │         │   (Chain & Artifacts) │         │ (Ops/Exec/Gov Dash)   │
└───────────────────────┘         └───────────────────────┘         └───────────────────────┘
```

1. **SHAKTI Master Dashboard**: The central navigation hub connecting service telemetry, node topology, and governance views.
2. **Runtime Services Widget**: Real-time integration panel tracking 7 microservices:
   - **PRANA**: Event Forwarding & Propagation Telemetry (`http://163.128.209.18:8103`)
   - **KARMA**: Cryptographic Integrity Helper (`http://163.128.209.18:8102`)
   - **RAJYA**: Risk Scoring & Policy Enforcement (`https://text-risk-scoring-service.onrender.com`)
   - **SANSKAR**: Constitutional Convergence (`https://full-tantra-constitutional-convergence.onrender.com`)
   - **TANTRA**: Gated Bridge Infrastructure (`https://tantra-gated-bridge-infrastructure.onrender.com`)
   - **BUCKET**: Provenance Artifact Store (`https://bhiv-bucket-i1l6.onrender.com`)
   - **HARSHA**: CET / KSML / Sum-Script Validator (`https://sl-validator-cet.onrender.com`)
3. **Bucket Integration Panel**: Artifact inspection and cryptographic chain verification interface.
4. **Command Execution Machine**: State machine managing command triggers, loading states, audit logs, and feedback loops (`useCommand`).

---

## Environment & Development Setup

### Prerequisites
- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher

### Installation

```bash
git clone https://github.com/rahilmulani025/Bhiv-Master.git
cd bhiv-master
npm install
```

### Development Server

```bash
npm run dev
```
Starts Vite dev server at `http://localhost:5173`.

### Code Quality & Linting

```bash
npm run lint
```
Runs ESLint across the codebase. Enforces strict zero-error policy.

### Production Build

```bash
npm run build
```
Compiles production distribution bundle under `dist/`.

---

## Live Integration vs UI-Only Demonstration

| Component / Module | Type | Endpoint / Contract | Audit Verdict |
| :--- | :--- | :--- | :--- |
| **PRANA** | Live Service | `http://163.128.209.18:8103/health` | **LIVE / VERIFIED** (HTTP 200 OK) |
| **KARMA** | Live Service | `http://163.128.209.18:8102/health` | **LIVE / VERIFIED** (HTTP 200 OK) |
| **RAJYA** | Live Service | `https://text-risk-scoring-service.onrender.com/health` | **LIVE / VERIFIED** (HTTP 200 OK) |
| **SANSKAR** | Live Service | `https://full-tantra-constitutional-convergence.onrender.com/health` | **LIVE / VERIFIED** (HTTP 200 OK) |
| **TANTRA** | Monitored | `https://tantra-gated-bridge-infrastructure.onrender.com/health` | **CONFIGURED / DEGRADED** (HTTP 503 Render) |
| **BUCKET** | Monitored | `https://bhiv-bucket-i1l6.onrender.com/health` | **CONFIGURED / DEGRADED** (HTTP 503 Render) |
| **HARSHA** | Monitored | `https://sl-validator-cet.onrender.com/health` | **CONFIGURED / UNVERIFIED** (Timeout) |
| **SHAKTI Federation Registry** | Registry API | *No canonical API provided* | **BLOCKED / UNKNOWN** |
| **InsightFlow** | Observability | *No canonical API provided* | **BLOCKED / UNKNOWN** |
| **Executive / Ops / SOC / Gov** | UI Dashboard | Local Mock Data (`MockService`) | **UI-ONLY DEMONSTRATION** |

---

## Verification & Evidence Packet Location

All verification artifacts, API response samples, security scan logs, and build records are stored under:

- [`/evidence_packet/`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet)
  - [`/evidence_packet/api_samples/`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples): Live JSON responses for PRANA, KARMA, RAJYA, SANSKAR.
  - [`/evidence_packet/runtime_logs/`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/runtime_logs): Build and lint output logs.
  - [`/evidence_packet/review_packet.md`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/review_packet.md): Summary review packet.
- [`/review_packets/`](file:///c:/Users/Rahil%20Mulani/bhiv-master/review_packets)
  - [`REVIEW_PACKET.md`](file:///c:/Users/Rahil%20Mulani/bhiv-master/review_packets/REVIEW_PACKET.md): System architecture and live flow documentation.
  - [`CODE_PACKET.md`](file:///c:/Users/Rahil%20Mulani/bhiv-master/review_packets/CODE_PACKET.md): Code review map of core implementation files.

---

## Deployment & Rollback Status

- **VM Deployment**: `BLOCKED — VM access/deployment target details unavailable`
- **VM Rollback**: `BLOCKED — VM rollback could not be executed`

---

## Known Limitations

1. **Render Free Tier Cold Starts / 503**: Services hosted on Render (TANTRA, BUCKET) may experience 503 errors or ~20s cold start delays when spun down.
2. **HARSHA Endpoint Timeout**: `https://sl-validator-cet.onrender.com` currently times out on health check requests.
3. **SHAKTI Federation Backend**: Federation synchronization currently syncs UI navigation state locally because no canonical backend registry endpoint exists.
