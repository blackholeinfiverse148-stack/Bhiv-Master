import { describe, it, expect, beforeEach } from "vitest";
import {
  generateTraceId,
  getCurrentTimestamp,
  getTraceHeaders,
  recordTelemetryEvent,
  getTelemetryHistory,
  clearTelemetryHistory,
  computeSha256,
} from "../services/telemetry";

describe("Telemetry and Observability Service", () => {
  beforeEach(() => {
    clearTelemetryHistory();
  });

  it("generates a valid UUID v4 trace ID", () => {
    const traceId = generateTraceId();
    expect(traceId).toBeTypeOf("string");
    // Standard UUID v4 regex: 8-4-4-4-12
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(traceId)).toBe(true);
  });

  it("generates ISO 8601 compliant timestamps", () => {
    const ts = getCurrentTimestamp();
    expect(new Date(ts).toISOString()).toBe(ts);
  });

  it("provides trace headers for network propagation", () => {
    const traceId = "test-trace-1234";
    const headers = getTraceHeaders(traceId);

    expect(headers["X-Trace-ID"]).toBe(traceId);
    expect(headers["X-BHIV-Client"]).toBe("bhiv-master-dashboard/v2.0");
    expect(headers["X-Client-Timestamp"]).toBeDefined();
  });

  it("records structured telemetry events in the buffer", () => {
    const event = recordTelemetryEvent({
      service: "PRANA",
      action: "GET /prana/system/health",
      status: "success",
      metadata: { latency: 45 },
    });

    expect(event.service).toBe("PRANA");
    expect(event.action).toBe("GET /prana/system/health");
    expect(event.status).toBe("success");
    expect(event.traceId).toBeDefined();

    const history = getTelemetryHistory();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(event.id);
  });

  it("computes deterministic SHA-256 hex string", async () => {
    const hash1 = await computeSha256("bhiv-payload-data");
    const hash2 = await computeSha256("bhiv-payload-data");

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });
});
