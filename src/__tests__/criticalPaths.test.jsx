/**
 * Comprehensive Unit Test Suite for Phase 2 Critical Paths
 * Covers:
 * 1. API client behavior
 * 2. HTTP error classification
 * 3. Timeout handling
 * 4. Authentication failure handling
 * 5. Malformed response handling
 * 6. Health status normalization
 * 7. Trace correlation
 * 8. Command state transitions
 * 9. Governance response parsing
 * 10. Integrity verification response parsing
 * 11. Runtime service aggregation
 * 12. Failure isolation
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import {
  apiFetch,
  apiGet,
  apiPost,
  evaluateServiceHealth,
  monitorAllServices,
  checkAllRuntimeServices,
  SERVICE_CONFIG,
  HEALTH_STATES,
  ERROR_TYPES,
  resetServiceHistory,
} from "../services/api";
import {
  computeSha256,
  recordTelemetryEvent,
  clearTelemetryHistory,
  getTelemetryHistory,
  sanitizeDiagnostic,
} from "../services/telemetry";
import { correlateTrace, TRACE_STATUS } from "../services/traceability";
import { fetchConstitutionalObservabilityModel } from "../services/observability";
import { ApprovalCard, ThemeProvider } from "../bhiv-dashboard-kit";

describe("Phase 2 Critical Paths Unit Test Suite", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetServiceHistory();
    clearTelemetryHistory();
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. API Client Behavior
  // ─────────────────────────────────────────────────────────────
  describe("1. API Client Behavior", () => {
    it("injects X-Trace-ID, X-Client-Timestamp, and X-BHIV-Client headers into all outgoing requests", async () => {
      let capturedHeaders = null;
      globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
        capturedHeaders = opts.headers;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "ok" }),
        });
      });

      const traceId = "test-trace-id-12345";
      await apiFetch("https://mock-service.test", "/health", { traceId });

      expect(capturedHeaders["X-Trace-ID"]).toBe(traceId);
      expect(capturedHeaders["X-BHIV-Client"]).toBe("bhiv-master-dashboard/v2.0");
      expect(capturedHeaders["X-Client-Timestamp"]).toBeDefined();
    });

    it("injects Bearer token header when token option is supplied", async () => {
      let capturedHeaders = null;
      globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
        capturedHeaders = opts.headers;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "authenticated" }),
        });
      });

      await apiFetch("https://mock-service.test", "/api/v1/secure", { token: "secret-token-abc" });

      expect(capturedHeaders["Authorization"]).toBe("Bearer secret-token-abc");
    });

    it("apiGet sends GET and apiPost sends POST with JSON headers and serialized body", async () => {
      let getMethod = null;
      let postMethod = null;
      let postBody = null;
      let postContentType = null;

      globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
        if (opts.method === "GET") getMethod = opts.method;
        if (opts.method === "POST") {
          postMethod = opts.method;
          postBody = opts.body;
          postContentType = opts.headers["Content-Type"];
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "ok" }),
        });
      });

      await apiGet("https://mock-service.test", "/items");
      expect(getMethod).toBe("GET");

      const payload = { action: "VALIDATE", id: 99 };
      await apiPost("https://mock-service.test", "/items", payload);
      expect(postMethod).toBe("POST");
      expect(postContentType).toBe("application/json");
      expect(postBody).toBe(JSON.stringify(payload));
    });

    it("records telemetry event on successful apiFetch", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: "success" }),
      });

      await apiFetch("https://mock-service.test", "/api/test", { traceId: "trace-tel-001" });

      const history = getTelemetryHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].traceId).toBe("trace-tel-001");
      expect(history[0].status).toBe("success");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. HTTP Error Classification
  // ─────────────────────────────────────────────────────────────
  describe("2. HTTP Error Classification", () => {
    it("distinguishes client 400 Bad Request, server 500 error, and 504 gateway timeout", async () => {
      // 400 Bad Request -> UNKNOWN
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });
      const res400 = await evaluateServiceHealth("rajya", "https://mock.test", "/health");
      expect(res400.status).toBe(HEALTH_STATES.UNKNOWN);
      expect(res400.httpStatus).toBe(400);

      // 500 Internal Server Error -> DEGRADED
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });
      const res500 = await evaluateServiceHealth("rajya", "https://mock.test", "/health");
      expect(res500.status).toBe(HEALTH_STATES.DEGRADED);
      expect(res500.errorType).toBe(ERROR_TYPES.HTTP_ERROR);
      expect(res500.httpStatus).toBe(500);

      // 504 Gateway Timeout -> DEGRADED
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 504,
        statusText: "Gateway Timeout",
      });
      const res504 = await evaluateServiceHealth("rajya", "https://mock.test", "/health");
      expect(res504.status).toBe(HEALTH_STATES.DEGRADED);
      expect(res504.httpStatus).toBe(504);
    });

    it("throws descriptive HTTP status error on apiFetch non-200 responses", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(apiFetch("https://mock.test", "/non-existent")).rejects.toThrow(/HTTP 404 Not Found/);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Timeout Handling
  // ─────────────────────────────────────────────────────────────
  describe("3. Timeout Handling", () => {
    it("classifies AbortError as TIMEOUT with configured timeout duration in message", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);

      const result = await evaluateServiceHealth("harsha", "https://sl-validator-cet.onrender.com", "/health", 5000);

      expect(result.status).toBe(HEALTH_STATES.TIMEOUT);
      expect(result.errorType).toBe(ERROR_TYPES.TIMEOUT);
      expect(result.errorMessage).toBe("Probe timed out after 5000ms");
      expect(result.httpStatus).toBeNull();
    });

    it("apiFetch translates AbortError to descriptive timeout error message", async () => {
      const abortError = new Error("Abort");
      abortError.name = "AbortError";
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);

      await expect(apiFetch("https://mock.test", "/slow-call", { timeout: 3000 })).rejects.toThrow(
        /Request timed out after 3000ms/
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Authentication Failure Handling
  // ─────────────────────────────────────────────────────────────
  describe("4. Authentication Failure Handling", () => {
    it("flags 401 Unauthorized as AUTH_FAILED without falling back to mock or open state", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const res = await evaluateServiceHealth("karma", "http://163.128.209.18:8102", "/health");
      expect(res.status).toBe(HEALTH_STATES.AUTH_FAILED);
      expect(res.errorType).toBe(ERROR_TYPES.AUTH_FAILURE);
      expect(res.errorMessage).toContain("Authentication/Authorization failed with HTTP 401");
    });

    it("flags 403 Forbidden as AUTH_FAILED and preserves lastFailure timestamp", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      const res = await evaluateServiceHealth("sanskar", "https://full-tantra-constitutional-convergence.onrender.com", "/health");
      expect(res.status).toBe(HEALTH_STATES.AUTH_FAILED);
      expect(res.lastFailure).toBeDefined();
      expect(res.lastSuccess).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Malformed Response Handling
  // ─────────────────────────────────────────────────────────────
  describe("5. Malformed Response Handling", () => {
    it("handles 0-byte or whitespace response bodies as EMPTY_RESPONSE", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "  \n\t  ",
      });

      const res = await evaluateServiceHealth("bucket", "https://bhiv-bucket-i1l6.onrender.com", "/health");
      expect(res.status).toBe(HEALTH_STATES.EMPTY_RESPONSE);
      expect(res.errorType).toBe(ERROR_TYPES.EMPTY_BODY);
      expect(res.errorMessage).toBe("Empty response body received from service endpoint");
    });

    it("handles HTML or non-JSON response bodies as INVALID_RESPONSE", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "<!DOCTYPE html><html><body>Error 502 Bad Gateway</body></html>",
      });

      const res = await evaluateServiceHealth("tantra", "https://tantra-gated-bridge-infrastructure.onrender.com", "/health");
      expect(res.status).toBe(HEALTH_STATES.INVALID_RESPONSE);
      expect(res.errorType).toBe(ERROR_TYPES.INVALID_JSON);
      expect(res.errorMessage).toContain("Malformed response: Endpoint returned non-JSON content");
    });

    it("handles valid JSON with unrecognized schema as UNKNOWN without fabricating health", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ unexpectedKey: 999 }),
      });

      const res = await evaluateServiceHealth("harsha", "https://sl-validator-cet.onrender.com", "/health");
      expect(res.status).toBe(HEALTH_STATES.UNKNOWN);
      expect(res.errorType).toBe(ERROR_TYPES.UNKNOWN_ERROR);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Health Status Normalization
  // ─────────────────────────────────────────────────────────────
  describe("6. Health Status Normalization", () => {
    it("recognizes operational aliases: 'ok', 'running', 'up', 'active', 'operational'", async () => {
      const aliases = ["ok", "running", "up", "active", "operational", "healthy", "online"];

      for (const alias of aliases) {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: alias }),
        });

        const res = await evaluateServiceHealth("prana", "http://163.128.209.18:8103", "/health");
        expect(res.status).toBe(HEALTH_STATES.HEALTHY);
      }
    });

    it("captures non-negative latency and updates lastSuccess timestamp", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ service: "bhiv-test" }),
      });

      const res = await evaluateServiceHealth("karma", "http://163.128.209.18:8102", "/health");
      expect(res.latencyMs).toBeGreaterThanOrEqual(0);
      expect(res.lastSuccess).toBeDefined();
      expect(res.lastFailure).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Trace Correlation
  // ─────────────────────────────────────────────────────────────
  describe("7. Trace Correlation", () => {
    it("correlates trace across services while preserving exact original identifiers", async () => {
      recordTelemetryEvent({
        service: "rajya",
        action: "POST /api/v1/rajya/validate",
        status: "success",
        traceId: "trace-uuid-101",
        metadata: { executionId: "exec-uuid-999" },
      });

      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/replay/trace-uuid-101")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              trace_id: "trace-uuid-101",
              certification_status: "CERTIFIED",
              execution_token: "tok-999",
            }),
          });
        }
        if (url.includes("/bucket/artifacts")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              artifacts: [
                {
                  artifact: {
                    artifact_id: "art-uuid-55",
                    trace_id: "trace-uuid-101",
                    hash: "0xhashroot",
                    parent_hash: "0xhashparent",
                  },
                },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ latest_hash: "0xhashroot", contract_version: "v1" }),
        });
      });

      const model = await correlateTrace("trace-uuid-101");

      expect(model.matchedIdentifiers.traceId).toBe("trace-uuid-101");
      expect(model.matchedIdentifiers.executionId).toBe("exec-uuid-999");
      expect(model.matchedIdentifiers.artifactId).toBe("art-uuid-55");
      expect(model.matchedIdentifiers.hash).toBe("0xhashroot");
      expect(model.matchedIdentifiers.parentHash).toBe("0xhashparent");
      expect(model.matchedIdentifiers.executionToken).toBe("tok-999");
      expect(model.status).toBe(TRACE_STATUS.COMPLETE);
    });

    it("flags broken link when PRANA has trace but BUCKET artifact is missing", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/replay/")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ trace_id: "trace-broken-test", certification_status: "CERTIFIED" }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ artifacts: [] }),
        });
      });

      const model = await correlateTrace("trace-broken-test");
      expect(model.status).toBe(TRACE_STATUS.BROKEN_LINK);
      expect(model.missingLinks.some((l) => l.includes("BUCKET provenance artifact absent"))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Command State Transitions & Audit Log
  // ─────────────────────────────────────────────────────────────
  describe("8. Command State Transitions", () => {
    it("ApprovalCard executes approve command and dispatches audit & notification", async () => {
      const mockApproval = {
        id: "APR-9001",
        title: "Authorize Cluster Scaledown",
        type: "DEPLOY",
        priority: "p2",
        requester: "DevOps Lead",
        dept: "Platform",
        age: "5 min",
        risk: "low",
      };
      const addAuditMock = vi.fn();
      const addNotifMock = vi.fn();
      const onDismissMock = vi.fn();

      const mockTheme = {
        theme: "dark",
        t: {
          surface: "#0C1018",
          surfaceHover: "#1A2436",
          border: "#1C2230",
          borderStrong: "#263040",
          text: "#DDE2EC",
          textSub: "#8892A6",
          textMuted: "#546070",
        },
      };

      render(
        <ThemeProvider value={mockTheme}>
          <ApprovalCard
            a={mockApproval}
            t={mockTheme.t}
            addAudit={addAuditMock}
            addNotif={addNotifMock}
            onDismiss={onDismissMock}
          />
        </ThemeProvider>
      );

      // Verify card rendered
      expect(screen.getByText(/Authorize Cluster Scaledown/i)).toBeDefined();

      // Click Approve button (triggers confirmation dialog)
      const approveBtn = screen.getByText(/^Approve$/i);
      fireEvent.click(approveBtn);

      // Click Confirm button inside dialog
      const confirmBtn = await screen.findByText(/^Confirm$/i);
      fireEvent.click(confirmBtn);

      await waitFor(
        () => {
          expect(addAuditMock).toHaveBeenCalledWith(
            expect.objectContaining({
              label: "Approve APR-9001",
              status: "success",
            })
          );
          expect(addNotifMock).toHaveBeenCalledWith(
            expect.objectContaining({
              text: "APR-9001 approved",
              severity: "info",
            })
          );
          expect(onDismissMock).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it("ApprovalCard executes reject command and records warning audit", async () => {
      const mockApproval = {
        id: "APR-9002",
        title: "Bypass Security Gate",
        type: "CONFIG",
        priority: "p1",
        requester: "Unauthorized Actor",
        dept: "External",
        age: "1 min",
        risk: "high",
      };
      const addAuditMock = vi.fn();
      const addNotifMock = vi.fn();
      const onDismissMock = vi.fn();

      const mockTheme = {
        theme: "dark",
        t: {
          surface: "#0C1018",
          surfaceHover: "#1A2436",
          border: "#1C2230",
          borderStrong: "#263040",
          text: "#DDE2EC",
          textSub: "#8892A6",
          textMuted: "#546070",
        },
      };

      render(
        <ThemeProvider value={mockTheme}>
          <ApprovalCard
            a={mockApproval}
            t={mockTheme.t}
            addAudit={addAuditMock}
            addNotif={addNotifMock}
            onDismiss={onDismissMock}
          />
        </ThemeProvider>
      );

      // Click Reject button (triggers confirmation dialog)
      const rejectBtn = screen.getByText(/^Reject$/i);
      fireEvent.click(rejectBtn);

      // Click Confirm button inside dialog
      const confirmBtn = await screen.findByText(/^Confirm$/i);
      fireEvent.click(confirmBtn);

      await waitFor(
        () => {
          expect(addAuditMock).toHaveBeenCalledWith(
            expect.objectContaining({
              label: "Reject APR-9002",
              status: "success",
            })
          );
          expect(addNotifMock).toHaveBeenCalledWith(
            expect.objectContaining({
              text: "APR-9002 rejected",
              severity: "warning",
            })
          );
        },
        { timeout: 3000 }
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Governance Response Parsing
  // ─────────────────────────────────────────────────────────────
  describe("9. Governance Response Parsing", () => {
    it("parses RAJYA governance response payload and computes SHA-256 client provenance hash", async () => {
      const mockGovernancePayload = {
        sarathiDecision: "ALLOW",
        executionId: "exec-gov-001",
        policyTier: "CONSTITUTIONAL_TIER_1",
      };

      const computedHash = await computeSha256(mockGovernancePayload);
      expect(computedHash).toMatch(/^[a-f0-9]{64}$/);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: "success",
          verdict: "EXECUTION_APPROVED",
          timestamp: "2026-09-12T12:00:00Z",
          policyTier: "CONSTITUTIONAL_TIER_1",
        }),
      });

      const res = await apiPost(
        SERVICE_CONFIG.RAJYA,
        "/api/v1/rajya/validate",
        mockGovernancePayload
      );

      expect(res.status).toBe("success");
      expect(res.verdict).toBe("EXECUTION_APPROVED");
      expect(res.policyTier).toBe("CONSTITUTIONAL_TIER_1");
    });

    it("sanitizes authorization tokens and secrets in diagnostic error messages", () => {
      const rawError = "Unauthorized: Bearer secretToken123 with api_key=superSecretKey";
      const sanitized = sanitizeDiagnostic(rawError);

      expect(sanitized).not.toContain("secretToken123");
      expect(sanitized).not.toContain("superSecretKey");
      expect(sanitized).toContain("Bearer [REDACTED]");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 10. Integrity Verification Response Parsing
  // ─────────────────────────────────────────────────────────────
  describe("10. Integrity Verification Response Parsing", () => {
    it("parses KARMA latest hash response and flags hash match as sound", async () => {
      const mockHash = "0x9876543210fedcba9876543210fedcba";
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ latest_hash: mockHash, status: "ok" }),
      });

      const res = await apiGet(SERVICE_CONFIG.KARMA, "/karma/latest-hash");
      expect(res.latest_hash).toBe(mockHash);

      // Verify match evaluation in observability model
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/karma/latest-hash")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ latest_hash: mockHash }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: "healthy" }),
          json: async () => ({ status: "healthy" }),
        });
      });

      const obs = await fetchConstitutionalObservabilityModel();
      expect(obs.services.karma.details.latestHash).toBe(mockHash);
      expect(obs.services.karma.isVerified).toBe(true);
    });

    it("marks KARMA integrity unverified when latest hash is missing from response", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/karma/latest-hash")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({}),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: "healthy" }),
          json: async () => ({ status: "healthy" }),
        });
      });

      const obs = await fetchConstitutionalObservabilityModel();
      expect(obs.services.karma.details.latestHash).toBe("NOT_RECEIVED");
      expect(obs.services.karma.isVerified).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 11. Runtime Service Aggregation
  // ─────────────────────────────────────────────────────────────
  describe("11. Runtime Service Aggregation", () => {
    it("aggregates all 7 microservices into normalized monitoring dictionary", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: "healthy" }),
      });

      const fullResults = await monitorAllServices();
      const serviceKeys = Object.keys(fullResults);

      expect(serviceKeys).toEqual([
        "prana",
        "karma",
        "rajya",
        "tantra",
        "bucket",
        "sanskar",
        "harsha",
      ]);

      serviceKeys.forEach((key) => {
        const item = fullResults[key];
        expect(item.serviceId).toBe(key);
        expect(item.serviceName).toBeDefined();
        expect(item.endpoint).toBeDefined();
        expect(item.status).toBe(HEALTH_STATES.HEALTHY);
        expect(item.latencyMs).toBeGreaterThanOrEqual(0);
      });
    });

    it("checkAllRuntimeServices extracts simplified status map", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: "healthy" }),
      });

      const statusMap = await checkAllRuntimeServices();
      expect(statusMap.prana).toBe(HEALTH_STATES.HEALTHY);
      expect(statusMap.karma).toBe(HEALTH_STATES.HEALTHY);
      expect(statusMap.rajya).toBe(HEALTH_STATES.HEALTHY);
      expect(statusMap.tantra).toBe(HEALTH_STATES.HEALTHY);
      expect(statusMap.bucket).toBe(HEALTH_STATES.HEALTHY);
      expect(statusMap.sanskar).toBe(HEALTH_STATES.HEALTHY);
      expect(statusMap.harsha).toBe(HEALTH_STATES.HEALTHY);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 12. Failure Isolation
  // ─────────────────────────────────────────────────────────────
  describe("12. Failure Isolation", () => {
    it("guarantees that 4 simultaneous failures never crash the aggregator or affect healthy services", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("163.128.209.18:8103")) {
          // PRANA: Healthy
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ status: "operational", service: "prana" }),
          });
        }
        if (url.includes("163.128.209.18:8102")) {
          // KARMA: 401 Auth Failed
          return Promise.resolve({
            ok: false,
            status: 401,
            statusText: "Unauthorized",
          });
        }
        if (url.includes("text-risk-scoring-service")) {
          // RAJYA: Healthy
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ status: "ok", service: "rajya" }),
          });
        }
        if (url.includes("tantra-gated-bridge")) {
          // TANTRA: 503 Degraded
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: "Service Unavailable",
          });
        }
        if (url.includes("bhiv-bucket-i1l6")) {
          // BUCKET: Offline (Network drop)
          return Promise.reject(new TypeError("Failed to fetch"));
        }
        if (url.includes("sl-validator-cet")) {
          // HARSHA: Timeout
          const err = new Error("AbortError");
          err.name = "AbortError";
          return Promise.reject(err);
        }
        // SANSKAR: Healthy
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: "healthy", service: "sanskar" }),
        });
      });

      const results = await monitorAllServices(8000);

      // Unaffected healthy services
      expect(results.prana.status).toBe(HEALTH_STATES.HEALTHY);
      expect(results.rajya.status).toBe(HEALTH_STATES.HEALTHY);
      expect(results.sanskar.status).toBe(HEALTH_STATES.HEALTHY);

      // Isolated failed services
      expect(results.karma.status).toBe(HEALTH_STATES.AUTH_FAILED);
      expect(results.tantra.status).toBe(HEALTH_STATES.DEGRADED);
      expect(results.bucket.status).toBe(HEALTH_STATES.OFFLINE);
      expect(results.harsha.status).toBe(HEALTH_STATES.TIMEOUT);
    });

    it("handles total rejection in individual promise gracefully without breaking dictionary", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Fatal connection crash"));

      const results = await monitorAllServices();

      expect(Object.keys(results).length).toBe(7);
      Object.values(results).forEach((item) => {
        expect(item.status).toBe(HEALTH_STATES.OFFLINE);
        expect(item.errorMessage).toBe("Fatal connection crash");
      });
    });
  });
});
