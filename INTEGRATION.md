# BHIV Integration Matrix & Service Verification Map

> **SUBMISSION TARGET**: APPROVED FOR INDEPENDENT TESTING
> **LAST VERIFIED**: 2026-08-26 IST

This document serves as the authoritative integration reference for all microservices, backend contracts, and external dependencies connected to or referenced by the `bhiv-master` control plane.

---

## 1. Dependency Integration Matrix

| Service | Role / Component | Base URL | Endpoint(s) | Classification Status | Verification Details | Evidence File | Known Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PRANA** | Event Forwarding & Propagation | `http://163.128.209.18:8103` | `/health`, `/prana/system/health`, `/prana/propagation-log`, `/replay/{trace_id}` | **LIVE / VERIFIED** | Verified live HTTP 200 OK response with active MongoDB connection and forwarding status. | [`prana_health.json`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples/prana_health.json) | Replay creation requires successful Bucket forwarding. |
| **KARMA** | Cryptographic Hash Integrity | `http://163.128.209.18:8102` | `/health`, `/karma/latest-hash`, `/karma/verify` | **LIVE / VERIFIED** | Verified live HTTP 200 OK response returning `{"status":"healthy","service":"bhiv-karma-helper"}`. | [`karma_health.json`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples/karma_health.json) | Helper service hash verification requires valid string body input. |
| **RAJYA** | Risk Scoring & Governance Policy | `https://text-risk-scoring-service.onrender.com` | `/health`, `/score` | **LIVE / VERIFIED** | Verified live HTTP 200 OK response returning `{"status":"ok","service":"bhiv-enforcement-gateway"}`. | [`rajya_health.json`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples/rajya_health.json) | Text risk scoring endpoint enforces strict request body format. |
| **SANSKAR** | Constitutional Convergence | `https://full-tantra-constitutional-convergence.onrender.com` | `/health`, `/sanskar/evaluate` | **LIVE / VERIFIED** | Verified live HTTP 200 OK response returning `{"status":"healthy","service":"sanskar","contract_version":"v1"}`. | [`sanskar_health.json`](file:///c:/Users/Rahil%20Mulani/bhiv-master/evidence_packet/api_samples/sanskar_health.json) | Cold starts on Render free tier may delay first request by ~15s. |
| **TANTRA** | Gated Bridge Infrastructure | `https://tantra-gated-bridge-infrastructure.onrender.com` | `/health` | **CONFIGURED / DEGRADED** | Health request returned HTTP 503 Service Unavailable (Render free tier instance spun down). | N/A (503 HTML) | Execution endpoints require authentication token contract. |
| **BUCKET** | Provenance & Artifact Store | `https://bhiv-bucket-i1l6.onrender.com` | `/health`, `/bucket/chain`, `/bucket/artifacts` | **CONFIGURED / DEGRADED** | Health request returned HTTP 503 Service Unavailable (Render instance offline). Local fallback data available in UI. | N/A (503 HTML) | Live chain retrieval unavailable when Render container is asleep. |
| **HARSHA** | CET / KSML / Sum-Script Validator | `https://sl-validator-cet.onrender.com` | `/health` | **CONFIGURED / UNVERIFIED** | Configured URL in source (`URL_HARSHA`), but live health requests timed out (>20s). | N/A (Timeout) | Endpoint unreachable during audit. Unverified live capability. |
| **SHAKTI Master** | Federation Registry & Node Map | *Local UI Hub* | *N/A* | **UI-ONLY DEMONSTRATION** | Renders 9 local dashboard tabs and mock node metadata. Sync action triggers UI state refresh. | N/A | Canonical backend federation API contract unavailable. |
| **InsightFlow** | Unified Telemetry Observability | *Not Configured* | *N/A* | **BLOCKED / UNKNOWN** | No canonical endpoint or API contract provided in repository or documentation. | N/A | Integration blocked pending API specification from BHIV team. |

---

## 2. Integration Status Definitions

- **LIVE / VERIFIED**: Endpoint is configured, reachable over network, and returns valid verified JSON payload with expected schema.
- **CONFIGURED / DEGRADED**: Base URL is hardcoded in application, but live endpoint returns HTTP 500/502/503 or transient network errors.
- **CONFIGURED / UNVERIFIED**: Base URL is configured in source code, but endpoint timed out or failed network probe without response.
- **UI-ONLY DEMONSTRATION**: UI component operates using local state machine, navigation metadata, or `MockService` generators.
- **BLOCKED / UNKNOWN**: Required external contract or API endpoint is completely missing from the project specification.

---

## 3. Dependency Detail Specifications

### 3.1 PRANA (Event Forwarding Service)
- **Role**: Captures system events, performs trace logging, forwards evidence to BUCKET.
- **Base URL**: `http://163.128.209.18:8103`
- **Verified Endpoint**: `GET /health` → `{"status":"healthy","service":"bhiv-prana","forwarding_enabled":true,"mongodb":{"mongodb_connected":true}}`
- **Replay Capabilities**: Replay trace retrieval available via `GET /replay/{trace_id}`.

### 3.2 KARMA (Cryptographic Integrity Helper)
- **Role**: Generates cryptographic hashes for incoming payloads to verify provenance.
- **Base URL**: `http://163.128.209.18:8102`
- **Verified Endpoint**: `GET /health` → `{"status":"healthy","service":"bhiv-karma-helper"}`

### 3.3 RAJYA (Enforcement & Risk Scoring)
- **Role**: Evaluates text payloads against security risk policies and assigns risk tiers.
- **Base URL**: `https://text-risk-scoring-service.onrender.com`
- **Verified Endpoint**: `GET /health` → `{"status":"ok","service":"bhiv-enforcement-gateway"}`

### 3.4 SANSKAR (Constitutional Convergence)
- **Role**: Ensures compliance with constitutional AI alignment rules.
- **Base URL**: `https://full-tantra-constitutional-convergence.onrender.com`
- **Verified Endpoint**: `GET /health` → `{"status":"healthy","service":"sanskar","contract_version":"v1"}`

### 3.5 HARSHA (CET / KSML Validator)
- **Status Reason**: Configured in `src/runtime-services-widget.jsx` line 29 as `https://sl-validator-cet.onrender.com`, but live connection test times out. Documented consistently across repository as `CONFIGURED / UNVERIFIED`.

### 3.6 SHAKTI Master Federation
- **Status Reason**: SHAKTI Master dashboard currently functions as a local UI navigation hub (`ShaktiMasterDashboard`). No live backend federation registry API exists. Navigation actions update local UI state cleanly.
