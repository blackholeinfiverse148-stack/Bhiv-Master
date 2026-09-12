import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ConstitutionalObservabilityDashboard from "../components/ConstitutionalObservability";
import {
  classifyHealthStatus,
  fetchConstitutionalObservabilityModel,
  OBSERVABILITY_CLASSIFICATIONS,
} from "../services/observability";
import { HEALTH_STATES } from "../services/api";

describe("Constitutional Observability System", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("classifyHealthStatus unit mapping", () => {
    it("maps HEALTHY to LIVE", () => {
      expect(classifyHealthStatus({ status: HEALTH_STATES.HEALTHY })).toBe(OBSERVABILITY_CLASSIFICATIONS.LIVE);
    });

    it("maps DEGRADED to DEGRADED", () => {
      expect(classifyHealthStatus({ status: HEALTH_STATES.DEGRADED })).toBe(OBSERVABILITY_CLASSIFICATIONS.DEGRADED);
    });

    it("maps OFFLINE to OFFLINE", () => {
      expect(classifyHealthStatus({ status: HEALTH_STATES.OFFLINE })).toBe(OBSERVABILITY_CLASSIFICATIONS.OFFLINE);
    });

    it("maps TIMEOUT, AUTH_FAILED, and UNKNOWN to UNVERIFIED honestly", () => {
      expect(classifyHealthStatus({ status: HEALTH_STATES.TIMEOUT })).toBe(OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED);
      expect(classifyHealthStatus({ status: HEALTH_STATES.AUTH_FAILED })).toBe(OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED);
      expect(classifyHealthStatus({ status: HEALTH_STATES.UNKNOWN })).toBe(OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED);
      expect(classifyHealthStatus(null)).toBe(OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED);
    });
  });

  describe("fetchConstitutionalObservabilityModel aggregator", () => {
    it("gathers telemetry from all 5 services with complete failure isolation", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("text-risk-scoring-service")) {
          // RAJYA healthy
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ status: "healthy", service: "bhiv-enforcement-gateway" }),
            json: async () => ({ status: "healthy", service: "bhiv-enforcement-gateway" }),
          });
        }
        if (url.includes("full-tantra-constitutional-convergence")) {
          // SANSKAR healthy
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ status: "healthy", service: "bhiv-sanskar", contract_version: "v1" }),
            json: async () => ({ status: "healthy", service: "bhiv-sanskar", contract_version: "v1" }),
          });
        }
        if (url.includes(":8102")) {
          // KARMA healthy with hash
          if (url.includes("latest-hash")) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({ status: "ok", latest_hash: "0xabcdef1234567890abcdef1234567890" }),
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ status: "healthy", service: "karma" }),
            json: async () => ({ status: "healthy", service: "karma" }),
          });
        }
        if (url.includes("bhiv-bucket-i1l6")) {
          // BUCKET degraded 503
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: "Service Unavailable",
            text: async () => "Render spin-down",
          });
        }
        if (url.includes("sl-validator-cet")) {
          // HARSHA timeout
          const err = new Error("Probe timed out");
          err.name = "AbortError";
          return Promise.reject(err);
        }
        return Promise.reject(new Error("Unknown host"));
      });

      const model = await fetchConstitutionalObservabilityModel();

      expect(model.services.rajya.classification).toBe("LIVE");
      expect(model.services.sanskar.classification).toBe("LIVE");
      expect(model.services.karma.classification).toBe("LIVE");
      expect(model.services.karma.details.latestHash).toBe("0xabcdef1234567890abcdef1234567890");

      // BUCKET must be DEGRADED (503), NEVER converted to LIVE
      expect(model.services.bucket.classification).toBe("DEGRADED");
      expect(model.services.bucket.httpStatus).toBe(503);

      // HARSHA must be UNVERIFIED (Timeout), NEVER converted to LIVE
      expect(model.services.harsha.classification).toBe("UNVERIFIED");
      expect(model.services.harsha.rawHealthStatus).toBe("TIMEOUT");
      expect(model.services.harsha.error).toContain("timed out");
    });
  });

  describe("ConstitutionalObservabilityDashboard Component", () => {
    it("renders all 5 constitutional domains and source service endpoints", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/api/v1/rajya/validate")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ status: "success", verdict: "EXECUTION_APPROVED" }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: "healthy", service: "bhiv-test" }),
          json: async () => ({ status: "healthy", service: "bhiv-test" }),
        });
      });

      render(<ConstitutionalObservabilityDashboard />);

      // Headers & Domain titles
      expect(screen.getByText(/Constitutional Observability & Convergence Model/i)).toBeDefined();
      expect(screen.getByText(/Governance \/ Decision State/i)).toBeDefined();
      expect(screen.getByText(/Constitutional \/ Convergence/i)).toBeDefined();
      expect(screen.getByText(/Integrity State/i)).toBeDefined();
      expect(screen.getByText(/Provenance \/ Evidence State/i)).toBeDefined();
      expect(screen.getByText(/Execution \/ Validation State/i)).toBeDefined();

      // Controls
      expect(screen.getByText(/Validate Constitutional Policy/i)).toBeDefined();
      expect(screen.getByText(/Deterministic Governance Validation Test/i)).toBeDefined();
    });

    it("displays honest unverified / degraded status and does not fabricate success when services fail", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("sl-validator-cet")) {
          const err = new Error("Failed to fetch");
          err.name = "AbortError";
          return Promise.reject(err);
        }
        if (url.includes("bhiv-bucket-i1l6")) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: "Service Unavailable",
            text: async () => "Unavailable",
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: "healthy" }),
          json: async () => ({ status: "healthy" }),
        });
      });

      render(<ConstitutionalObservabilityDashboard />);

      await waitFor(() => {
        // Honest badges should render
        expect(screen.getAllByText(/UNVERIFIED/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/DEGRADED/i).length).toBeGreaterThan(0);
      });
    });

    it("executes interactive RAJYA validation and displays verdict & client SHA-256 hash", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/api/v1/rajya/validate")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              status: "success",
              verdict: "EXECUTION_APPROVED",
              policyTier: "CONSTITUTIONAL_TIER_1",
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: "healthy" }),
          json: async () => ({ status: "healthy" }),
        });
      });

      render(<ConstitutionalObservabilityDashboard />);

      const validateBtn = screen.getByText(/Validate Constitutional Policy/i);
      fireEvent.click(validateBtn);

      await waitFor(() => {
        expect(screen.getByText(/Verdict: EXECUTION_APPROVED/i)).toBeDefined();
        expect(screen.getByText(/Client Provenance SHA-256:/i)).toBeDefined();
      });
    });
  });
});
