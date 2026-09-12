import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  evaluateServiceHealth,
  monitorAllServices,
  HEALTH_STATES,
  ERROR_TYPES,
  resetServiceHistory,
} from "../services/api";

describe("Production Runtime Monitoring Layer & Status Normalization", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetServiceHistory();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("normalizes healthy response with latency and preserves lastSuccess", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "healthy", service: "bhiv-prana" }),
    });

    const result = await evaluateServiceHealth("prana", "http://163.128.209.18:8103", "/health");

    expect(result.serviceId).toBe("prana");
    expect(result.status).toBe(HEALTH_STATES.HEALTHY);
    expect(result.errorType).toBeNull();
    expect(result.errorMessage).toBeNull();
    expect(result.httpStatus).toBe(200);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.lastSuccess).toBeDefined();
    expect(result.lastFailure).toBeNull();
    expect(result.rawDetails).toEqual({ status: "healthy", service: "bhiv-prana" });
  });

  it("distinguishes request timeout (AbortError) from network offline", async () => {
    const timeoutErr = new Error("AbortError");
    timeoutErr.name = "AbortError";
    globalThis.fetch = vi.fn().mockRejectedValue(timeoutErr);

    const result = await evaluateServiceHealth("harsha", "https://sl-validator-cet.onrender.com", "/health", 8000);

    expect(result.serviceId).toBe("harsha");
    expect(result.status).toBe(HEALTH_STATES.TIMEOUT);
    expect(result.errorType).toBe(ERROR_TYPES.TIMEOUT);
    expect(result.errorMessage).toContain("timed out after 8000ms");
    expect(result.httpStatus).toBeNull();
    expect(result.lastFailure).toBeDefined();
  });

  it("distinguishes network offline from timeout", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await evaluateServiceHealth("prana", "http://163.128.209.18:8103", "/health");

    expect(result.status).toBe(HEALTH_STATES.OFFLINE);
    expect(result.errorType).toBe(ERROR_TYPES.NETWORK_OFFLINE);
    expect(result.errorMessage).toBe("Failed to fetch");
    expect(result.httpStatus).toBeNull();
    expect(result.lastFailure).toBeDefined();
  });

  it("identifies HTTP 503 (Render Container Degraded) as DEGRADED with status code", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });

    const result = await evaluateServiceHealth("tantra", "https://tantra-gated-bridge-infrastructure.onrender.com", "/health");

    expect(result.status).toBe(HEALTH_STATES.DEGRADED);
    expect(result.errorType).toBe(ERROR_TYPES.HTTP_ERROR);
    expect(result.httpStatus).toBe(503);
    expect(result.errorMessage).toContain("503");
    expect(result.lastFailure).toBeDefined();
  });

  it("identifies authentication and authorization failures (HTTP 401 and 403)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    const result401 = await evaluateServiceHealth("karma", "http://163.128.209.18:8102", "/health");
    expect(result401.status).toBe(HEALTH_STATES.AUTH_FAILED);
    expect(result401.errorType).toBe(ERROR_TYPES.AUTH_FAILURE);
    expect(result401.httpStatus).toBe(401);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });

    const result403 = await evaluateServiceHealth("karma", "http://163.128.209.18:8102", "/health");
    expect(result403.status).toBe(HEALTH_STATES.AUTH_FAILED);
    expect(result403.errorType).toBe(ERROR_TYPES.AUTH_FAILURE);
    expect(result403.httpStatus).toBe(403);
  });

  it("detects empty (0-byte/whitespace) response bodies", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "",
    });

    const result = await evaluateServiceHealth("bucket", "https://bhiv-bucket-i1l6.onrender.com", "/health");

    expect(result.status).toBe(HEALTH_STATES.EMPTY_RESPONSE);
    expect(result.errorType).toBe(ERROR_TYPES.EMPTY_BODY);
    expect(result.errorMessage).toContain("Empty response body");
  });

  it("detects malformed (non-JSON) response bodies", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<html><head><title>502 Bad Gateway</title></head></html>",
    });

    const result = await evaluateServiceHealth("bucket", "https://bhiv-bucket-i1l6.onrender.com", "/health");

    expect(result.status).toBe(HEALTH_STATES.INVALID_RESPONSE);
    expect(result.errorType).toBe(ERROR_TYPES.INVALID_JSON);
    expect(result.errorMessage).toContain("Malformed response");
  });

  it("tracks both lastSuccess and lastFailure across consecutive checks", async () => {
    // 1. First probe succeeds
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "healthy" }),
    });
    const firstCheck = await evaluateServiceHealth("rajya", "https://text-risk-scoring-service.onrender.com", "/health");
    const successTime = firstCheck.lastSuccess;
    expect(successTime).toBeDefined();
    expect(firstCheck.lastFailure).toBeNull();

    // 2. Second probe fails (HTTP 503)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });
    const secondCheck = await evaluateServiceHealth("rajya", "https://text-risk-scoring-service.onrender.com", "/health");

    expect(secondCheck.status).toBe(HEALTH_STATES.DEGRADED);
    expect(secondCheck.lastSuccess).toBe(successTime); // previous success preserved
    expect(secondCheck.lastFailure).toBeDefined();
  });

  it("isolates multi-service health checks using Promise.allSettled without cascading failure", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("163.128.209.18:8103")) {
        // PRANA: healthy
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ status: "healthy", service: "bhiv-prana" }),
        });
      }
      if (url.includes("tantra-gated-bridge")) {
        // TANTRA: degraded HTTP 503
        return Promise.resolve({
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        });
      }
      if (url.includes("sl-validator-cet")) {
        // HARSHA: timeout
        const err = new Error("AbortError");
        err.name = "AbortError";
        return Promise.reject(err);
      }
      // Others: healthy
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: "ok" }),
      });
    });

    const results = await monitorAllServices(8000);

    // Assert that all 7 services returned a normalized model
    expect(Object.keys(results).length).toBe(7);

    // PRANA was unaffected and is healthy
    expect(results.prana.status).toBe(HEALTH_STATES.HEALTHY);
    expect(results.prana.errorType).toBeNull();

    // TANTRA returned DEGRADED without breaking others
    expect(results.tantra.status).toBe(HEALTH_STATES.DEGRADED);
    expect(results.tantra.httpStatus).toBe(503);

    // HARSHA returned TIMEOUT without breaking others
    expect(results.harsha.status).toBe(HEALTH_STATES.TIMEOUT);
    expect(results.harsha.errorType).toBe(ERROR_TYPES.TIMEOUT);

    // BUCKET, KARMA, RAJYA, SANSKAR were also unaffected
    expect(results.karma.status).toBe(HEALTH_STATES.HEALTHY);
    expect(results.rajya.status).toBe(HEALTH_STATES.HEALTHY);
    expect(results.bucket.status).toBe(HEALTH_STATES.HEALTHY);
    expect(results.sanskar.status).toBe(HEALTH_STATES.HEALTHY);
  });

  it("preserves fail-closed behavior for unrecognizable response payloads", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ randomField: 12345 }),
    });

    const result = await evaluateServiceHealth("prana", "http://163.128.209.18:8103", "/health");

    // Must NOT fabricate a healthy state
    expect(result.status).toBe(HEALTH_STATES.UNKNOWN);
    expect(result.errorType).toBe(ERROR_TYPES.UNKNOWN_ERROR);
    expect(result.errorMessage).toContain("recognized operational health format");
  });
});
