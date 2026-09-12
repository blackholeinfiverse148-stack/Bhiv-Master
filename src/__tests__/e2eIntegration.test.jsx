/**
 * End-to-End & Integration Verification Test Suite for BHIV Master
 * 
 * Verified Backend Reachability:
 * - REACHABLE:   PRANA, KARMA, RAJYA, TANTRA
 * - UNAVAILABLE: BUCKET (HTTP 503 Render gateway), SANSKAR (Timeout), HARSHA (Timeout)
 * 
 * Verifies all 9 required paths for reachable services, and creates contract-level
 * tests for unavailable services labeled explicitly as such.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  evaluateServiceHealth,
  monitorAllServices,
  apiFetch,
  apiGet,
  apiPost,
  SERVICE_CONFIG,
  HEALTH_STATES,
  ERROR_TYPES,
  resetServiceHistory,
} from "../services/api";
import {
  classifyHealthStatus,
  OBSERVABILITY_CLASSIFICATIONS,
} from "../services/observability";
import { correlateTrace } from "../services/traceability";
import { computeSha256, clearTelemetryHistory } from "../services/telemetry";
import ConstitutionalObservabilityDashboard from "../components/ConstitutionalObservability";
import RuntimeServicesWidget from "../runtime-services-widget";

describe("Phase 2 E2E & Integration Verification Suite", () => {
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
  // 1. Dashboard Loads
  // ─────────────────────────────────────────────────────────────
  describe("1. Dashboard Loads", () => {
    it("loads RuntimeServicesWidget without crashing and renders header and 7-service overview", async () => {
      // Provide mock monitor data for initial render
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes(":8103/health")) {
          return Promise.resolve(new Response(JSON.stringify({ status: "healthy", service: "bhiv-prana" }), { status: 200 }));
        }
        if (url.includes(":8102/health")) {
          return Promise.resolve(new Response(JSON.stringify({ status: "healthy", service: "bhiv-karma-helper" }), { status: 200 }));
        }
        if (url.includes("text-risk-scoring-service") && url.includes("/health")) {
          return Promise.resolve(new Response(JSON.stringify({ status: "ok", service: "bhiv-enforcement-gateway" }), { status: 200 }));
        }
        if (url.includes("tantra-gated-bridge") && url.includes("/health")) {
          return Promise.resolve(new Response(JSON.stringify({ status: "healthy", service: "execution" }), { status: 200 }));
        }
        if (url.includes("bhiv-bucket") && url.includes("/health")) {
          return Promise.resolve(new Response("<!DOCTYPE html><html>503 Service Unavailable</html>", { status: 503 }));
        }
        return Promise.reject(new Error("Network timeout"));
      });

      render(<RuntimeServicesWidget />);

      // Verify dashboard header loads
      expect(screen.getByText(/BHIV Runtime Services/i)).toBeDefined();
      expect(screen.getByText(/Runtime Telemetry — PRANA · KARMA · RAJYA · TANTRA · BUCKET · SANSKAR · HARSHA/i)).toBeDefined();

      // Verify 7 service cards appear in overview
      expect(screen.getByText(/^PRANA$/i)).toBeDefined();
      expect(screen.getByText(/^KARMA$/i)).toBeDefined();
      expect(screen.getByText(/^RAJYA$/i)).toBeDefined();
      expect(screen.getByText(/^TANTRA$/i)).toBeDefined();
      expect(screen.getByText(/^BUCKET$/i)).toBeDefined();
      expect(screen.getByText(/^SANSKAR$/i)).toBeDefined();
      expect(screen.getByText(/^HARSHA$/i)).toBeDefined();
    });

    it("loads ConstitutionalObservabilityDashboard without crashing and renders 5 sovereign domains", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes(":8102/health")) {
          return Promise.resolve(new Response(JSON.stringify({ status: "healthy", service: "bhiv-karma-helper" }), { status: 200 }));
        }
        if (url.includes(":8102/karma/latest-hash")) {
          return Promise.resolve(new Response(JSON.stringify({ latest_hash: "0000000000000000000000000000000000000000000000000000000000000000" }), { status: 200 }));
        }
        if (url.includes("text-risk-scoring-service") && url.includes("/health")) {
          return Promise.resolve(new Response(JSON.stringify({ status: "ok", service: "bhiv-enforcement-gateway" }), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({ status: "degraded" }), { status: 503 }));
      });

      render(<ConstitutionalObservabilityDashboard />);

      expect(screen.getByText(/Constitutional Observability & Convergence Model/i)).toBeDefined();
      expect(screen.getByText(/Governance \/ Decision State/i)).toBeDefined();
      expect(screen.getByText(/Integrity State/i)).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Health Check Is Requested
  // ─────────────────────────────────────────────────────────────
  describe("2. Health Check Is Requested", () => {
    it("requests health checks with exact contract paths for all reachable services", async () => {
      const requestedUrls = [];
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        requestedUrls.push(url);
        return Promise.resolve(new Response(JSON.stringify({ status: "healthy" }), { status: 200 }));
      });

      await monitorAllServices(3000);

      expect(requestedUrls).toContain(`${SERVICE_CONFIG.PRANA}/health`);
      expect(requestedUrls).toContain(`${SERVICE_CONFIG.KARMA}/health`);
      expect(requestedUrls).toContain(`${SERVICE_CONFIG.RAJYA}/health`);
      expect(requestedUrls).toContain(`${SERVICE_CONFIG.TANTRA}/health`);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. API Response Is Parsed
  // ─────────────────────────────────────────────────────────────
  describe("3. API Response Is Parsed", () => {
    it("parses live payload formats from PRANA, KARMA, RAJYA, and TANTRA", async () => {
      // Test PRANA live schema
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "healthy",
            service: "bhiv-prana",
            forwarding_enabled: true,
            mongodb: { mongodb_connected: true },
          }),
          { status: 200 }
        )
      );
      const pranaResult = await evaluateServiceHealth("prana", SERVICE_CONFIG.PRANA, "/health");
      expect(pranaResult.status).toBe(HEALTH_STATES.HEALTHY);
      expect(pranaResult.rawDetails.service).toBe("bhiv-prana");
      expect(pranaResult.rawDetails.forwarding_enabled).toBe(true);

      // Test KARMA live schema
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "healthy", service: "bhiv-karma-helper" }), { status: 200 })
      );
      const karmaResult = await evaluateServiceHealth("karma", SERVICE_CONFIG.KARMA, "/health");
      expect(karmaResult.status).toBe(HEALTH_STATES.HEALTHY);
      expect(karmaResult.rawDetails.service).toBe("bhiv-karma-helper");

      // Test RAJYA live schema
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "ok", service: "bhiv-enforcement-gateway" }), { status: 200 })
      );
      const rajyaResult = await evaluateServiceHealth("rajya", SERVICE_CONFIG.RAJYA, "/health");
      expect(rajyaResult.status).toBe(HEALTH_STATES.HEALTHY);
      expect(rajyaResult.rawDetails.service).toBe("bhiv-enforcement-gateway");

      // Test TANTRA live schema
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ service: "execution", status: "healthy", algorithms: ["RS256", "EdDSA"] }), { status: 200 })
      );
      const tantraResult = await evaluateServiceHealth("tantra", SERVICE_CONFIG.TANTRA, "/health");
      expect(tantraResult.status).toBe(HEALTH_STATES.HEALTHY);
      expect(tantraResult.rawDetails.algorithms).toContain("RS256");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Runtime Status Is Rendered
  // ─────────────────────────────────────────────────────────────
  describe("4. Runtime Status Is Rendered", () => {
    it("renders LIVE and HEALTHY badges in Constitutional Observability and Overview", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes(":8102/health")) {
          return Promise.resolve(new Response(JSON.stringify({ status: "healthy", service: "bhiv-karma-helper" }), { status: 200 }));
        }
        if (url.includes(":8102/karma/latest-hash")) {
          return Promise.resolve(new Response(JSON.stringify({ latest_hash: "abcd1234efgh5678" }), { status: 200 }));
        }
        if (url.includes("text-risk-scoring-service") && url.includes("/health")) {
          return Promise.resolve(new Response(JSON.stringify({ status: "ok", service: "bhiv-enforcement-gateway" }), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({ status: "down" }), { status: 503 }));
      });

      render(<ConstitutionalObservabilityDashboard />);

      await waitFor(() => {
        // KARMA and RAJYA are healthy, should render LIVE
        const liveBadges = screen.getAllByText(/LIVE/i);
        expect(liveBadges.length).toBeGreaterThan(0);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Failure States Render Correctly
  // ─────────────────────────────────────────────────────────────
  describe("5. Failure States Render Correctly", () => {
    it("renders BUCKET 503 HTML failure honestly as DEGRADED without crashing or fabricating success", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response("<!DOCTYPE html><html>Render Gateway Error 503</html>", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/html" },
        })
      );

      const bucketResult = await evaluateServiceHealth("bucket", SERVICE_CONFIG.BUCKET, "/health");
      expect(bucketResult.status).toBe(HEALTH_STATES.DEGRADED);
      expect(bucketResult.httpStatus).toBe(503);
      expect(bucketResult.errorMessage).toMatch(/HTTP 503/i);

      // Verify classification in constitutional model
      const classification = classifyHealthStatus(bucketResult);
      expect(classification).toBe(OBSERVABILITY_CLASSIFICATIONS.DEGRADED);
      expect(classification).not.toBe(OBSERVABILITY_CLASSIFICATIONS.LIVE);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Timeout Behavior Works
  // ─────────────────────────────────────────────────────────────
  describe("6. Timeout Behavior Works", () => {
    it("evaluates timeout honestly and records TIMEOUT state without hanging", async () => {
      globalThis.fetch = vi.fn().mockImplementation(() => {
        const err = new Error("The operation was aborted due to timeout");
        err.name = "AbortError";
        return Promise.reject(err);
      });

      const timeoutResult = await evaluateServiceHealth("sanskar", SERVICE_CONFIG.SANSKAR, "/health", 200);
      expect(timeoutResult.status).toBe(HEALTH_STATES.TIMEOUT);
      expect(timeoutResult.errorType).toBe(ERROR_TYPES.TIMEOUT);
      expect(timeoutResult.errorMessage).toMatch(/timed out after 200ms/i);

      const classification = classifyHealthStatus(timeoutResult);
      expect(classification).toBe(OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Authentication Failures Are Surfaced Correctly
  // ─────────────────────────────────────────────────────────────
  describe("7. Authentication Failures Are Surfaced Correctly", () => {
    it("surfaces HTTP 401 and 403 as AUTH_FAILED and preserves fail-closed status", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "Bearer token required or expired" }), {
          status: 401,
          statusText: "Unauthorized",
        })
      );

      const authResult = await evaluateServiceHealth("prana", SERVICE_CONFIG.PRANA, "/health");
      expect(authResult.status).toBe(HEALTH_STATES.AUTH_FAILED);
      expect(authResult.errorType).toBe(ERROR_TYPES.AUTH_FAILURE);
      expect(authResult.errorMessage).toMatch(/HTTP 401/i);

      const classification = classifyHealthStatus(authResult);
      expect(classification).toBe(OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Trace Information Is Preserved
  // ─────────────────────────────────────────────────────────────
  describe("8. Trace Information Is Preserved", () => {
    it("injects correlation headers and preserves trace IDs across requests", async () => {
      let sentHeaders = {};
      globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
        sentHeaders = opts.headers;
        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      });

      await apiFetch("http://163.128.209.18:8103", "/prana/propagation-log", {
        headers: { "X-Correlation-ID": "corr-e2e-99", "X-Custom-Req": "test-e2e" },
      });

      expect(sentHeaders["X-Correlation-ID"]).toBe("corr-e2e-99");
      expect(sentHeaders["X-Trace-ID"]).toBeDefined();
      expect(sentHeaders["X-BHIV-Client"]).toBe("bhiv-master-dashboard/v2.0");
      expect(sentHeaders["X-Custom-Req"]).toBe("test-e2e");
    });

    it("correlates multi-service trace with live and missing stages explicitly", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes(":8103/replay/")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                trace_id: "TR-E2E-LIVE-01",
                certification_status: "CERTIFIED",
                execution_token: "TOK-99",
                created_at: "2026-09-12T13:00:00Z",
              }),
              { status: 200 }
            )
          );
        }
        if (url.includes(":8102/karma/latest-hash")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ latest_hash: "00000000000000000000000000000000" }),
              { status: 200 }
            )
          );
        }
        return Promise.reject(new Error("Service offline"));
      });

      const result = await correlateTrace("TR-E2E-LIVE-01");
      expect(result.queryId).toBe("TR-E2E-LIVE-01");
      expect(result.stages).toHaveLength(6);
      expect(result.status).toBeDefined();
      expect(result.missingLinks.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Governance, Integrity & Provenance Information Rendered
  // ─────────────────────────────────────────────────────────────
  describe("9. Governance / Integrity / Provenance Contracts (Reachable Services)", () => {
    it("parses RAJYA governance validate contract response and computes client provenance hash", async () => {
      const rajyaDecisionResponse = {
        status: "REJECT",
        rejection_code: "RAJYA_SARATHI_AUTHORITY_MISSING",
        rejection_reason: "Sarathi decision is missing. Cannot approve execution without governance authority.",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(rajyaDecisionResponse), { status: 200 })
      );

      const res = await apiPost(SERVICE_CONFIG.RAJYA, "/api/v1/rajya/validate", {
        execution_id: "EXEC-TEST-001",
      });

      expect(res.status).toBe("REJECT");
      expect(res.rejection_code).toBe("RAJYA_SARATHI_AUTHORITY_MISSING");

      // Verify SHA-256 provenance hash computation
      const provenanceHash = await computeSha256(JSON.stringify(res));
      expect(provenanceHash).toHaveLength(64);
    });

    it("parses KARMA /karma/verify and /karma/latest-hash contracts correctly", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/karma/latest-hash")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                latest_hash: "0000000000000000000000000000000000000000000000000000000000000000",
                chain: "PranaPacket",
              }),
              { status: 200 }
            )
          );
        }
        if (url.includes("/karma/verify")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                status: "MATCH",
                events_verified: 0,
                matches: 0,
                mismatches: [],
                validation_ids: [],
              }),
              { status: 200 }
            )
          );
        }
        return Promise.reject(new Error("Not found"));
      });

      const hashData = await apiGet(SERVICE_CONFIG.KARMA, "/karma/latest-hash");
      expect(hashData.latest_hash).toBe("0000000000000000000000000000000000000000000000000000000000000000");
      expect(hashData.chain).toBe("PranaPacket");

      const verifyData = await apiPost(SERVICE_CONFIG.KARMA, "/karma/verify", {});
      expect(verifyData.status).toBe("MATCH");
      expect(verifyData.matches).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 10. Contract-Level Tests for Unavailable Services
  // ─────────────────────────────────────────────────────────────
  describe("10. Contract-Level Tests for Unavailable Services", () => {
    it("[CONTRACT-LEVEL TEST - SERVICE CURRENTLY UNAVAILABLE] BUCKET Provenance Store contract compliance", async () => {
      // Contract specification:
      // Endpoint: GET /bucket/chain-state
      // Expected Response Schema on Healthy: { chain_length: number, latest_hash: string, root_hash: string, artifact_count: number }
      const mockHealthyBucketContract = {
        chain_length: 42,
        latest_hash: "a3b9c0d1e2f3a4b5c6d7e8f90123456789abcdef0123456789abcdef01234567",
        root_hash: "f1e2d3c4b5a60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0",
        artifact_count: 128,
        status: "healthy",
      };

      // Mock contract parsing
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/health")) {
          return Promise.resolve(new Response(JSON.stringify({ status: "healthy", service: "bhiv-bucket-storage" }), { status: 200 }));
        }
        if (url.includes("/bucket/chain-state")) {
          return Promise.resolve(new Response(JSON.stringify(mockHealthyBucketContract), { status: 200 }));
        }
        return Promise.reject(new Error("Unknown route"));
      });

      const health = await evaluateServiceHealth("bucket", SERVICE_CONFIG.BUCKET, "/health");
      expect(health.status).toBe(HEALTH_STATES.HEALTHY);

      const chainState = await apiGet(SERVICE_CONFIG.BUCKET, "/bucket/chain-state");
      expect(chainState.chain_length).toBe(42);
      expect(chainState.artifact_count).toBe(128);
      expect(chainState.latest_hash).toHaveLength(64);
    });

    it("[CONTRACT-LEVEL TEST - SERVICE CURRENTLY UNAVAILABLE] SANSKAR Constitutional Convergence contract compliance", async () => {
      // Contract specification:
      // Endpoint: GET /health
      // Expected Response Schema on Healthy: { status: "healthy", service: "bhiv-sanskar", contract_version: "v1.2", rules_enforced: number }
      const mockHealthySanskarContract = {
        status: "healthy",
        service: "bhiv-sanskar",
        contract_version: "v1.2",
        rules_enforced: 18,
        convergence_status: "ACTIVE",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockHealthySanskarContract), { status: 200 })
      );

      const health = await evaluateServiceHealth("sanskar", SERVICE_CONFIG.SANSKAR, "/health");
      expect(health.status).toBe(HEALTH_STATES.HEALTHY);
      expect(health.rawDetails.contract_version).toBe("v1.2");
      expect(health.rawDetails.rules_enforced).toBe(18);

      const classification = classifyHealthStatus(health);
      expect(classification).toBe(OBSERVABILITY_CLASSIFICATIONS.LIVE);
    });

    it("[CONTRACT-LEVEL TEST - SERVICE CURRENTLY UNAVAILABLE] HARSHA CET/KSML Validator contract compliance", async () => {
      // Contract specification:
      // Endpoint: GET /health and POST /validate
      // Expected Response Schema on Healthy: { status: "healthy", service: "sl-validator-cet", engine: "KSML-CET-v2" }
      const mockHealthyHarshaContract = {
        status: "healthy",
        service: "sl-validator-cet",
        engine: "KSML-CET-v2",
        validation_queue: 0,
      };

      const mockValidationResult = {
        execution_id: "EXEC-VAL-99",
        valid: true,
        ksml_compliance: "PASSED",
        cet_timestamp: "2026-09-12T13:15:00Z",
      };

      globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
        if (url.includes("/health")) {
          return Promise.resolve(new Response(JSON.stringify(mockHealthyHarshaContract), { status: 200 }));
        }
        if (url.includes("/validate") && opts.method === "POST") {
          return Promise.resolve(new Response(JSON.stringify(mockValidationResult), { status: 200 }));
        }
        return Promise.reject(new Error("Unknown route"));
      });

      const health = await evaluateServiceHealth("harsha", SERVICE_CONFIG.HARSHA, "/health");
      expect(health.status).toBe(HEALTH_STATES.HEALTHY);
      expect(health.rawDetails.engine).toBe("KSML-CET-v2");

      const validation = await apiPost(SERVICE_CONFIG.HARSHA, "/validate", {
        execution_id: "EXEC-VAL-99",
        code: "KSML_OP_SCALE_01",
      });
      expect(validation.valid).toBe(true);
      expect(validation.ksml_compliance).toBe("PASSED");
    });
  });
});
