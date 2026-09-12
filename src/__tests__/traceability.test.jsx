import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import TraceabilityInspector from "../components/TraceabilityInspector";
import {
  correlateTrace,
  extractRecentTraces,
  STAGE_STATUS,
  TRACE_STATUS,
} from "../services/traceability";
import { recordTelemetryEvent, clearTelemetryHistory } from "../services/telemetry";

describe("End-to-End Traceability & Correlation System", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    clearTelemetryHistory();
    vi.restoreAllMocks();
  });

  describe("extractRecentTraces", () => {
    it("gathers observed trace and execution identifiers without inventing any IDs", async () => {
      recordTelemetryEvent({
        service: "test-service",
        action: "probe",
        status: "success",
        traceId: "trace-discovered-001",
        metadata: { executionId: "exec-discovered-999" },
      });

      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/bucket/artifacts")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              artifacts: [
                { artifact: { artifact_id: "art-100", trace_id: "trace-from-bucket" } },
              ],
            }),
          });
        }
        if (url.includes("/prana/propagation-log")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              events: [
                { trace_id: "trace-from-prana", status: "forwarded" },
              ],
            }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      const list = await extractRecentTraces();
      const ids = list.map((item) => item.id);

      expect(ids).toContain("trace-discovered-001");
      expect(ids).toContain("exec-discovered-999");
      expect(ids).toContain("trace-from-bucket");
      expect(ids).toContain("trace-from-prana");
    });
  });

  describe("correlateTrace engine", () => {
    it("correlates a multi-service trace and preserves original identifiers exactly", async () => {
      // Record local governance telemetry for RAJYA
      recordTelemetryEvent({
        service: "rajya",
        action: "POST /api/v1/rajya/validate",
        status: "success",
        traceId: "trace-alpha-123",
        metadata: { executionId: "exec-alpha-123" },
      });

      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/replay/trace-alpha-123")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              trace_id: "trace-alpha-123",
              certification_status: "CERTIFIED",
              execution_token: "tok-alpha-99",
              created_at: "2026-09-12T12:00:00Z",
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
                    artifact_id: "art-alpha-55",
                    trace_id: "trace-alpha-123",
                    hash: "0xhashalpha",
                    parent_hash: "0xparenthash",
                  },
                  chain_verified: true,
                },
              ],
            }),
          });
        }
        if (url.includes("/karma/latest-hash")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ latest_hash: "0xhashalpha" }),
          });
        }
        if (url.includes("full-tantra-constitutional-convergence")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ contract_version: "v1", service: "bhiv-sanskar" }),
          });
        }
        if (url.includes("sl-validator-cet")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ status: "operational", service: "sl-validator-cet" }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      const model = await correlateTrace("trace-alpha-123");

      expect(model.matchedIdentifiers.traceId).toBe("trace-alpha-123");
      expect(model.matchedIdentifiers.executionId).toBe("exec-alpha-123");
      expect(model.matchedIdentifiers.artifactId).toBe("art-alpha-55");
      expect(model.matchedIdentifiers.hash).toBe("0xhashalpha");
      expect(model.matchedIdentifiers.parentHash).toBe("0xparenthash");
      expect(model.matchedIdentifiers.executionToken).toBe("tok-alpha-99");

      // Verify stages
      const govStage = model.stages.find((s) => s.id === "governance");
      const propStage = model.stages.find((s) => s.id === "propagation");
      const provStage = model.stages.find((s) => s.id === "provenance");
      const integStage = model.stages.find((s) => s.id === "integrity");

      expect(govStage.status).toBe(STAGE_STATUS.VERIFIED);
      expect(propStage.status).toBe(STAGE_STATUS.VERIFIED);
      expect(provStage.status).toBe(STAGE_STATUS.VERIFIED);
      expect(integStage.status).toBe(STAGE_STATUS.VERIFIED);
      expect(model.status).toBe(TRACE_STATUS.COMPLETE);
    });

    it("explicitly detects missing links when downstream BUCKET artifact is absent", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/replay/trace-missing-artifact")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              trace_id: "trace-missing-artifact",
              certification_status: "CERTIFIED",
              execution_token: "tok-incomplete",
            }),
          });
        }
        if (url.includes("/bucket/artifacts")) {
          // BUCKET returns empty list
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ artifacts: [] }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      const model = await correlateTrace("trace-missing-artifact");

      const provStage = model.stages.find((s) => s.id === "provenance");
      expect(provStage.status).toBe(STAGE_STATUS.MISSING_LINK);
      expect(model.missingLinks.some((l) => l.includes("BUCKET provenance artifact absent"))).toBe(true);
      expect(model.status).toBe(TRACE_STATUS.BROKEN_LINK);
    });

    it("handles offline or timed out services gracefully without throwing", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/replay/")) {
          return Promise.reject(new Error("PRANA connection refused (500)"));
        }
        if (url.includes("sl-validator-cet")) {
          const timeoutErr = new Error("HARSHA timeout");
          timeoutErr.name = "AbortError";
          return Promise.reject(timeoutErr);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "ok" }),
        });
      });

      const model = await correlateTrace("trace-offline-test");

      const propStage = model.stages.find((s) => s.id === "propagation");
      const execStage = model.stages.find((s) => s.id === "execution");

      expect(propStage.status).toBe(STAGE_STATUS.UNVERIFIED_OFFLINE);
      expect(propStage.error).toContain("PRANA");
      expect(execStage.status).toBe(STAGE_STATUS.UNVERIFIED_OFFLINE);
      expect(model.missingLinks.some((l) => l.includes("PRANA event replay service unreachable"))).toBe(true);
    });
  });

  describe("TraceabilityInspector Component", () => {
    it("renders search input, recent traces, and 6-stage lifecycle timeline", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      render(<TraceabilityInspector />);

      await waitFor(() => {
        expect(screen.getByText(/End-to-End Traceability & Correlation Inspector/i)).toBeDefined();
        expect(screen.getByPlaceholderText(/Search by Trace ID/i)).toBeDefined();
        expect(screen.getByText(/Correlate Trace/i)).toBeDefined();
      });
    });

    it("triggers correlation on button click and renders missing link alert", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url) => {
        if (url.includes("/replay/trace-btn-test")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              trace_id: "trace-btn-test",
              certification_status: "CERTIFIED",
              execution_token: "tok-btn-test",
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ artifacts: [] }),
        });
      });

      render(<TraceabilityInspector />);

      const input = screen.getByPlaceholderText(/Search by Trace ID/i);
      fireEvent.change(input, { target: { value: "trace-btn-test" } });

      const correlateBtn = screen.getByText(/Correlate Trace/i);
      fireEvent.click(correlateBtn);

      await waitFor(() => {
        expect(screen.getByText(/Trace Lifecycle Overview:/i)).toBeDefined();
        expect(screen.getByText(/Explicit Missing Links & Lifecycle Gaps/i)).toBeDefined();
      });
    });
  });
});
