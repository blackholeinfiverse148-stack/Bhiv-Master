# Task Management System (TMS) — Integration Status

Honest integration status as of August 2026.
Rule: "Complete" means live API verified. "Pending/Blocked/Degraded" means not live or degraded.

---

## Owner & Roles Matrix

| Owner | Role | Deliverables | Status | Honest Notes |
|---|---|---|---|---|
| **Rajaryan Verma** | RAJYA Sovereign Core | /health, /score | ✅ Live / Verified | Live HTTP 200 OK — `{"status":"ok","service":"bhiv-enforcement-gateway"}`. Verified with real API probes. |
| **Siddhesh Narkar** | Bucket | /health, /bucket/artifacts, /bucket/chain-state | ⚠️ Configured / Degraded | Base URL `https://bhiv-bucket-i1l6.onrender.com`. Health probe returned HTTP 503 (Render instance asleep/degraded). Local fallback UI available. |
| **Rukayya Ansari** | PRANA & KARMA | PRANA: /health, /prana/system/health, /prana/propagation-log, /replay/{id}. KARMA: /health, /karma/latest-hash, /karma/verify | ✅ Live / Verified | Live HTTP 200 OK — real API responses. PRANA forwarding enabled. Known constraint: both services run on HTTP (163.128.209.18). |
| **Ranjit Patil** | TANTRA Gated Bridge | /health | ⚠️ Configured / Degraded | Base URL `https://tantra-gated-bridge-infrastructure.onrender.com`. Probe returned HTTP 503 (Render free tier instance asleep). Execution contract unavailable. |
| **Sakshi** | SANSKAR Runtime | /health, /sanskar/evaluate | ✅ Live / Health Verified | URL `https://full-tantra-constitutional-convergence.onrender.com`. Health probe returned HTTP 200 OK (`{"status":"healthy","service":"sanskar","contract_version":"v1"}`). |
| **Harsha Pawar** | CET / KSML / SUM-SCRIPT | /health | 🔄 Configured / Unverified | Base URL configured in source (`https://sl-validator-cet.onrender.com`). Probes timed out (>20s) during verification. Unverified. |
| **Vijay Dhawan** | InsightFlow | Unknown | ❌ Blocked / Unknown | No endpoints or contract received. No contact established on this integration. |
| **Pratik** | SHAKTI Master Dashboard | Widget registration format, federation API | ⚠️ UI-Only Demonstration | ShaktiMasterDashboard component built — 9-node navigation table, click-to-navigate, breadcrumb. No SHAKTI backend federation API exists. Node metrics/hashes are local UI metadata. |
| **Karan** | Coordinator | Integration session scheduling | 🔄 Pending | Live integration VC sessions not yet conducted. |
| **Vinayak Tiwari** | Testing / Certification | Final validation | 🔄 Target: Independent Testing | Build and linter verified. Prepared for independent testing. VM deployment pending credentials. |

---

## Summary

| Category | Count | Services |
|---|---|---|
| Live / Verified | 4 | RAJYA, PRANA, KARMA, SANSKAR |
| Configured / Degraded | 2 | BUCKET, TANTRA |
| Configured / Unverified | 1 | HARSHA |
| Blocked / Unknown | 1 | InsightFlow |
| UI-Level Only | 1 | SHAKTI Federation |
| Pending | 2 | Karan scheduling, Vinayak certification |

---

## Correction Log

- **Harsha Pawar / HARSHA**: Updated from "URL not received" to "CONFIGURED / UNVERIFIED" (`https://sl-validator-cet.onrender.com` configured in source; health request timed out during probe).
- **Siddhesh Narkar / BUCKET**: Updated from "Live 100 artifacts" to "CONFIGURED / DEGRADED" (latest empirical probe returned HTTP 503 Render unavailable).
- **Sakshi / SANSKAR**: Updated from "Partial" to "LIVE / HEALTH VERIFIED" (latest empirical probe returned HTTP 200 `{"status":"healthy","service":"sanskar","contract_version":"v1"}`).
- **Vijay Dhawan / InsightFlow**: Corrected to BLOCKED / UNKNOWN (no contract or endpoint available).
- **Pratik / SHAKTI**: Corrected to UI-ONLY DEMONSTRATION (navigation component exists; backend federation registry API pending).
