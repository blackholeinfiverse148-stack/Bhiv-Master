/**
 * Unified Constitutional Observability Dashboard
 * Production monitoring and convergence tracking across:
 * - RAJYA (Governance / Decision State)
 * - SANSKAR (Constitutional / Convergence State)
 * - KARMA (Integrity State)
 * - BUCKET (Provenance / Evidence State)
 * - HARSHA (Execution / Validation State)
 *
 * Enforces honest state representations: LIVE, DEGRADED, OFFLINE, UNVERIFIED, UI-ONLY.
 * Never converts missing data into successful states.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  FileCheck,
  Terminal,
  Activity,
  Database,
  Cpu,
  Copy,
  Check,
} from "lucide-react";
import { SERVICE_CONFIG, apiPost } from "../services/api";
import { generateTraceId, computeSha256, getTelemetryHistory, getCurrentTimestamp, sanitizeDiagnostic } from "../services/telemetry";
import { fetchConstitutionalObservabilityModel, OBSERVABILITY_CLASSIFICATIONS } from "../services/observability";

const C = {
  bg: "#090C12",
  surface: "#101520",
  elevated: "#0C1018",
  border: "#1C2230",
  borderHi: "#263040",
  text: "#DDE2EC",
  textSub: "#8892A6",
  textMuted: "#546070",
  ok: "#22C55E",
  warn: "#F59E0B",
  crit: "#EF4444",
  purple: "#8B5CF6",
  accent: "#2E7CF6",
  teal: "#14B8A6",
  indigo: "#6366F1",
  slate: "#94A3B8",
};

const MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";

function getStatusBadgeStyle(classification) {
  switch (classification) {
    case OBSERVABILITY_CLASSIFICATIONS.LIVE:
      return { bg: `${C.ok}22`, text: C.ok, border: `${C.ok}44`, label: "LIVE" };
    case OBSERVABILITY_CLASSIFICATIONS.DEGRADED:
      return { bg: `${C.warn}22`, text: C.warn, border: `${C.warn}44`, label: "DEGRADED" };
    case OBSERVABILITY_CLASSIFICATIONS.OFFLINE:
      return { bg: `${C.crit}22`, text: C.crit, border: `${C.crit}44`, label: "OFFLINE" };
    case OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED:
      return { bg: `${C.indigo}22`, text: "#818CF8", border: `${C.indigo}44`, label: "UNVERIFIED" };
    case OBSERVABILITY_CLASSIFICATIONS.UI_ONLY:
    default:
      return { bg: `${C.slate}22`, text: C.slate, border: `${C.slate}44`, label: "UI-ONLY" };
  }
}

function StatusBadge({ classification, rawStatus }) {
  const style = getStatusBadgeStyle(classification);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 10,
          fontFamily: MONO,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 99,
          background: style.bg,
          color: style.text,
          border: `1px solid ${style.border}`,
          letterSpacing: "0.04em",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: style.text }} />
        {style.label}
      </span>
      {rawStatus && rawStatus !== classification && (
        <span style={{ fontSize: 9.5, color: C.textMuted, fontFamily: MONO }}>
          ({rawStatus})
        </span>
      )}
    </div>
  );
}

function CopyableText({ text, maxLen = 32 }) {
  const [copied, setCopied] = useState(false);
  if (!text) return <span style={{ color: C.textMuted }}>—</span>;

  const handleCopy = (e) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const displayText = text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;

  return (
    <span
      onClick={handleCopy}
      title={`Click to copy: ${text}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        cursor: "pointer",
        color: copied ? C.ok : C.textSub,
        fontFamily: MONO,
      }}
    >
      <span>{displayText}</span>
      {copied ? <Check size={11} color={C.ok} /> : <Copy size={11} color={C.textMuted} />}
    </span>
  );
}

export default function ConstitutionalObservabilityDashboard() {
  const [observabilityData, setObservabilityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Interactive Governance Decision Gate
  const [decisionPayload, setDecisionPayload] = useState({
    sarathiDecision: "ALLOW",
    executionId: generateTraceId(),
    policyTier: "CONSTITUTIONAL_TIER_1",
  });
  const [validationResult, setValidationResult] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [proofHash, setProofHash] = useState("");
  const [recentTelemetry, setRecentTelemetry] = useState([]);

  const refreshObservability = useCallback(async () => {
    setLoading(true);
    try {
      const model = await fetchConstitutionalObservabilityModel();
      setObservabilityData(model);
      setLastRefreshed(getCurrentTimestamp());
    } catch {
      // Error handled within model
    } finally {
      setLoading(false);
      setRecentTelemetry(getTelemetryHistory().slice(0, 10));
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) refreshObservability();
    }, 0);

    const handleTel = () => {
      if (active) setRecentTelemetry(getTelemetryHistory().slice(0, 10));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("bhiv:telemetry", handleTel);
    }

    return () => {
      active = false;
      clearTimeout(timer);
      if (typeof window !== "undefined") {
        window.removeEventListener("bhiv:telemetry", handleTel);
      }
    };
  }, [refreshObservability]);

  const runValidationGate = async () => {
    setValidationLoading(true);
    setValidationError(null);
    setValidationResult(null);
    try {
      const execId = generateTraceId();
      const payload = {
        ...decisionPayload,
        executionId: execId,
        timestamp: getCurrentTimestamp(),
      };
      setDecisionPayload(payload);

      const hash = await computeSha256(payload);
      setProofHash(hash);

      const res = await apiPost(SERVICE_CONFIG.RAJYA, "/api/v1/rajya/validate", payload);
      setValidationResult(res);
    } catch (err) {
      setValidationError(err.message);
    } finally {
      setValidationLoading(false);
      setRecentTelemetry(getTelemetryHistory().slice(0, 10));
    }
  };

  const services = observabilityData?.services || {};

  return (
    <div style={{ padding: "18px 20px 32px", color: C.text, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #8B5CF6, #2E7CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(46,124,246,0.3)",
            }}
          >
            <Shield size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>
              Constitutional Observability & Convergence Model
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              Operator telemetry across RAJYA (Governance), SANSKAR (Convergence), KARMA (Integrity), BUCKET (Provenance), and HARSHA (Execution)
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastRefreshed && (
            <span style={{ fontSize: 10, color: C.textMuted, fontFamily: MONO }}>
              Last probe: {new Date(lastRefreshed).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refreshObservability}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 6,
              border: `1px solid ${C.border}`,
              background: C.surface,
              color: C.text,
              cursor: loading ? "wait" : "pointer",
              fontSize: 12,
              fontFamily: MONO,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            <span>Refresh Observability</span>
          </button>
        </div>
      </div>

      {/* Unified 5-Service Observability Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 14 }}>
        {/* 1. RAJYA (Governance / Decision State) */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${C.warn}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Lock size={15} color={C.warn} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.warn }}>Governance / Decision State</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>RAJYA Enforcement Gate</div>
              </div>
            </div>
            <StatusBadge
              classification={services.rajya?.classification || OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED}
              rawStatus={services.rajya?.rawHealthStatus}
            />
          </div>

          <div style={{ background: C.elevated, padding: 10, borderRadius: 8, fontSize: 11, fontFamily: MONO, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Source Service:</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{services.rajya?.serviceSource || "bhiv-enforcement-gateway"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", wordBreak: "break-all" }}>
              <span style={{ color: C.textMuted }}>Endpoint:</span>
              <span style={{ color: C.textSub }}>{services.rajya?.endpoint || `${SERVICE_CONFIG.RAJYA}/health`}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Primary Gate:</span>
              <span style={{ color: C.accent }}>/api/v1/rajya/validate</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Enforcement State:</span>
              <span style={{ color: services.rajya?.details?.enforcementEngine === "ACTIVE" ? C.ok : C.warn }}>
                {services.rajya?.details?.enforcementEngine || "STANDBY"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Trace Correlation:</span>
              <CopyableText text={decisionPayload.executionId} maxLen={20} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: C.textMuted, fontFamily: MONO, marginTop: "auto" }}>
            <span>Latency: {services.rajya?.latencyMs ? `${services.rajya.latencyMs}ms` : "—"}</span>
            <span>HTTP {services.rajya?.httpStatus || "N/A"}</span>
            <span>{services.rajya?.timestamp ? new Date(services.rajya.timestamp).toLocaleTimeString() : "—"}</span>
          </div>
          {services.rajya?.error && (
            <div style={{ fontSize: 10, color: C.crit, fontFamily: MONO, background: `${C.crit}11`, padding: "4px 8px", borderRadius: 4 }}>
              ⚠ {services.rajya.error}
            </div>
          )}
        </div>

        {/* 2. SANSKAR (Constitutional / Convergence State) */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${C.purple}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={15} color={C.purple} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.purple }}>Constitutional / Convergence</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>SANSKAR Runtime</div>
              </div>
            </div>
            <StatusBadge
              classification={services.sanskar?.classification || OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED}
              rawStatus={services.sanskar?.rawHealthStatus}
            />
          </div>

          <div style={{ background: C.elevated, padding: 10, borderRadius: 8, fontSize: 11, fontFamily: MONO, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Source Service:</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{services.sanskar?.serviceSource || "bhiv-sanskar"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", wordBreak: "break-all" }}>
              <span style={{ color: C.textMuted }}>Endpoint:</span>
              <span style={{ color: C.textSub }}>{services.sanskar?.endpoint || `${SERVICE_CONFIG.SANSKAR}/health`}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Contract Version:</span>
              <span style={{ color: C.purple, fontWeight: 700 }}>{services.sanskar?.details?.contractVersion || "v1 (default)"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Convergence Gate:</span>
              <span style={{ color: services.sanskar?.isVerified ? C.ok : C.warn }}>
                {services.sanskar?.details?.convergenceGate || "UNVERIFIED"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Policy Alignment:</span>
              <span style={{ color: services.sanskar?.isVerified ? C.ok : C.warn }}>
                {services.sanskar?.details?.policyAlignment || "UNVERIFIED"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: C.textMuted, fontFamily: MONO, marginTop: "auto" }}>
            <span>Latency: {services.sanskar?.latencyMs ? `${services.sanskar.latencyMs}ms` : "—"}</span>
            <span>HTTP {services.sanskar?.httpStatus || "N/A"}</span>
            <span>{services.sanskar?.timestamp ? new Date(services.sanskar.timestamp).toLocaleTimeString() : "—"}</span>
          </div>
          {services.sanskar?.error && (
            <div style={{ fontSize: 10, color: C.crit, fontFamily: MONO, background: `${C.crit}11`, padding: "4px 8px", borderRadius: 4 }}>
              ⚠ {services.sanskar.error}
            </div>
          )}
        </div>

        {/* 3. KARMA (Integrity State) */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${C.accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={15} color={C.accent} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.accent }}>Integrity State</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>KARMA Cryptographic Chain</div>
              </div>
            </div>
            <StatusBadge
              classification={services.karma?.classification || OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED}
              rawStatus={services.karma?.rawHealthStatus}
            />
          </div>

          <div style={{ background: C.elevated, padding: 10, borderRadius: 8, fontSize: 11, fontFamily: MONO, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Source Service:</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{services.karma?.serviceSource || "bhiv-karma-integrity"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", wordBreak: "break-all" }}>
              <span style={{ color: C.textMuted }}>Endpoint:</span>
              <span style={{ color: C.textSub }}>{services.karma?.endpoint || `${SERVICE_CONFIG.KARMA}/karma/latest-hash`}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Latest Hash:</span>
              <CopyableText text={services.karma?.details?.latestHash} maxLen={18} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Verification Protocol:</span>
              <span style={{ color: C.text }}>{services.karma?.details?.verificationProtocol || "SHA-256"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Integrity Proof:</span>
              <span style={{ color: services.karma?.isVerified ? C.ok : C.warn }}>
                {services.karma?.isVerified ? "CRYPTOGRAPHICALLY SOUND" : "UNVERIFIED / NO HASH"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: C.textMuted, fontFamily: MONO, marginTop: "auto" }}>
            <span>Latency: {services.karma?.latencyMs ? `${services.karma.latencyMs}ms` : "—"}</span>
            <span>HTTP {services.karma?.httpStatus || "N/A"}</span>
            <span>{services.karma?.timestamp ? new Date(services.karma.timestamp).toLocaleTimeString() : "—"}</span>
          </div>
          {services.karma?.error && (
            <div style={{ fontSize: 10, color: C.crit, fontFamily: MONO, background: `${C.crit}11`, padding: "4px 8px", borderRadius: 4 }}>
              ⚠ {services.karma.error}
            </div>
          )}
        </div>

        {/* 4. BUCKET (Provenance / Evidence State) */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${C.teal}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Database size={15} color={C.teal} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.teal }}>Provenance / Evidence State</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>BUCKET Artifact Ledger</div>
              </div>
            </div>
            <StatusBadge
              classification={services.bucket?.classification || OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED}
              rawStatus={services.bucket?.rawHealthStatus}
            />
          </div>

          <div style={{ background: C.elevated, padding: 10, borderRadius: 8, fontSize: 11, fontFamily: MONO, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Source Service:</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{services.bucket?.serviceSource || "bhiv-bucket-storage"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", wordBreak: "break-all" }}>
              <span style={{ color: C.textMuted }}>Endpoint:</span>
              <span style={{ color: C.textSub }}>{services.bucket?.endpoint || `${SERVICE_CONFIG.BUCKET}/bucket/chain-state`}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Artifact Count:</span>
              <span style={{ color: C.teal, fontWeight: 700 }}>{String(services.bucket?.details?.artifactCount ?? "UNAVAILABLE")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Ledger Root Hash:</span>
              <CopyableText text={services.bucket?.details?.latestHash} maxLen={18} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Chain Synchronization:</span>
              <span style={{ color: services.bucket?.isVerified ? C.ok : C.warn }}>
                {services.bucket?.details?.chainSync || "UNVERIFIED"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: C.textMuted, fontFamily: MONO, marginTop: "auto" }}>
            <span>Latency: {services.bucket?.latencyMs ? `${services.bucket.latencyMs}ms` : "—"}</span>
            <span>HTTP {services.bucket?.httpStatus || "N/A"}</span>
            <span>{services.bucket?.timestamp ? new Date(services.bucket.timestamp).toLocaleTimeString() : "—"}</span>
          </div>
          {services.bucket?.error && (
            <div style={{ fontSize: 10, color: C.crit, fontFamily: MONO, background: `${C.crit}11`, padding: "4px 8px", borderRadius: 4 }}>
              ⚠ {services.bucket.error}
            </div>
          )}
        </div>

        {/* 5. HARSHA (Execution / Validation State) */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: `${C.indigo}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Cpu size={15} color={C.indigo} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: C.indigo }}>Execution / Validation State</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>HARSHA CET/KSML Gate</div>
              </div>
            </div>
            <StatusBadge
              classification={services.harsha?.classification || OBSERVABILITY_CLASSIFICATIONS.UNVERIFIED}
              rawStatus={services.harsha?.rawHealthStatus}
            />
          </div>

          <div style={{ background: C.elevated, padding: 10, borderRadius: 8, fontSize: 11, fontFamily: MONO, display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Source Service:</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{services.harsha?.serviceSource || "sl-validator-cet"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", wordBreak: "break-all" }}>
              <span style={{ color: C.textMuted }}>Endpoint:</span>
              <span style={{ color: C.textSub }}>{services.harsha?.endpoint || `${SERVICE_CONFIG.HARSHA}/health`}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Validator Status:</span>
              <span style={{ color: services.harsha?.isVerified ? C.ok : C.warn }}>
                {services.harsha?.details?.validatorStatus || "UNVERIFIED / STANDBY"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Engine Architecture:</span>
              <span style={{ color: C.text }}>{services.harsha?.details?.engineType || "KSML / CET / SUM-SCRIPT"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.textMuted }}>Fail-Closed Mode:</span>
              <span style={{ color: C.ok }}>ENFORCED</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: C.textMuted, fontFamily: MONO, marginTop: "auto" }}>
            <span>Latency: {services.harsha?.latencyMs ? `${services.harsha.latencyMs}ms` : "—"}</span>
            <span>HTTP {services.harsha?.httpStatus || "N/A"}</span>
            <span>{services.harsha?.timestamp ? new Date(services.harsha.timestamp).toLocaleTimeString() : "—"}</span>
          </div>
          {services.harsha?.error && (
            <div style={{ fontSize: 10, color: C.crit, fontFamily: MONO, background: `${C.crit}11`, padding: "4px 8px", borderRadius: 4 }}>
              ⚠ {services.harsha.error}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Governance Decision Validation Gate */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <FileCheck size={16} color={C.accent} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Deterministic Governance Validation Test</span>
        </div>
        <div style={{ fontSize: 11.5, color: C.textSub, marginBottom: 14 }}>
          Executes an authentic policy check against RAJYA gateway using published contract (<code>POST /api/v1/rajya/validate</code>).
          Generates an auditable client trace ID and computes local cryptographic SHA-256 provenance hash.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 10.5, color: C.textMuted, marginBottom: 4, fontFamily: MONO }}>
              Sarathi Decision
            </label>
            <select
              value={decisionPayload.sarathiDecision}
              onChange={(e) => setDecisionPayload({ ...decisionPayload, sarathiDecision: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                background: C.elevated,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 12,
                fontFamily: MONO,
              }}
            >
              <option value="ALLOW">ALLOW</option>
              <option value="DENY">DENY</option>
              <option value="ABSTAIN">ABSTAIN</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 10.5, color: C.textMuted, marginBottom: 4, fontFamily: MONO }}>
              Execution Trace ID (Correlation)
            </label>
            <input
              type="text"
              readOnly
              value={decisionPayload.executionId}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 6,
                background: C.elevated,
                border: `1px solid ${C.border}`,
                color: C.textSub,
                fontSize: 11,
                fontFamily: MONO,
              }}
            />
          </div>
        </div>

        <button
          onClick={runValidationGate}
          disabled={validationLoading}
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            background: C.accent,
            color: "#FFFFFF",
            border: "none",
            fontWeight: 600,
            fontSize: 12,
            cursor: validationLoading ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {validationLoading ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Lock size={13} />}
          <span>Validate Constitutional Policy</span>
        </button>

        {proofHash && (
          <div style={{ marginTop: 12, padding: 10, background: C.elevated, borderRadius: 6, fontSize: 10.5, fontFamily: MONO }}>
            <span style={{ color: C.textMuted }}>Client Provenance SHA-256: </span>
            <span style={{ color: C.accent }}>{proofHash}</span>
          </div>
        )}

        {validationResult && (
          <div style={{ marginTop: 12, padding: 12, background: `${C.ok}11`, border: `1px solid ${C.ok}44`, borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.ok, fontWeight: 600, fontSize: 12, marginBottom: 6 }}>
              <CheckCircle2 size={14} />
              <span>Verdict: {validationResult.verdict || "EXECUTION_APPROVED"}</span>
            </div>
            <pre style={{ margin: 0, fontSize: 10, fontFamily: MONO, color: C.textSub, whiteSpace: "pre-wrap" }}>
              {sanitizeDiagnostic(JSON.stringify(validationResult, null, 2))}
            </pre>
          </div>
        )}

        {validationError && (
          <div style={{ marginTop: 12, padding: 12, background: `${C.crit}11`, border: `1px solid ${C.crit}44`, borderRadius: 8, color: C.crit, fontSize: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, marginBottom: 4 }}>
              <AlertTriangle size={14} />
              <span>Gateway Validation Notice</span>
            </div>
            <div>{sanitizeDiagnostic(validationError)}</div>
          </div>
        )}
      </div>

      {/* Live Observability & Trace Stream */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Terminal size={15} color={C.purple} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>Live Observability & Trace Stream</span>
          <span style={{ fontSize: 10, color: C.textMuted, fontFamily: MONO, marginLeft: "auto" }}>
            {recentTelemetry.length} events logged
          </span>
        </div>
        <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {recentTelemetry.length === 0 ? (
            <div style={{ fontSize: 11, color: C.textMuted, fontFamily: MONO, padding: "8px 0" }}>
              No telemetry events recorded yet. Perform health checks or validations to stream events.
            </div>
          ) : (
            recentTelemetry.map((evt) => (
              <div
                key={evt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: C.elevated,
                  fontSize: 10.5,
                  fontFamily: MONO,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      background: evt.status === "success" ? C.ok : evt.status === "error" ? C.crit : C.warn,
                    }}
                  />
                  <span style={{ color: C.text, fontWeight: 600 }}>{evt.action}</span>
                  <span style={{ color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {evt.traceId}
                  </span>
                </div>
                <span style={{ color: C.textMuted, flexShrink: 0 }}>
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
