/**
 * Unified API Client & Production Runtime Monitoring Layer for BHIV Master Dashboard
 * Handles all network requests, health checks, normalized monitoring models,
 * failure isolation (Promise.allSettled), and deterministic state classifications.
 */
import { generateTraceId, getTraceHeaders, recordTelemetryEvent, getCurrentTimestamp } from "./telemetry";

// ── Environment Configuration with Fallback Constants ─────────────────────────
const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};

export const SERVICE_CONFIG = {
  PRANA:   env.VITE_PRANA_BASE_URL   || "http://163.128.209.18:8103",
  KARMA:   env.VITE_KARMA_BASE_URL   || "http://163.128.209.18:8102",
  RAJYA:   env.VITE_RAJYA_BASE_URL   || "https://text-risk-scoring-service.onrender.com",
  SANSKAR: env.VITE_SANSKAR_BASE_URL || "https://full-tantra-constitutional-convergence.onrender.com",
  TANTRA:  env.VITE_TANTRA_BASE_URL  || "https://tantra-gated-bridge-infrastructure.onrender.com",
  BUCKET:  env.VITE_BUCKET_BASE_URL  || "https://bhiv-bucket-i1l6.onrender.com",
  HARSHA:  env.VITE_HARSHA_BASE_URL  || "https://sl-validator-cet.onrender.com",
  DEFAULT_TIMEOUT_MS: Number(env.VITE_API_TIMEOUT_MS) || 8000,
  BEARER_TOKEN: env.VITE_API_BEARER_TOKEN || "",
};

export const SERVICE_NAMES = {
  prana:   "PRANA (Event Propagation & Replay)",
  karma:   "KARMA (Cryptographic Integrity)",
  rajya:   "RAJYA (Governance Enforcement Gate)",
  tantra:  "TANTRA (Gated Bridge)",
  bucket:  "BUCKET (Provenance Store)",
  sanskar: "SANSKAR (Constitutional Convergence)",
  harsha:  "HARSHA (CET/KSML Validator)",
};

// ── Deterministic Health States ────────────────────────────────────────────────
export const HEALTH_STATES = {
  CHECKING:         "CHECKING",
  HEALTHY:          "HEALTHY",
  DEGRADED:         "DEGRADED",
  OFFLINE:          "OFFLINE",
  TIMEOUT:          "TIMEOUT",
  AUTH_FAILED:      "AUTH_FAILED",
  EMPTY_RESPONSE:   "EMPTY_RESPONSE",
  INVALID_RESPONSE: "INVALID_RESPONSE",
  UNKNOWN:          "UNKNOWN",
};

// ── Error Classification Types ─────────────────────────────────────────────────
export const ERROR_TYPES = {
  TIMEOUT:         "TIMEOUT",
  NETWORK_OFFLINE: "NETWORK_OFFLINE",
  HTTP_ERROR:      "HTTP_ERROR",
  AUTH_FAILURE:    "AUTH_FAILURE",
  EMPTY_BODY:      "EMPTY_BODY",
  INVALID_JSON:    "INVALID_JSON",
  UNKNOWN_ERROR:   "UNKNOWN_ERROR",
};

// ── Service In-Memory History (Last Success & Last Failure) ───────────────────
const serviceHistory = {
  prana:   { lastSuccess: null, lastFailure: null },
  karma:   { lastSuccess: null, lastFailure: null },
  rajya:   { lastSuccess: null, lastFailure: null },
  tantra:  { lastSuccess: null, lastFailure: null },
  bucket:  { lastSuccess: null, lastFailure: null },
  sanskar: { lastSuccess: null, lastFailure: null },
  harsha:  { lastSuccess: null, lastFailure: null },
};

export function getServiceHistory(serviceId) {
  return serviceHistory[serviceId] ? { ...serviceHistory[serviceId] } : { lastSuccess: null, lastFailure: null };
}

export function resetServiceHistory() {
  Object.keys(serviceHistory).forEach((key) => {
    serviceHistory[key] = { lastSuccess: null, lastFailure: null };
  });
}

/**
 * Standardized API fetch wrapper with timeout, trace headers, optional auth, and telemetry recording
 */
export async function apiFetch(baseUrl, path, options = {}) {
  const timeout = options.timeout || SERVICE_CONFIG.DEFAULT_TIMEOUT_MS;
  const traceId = options.traceId || generateTraceId();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const authHeader = options.token
    ? { Authorization: `Bearer ${options.token}` }
    : SERVICE_CONFIG.BEARER_TOKEN
    ? { Authorization: `Bearer ${SERVICE_CONFIG.BEARER_TOKEN}` }
    : {};

  const mergedHeaders = {
    ...getTraceHeaders(traceId),
    ...authHeader,
    ...(options.headers || {}),
  };

  const startTime = Date.now();
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: mergedHeaders,
    });
    clearTimeout(timer);
    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      recordTelemetryEvent({
        service: baseUrl,
        action: `${options.method || "GET"} ${path}`,
        status: res.status >= 500 ? "error" : "warning",
        traceId,
        metadata: { status: res.status, durationMs },
      });
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    recordTelemetryEvent({
      service: baseUrl,
      action: `${options.method || "GET"} ${path}`,
      status: "success",
      traceId,
      metadata: { status: res.status, durationMs },
    });
    return data;
  } catch (err) {
    clearTimeout(timer);
    const durationMs = Date.now() - startTime;
    const isTimeout = err.name === "AbortError";
    recordTelemetryEvent({
      service: baseUrl,
      action: `${options.method || "GET"} ${path}`,
      status: "error",
      traceId,
      metadata: { error: err.message, isTimeout, durationMs },
    });
    if (isTimeout) {
      throw new Error(`Request timed out after ${timeout}ms`, { cause: err });
    }
    throw err;
  }
}

export function apiGet(baseUrl, path, options = {}) {
  return apiFetch(baseUrl, path, { ...options, method: "GET" });
}

export function apiPost(baseUrl, path, body, options = {}) {
  return apiFetch(baseUrl, path, {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/**
 * Evaluates service health and returns a comprehensive normalized monitoring model
 */
export async function evaluateServiceHealth(
  serviceId,
  baseUrl,
  path = "/health",
  timeoutMs = SERVICE_CONFIG.DEFAULT_TIMEOUT_MS
) {
  const timestamp = getCurrentTimestamp();
  const history = serviceHistory[serviceId] || { lastSuccess: null, lastFailure: null };

  if (!baseUrl) {
    history.lastFailure = timestamp;
    if (serviceHistory[serviceId]) serviceHistory[serviceId].lastFailure = timestamp;
    return {
      serviceId: serviceId || "unknown",
      serviceName: SERVICE_NAMES[serviceId] || "Unknown Service",
      endpoint: path,
      baseUrl: "",
      path,
      status: HEALTH_STATES.UNKNOWN,
      latencyMs: 0,
      httpStatus: null,
      errorType: ERROR_TYPES.UNKNOWN_ERROR,
      errorMessage: "No base URL configured for service",
      lastCheck: timestamp,
      lastSuccess: history.lastSuccess,
      lastFailure: history.lastFailure,
      rawDetails: null,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const res = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;

    // 1. Identify Authentication/Authorization Failures (HTTP 401, 403)
    if (res.status === 401 || res.status === 403) {
      history.lastFailure = timestamp;
      if (serviceHistory[serviceId]) serviceHistory[serviceId].lastFailure = timestamp;
      return {
        serviceId,
        serviceName: SERVICE_NAMES[serviceId] || serviceId.toUpperCase(),
        endpoint: `${baseUrl}${path}`,
        baseUrl,
        path,
        status: HEALTH_STATES.AUTH_FAILED,
        latencyMs,
        httpStatus: res.status,
        errorType: ERROR_TYPES.AUTH_FAILURE,
        errorMessage: `Authentication/Authorization failed with HTTP ${res.status}`,
        lastCheck: timestamp,
        lastSuccess: history.lastSuccess,
        lastFailure: history.lastFailure,
        rawDetails: null,
      };
    }

    // 2. Distinguish Server/HTTP Failures (HTTP 500, 502, 503)
    if (res.status >= 500) {
      history.lastFailure = timestamp;
      if (serviceHistory[serviceId]) serviceHistory[serviceId].lastFailure = timestamp;
      return {
        serviceId,
        serviceName: SERVICE_NAMES[serviceId] || serviceId.toUpperCase(),
        endpoint: `${baseUrl}${path}`,
        baseUrl,
        path,
        status: HEALTH_STATES.DEGRADED,
        latencyMs,
        httpStatus: res.status,
        errorType: ERROR_TYPES.HTTP_ERROR,
        errorMessage: `Service degraded with HTTP ${res.status} ${res.statusText || "Server Error"}`,
        lastCheck: timestamp,
        lastSuccess: history.lastSuccess,
        lastFailure: history.lastFailure,
        rawDetails: null,
      };
    }

    if (!res.ok) {
      history.lastFailure = timestamp;
      if (serviceHistory[serviceId]) serviceHistory[serviceId].lastFailure = timestamp;
      return {
        serviceId,
        serviceName: SERVICE_NAMES[serviceId] || serviceId.toUpperCase(),
        endpoint: `${baseUrl}${path}`,
        baseUrl,
        path,
        status: HEALTH_STATES.UNKNOWN,
        latencyMs,
        httpStatus: res.status,
        errorType: ERROR_TYPES.HTTP_ERROR,
        errorMessage: `Unexpected HTTP response status: ${res.status}`,
        lastCheck: timestamp,
        lastSuccess: history.lastSuccess,
        lastFailure: history.lastFailure,
        rawDetails: null,
      };
    }

    // 3. Detect Empty Responses (0 bytes or whitespace only)
    const text = await res.text();
    if (!text || !text.trim()) {
      history.lastFailure = timestamp;
      if (serviceHistory[serviceId]) serviceHistory[serviceId].lastFailure = timestamp;
      return {
        serviceId,
        serviceName: SERVICE_NAMES[serviceId] || serviceId.toUpperCase(),
        endpoint: `${baseUrl}${path}`,
        baseUrl,
        path,
        status: HEALTH_STATES.EMPTY_RESPONSE,
        latencyMs,
        httpStatus: res.status,
        errorType: ERROR_TYPES.EMPTY_BODY,
        errorMessage: "Empty response body received from service endpoint",
        lastCheck: timestamp,
        lastSuccess: history.lastSuccess,
        lastFailure: history.lastFailure,
        rawDetails: null,
      };
    }

    // 4. Detect Malformed Responses (Invalid JSON)
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      history.lastFailure = timestamp;
      if (serviceHistory[serviceId]) serviceHistory[serviceId].lastFailure = timestamp;
      return {
        serviceId,
        serviceName: SERVICE_NAMES[serviceId] || serviceId.toUpperCase(),
        endpoint: `${baseUrl}${path}`,
        baseUrl,
        path,
        status: HEALTH_STATES.INVALID_RESPONSE,
        latencyMs,
        httpStatus: res.status,
        errorType: ERROR_TYPES.INVALID_JSON,
        errorMessage: "Malformed response: Endpoint returned non-JSON content",
        lastCheck: timestamp,
        lastSuccess: history.lastSuccess,
        lastFailure: history.lastFailure,
        rawDetails: null,
      };
    }

    // 5. Validate Health Status in Parsed JSON
    if (data && typeof data === "object") {
      const statusVal = String(data.status || data.state || "").toLowerCase();
      const isOperational = ["healthy", "ok", "running", "up", "active", "online", "operational"].includes(statusVal);
      const hasIdentity = Boolean(data.service || data.name || data.version);

      if (isOperational || hasIdentity) {
        history.lastSuccess = timestamp;
        if (serviceHistory[serviceId]) serviceHistory[serviceId].lastSuccess = timestamp;
        return {
          serviceId,
          serviceName: SERVICE_NAMES[serviceId] || serviceId.toUpperCase(),
          endpoint: `${baseUrl}${path}`,
          baseUrl,
          path,
          status: HEALTH_STATES.HEALTHY,
          latencyMs,
          httpStatus: res.status,
          errorType: null,
          errorMessage: null,
          lastCheck: timestamp,
          lastSuccess: history.lastSuccess,
          lastFailure: history.lastFailure,
          rawDetails: data,
        };
      }
    }

    history.lastFailure = timestamp;
    if (serviceHistory[serviceId]) serviceHistory[serviceId].lastFailure = timestamp;
    return {
      serviceId,
      serviceName: SERVICE_NAMES[serviceId] || serviceId.toUpperCase(),
      endpoint: `${baseUrl}${path}`,
      baseUrl,
      path,
      status: HEALTH_STATES.UNKNOWN,
      latencyMs,
      httpStatus: res.status,
      errorType: ERROR_TYPES.UNKNOWN_ERROR,
      errorMessage: "Payload does not conform to recognized operational health format",
      lastCheck: timestamp,
      lastSuccess: history.lastSuccess,
      lastFailure: history.lastFailure,
      rawDetails: data,
    };
  } catch (err) {
    clearTimeout(timer);
    const latencyMs = Date.now() - startTime;
    history.lastFailure = timestamp;
    if (serviceHistory[serviceId]) serviceHistory[serviceId].lastFailure = timestamp;

    // 6. Distinguish Timeout from Offline Network Failure
    if (err.name === "AbortError") {
      return {
        serviceId,
        serviceName: SERVICE_NAMES[serviceId] || serviceId.toUpperCase(),
        endpoint: `${baseUrl}${path}`,
        baseUrl,
        path,
        status: HEALTH_STATES.TIMEOUT,
        latencyMs,
        httpStatus: null,
        errorType: ERROR_TYPES.TIMEOUT,
        errorMessage: `Probe timed out after ${timeoutMs}ms`,
        lastCheck: timestamp,
        lastSuccess: history.lastSuccess,
        lastFailure: history.lastFailure,
        rawDetails: null,
      };
    }

    return {
      serviceId,
      serviceName: SERVICE_NAMES[serviceId] || serviceId.toUpperCase(),
      endpoint: `${baseUrl}${path}`,
      baseUrl,
      path,
      status: HEALTH_STATES.OFFLINE,
      latencyMs,
      httpStatus: null,
      errorType: ERROR_TYPES.NETWORK_OFFLINE,
      errorMessage: err.message || "Network unreachable or connection refused",
      lastCheck: timestamp,
      lastSuccess: history.lastSuccess,
      lastFailure: history.lastFailure,
      rawDetails: null,
    };
  }
}

/**
 * Backward-compatible single health string evaluator
 */
export async function checkServiceHealth(baseUrl, path = "/health", timeoutMs = SERVICE_CONFIG.DEFAULT_TIMEOUT_MS) {
  const result = await evaluateServiceHealth("generic", baseUrl, path, timeoutMs);
  return result.status;
}

/**
 * Monitors all 7 Sovereign runtime microservices using Promise.allSettled for complete failure isolation.
 * Guarantees that a failure, 503, or timeout in one service will NEVER break monitoring for any other service.
 */
export async function monitorAllServices(timeoutMs = SERVICE_CONFIG.DEFAULT_TIMEOUT_MS) {
  const serviceDefs = [
    { id: "prana",   url: SERVICE_CONFIG.PRANA,   path: "/health" },
    { id: "karma",   url: SERVICE_CONFIG.KARMA,   path: "/health" },
    { id: "rajya",   url: SERVICE_CONFIG.RAJYA,   path: "/health" },
    { id: "tantra",  url: SERVICE_CONFIG.TANTRA,  path: "/health" },
    { id: "bucket",  url: SERVICE_CONFIG.BUCKET,  path: "/health" },
    { id: "sanskar", url: SERVICE_CONFIG.SANSKAR, path: "/health" },
    { id: "harsha",  url: SERVICE_CONFIG.HARSHA,  path: "/health" },
  ];

  const promises = serviceDefs.map((def) => evaluateServiceHealth(def.id, def.url, def.path, timeoutMs));
  const settled = await Promise.allSettled(promises);

  const resultMap = {};
  settled.forEach((item, index) => {
    const def = serviceDefs[index];
    if (item.status === "fulfilled") {
      resultMap[def.id] = item.value;
    } else {
      // Fail-closed fallback in the impossible event of unhandled promise rejection
      resultMap[def.id] = {
        serviceId: def.id,
        serviceName: SERVICE_NAMES[def.id] || def.id.toUpperCase(),
        endpoint: `${def.url}${def.path}`,
        baseUrl: def.url,
        path: def.path,
        status: HEALTH_STATES.OFFLINE,
        latencyMs: 0,
        httpStatus: null,
        errorType: ERROR_TYPES.UNKNOWN_ERROR,
        errorMessage: item.reason?.message || "Health check failed unexpectedly",
        lastCheck: getCurrentTimestamp(),
        lastSuccess: serviceHistory[def.id]?.lastSuccess || null,
        lastFailure: getCurrentTimestamp(),
        rawDetails: null,
      };
    }
  });

  return resultMap;
}

/**
 * Backward-compatible aggregated health status checker returning { prana: "HEALTHY", ... }
 */
export async function checkAllRuntimeServices(timeoutMs = SERVICE_CONFIG.DEFAULT_TIMEOUT_MS) {
  const fullResults = await monitorAllServices(timeoutMs);
  const statusMap = {};
  Object.keys(fullResults).forEach((id) => {
    statusMap[id] = fullResults[id].status;
  });
  return statusMap;
}
