/**
 * BHIV Runtime Services Widget
 * Single file — all 7 services integrated
 *
 * Services:
 *   PRANA   http://163.128.209.18:8103
 *   KARMA   http://163.128.209.18:8102
 *   RAJYA   https://text-risk-scoring-service.onrender.com
 *   TANTRA  https://tantra-gated-bridge-infrastructure.onrender.com
 *   BUCKET  https://bhiv-bucket-i1l6.onrender.com
 *   SANSKAR https://full-tantra-constitutional-convergence.onrender.com
 *   HARSHA  set HARSHA_BASE_URL below once Harsha sends it
 *
 * To add to bhiv-dashboard-kit.jsx:
 *   import RuntimeServicesWidget from './runtime-services-widget'
 *   Add to DASHBOARDS: {id:"runtime", label:"Runtime Services", icon:Activity, color:"#22C55E"}
 *   Add to routing:    {activeDash==="runtime" && <RuntimeServicesWidget/>}
 */

import { useState, useEffect, useCallback } from "react";
import {
  SERVICE_CONFIG,
  HEALTH_STATES,
  apiGet,
  apiPost,
  monitorAllServices,
} from "./services/api";
import ErrorBoundary from "./components/ErrorBoundary";
import { sanitizeDiagnostic } from "./services/telemetry";

// ── Service base URLs ─────────────────────────────────────────────────────────
const URL_PRANA   = SERVICE_CONFIG.PRANA;
const URL_KARMA   = SERVICE_CONFIG.KARMA;
const URL_RAJYA   = SERVICE_CONFIG.RAJYA;
const URL_TANTRA  = SERVICE_CONFIG.TANTRA;
const URL_BUCKET  = SERVICE_CONFIG.BUCKET;
const URL_SANSKAR = SERVICE_CONFIG.SANSKAR;
const URL_HARSHA  = SERVICE_CONFIG.HARSHA;

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        "#090C12",
  surface:   "#101520",
  elevated:  "#0C1018",
  border:    "#1C2230",
  borderHi:  "#263040",
  text:      "#DDE2EC",
  textSub:   "#8892A6",
  textMuted: "#546070",
  accent:    "#2E7CF6",
  ok:        "#22C55E",
  warn:      "#F59E0B",
  crit:      "#EF4444",
  info:      "#6366F1",
  purple:    "#8B5CF6",
  teal:      "#06B8D0",
  orange:    "#F97316",
};
const MONO = "'JetBrains Mono','IBM Plex Mono',monospace";
const BODY = "'Inter',system-ui,sans-serif";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "medium" });
  } catch { return String(val); }
}

function isHealthyStatus(s) {
  return ["healthy","ok","running","up","active","online","operational"].includes(
    String(s || "").toLowerCase()
  );
}

// ── Primitives ────────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: C.surface,
      border: "1px solid " + C.border,
      borderRadius: 12,
      padding: 14,
      boxShadow: "0 1px 4px rgba(0,0,0,0.14)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Dot({ ok, pulse }) {
  const col = ok ? C.ok : C.crit;
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 8, height: 8, flexShrink: 0 }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: col, display: "block" }} />
      {pulse && (
        <span style={{
          position: "absolute", inset: 0, borderRadius: 99,
          background: col, animation: "rt-pulse 1.8s ease-out infinite",
        }} />
      )}
    </span>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 9.5, fontFamily: MONO, fontWeight: 600,
      color, background: color + "18", padding: "2px 8px", borderRadius: 99,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: 99, background: color }} />
      {String(label).toUpperCase()}
    </span>
  );
}

function Spin({ size }) {
  return (
    <span style={{
      display: "inline-block", width: size || 14, height: size || 14,
      borderRadius: 99, border: "2px solid " + C.border,
      borderTopColor: C.accent, animation: "rt-spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function ErrBox({ msg, onRetry }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 7,
      border: "1px solid " + C.crit + "44", background: C.crit + "08",
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 11, color: C.crit,
    }}>
      <span style={{ flex: 1 }}>⚠ {sanitizeDiagnostic(msg)}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 5,
          border: "1px solid " + C.crit + "55", background: C.crit + "18",
          color: C.crit, cursor: "pointer",
        }}>Retry</button>
      )}
    </div>
  );
}

function LoadRow({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.textMuted, fontSize: 11, padding: "6px 0" }}>
      <Spin size={12} /> {text || "Loading..."}
    </div>
  );
}

function Fld({ label, value, color, mono, copy }) {
  const [cp, setCp] = useState(false);
  const val = value !== undefined && value !== null ? String(value) : null;
  return (
    <div style={{
      background: C.elevated, borderRadius: 7, padding: "8px 10px",
      border: "1px solid " + C.border,
    }}>
      <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{
          fontFamily: mono ? MONO : BODY,
          fontSize: val && val.length > 30 ? 9 : (mono ? 10 : 11),
          fontWeight: 600, color: color || (val ? C.text : C.textMuted),
          flex: 1, wordBreak: "break-all", lineHeight: 1.4,
        }}>
          {val || "—"}
        </div>
        {copy && val && (
          <button onClick={() => {
            navigator.clipboard.writeText(val);
            setCp(true); setTimeout(() => setCp(false), 1500);
          }} style={{
            fontSize: 9, padding: "1px 6px", borderRadius: 4, cursor: "pointer", flexShrink: 0,
            border: "1px solid " + (cp ? C.ok : C.border),
            background: cp ? C.ok + "18" : "transparent",
            color: cp ? C.ok : C.textMuted,
          }}>{cp ? "✓" : "copy"}</button>
        )}
      </div>
    </div>
  );
}

function RawJSON({ data, label }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{
        fontSize: 10, padding: "3px 9px", borderRadius: 6,
        border: "1px solid " + C.border, background: "transparent",
        color: C.textMuted, cursor: "pointer",
      }}>
        {open ? "Hide" : "Show"} {label || "raw JSON"}
      </button>
      {open && (
        <div style={{
          marginTop: 6, background: C.elevated, borderRadius: 7,
          padding: "8px 10px", border: "1px solid " + C.borderHi,
        }}>
          <pre style={{
            fontFamily: MONO, fontSize: 9, color: C.textSub,
            whiteSpace: "pre-wrap", wordBreak: "break-all",
            maxHeight: 280, overflowY: "auto", margin: 0,
          }}>
            {sanitizeDiagnostic(JSON.stringify(data, null, 2))}
          </pre>
        </div>
      )}
    </div>
  );
}

function PanelHeader({ icon, title, subtitle, color, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: color || C.text, lineHeight: 1.2 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 9.5, color: C.textMuted, fontFamily: MONO, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}

function TabBar({ tabs, active, setActive, color }) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
      {tabs.map(t => (
        <button key={t} onClick={() => setActive(t)} style={{
          fontSize: 10, padding: "3px 10px", borderRadius: 99, cursor: "pointer",
          border: "1px solid " + (active === t ? color : C.border),
          background: active === t ? color + "1A" : "transparent",
          color: active === t ? color : C.textMuted,
          fontFamily: BODY, textTransform: "capitalize",
        }}>{t}</button>
      ))}
    </div>
  );
}

function RefBtn({ onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      fontSize: 10.5, padding: "3px 9px", borderRadius: 6,
      border: "1px solid " + C.border, background: "transparent",
      color: C.textMuted, cursor: loading ? "wait" : "pointer",
      display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
    }}>
      {loading ? <Spin size={11} /> : "↻"} Refresh
    </button>
  );
}

function ActionBtn({ label, onClick, loading, color }) {
  const col = color || C.accent;
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: "100%", padding: "8px", borderRadius: 8,
      cursor: loading ? "wait" : "pointer",
      border: "1px solid " + col + "55", background: col + "15",
      color: col, fontSize: 12, fontWeight: 600,
      display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
    }}>
      {loading ? <><Spin size={13} /> Running...</> : label}
    </button>
  );
}

// ── Runtime Overview Strip ────────────────────────────────────────────────────
function OverviewStrip({ services }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(" + services.length + ",1fr)",
      gap: 10,
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid " + C.border,
      background: C.elevated,
      marginBottom: 16,
    }}>
      {services.map(({ name, state, color, latencyMs, errorMessage, httpStatus }) => {
        const isChecking = state === HEALTH_STATES.CHECKING;
        const isHealthy = state === HEALTH_STATES.HEALTHY;
        const isDegraded = state === HEALTH_STATES.DEGRADED;
        const stateColor = isHealthy ? C.ok : isDegraded ? C.warn : (isChecking ? C.textMuted : C.crit);
        return (
          <div key={name} title={errorMessage || (isHealthy ? `Healthy (${latencyMs}ms)` : state)} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            {isChecking
              ? <Spin size={8} />
              : <Dot ok={isHealthy} pulse={isHealthy} />
            }
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color, lineHeight: 1 }}>{name}</div>
              <div style={{ fontSize: 9, color: stateColor, marginTop: 1, fontFamily: MONO, fontWeight: 600 }}>
                {state || HEALTH_STATES.CHECKING}
                {latencyMs !== undefined && latencyMs > 0 ? ` (${latencyMs}ms)` : ""}
              </div>
              {httpStatus && (
                <div style={{ fontSize: 8.5, color: C.textMuted, fontFamily: MONO }}>HTTP {httpStatus}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PRANA Panel ───────────────────────────────────────────────────────────────
function PranaPanel() {
  const [health,   setHealth]   = useState(null);
  const [sysInfo,  setSysInfo]  = useState(null);
  const [propLog,  setPropLog]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [tab,      setTab]      = useState("health");

  const handleRefresh = useCallback(async () => {
    setLoading(true); setError(null);
    const [h, s, p] = await Promise.allSettled([
      apiGet(URL_PRANA, "/health"),
      apiGet(URL_PRANA, "/prana/system/health"),
      apiGet(URL_PRANA, "/prana/propagation-log?limit=20"),
    ]);
    if (h.status === "fulfilled") setHealth(h.value);
    if (s.status === "fulfilled") setSysInfo(s.value);
    if (p.status === "fulfilled") setPropLog(p.value);
    if (h.status === "rejected" && s.status === "rejected") setError(h.reason?.message || "PRANA unreachable");
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiGet(URL_PRANA, "/health"),
      apiGet(URL_PRANA, "/prana/system/health"),
      apiGet(URL_PRANA, "/prana/propagation-log?limit=20"),
    ]).then(([h, s, p]) => {
      if (!active) return;
      if (h.status === "fulfilled") setHealth(h.value);
      if (s.status === "fulfilled") setSysInfo(s.value);
      if (p.status === "fulfilled") setPropLog(p.value);
      if (h.status === "rejected" && s.status === "rejected") setError(h.reason?.message || "PRANA unreachable");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const isOk = isHealthyStatus(health?.status) || isHealthyStatus(sysInfo?.status);
  const mongoOk = health?.mongodb?.mongodb_connected;

  return (
    <Card>
      <PanelHeader
        icon="🧬" title="PRANA — Event Forwarding"
        subtitle={URL_PRANA} color={C.teal}
        right={<RefBtn onClick={handleRefresh} loading={loading} />}
      />

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
        {health && <Badge label={isOk ? "healthy" : "degraded"} color={isOk ? C.ok : C.crit} />}
        {health?.forwarding_enabled !== undefined && (
          <Badge label={health.forwarding_enabled ? "forwarding ON" : "forwarding OFF"}
                 color={health.forwarding_enabled ? C.ok : C.warn} />
        )}
        {mongoOk !== undefined && (
          <Badge label={mongoOk ? "MongoDB OK" : "MongoDB DOWN"}
                 color={mongoOk ? C.ok : C.crit} />
        )}
      </div>

      {loading && <LoadRow text="Fetching PRANA health..." />}
      {error && !health && !sysInfo && <ErrBox msg={error} onRetry={handleRefresh} />}

      <TabBar tabs={["health","system","propagation"]} active={tab} setActive={setTab} color={C.teal} />

      {tab === "health" && health && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Fld label="Status"    value={health.status}                       color={isOk ? C.ok : C.warn} />
          <Fld label="Service"   value={health.service} />
          <Fld label="MongoDB"   value={health.mongodb?.connection_status}   color={mongoOk ? C.ok : C.crit} />
          <Fld label="Database"  value={health.mongodb?.database_name}       mono />
          {health.forwarding_enabled !== undefined && (
            <Fld label="Forwarding" value={health.forwarding_enabled ? "Enabled" : "Disabled"}
                 color={health.forwarding_enabled ? C.ok : C.warn} />
          )}
        </div>
      )}

      {tab === "system" && (
        sysInfo ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Fld label="Mode"           value={sysInfo.mode} />
              <Fld label="Replay Records" value={sysInfo.replay_records_count} color={C.accent} mono />
              <Fld label="Last Replay"    value={fmtTime(sysInfo.last_replay_timestamp)} mono />
              <Fld label="Forwarding"     value={sysInfo.forwarding_enabled ? "Enabled" : "Disabled"}
                   color={sysInfo.forwarding_enabled ? C.ok : C.warn} />
            </div>
            {sysInfo.core_services && (
              <div style={{ background: C.elevated, borderRadius: 7, padding: "8px 10px", border: "1px solid " + C.border }}>
                <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Core Service URLs
                </div>
                {Object.entries(sysInfo.core_services).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 10, fontFamily: MONO, color: C.textSub, marginBottom: 3 }}>
                    <span style={{ color: C.textMuted }}>{k}: </span>{String(v)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : <LoadRow text="Loading system health..." />
      )}

      {tab === "propagation" && (
        propLog ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
            {(propLog.events || propLog.logs || propLog.records || (Array.isArray(propLog) ? propLog : [])).slice(0,20).map((e, i) => {
              const ok = ["forwarded","success","ok"].includes(String(e.status || "").toLowerCase());
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                  borderRadius: 6, background: C.elevated, border: "1px solid " + C.border, fontSize: 10,
                }}>
                  <Dot ok={ok} />
                  <span style={{ fontFamily: MONO, color: ok ? C.ok : C.crit, width: 80, flexShrink: 0 }}>
                    {e.status || "?"}
                  </span>
                  <span style={{ color: C.textSub, flex: 1 }}>
                    {e.destination || e.action || e.event_type || "-"}
                  </span>
                  <span style={{ color: C.textMuted, fontFamily: MONO, flexShrink: 0 }}>
                    {fmtTime(e.logged_at || e.timestamp || e.created_at) || "-"}
                  </span>
                </div>
              );
            })}
            {(!propLog.events && !Array.isArray(propLog)) && <RawJSON data={propLog} label="propagation log" />}
          </div>
        ) : <LoadRow text="Loading propagation log..." />
      )}
    </Card>
  );
}

// ── KARMA Panel ───────────────────────────────────────────────────────────────
function KarmaPanel() {
  const [health,    setHealth]    = useState(null);
  const [latHash,   setLatHash]   = useState(null);
  const [verify,    setVerify]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [tab,       setTab]       = useState("health");
  const [verifying, setVerifying] = useState(false);

  const handleRefresh = useCallback(async () => {
    setLoading(true); setError(null);
    const [h, lh] = await Promise.allSettled([
      apiGet(URL_KARMA, "/health"),
      apiGet(URL_KARMA, "/karma/latest-hash"),
    ]);
    if (h.status  === "fulfilled") setHealth(h.value);
    if (lh.status === "fulfilled") setLatHash(lh.value);
    if (h.status  === "rejected" && lh.status === "rejected") setError(h.reason?.message || "KARMA unreachable");
    setLoading(false);
  }, []);

  const runVerify = useCallback(async () => {
    setVerifying(true);
    try {
      const res = await apiPost(URL_KARMA, "/karma/verify", {});
      setVerify(res);
      setTab("verify");
    } catch (e) { setVerify({ _error: e.message }); setTab("verify"); }
    finally { setVerifying(false); }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiGet(URL_KARMA, "/health"),
      apiGet(URL_KARMA, "/karma/latest-hash"),
    ]).then(([h, lh]) => {
      if (!active) return;
      if (h.status  === "fulfilled") setHealth(h.value);
      if (lh.status === "fulfilled") setLatHash(lh.value);
      if (h.status  === "rejected" && lh.status === "rejected") setError(h.reason?.message || "KARMA unreachable");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const isOk = isHealthyStatus(health?.status);

  return (
    <Card>
      <PanelHeader
        icon="⚖️" title="KARMA — Integrity Chain"
        subtitle={URL_KARMA} color={C.purple}
        right={<RefBtn onClick={handleRefresh} loading={loading} />}
      />

      <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
        {health && <Badge label={isOk ? "healthy" : "degraded"} color={isOk ? C.ok : C.crit} />}
        {health?.service && <Badge label={health.service} color={C.purple} />}
      </div>

      {loading && <LoadRow text="Fetching KARMA health..." />}
      {error && !health && !latHash && <ErrBox msg={error} onRetry={handleRefresh} />}

      <TabBar tabs={["health","chain","verify"]} active={tab} setActive={setTab} color={C.purple} />

      {tab === "health" && health && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Fld label="Status"  value={health.status}  color={isOk ? C.ok : C.warn} />
          <Fld label="Service" value={health.service} />
        </div>
      )}

      {tab === "chain" && (
        latHash ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Fld label="Chain"    value={latHash.chain}    color={C.purple} />
              <Fld label="Sequence" value={latHash.sequence} color={C.accent} mono />
            </div>
            <Fld label="Latest Hash" value={latHash.latest_hash} color={C.ok} mono copy />
            {latHash.event_id && <Fld label="Event ID" value={latHash.event_id} mono copy />}
          </div>
        ) : <LoadRow text="Loading chain state..." />
      )}

      {tab === "verify" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ActionBtn
            label="⚡ Run Chain Verification"
            onClick={runVerify}
            loading={verifying}
            color={C.purple}
          />
          {verify && !verify._error && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Fld label="Status"      value={verify.status}
                   color={verify.status === "MATCH" || verify.status === "verified" ? C.ok : C.crit} />
              <Fld label="Chain Valid" value={verify.chain_valid ? "true" : "false"}
                   color={verify.chain_valid ? C.ok : C.crit} />
              {verify.matches    !== undefined && <Fld label="Matches"    value={verify.matches}    color={C.ok} />}
              {verify.mismatches !== undefined && <Fld label="Mismatches" value={verify.mismatches} color={verify.mismatches > 0 ? C.crit : C.ok} />}
              {verify.current_hash  && <Fld label="Current Hash"  value={verify.current_hash}  mono copy />}
              {verify.expected_hash && <Fld label="Expected Hash" value={verify.expected_hash} mono copy />}
            </div>
          )}
          {verify?._error && <ErrBox msg={verify._error} />}
        </div>
      )}
    </Card>
  );
}

// ── RAJYA Panel ───────────────────────────────────────────────────────────────
function RajyaPanel() {
  const EXEC_ID = "c8f2b77a-2454-4712-baea-35b8696d744f";
  const [decision, setDecision] = useState("ALLOW");
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const validate = useCallback(async () => {
    setLoading(true); setError(null); setResult(null);
    const body = {
      execution_id: EXEC_ID,
      sarathi_decision: decision,
      sarathi_execution_id: EXEC_ID,
      enforcement_verdict: {
        execution_id: EXEC_ID,
        enforcement_decision: decision,
        trace_hash: "a75eace926f5277e27b8da32a22c56436ed80086f2f221627a3ef74a5adde68c",
        risk_score: 0.15,
        confidence: 0.95,
      },
    };
    try {
      const res = await apiPost(URL_RAJYA, "/api/v1/rajya/validate", body);
      setResult(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [decision]);

  const approved = result?.status === "EXECUTION_APPROVED";
  const rejected = result?.status === "REJECT";

  return (
    <Card>
      <PanelHeader
        icon="🏛️" title="RAJYA — Governance Validation"
        subtitle={URL_RAJYA + "/api/v1/rajya/validate"} color={C.warn}
      />

      <div style={{ fontSize: 10.5, color: C.textMuted, marginBottom: 8, lineHeight: 1.5 }}>
        Mandatory governance gate before any execution. Select Sarathi decision and run:
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {["ALLOW","DENY","ABSTAIN"].map(d => {
          const col = d === "ALLOW" ? C.ok : C.crit;
          return (
            <button key={d} onClick={() => setDecision(d)} style={{
              fontSize: 10.5, padding: "4px 12px", borderRadius: 99, cursor: "pointer",
              border: "1px solid " + (decision === d ? col : C.border),
              background: decision === d ? col + "1A" : "transparent",
              color: decision === d ? col : C.textMuted,
              fontFamily: MONO, fontWeight: 600,
            }}>{d}</button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <Fld label="Execution ID"      value={EXEC_ID}  mono copy />
        <Fld label="Sarathi Decision"  value={decision}
             color={decision === "ALLOW" ? C.ok : C.crit} />
      </div>

      <ActionBtn label="🏛️ Run RAJYA Validation" onClick={validate} loading={loading} color={C.warn} />

      {error && <div style={{ marginTop: 8 }}><ErrBox msg={error} /></div>}

      {result && (
        <div style={{
          marginTop: 10, padding: "12px", borderRadius: 8,
          border: "1px solid " + (approved ? C.ok : C.crit) + "55",
          background: (approved ? C.ok : C.crit) + "08",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: approved || !rejected ? 0 : 8 }}>
            <span style={{ fontSize: 18 }}>{approved ? "✅" : "❌"}</span>
            <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: approved ? C.ok : C.crit }}>
              {result.status}
            </span>
          </div>
          {rejected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              <Fld label="Rejection Code"   value={result.rejection_code}   color={C.crit} mono />
              <Fld label="Rejection Reason" value={result.rejection_reason} color={C.warn} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── TANTRA Panel ──────────────────────────────────────────────────────────────
function TantraPanel() {
  const [health,  setHealth]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const handleRefresh = useCallback(async () => {
    setLoading(true); setError(null);
    const results = await Promise.allSettled([
      apiGet(URL_TANTRA, "/health"),
      apiGet(URL_TANTRA, "/"),
      apiGet(URL_TANTRA, "/status"),
    ]);
    const first = results.find(r => r.status === "fulfilled");
    if (first) setHealth(first.value);
    else setError(results[0].reason?.message || "TANTRA unreachable");
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiGet(URL_TANTRA, "/health"),
      apiGet(URL_TANTRA, "/"),
      apiGet(URL_TANTRA, "/status"),
    ]).then(results => {
      if (!active) return;
      const first = results.find(r => r.status === "fulfilled");
      if (first) setHealth(first.value);
      else setError(results[0].reason?.message || "TANTRA unreachable");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const isOk = health && isHealthyStatus(health.status || health.health || health.state);

  return (
    <Card>
      <PanelHeader
        icon="⚡" title="TANTRA — Gated Bridge"
        subtitle={URL_TANTRA} color={C.info}
        right={<RefBtn onClick={handleRefresh} loading={loading} />}
      />

      {loading && <LoadRow text="Connecting to TANTRA Gated Bridge..." />}
      {error && <ErrBox msg={error} onRetry={handleRefresh} />}

      {health && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 7 }}>
            <Badge label={isOk ? "reachable" : "degraded"} color={isOk ? C.ok : C.warn} />
            {health.service && <Badge label={health.service} color={C.info} />}
          </div>

          {/* Structured fields if they exist */}
          {(health.status || health.version || health.mode) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {health.status  && <Fld label="Status"  value={health.status}  color={isOk ? C.ok : C.warn} />}
              {health.version && <Fld label="Version" value={health.version} mono />}
              {health.mode    && <Fld label="Mode"    value={health.mode} />}
              {health.service && <Fld label="Service" value={health.service} />}
            </div>
          )}

          <RawJSON data={health} label="TANTRA response" />
        </div>
      )}
    </Card>
  );
}

// ── BUCKET Panel ──────────────────────────────────────────────────────────────
function BucketPanel() {
  const [health, setHealth] = useState(null);
  const [chain,  setChain]  = useState(null);
  const [loading,setLoading]= useState(true);
  const [error,  setError]  = useState(null);

  const handleRefresh = useCallback(async () => {
    setLoading(true); setError(null);
    const [h, c] = await Promise.allSettled([
      apiGet(URL_BUCKET, "/health"),
      apiGet(URL_BUCKET, "/bucket/chain-state"),
    ]);
    if (h.status === "fulfilled") setHealth(h.value);
    if (c.status === "fulfilled") setChain(c.value);
    if (h.status === "rejected" && c.status === "rejected") setError(h.reason?.message || "BUCKET unreachable");
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiGet(URL_BUCKET, "/health"),
      apiGet(URL_BUCKET, "/bucket/chain-state"),
    ]).then(([h, c]) => {
      if (!active) return;
      if (h.status === "fulfilled") setHealth(h.value);
      if (c.status === "fulfilled") setChain(c.value);
      if (h.status === "rejected" && c.status === "rejected") setError(h.reason?.message || "BUCKET unreachable");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const isOk = health && isHealthyStatus(health.status);
  const artifactCount = chain?.artifact_count ?? health?.artifact_count ?? "—";
  const latestHash    = chain?.latest_hash ?? null;

  return (
    <Card>
      <PanelHeader
        icon="🪣" title="BUCKET — Provenance Store"
        subtitle={URL_BUCKET} color={C.ok}
        right={<RefBtn onClick={handleRefresh} loading={loading} />}
      />

      {loading && <LoadRow text="Checking Bucket health..." />}
      {error && !health && !chain && <ErrBox msg={error} onRetry={handleRefresh} />}

      {(health || chain) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 7 }}>
            <Badge label={isOk ? "healthy" : (health?.status || "reachable")} color={isOk ? C.ok : C.warn} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Fld label="Total Artifacts" value={String(artifactCount)} color={C.accent} />
            <Fld label="Storage Type"    value={health?.storage_type || "append_only"} />
          </div>
          {latestHash && <Fld label="Latest Chain Hash" value={latestHash} color={C.ok} mono copy />}
        </div>
      )}
    </Card>
  );
}

// ── SANSKAR Panel ─────────────────────────────────────────────────────────────
function SanskarPanel() {
  const [health,  setHealth]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const handleRefresh = useCallback(async () => {
    setLoading(true); setError(null);
    const results = await Promise.allSettled([
      apiGet(URL_SANSKAR, "/health"),
      apiGet(URL_SANSKAR, "/"),
      apiGet(URL_SANSKAR, "/status"),
    ]);
    const first = results.find(r => r.status === "fulfilled");
    if (first) setHealth(first.value);
    else setError(results[0].reason?.message || "SANSKAR unreachable");
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiGet(URL_SANSKAR, "/health"),
      apiGet(URL_SANSKAR, "/"),
      apiGet(URL_SANSKAR, "/status"),
    ]).then(results => {
      if (!active) return;
      const first = results.find(r => r.status === "fulfilled");
      if (first) setHealth(first.value);
      else setError(results[0].reason?.message || "SANSKAR unreachable");
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const rawStatus = health?.status || health?.health || health?.state;
  const isOk = isHealthyStatus(rawStatus);
  const service = health?.service || health?.name || health?.service_name || "sanskar";

  return (
    <Card>
      <PanelHeader
        icon="🕉️" title="SANSKAR — Constitutional Convergence"
        subtitle={URL_SANSKAR} color={C.orange}
        right={<RefBtn onClick={handleRefresh} loading={loading} />}
      />

      {loading && <LoadRow text="Connecting to SANSKAR..." />}
      {error && <ErrBox msg={error} onRetry={handleRefresh} />}

      {health && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <Badge label={isOk ? "healthy" : (rawStatus || "reachable")} color={isOk ? C.ok : C.warn} />
            <Badge label={service} color={C.orange} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Fld label="Status"  value={rawStatus} color={isOk ? C.ok : C.warn} />
            <Fld label="Service" value={service} />
            {health.version     && <Fld label="Version"     value={health.version}     mono />}
            {health.environment && <Fld label="Environment" value={health.environment} />}
            {health.uptime      && <Fld label="Uptime"      value={String(health.uptime)} mono />}
            {health.timestamp   && <Fld label="Timestamp"   value={fmtTime(health.timestamp)} mono />}
            {health.db?.status  && <Fld label="DB"          value={health.db.status}   color={C.ok} />}
          </div>

          <RawJSON data={health} label="full SANSKAR response" />
        </div>
      )}
    </Card>
  );
}

// ── HARSHA Panel — CET / KSML / SUM-SCRIPT ───────────────────────────────────
const HARSHA_TEMPLATES = {
  validate_dec: JSON.stringify({
    decision_id: "dec-001",
    trace_id: "trace-101",
    intent: "EXECUTE_TRANSACTION",
    actors: { user_id: "usr_99" },
    constraints: [{ left: "balance", operator: ">=", right: 100 }],
    context: { env: "production" },
    timestamp: "2026-08-11T12:00:00Z"
  }, null, 2),
  ksml: JSON.stringify({
    decision_id: "dec-ksml-001",
    trace_id: "trace-ksml-101",
    intent: "COMPILE_KSML",
    actors: { system: "ksml_compiler" },
    constraints: [{ left: "status", operator: "==", right: "active" }],
    context: { version: "1.0" },
    timestamp: "2026-08-11T12:00:00Z"
  }, null, 2),
  cet: JSON.stringify({
    trace_id: "trace-cet-101",
    version: "1.0"
  }, null, 2),
  forward: JSON.stringify({
    sum_script: {
      script_id: "sum-001",
      steps: []
    }
  }, null, 2),
  enforce: JSON.stringify({
    sum_script: {
      script_id: "sum-001",
      steps: []
    }
  }, null, 2),
  validate_exec: JSON.stringify({
    sum_script: {
      script_id: "sum-001",
      steps: []
    }
  }, null, 2),
  execute: JSON.stringify({
    sum_script: {
      execution_id: "exec-999",
      steps: []
    }
  }, null, 2)
};

function HarshaPanel() {
  const [tab,      setTab]     = useState("validate_dec");
  const [result,   setResult]  = useState(null);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState(null);
  const [reqBody,  setReqBody] = useState(HARSHA_TEMPLATES.validate_dec);

  const TABS = [
    { id: "validate_dec", label: "Validate Decision", endpoint: "/validate",            desc: "Deterministic DecisionRequest validation" },
    { id: "ksml",         label: "KSML Compile",      endpoint: "/compile_execution",  desc: "Compile KSML input → deterministic SUM-SCRIPT" },
    { id: "cet",          label: "CET Compile",       endpoint: "/cet/compile",        desc: "CET compile → SUM-SCRIPT + contract hash" },
    { id: "forward",      label: "Forward",           endpoint: "/forward_to_sarathi", desc: "Forward SUM-SCRIPT to Sarathi stage" },
    { id: "enforce",      label: "Enforce",           endpoint: "/enforce_execution",  desc: "Sarathi enforcement → enforcement token" },
    { id: "validate_exec",label: "Validate Exec",     endpoint: "/validate_execution", desc: "Bridge validation before execution" },
    { id: "execute",      label: "Execute",           endpoint: "/execute",            desc: "Execute the validated SUM-SCRIPT" },
  ];

  const activeTab = TABS.find(t => t.id === tab) || TABS[0];

  const handleTabChange = (tabId) => {
    setTab(tabId);
    setResult(null);
    setError(null);
    setReqBody(HARSHA_TEMPLATES[tabId] || '{}');
  };

  const run = useCallback(async () => {
    if (!URL_HARSHA) return;
    setLoading(true); setError(null); setResult(null);
    let body;
    try { body = JSON.parse(reqBody); } catch { body = { input: reqBody }; }
    try {
      const res = await apiPost(URL_HARSHA, activeTab.endpoint, body);
      setResult(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [activeTab, reqBody]);

  // When Harsha URL is not yet set
  if (!URL_HARSHA) {
    return (
      <Card>
        <PanelHeader icon="⚙️" title="KSML / CET / SUM-SCRIPT — Harsha Pawar" color={C.teal} />
        <div style={{
          padding: "12px", borderRadius: 8, marginBottom: 10,
          border: "1px solid " + C.warn + "44", background: C.warn + "08",
          fontSize: 11, color: C.warn, lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠ Waiting for Harsha's base URL</div>
          <div style={{ color: C.textSub, marginBottom: 10 }}>
            Set <code style={{ fontFamily: MONO, background: C.elevated, padding: "1px 5px", borderRadius: 3 }}>URL_HARSHA</code> at
            the top of <code style={{ fontFamily: MONO, background: C.elevated, padding: "1px 5px", borderRadius: 3 }}>runtime-services-widget.jsx</code>.
            All endpoints are wired and ready.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {TABS.map(t => (
              <div key={t.id} style={{ display: "flex", gap: 8, fontSize: 10.5 }}>
                <span style={{ fontFamily: MONO, color: C.teal, width: 46, flexShrink: 0 }}>POST</span>
                <span style={{ fontFamily: MONO, color: C.textSub, width: 160, flexShrink: 0 }}>{t.endpoint}</span>
                <span style={{ color: C.textMuted }}>— {t.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <PanelHeader
        icon="⚙️" title="KSML / CET / SUM-SCRIPT — Harsha Pawar"
        subtitle={URL_HARSHA} color={C.teal}
      />

      {/* Pipeline flow */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
        padding: "7px 10px", borderRadius: 7, marginBottom: 10,
        background: C.elevated, border: "1px solid " + C.border, fontSize: 9.5,
      }}>
        {[["KSML","#06B8D0"],["→",""],["CET","#8B5CF6"],["→",""],["Validate","#F59E0B"],["→",""],["Execute","#22C55E"]].map(([l,c],i) =>
          l === "→"
            ? <span key={i} style={{ color: C.textMuted }}>→</span>
            : <span key={i} style={{ fontFamily: MONO, fontWeight: 600, color: c, background: c+"15", padding: "1px 7px", borderRadius: 4 }}>{l}</span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
            fontSize: 10, padding: "3px 10px", borderRadius: 99, cursor: "pointer",
            border: "1px solid " + (tab === t.id ? C.teal : C.border),
            background: tab === t.id ? C.teal + "1A" : "transparent",
            color: tab === t.id ? C.teal : C.textMuted,
            fontFamily: BODY,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Endpoint description */}
      <div style={{ fontSize: 10.5, color: C.textMuted, marginBottom: 8, padding: "5px 8px", background: C.elevated, borderRadius: 6, border: "1px solid " + C.border }}>
        <span style={{ fontFamily: MONO, color: C.teal }}>POST </span>
        <span style={{ fontFamily: MONO, color: C.textSub }}>{activeTab.endpoint}</span>
        <span> — {activeTab.desc}</span>
      </div>

      {/* Request body */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Request Body (JSON — editable)
        </div>
        <textarea
          value={reqBody}
          onChange={e => setReqBody(e.target.value)}
          rows={6}
          style={{
            width: "100%", background: C.elevated,
            border: "1px solid " + C.border, borderRadius: 7,
            padding: "8px 10px", color: C.text,
            fontSize: 11, fontFamily: MONO, outline: "none", resize: "vertical",
          }}
        />
      </div>

      <ActionBtn label={"▶ Run " + activeTab.label} onClick={run} loading={loading} color={C.teal} />

      {error && <div style={{ marginTop: 8 }}><ErrBox msg={error} /></div>}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {result.status && (
            <Badge label={result.status}
                   color={["success","compiled","validated","forwarded","executed","ok"].includes(
                     String(result.status).toLowerCase()) ? C.ok : C.warn} />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {result.contract_hash  && <Fld label="Contract Hash"  value={result.contract_hash}  mono copy />}
            {result.script_hash    && <Fld label="Script Hash"    value={result.script_hash}    mono copy />}
            {result.execution_id   && <Fld label="Execution ID"   value={result.execution_id}   mono copy />}
            {result.token          && <Fld label="Token"          value={result.token}          mono copy />}
          </div>
          <RawJSON data={result} label="full response" />
        </div>
      )}
    </Card>
  );
}


// ── PRANA Replay Panel ────────────────────────────────────────────────────────
function ReplayPanel() {
  const [traceId, setTraceId] = useState("trace-001");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!traceId.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await apiGet(URL_PRANA, "/replay/" + encodeURIComponent(traceId.trim()));
      setResult(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [traceId]);

  return (
    <Card>
      <PanelHeader icon="⏮️" title="PRANA — Replay by Trace ID" subtitle="GET /replay/{trace_id}" color={C.teal} />

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={traceId}
          onChange={e => setTraceId(e.target.value)}
          placeholder="Enter trace_id..."
          onKeyDown={e => e.key === "Enter" && fetch()}
          style={{
            flex: 1, background: C.elevated,
            border: "1px solid " + C.border, borderRadius: 7,
            padding: "7px 10px", color: C.text,
            fontSize: 11.5, fontFamily: MONO, outline: "none",
          }}
        />
        <button onClick={fetch} disabled={loading} style={{
          padding: "7px 14px", borderRadius: 7, cursor: loading ? "wait" : "pointer",
          border: "1px solid " + C.teal + "55", background: C.teal + "15",
          color: C.teal, fontSize: 11, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 5,
        }}>
          {loading ? <><Spin size={11} /> Fetching...</> : "Fetch Replay"}
        </button>
      </div>

      {error && <ErrBox msg={error} />}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Fld label="Trace ID"        value={result.trace_id}           mono copy />
            <Fld label="Certification"   value={result.certification_status}
                 color={result.certification_status === "CERTIFIED" ? C.ok : C.warn} />
            <Fld label="Created At"      value={fmtTime(result.created_at)} />
            <Fld label="Exec Token"      value={result.execution_token}     mono copy />
          </div>
          {result.bucket_response && (
            <div style={{ background: C.elevated, borderRadius: 7, padding: "8px 10px", border: "1px solid " + C.border }}>
              <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Bucket Response
              </div>
              <pre style={{ fontFamily: MONO, fontSize: 9, color: C.textSub, margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(result.bucket_response, null, 2)}
              </pre>
            </div>
          )}
          <RawJSON data={result} label="full replay record" />
        </div>
      )}
    </Card>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function RuntimeServicesWidget() {
  const [monitorData, setMonitorData] = useState({});
  const [loading, setLoading] = useState(true);

  const refreshMonitoring = useCallback(async () => {
    setLoading(true);
    try {
      const results = await monitorAllServices();
      setMonitorData(results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) refreshMonitoring();
    }, 0);
    const interval = setInterval(() => {
      if (active) refreshMonitoring();
    }, 30000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [refreshMonitoring]);

  const overviewServices = [
    { name: "PRANA",   state: monitorData.prana?.status   || HEALTH_STATES.CHECKING, color: C.teal,   latencyMs: monitorData.prana?.latencyMs,   errorMessage: monitorData.prana?.errorMessage,   httpStatus: monitorData.prana?.httpStatus },
    { name: "KARMA",   state: monitorData.karma?.status   || HEALTH_STATES.CHECKING, color: C.purple, latencyMs: monitorData.karma?.latencyMs,   errorMessage: monitorData.karma?.errorMessage,   httpStatus: monitorData.karma?.httpStatus },
    { name: "RAJYA",   state: monitorData.rajya?.status   || HEALTH_STATES.CHECKING, color: C.warn,   latencyMs: monitorData.rajya?.latencyMs,   errorMessage: monitorData.rajya?.errorMessage,   httpStatus: monitorData.rajya?.httpStatus },
    { name: "TANTRA",  state: monitorData.tantra?.status  || HEALTH_STATES.CHECKING, color: C.info,   latencyMs: monitorData.tantra?.latencyMs,  errorMessage: monitorData.tantra?.errorMessage,  httpStatus: monitorData.tantra?.httpStatus },
    { name: "BUCKET",  state: monitorData.bucket?.status  || HEALTH_STATES.CHECKING, color: C.ok,     latencyMs: monitorData.bucket?.latencyMs,  errorMessage: monitorData.bucket?.errorMessage,  httpStatus: monitorData.bucket?.httpStatus },
    { name: "SANSKAR", state: monitorData.sanskar?.status || HEALTH_STATES.CHECKING, color: C.orange, latencyMs: monitorData.sanskar?.latencyMs, errorMessage: monitorData.sanskar?.errorMessage, httpStatus: monitorData.sanskar?.httpStatus },
    { name: "HARSHA",  state: monitorData.harsha?.status  || HEALTH_STATES.CHECKING, color: C.teal,   latencyMs: monitorData.harsha?.latencyMs,  errorMessage: monitorData.harsha?.errorMessage,  httpStatus: monitorData.harsha?.httpStatus },
  ];

  return (
    <div style={{ fontFamily: BODY, color: C.text, padding: "18px 20px 40px" }}>
      <style>{`
        @keyframes rt-spin  { to { transform: rotate(360deg); } }
        @keyframes rt-pulse { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.6);opacity:0} }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #546070; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: #263040; border-radius: 99px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          background: "linear-gradient(135deg,#2E7CF6,#06B8D0)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
        }}>⚡</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>BHIV Runtime Services</div>
          <div style={{ fontSize: 10.5, color: C.textMuted }}>
            Runtime Telemetry — PRANA · KARMA · RAJYA · TANTRA · BUCKET · SANSKAR · HARSHA
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: C.textMuted, fontFamily: MONO }}>
          <span>{new Date().toLocaleTimeString("en-IN")} IST</span>
          <button
            onClick={refreshMonitoring}
            disabled={loading}
            style={{
              padding: "4px 9px",
              borderRadius: 5,
              border: "1px solid " + C.border,
              background: C.elevated,
              color: C.text,
              fontSize: 9.5,
              fontFamily: MONO,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Probing..." : "Refresh Probes"}
          </button>
        </div>
      </div>

      {/* 7-service overview strip */}
      <OverviewStrip services={overviewServices} />

      {/* Row 1: PRANA + KARMA */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ErrorBoundary name="PRANA Service Panel" compact>
          <PranaPanel />
        </ErrorBoundary>
        <ErrorBoundary name="KARMA Service Panel" compact>
          <KarmaPanel />
        </ErrorBoundary>
      </div>

      {/* Row 2: RAJYA + TANTRA */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <ErrorBoundary name="RAJYA Service Panel" compact>
          <RajyaPanel />
        </ErrorBoundary>
        <ErrorBoundary name="TANTRA Service Panel" compact>
          <TantraPanel />
        </ErrorBoundary>
      </div>

      {/* Row 3: BUCKET + SANSKAR */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <ErrorBoundary name="BUCKET Service Panel" compact>
          <BucketPanel />
        </ErrorBoundary>
        <ErrorBoundary name="SANSKAR Service Panel" compact>
          <SanskarPanel />
        </ErrorBoundary>
      </div>

      {/* Row 4: HARSHA + REPLAY */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <ErrorBoundary name="HARSHA Service Panel" compact>
          <HarshaPanel />
        </ErrorBoundary>
        <ErrorBoundary name="PRANA Replay Panel" compact>
          <ReplayPanel />
        </ErrorBoundary>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 14, padding: "10px 14px", borderRadius: 8,
        border: "1px solid " + C.border, background: C.elevated,
        fontSize: 11, color: C.textMuted, lineHeight: 1.7,
      }}>
        <span style={{ color: C.accent, fontWeight: 600 }}>Runtime Service Integration Status: </span>
        Verified Endpoints — PRANA (${URL_PRANA}) · KARMA (${URL_KARMA}) · RAJYA (${URL_RAJYA}) · SANSKAR (${URL_SANSKAR}).
        Monitored/Configured Endpoints — TANTRA (${URL_TANTRA}) · BUCKET (${URL_BUCKET}) · HARSHA (${URL_HARSHA}).
      </div>
    </div>
  );
}
