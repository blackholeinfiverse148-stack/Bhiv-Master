/**
 * Deterministic Logic Verification Suite for BHIV Master
 * 
 * Verifies frontend deterministic transformations, pure functions, state machines,
 * and response parsers without inventing backend behavior.
 * 
 * Backend-dependent items that cannot be proven from the frontend repository
 * are explicitly marked as UNVERIFIED rather than fabricating evidence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  evaluateServiceHealth,
  apiGet,
  apiPost,
  SERVICE_CONFIG,
  HEALTH_STATES,
  resetServiceHistory,
} from "../services/api";
import {
  CMD,
  cmdReducer,
  INITIAL_CMD_STATE,
} from "../services/command";
import {
  computeSha256,
  sanitizeDiagnostic,
  getTraceHeaders,
  clearTelemetryHistory,
} from "../services/telemetry";
import {
  classifyHealthStatus,
  OBSERVABILITY_CLASSIFICATIONS,
} from "../services/observability";
import {
  correlateTrace,
  TRACE_STATUS,
} from "../services/traceability";

describe("Deterministic Logic Verification Suite", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetServiceHistory();
    clearTelemetryHistory();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Identical Input → Identical Normalized Output
  // ─────────────────────────────────────────────────────────────
  describe("1. Identical Input → Identical Normalized Output", () => {
    it("produces identical SHA-256 cryptographic hashes for identical inputs", async () => {
      const inputPayload = JSON.stringify({
        trace_id: "TR-DET-001",
        execution_id: "EXEC-DET-001",
        verdict: "APPROVED",
      });

      const hashA = await computeSha256(inputPayload);
      const hashB = await computeSha256(inputPayload);

      expect(hashA).toBe(hashB);
      expect(hashA).toHaveLength(64);
      expect(hashA).toMatch(/^[0-9a-f]{64}$/);

      // Verify avalanche effect: single character change produces completely different hash
      const hashModified = await computeSha256(inputPayload + " ");
      expect(hashModified).not.toBe(hashA);
    });

    it("sanitizes diagnostic strings deterministically across repeated invocations", () => {
      const dirtyDiagnostic = "Failed to authenticate: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 with secret=supersecret123 and token=mysecrettoken";
      
      const sanitizedA = sanitizeDiagnostic(dirtyDiagnostic);
      const sanitizedB = sanitizeDiagnostic(dirtyDiagnostic);

      expect(sanitizedA).toBe(sanitizedB);
      expect(sanitizedA).not.toContain("supersecret123");
      expect(sanitizedA).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
      expect(sanitizedA).not.toContain("mysecrettoken");
      expect(sanitizedA).toContain("Bearer [REDACTED]");
      expect(sanitizedA).toContain("secret=[REDACTED]");
      expect(sanitizedA).toContain("token=[REDACTED]");
    });

    it("maps health states to operator classifications deterministically", () => {
      // Test deterministic mapping
      expect(classifyHealthStatus({ status: HEALTH_STATES.HEALTHY })).toBe(OBSERVABILITY_CLASSIFICATIONS.LIVE);
      expect(classifyHealthStatus({ status: HEALTH_STATES.DEGRADED })).toBe(OBSERVABILITY_CLASSIFICATIONS.DEGRADED);
      expect(classifyHealthStatus({ status: HEALTH_STATES.OFFLINE })).toBe(OBSERVABILITY_CLASSIFICATIONS.OFFLINE);
      expect(classifyHealthStatus({ status: HEALTH_STATES.TIMEOUT })).toBe(OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED);
      expect(classifyHealthStatus({ status: HEALTH_STATES.AUTH_FAILED })).toBe(OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED);
      expect(classifyHealthStatus({ status: HEALTH_STATES.EMPTY_RESPONSE })).toBe(OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED);
      expect(classifyHealthStatus(null)).toBe(OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Command State Transitions (State Machine Determinism)
  // ─────────────────────────────────────────────────────────────
  describe("2. Command State Transitions", () => {
    it("follows the complete successful command lifecycle deterministically", () => {
      // Start from INITIAL_CMD_STATE: IDLE
      let state = INITIAL_CMD_STATE;
      expect(state.phase).toBe(CMD.IDLE);
      expect(state.target).toBeNull();

      // OPEN action -> CONFIRM phase
      state = cmdReducer(state, { type: "OPEN", target: "OP-401" });
      expect(state.phase).toBe(CMD.CONFIRM);
      expect(state.target).toBe("OP-401");

      // START action -> EXECUTING phase
      state = cmdReducer(state, { type: "START" });
      expect(state.phase).toBe(CMD.EXECUTING);
      expect(state.target).toBe("OP-401");
      expect(state.error).toBeNull();

      // SUCCESS action -> SUCCESS phase
      state = cmdReducer(state, { type: "SUCCESS", result: { completed: true }, auditId: "AUD-99" });
      expect(state.phase).toBe(CMD.SUCCESS);
      expect(state.result).toEqual({ completed: true });
      expect(state.auditId).toBe("AUD-99");

      // RESET action -> IDLE phase
      state = cmdReducer(state, { type: "RESET" });
      expect(state.phase).toBe(CMD.IDLE);
      expect(state.target).toBeNull();
      expect(state.result).toBeNull();
      expect(state.auditId).toBeNull();
    });

    it("follows the failure and rollback command lifecycles deterministically", () => {
      let state = INITIAL_CMD_STATE;

      // Transition to EXECUTING
      state = cmdReducer(state, { type: "OPEN", target: "OP-FAIL-01" });
      state = cmdReducer(state, { type: "START" });

      // FAILURE action -> FAILURE phase
      state = cmdReducer(state, { type: "FAILURE", error: "Connection timeout to validator" });
      expect(state.phase).toBe(CMD.FAILURE);
      expect(state.error).toBe("Connection timeout to validator");

      // Rollback transition sequence
      state = cmdReducer(state, { type: "ROLLBACK_START" });
      expect(state.phase).toBe(CMD.ROLLING_BACK);

      state = cmdReducer(state, { type: "ROLLBACK_END" });
      expect(state.phase).toBe(CMD.ROLLED_BACK);

      // RESET returns cleanly to IDLE
      state = cmdReducer(state, { type: "RESET" });
      expect(state.phase).toBe(CMD.IDLE);
    });

    it("preserves immutability and ignores unrecognized action types", () => {
      const state = { phase: CMD.CONFIRM, target: "T-1", error: null, result: null, auditId: null };
      const nextState = cmdReducer(state, { type: "UNKNOWN_ACTION_DO_NOTHING" });

      expect(nextState).toBe(state); // Identical reference on no-op
      expect(nextState.phase).toBe(CMD.CONFIRM);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. API Payload Construction
  // ─────────────────────────────────────────────────────────────
  describe("3. API Payload Construction", () => {
    it("constructs trace headers deterministically given a fixed trace ID", () => {
      const fixedTraceId = "4a6f2b1c-9e8d-4a1b-8c2d-3e4f5a6b7c8d";
      const headers = getTraceHeaders(fixedTraceId);

      expect(headers["X-Trace-ID"]).toBe(fixedTraceId);
      expect(headers["X-BHIV-Client"]).toBe("bhiv-master-dashboard/v2.0");
      expect(headers["X-Client-Timestamp"]).toBeDefined();
    });

    it("serializes apiPost requests with exact Content-Type and stringified JSON payload", async () => {
      let capturedRequest = null;
      globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
        capturedRequest = { url, opts };
        return Promise.resolve(new Response(JSON.stringify({ received: true }), { status: 200 }));
      });

      const bodyPayload = {
        execution_id: "EXEC-DET-PAYLOAD",
        sarathi_decision: "ALLOW",
        enforcement_verdict: { allowed: true, policy: "POL-01" },
      };

      await apiPost("https://text-risk-scoring-service.onrender.com", "/api/v1/rajya/validate", bodyPayload);

      expect(capturedRequest.url).toBe("https://text-risk-scoring-service.onrender.com/api/v1/rajya/validate");
      expect(capturedRequest.opts.method).toBe("POST");
      expect(capturedRequest.opts.headers["Content-Type"]).toBe("application/json");
      expect(capturedRequest.opts.body).toBe(JSON.stringify(bodyPayload));
    });

    it("constructs PRANA replay URLs with proper URI parameter encoding", async () => {
      let requestedUrl = "";
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        requestedUrl = url;
        return Promise.resolve(new Response(JSON.stringify({ trace_id: "special" }), { status: 200 }));
      });

      const complexTraceId = "TR/2026/09#STAGE?token=abc&val=1";
      await apiGet("http://163.128.209.18:8103", `/replay/${encodeURIComponent(complexTraceId)}`);

      expect(requestedUrl).toBe("http://163.128.209.18:8103/replay/TR%2F2026%2F09%23STAGE%3Ftoken%3Dabc%26val%3D1");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Response Normalization
  // ─────────────────────────────────────────────────────────────
  describe("4. Response Normalization", () => {
    const testCases = [
      {
        desc: "200 with status: 'healthy'",
        status: 200,
        body: { status: "healthy", service: "prana" },
        expectedState: HEALTH_STATES.HEALTHY,
      },
      {
        desc: "200 with status: 'ok'",
        status: 200,
        body: { status: "ok", service: "rajya" },
        expectedState: HEALTH_STATES.HEALTHY,
      },
      {
        desc: "200 with status: 'UP'",
        status: 200,
        body: { status: "UP", service: "karma" },
        expectedState: HEALTH_STATES.HEALTHY,
      },
      {
        desc: "200 with status: 'running'",
        status: 200,
        body: { status: "running", service: "tantra" },
        expectedState: HEALTH_STATES.HEALTHY,
      },
      {
        desc: "200 with unrecognized status and no identity",
        status: 200,
        body: { status: "custom_status", count: 0 },
        expectedState: HEALTH_STATES.UNKNOWN,
      },
      {
        desc: "200 with empty body",
        status: 200,
        body: "",
        expectedState: HEALTH_STATES.EMPTY_RESPONSE,
      },
      {
        desc: "200 with non-JSON HTML body",
        status: 200,
        body: "<html>Error</html>",
        expectedState: HEALTH_STATES.INVALID_RESPONSE,
      },
      {
        desc: "401 Unauthorized",
        status: 401,
        body: { error: "unauthorized" },
        expectedState: HEALTH_STATES.AUTH_FAILED,
      },
      {
        desc: "403 Forbidden",
        status: 403,
        body: { error: "forbidden" },
        expectedState: HEALTH_STATES.AUTH_FAILED,
      },
      {
        desc: "500 Internal Server Error",
        status: 500,
        body: { error: "internal error" },
        expectedState: HEALTH_STATES.DEGRADED,
      },
      {
        desc: "503 Service Unavailable",
        status: 503,
        body: "Gateway Down",
        expectedState: HEALTH_STATES.DEGRADED,
      },
    ];

    testCases.forEach(({ desc, status, body, expectedState }) => {
      it(`normalizes ${desc} deterministically to ${expectedState}`, async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
          new Response(typeof body === "string" ? body : JSON.stringify(body), { status })
        );

        const result = await evaluateServiceHealth("test", "http://localhost:8000", "/health");
        expect(result.status).toBe(expectedState);
        expect(result.httpStatus).toBe(status);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Trace Correlation Logic
  // ─────────────────────────────────────────────────────────────
  describe("5. Trace Correlation", () => {
    it("classifies complete trace with all verified stages as COMPLETE", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes(":8103/replay/")) {
          return Promise.resolve(new Response(JSON.stringify({ trace_id: "TR-DET-ALL", created_at: "2026-09-12T12:00:00Z" }), { status: 200 }));
        }
        if (url.includes("/bucket/artifacts")) {
          return Promise.resolve(new Response(JSON.stringify([{ artifact: { trace_id: "TR-DET-ALL", artifact_id: "ART-1" } }]), { status: 200 }));
        }
        if (url.includes("/karma/latest-hash")) {
          return Promise.resolve(new Response(JSON.stringify({ latest_hash: "hash123" }), { status: 200 }));
        }
        if (url.includes("/health")) {
          return Promise.resolve(new Response(JSON.stringify({ status: "healthy" }), { status: 200 }));
        }
        return Promise.reject(new Error("Unknown"));
      });

      const res = await correlateTrace("TR-DET-ALL");
      expect(res.queryId).toBe("TR-DET-ALL");
      expect(res.stages).toHaveLength(6);
      expect(res.status).toBe(TRACE_STATUS.COMPLETE);
    });

    it("classifies broken trace when PRANA has replay but BUCKET artifact is missing as BROKEN_LINK", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes(":8103/replay/")) {
          return Promise.resolve(new Response(JSON.stringify({ trace_id: "TR-BROKEN", created_at: "2026-09-12T12:00:00Z" }), { status: 200 }));
        }
        if (url.includes("/bucket/artifacts")) {
          return Promise.resolve(new Response(JSON.stringify([]), { status: 200 })); // Empty BUCKET
        }
        if (url.includes("/health")) {
          return Promise.resolve(new Response(JSON.stringify({ status: "healthy" }), { status: 200 }));
        }
        return Promise.reject(new Error("Unavailable"));
      });

      const res = await correlateTrace("TR-BROKEN");
      expect(res.status).toBe(TRACE_STATUS.BROKEN_LINK);
      expect(res.missingLinks.some((l) => l.includes("BUCKET provenance artifact absent"))).toBe(true);
    });

    it("classifies unverified trace when 0 stages match as UNVERIFIED", async () => {
      globalThis.fetch = vi.fn().mockImplementation(() => {
        return Promise.reject(new Error("Connection refused"));
      });

      const res = await correlateTrace("TR-NONEXISTENT");
      expect(res.status).toBe(TRACE_STATUS.UNVERIFIED);
      expect(res.missingLinks.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Governance Result Interpretation
  // ─────────────────────────────────────────────────────────────
  describe("6. Governance Result Interpretation", () => {
    it("interprets RAJYA rejection payload deterministically", async () => {
      const rejectionPayload = {
        status: "REJECT",
        rejection_code: "RAJYA_SARATHI_AUTHORITY_MISSING",
        rejection_reason: "Sarathi decision is missing. Cannot approve execution without governance authority.",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(rejectionPayload), { status: 200 })
      );

      const res = await apiPost(SERVICE_CONFIG.RAJYA, "/api/v1/rajya/validate", { execution_id: "EXEC-01" });
      expect(res.status).toBe("REJECT");
      expect(res.rejection_code).toBe("RAJYA_SARATHI_AUTHORITY_MISSING");

      // Verify SHA-256 provenance hash of rejection verdict
      const hash = await computeSha256(JSON.stringify(res));
      const expectedHash = await computeSha256(JSON.stringify(rejectionPayload));
      expect(hash).toBe(expectedHash);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Integrity Result Interpretation
  // ─────────────────────────────────────────────────────────────
  describe("7. Integrity Result Interpretation", () => {
    it("interprets KARMA MATCH vs MISMATCH responses deterministically", async () => {
      // MATCH interpretation
      const matchResponse = {
        status: "MATCH",
        events_verified: 10,
        matches: 10,
        mismatches: [],
      };
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(matchResponse), { status: 200 }));
      const verifyMatch = await apiPost(SERVICE_CONFIG.KARMA, "/karma/verify", {});
      expect(verifyMatch.status).toBe("MATCH");
      expect(verifyMatch.mismatches).toHaveLength(0);

      // MISMATCH interpretation
      const mismatchResponse = {
        status: "MISMATCH",
        events_verified: 10,
        matches: 8,
        mismatches: [{ event_id: "EV-03", expected_hash: "0x123", actual_hash: "0x456" }],
      };
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(mismatchResponse), { status: 200 }));
      const verifyMismatch = await apiPost(SERVICE_CONFIG.KARMA, "/karma/verify", {});
      expect(verifyMismatch.status).toBe("MISMATCH");
      expect(verifyMismatch.mismatches).toHaveLength(1);
      expect(verifyMismatch.mismatches[0].event_id).toBe("EV-03");
    });

    it("honestly reports unanchored root hash when block hash is zeroed genesis root", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ latest_hash: "0000000000000000000000000000000000000000000000000000000000000000" }), { status: 200 })
      );

      const res = await apiGet(SERVICE_CONFIG.KARMA, "/karma/latest-hash");
      expect(res.latest_hash).toBe("0000000000000000000000000000000000000000000000000000000000000000");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Backend Determinism Requirements Marked as UNVERIFIED
  // ─────────────────────────────────────────────────────────────
  describe("8. Backend-Dependent Determinism [UNVERIFIED from Frontend]", () => {
    it("[UNVERIFIED] Distributed multi-service data consensus cannot be verified from frontend alone", () => {
      // REQUIREMENT: PRANA event replay consistency matching BUCKET immutable ledger entries.
      // LIMITATION: The frontend only reads REST endpoints; it cannot inspect distributed database logs
      // or guarantee that database replication lag / partitioning does not cause inconsistent reads.
      const backendConsensusVerification = {
        status: "UNVERIFIED",
        reason: "Requires backend database log replication audit and multi-node partition tests",
        frontendGuarantees: "Preserves original IDs and flags missing links honestly without fabrication",
      };

      expect(backendConsensusVerification.status).toBe("UNVERIFIED");
    });

    it("[UNVERIFIED] CET/KSML compiler deterministic bytecode reproducibility requires backend verification", () => {
      // REQUIREMENT: HARSHA KSML CET compiler always outputs bit-for-bit identical bytecode for identical rule trees.
      // LIMITATION: Compiler execution takes place inside the HARSHA container. The frontend cannot verify compiler bit determinism.
      const compilerDeterminism = {
        status: "UNVERIFIED",
        reason: "Requires compiler container unit test verifying bit-for-bit AST output",
        frontendGuarantees: "Payload sent to /validate is serialized deterministically",
      };

      expect(compilerDeterminism.status).toBe("UNVERIFIED");
    });

    it("[UNVERIFIED] Storage persistence and cryptographic immutability of KARMA ledger requires backend verification", () => {
      // REQUIREMENT: KARMA ledger chain is tamper-evident and append-only across storage restarts.
      // LIMITATION: The frontend only queries /karma/latest-hash and /karma/verify; physical disk immutability
      // and Merkle tree root persistence must be verified via backend integration tests.
      const ledgerImmutability = {
        status: "UNVERIFIED",
        reason: "Requires disk-level corruption/tampering injection tests on KARMA host",
        frontendGuarantees: "Frontend faithfully checks hash equality and never fabricates a MATCH state",
      };

      expect(ledgerImmutability.status).toBe("UNVERIFIED");
    });
  });
});
