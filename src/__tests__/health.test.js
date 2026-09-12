import { describe, it, expect, vi, afterEach } from "vitest";
import { checkServiceHealth, HEALTH_STATES } from "../services/api";

describe("checkServiceHealth deterministic classification", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns UNKNOWN if baseUrl is missing", async () => {
    const res = await checkServiceHealth("");
    expect(res).toBe(HEALTH_STATES.UNKNOWN);
  });

  it("returns HEALTHY when service returns operational status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "healthy", service: "bhiv-prana" }),
    });

    const res = await checkServiceHealth("http://mock-service", "/health");
    expect(res).toBe(HEALTH_STATES.HEALTHY);
  });

  it("returns HEALTHY when service object contains name/service", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ service: "bhiv-karma-helper" }),
    });

    const res = await checkServiceHealth("http://mock-service", "/health");
    expect(res).toBe(HEALTH_STATES.HEALTHY);
  });

  it("returns AUTH_FAILED when status is 401 or 403", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const res = await checkServiceHealth("http://mock-service", "/health");
    expect(res).toBe(HEALTH_STATES.AUTH_FAILED);
  });

  it("returns DEGRADED when status is >= 500 (e.g. Render HTTP 503)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
    });

    const res = await checkServiceHealth("http://mock-service", "/health");
    expect(res).toBe(HEALTH_STATES.DEGRADED);
  });

  it("returns TIMEOUT when request aborts due to timeout", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    const res = await checkServiceHealth("http://mock-service", "/health");
    expect(res).toBe(HEALTH_STATES.TIMEOUT);
  });

  it("returns OFFLINE on generic network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    const res = await checkServiceHealth("http://mock-service", "/health");
    expect(res).toBe(HEALTH_STATES.OFFLINE);
  });

  it("returns EMPTY_RESPONSE when body has 0 bytes", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "   ",
    });

    const res = await checkServiceHealth("http://mock-service", "/health");
    expect(res).toBe(HEALTH_STATES.EMPTY_RESPONSE);
  });

  it("returns INVALID_RESPONSE when body is not valid JSON", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<html>502 Bad Gateway</html>",
    });

    const res = await checkServiceHealth("http://mock-service", "/health");
    expect(res).toBe(HEALTH_STATES.INVALID_RESPONSE);
  });
});
