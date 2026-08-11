# BHIV-ECC Endpoint & API Mapping

This document details all API endpoints integrated within the BHIV Dashboard Kit.

## 1. Core Services Registry

| Service | Base URL | Endpoints | Method | Description |
| :--- | :--- | :--- | :--- | :--- |
| **PRANA** | `http://163.128.209.18:8103` | `/system/health`<br>`/events`<br>`/propagation-log` | `GET`<br>`GET`<br>`GET` | Event forwarding status, active telemetry logs, and trace events. |
| **KARMA** | `http://163.128.209.18:8102` | `/health`<br>`/latest-hash`<br>`/verify` | `GET`<br>`GET`<br>`POST` | Verification of integrity chains and cryptographic blocks. |
| **RAJYA** | `https://text-risk-scoring-service.onrender.com` | `/api/v1/rajya/validate` | `POST` | Governance validation gate for decisions (ALLOW, DENY, ABSTAIN). |
| **TANTRA** | `https://tantra-gated-bridge-infrastructure.onrender.com` | `/health`<br>`/status` | `GET`<br>`GET` | Bridge monitoring and Gated Bridge state. |
| **BUCKET** | `https://bhiv-bucket-i1l6.onrender.com` | `/health`<br>`/bucket/chain-state`<br>`/bucket/artifacts`<br>`/bucket/artifact/{id}` | `GET`<br>`GET`<br>`GET`<br>`GET` | Provenance store, artifact lists, and detail payload querying. |
| **SANSKAR** | `https://full-tantra-constitutional-convergence.onrender.com` | `/health`<br>`/status` | `GET`<br>`GET` | Constitutional convergence state and metrics. |
| **HARSHA** | `https://sl-validator-cet.onrender.com` | `/health`<br>`/validate`<br>`/compile_execution`<br>`/cet/compile`<br>`/forward_to_sarathi`<br>`/enforce_execution`<br>`/validate_execution`<br>`/execute` | `GET`<br>`POST`<br>`POST`<br>`POST`<br>`POST`<br>`POST`<br>`POST`<br>`POST` | SL Validator, CET, KSML, and SUM-SCRIPT runtime actions. |

## 2. API Response Formats (Example)

### BUCKET Artifact GET (`/bucket/artifact/sub-1`)
```json
{
  "id": "sub-1",
  "type": "task_submit",
  "storageType": "append_only",
  "timestamp": "2026-08-01T15:30:00Z",
  "schemaVersion": "1.0.0",
  "sourceModule": "gurukul",
  "traceId": "gurukul-f5e356159c9f4dfb83651264aa0f1cbc",
  "payload": {
    "content_length": 100,
    "source": "test",
    "user_id": "user1",
    "title": "Test"
  }
}
```

### RAJYA Decision Validation POST (`/api/v1/rajya/validate`)
**Request:**
```json
{
  "sarathiDecision": "ALLOW",
  "executionId": "c8f2b77a-2454-4712-baea-35b8696d744f"
}
```
**Response:**
```json
{
  "status": "success",
  "verdict": "EXECUTION_APPROVED",
  "timestamp": "2026-08-08T08:27:50Z"
}
```
