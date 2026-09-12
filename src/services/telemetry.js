/**
 * BHIV Telemetry & Observability Service
 * Implements BHIV Observability Protocol (docs/Runtime_Contracts.md):
 * - UUID v4 deterministic/random traceId generation
 * - ISO 8601 compliant timestamps
 * - Trace header propagation
 * - Structured audit event log
 * - Provenance hash computation
 */

export function generateTraceId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getCurrentTimestamp() {
  return new Date().toISOString();
}

export function getTraceHeaders(traceId = generateTraceId()) {
  return {
    "X-Trace-ID": traceId,
    "X-Client-Timestamp": getCurrentTimestamp(),
    "X-BHIV-Client": "bhiv-master-dashboard/v2.0",
  };
}

// In-memory persistent telemetry buffer (retains up to 200 events)
const MAX_EVENTS = 200;
const telemetryBuffer = [];

export function recordTelemetryEvent({
  service = "master-dashboard",
  action = "unknown",
  status = "info",
  traceId = generateTraceId(),
  metadata = {},
}) {
  const event = {
    id: "TEL-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    traceId,
    service,
    action,
    status,
    timestamp: getCurrentTimestamp(),
    metadata,
  };

  telemetryBuffer.unshift(event);
  if (telemetryBuffer.length > MAX_EVENTS) {
    telemetryBuffer.pop();
  }

  // Broadcast event for subscribers (e.g. Constitutional Observability widgets)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("bhiv:telemetry", { detail: event }));
  }

  return event;
}

export function getTelemetryHistory() {
  return [...telemetryBuffer];
}

export function clearTelemetryHistory() {
  telemetryBuffer.length = 0;
}

/**
 * SHA-256 provenance hash utility for KARMA / BUCKET chain verification
 */
export async function computeSha256(payload) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);
  if (typeof crypto !== "undefined" && crypto.subtle && crypto.subtle.digest) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Synchronous djb2-like hex fallback for environments without subtle crypto
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(64, "0");
}

/**
 * Sanitizes diagnostic strings to ensure credentials, tokens, and authorization
 * secrets are never exposed in UI alerts, telemetry, or stack dumps.
 */
export function sanitizeDiagnostic(str) {
  if (!str) return "";
  return String(str)
    .replace(/bearer\s+[a-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/(token|secret|password|apikey|api_key|auth|credential|key)[=:\s]+["']?[a-z0-9._~+/-]+["']?/gi, "$1=[REDACTED]")
    .replace(/-----BEGIN[A-Z\s]+KEY-----[\s\S]*?-----END[A-Z\s]+KEY-----/gi, "[REDACTED_PRIVATE_KEY]");
}

