/**
 * End-to-End Traceability & Correlation Inspector
 * Allows the operator to inspect the multi-service lifecycle of a trace across:
 * PRANA, RAJYA, KARMA, BUCKET, SANSKAR, and HARSHA.
 * Preserves original identifiers and displays missing links explicitly.
 */

import { useState, useEffect, useCallback } from "react";
import {
  GitCommit,
  Search,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  Link2,
  Activity,
  Layers,
  Database,
  Cpu,
} from "lucide-react";
import {
  correlateTrace,
  extractRecentTraces,
  STAGE_STATUS,
  TRACE_STATUS,
  LIFECYCLE_STAGES,
} from "../services/traceability";

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
};

const MONO = "'JetBrains Mono', 'IBM Plex Mono', monospace";

function getStageIcon(stageId) {
  switch (stageId) {
    case LIFECYCLE_STAGES.GOVERNANCE:
      return Shield;
    case LIFECYCLE_STAGES.CONSTITUTIONAL:
      return Layers;
    case LIFECYCLE_STAGES.EXECUTION:
      return Cpu;
    case LIFECYCLE_STAGES.PROPAGATION:
      return Activity;
    case LIFECYCLE_STAGES.PROVENANCE:
      return Database;
    case LIFECYCLE_STAGES.INTEGRITY:
      return GitCommit;
    default:
      return Link2;
  }
}

function getStageBadge(status) {
  switch (status) {
    case STAGE_STATUS.VERIFIED:
      return { bg: `${C.ok}22`, text: C.ok, border: `${C.ok}44`, label: "VERIFIED" };
    case STAGE_STATUS.PARTIAL:
      return { bg: `${C.warn}22`, text: C.warn, border: `${C.warn}44`, label: "PARTIAL" };
    case STAGE_STATUS.MISSING_LINK:
      return { bg: `${C.crit}22`, text: C.crit, border: `${C.crit}44`, label: "MISSING LINK" };
    case STAGE_STATUS.UNVERIFIED_OFFLINE:
      return { bg: `${C.indigo}22`, text: "#818CF8", border: `${C.indigo}44`, label: "OFFLINE / TIMEOUT" };
    default:
      return { bg: `${C.textMuted}22`, text: C.textMuted, border: `${C.textMuted}44`, label: "PENDING" };
  }
}

function getTraceStatusBadge(status) {
  switch (status) {
    case TRACE_STATUS.COMPLETE:
      return { bg: `${C.ok}22`, text: C.ok, border: `${C.ok}44`, label: "COMPLETE LIFECYCLE" };
    case TRACE_STATUS.PARTIAL:
      return { bg: `${C.warn}22`, text: C.warn, border: `${C.warn}44`, label: "PARTIAL TRACE" };
    case TRACE_STATUS.BROKEN_LINK:
      return { bg: `${C.crit}22`, text: C.crit, border: `${C.crit}44`, label: "BROKEN LINK DETECTED" };
    case TRACE_STATUS.UNVERIFIED:
    default:
      return { bg: `${C.indigo}22`, text: "#818CF8", border: `${C.indigo}44`, label: "UNVERIFIED" };
  }
}

function CopyableBadge({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      onClick={handleCopy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        background: C.elevated,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        fontSize: 10.5,
        fontFamily: MONO,
        cursor: "pointer",
      }}
      title={`Click to copy: ${value}`}
    >
      <span style={{ color: C.textMuted }}>{label}:</span>
      <span style={{ color: copied ? C.ok : C.accent }}>
        {value.length > 24 ? `${value.slice(0, 24)}...` : value}
      </span>
      {copied ? <Check size={11} color={C.ok} /> : <Copy size={11} color={C.textMuted} />}
    </div>
  );
}

export default function TraceabilityInspector() {
  const [searchId, setSearchId] = useState("trace-001");
  const [activeTrace, setActiveTrace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentTraces, setRecentTraces] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [expandedPayloads, setExpandedPayloads] = useState({});

  const loadRecentTraces = useCallback(async () => {
    setRecentLoading(true);
    try {
      const candidates = await extractRecentTraces();
      setRecentTraces(candidates);
      if (candidates.length > 0 && !searchId) {
        setSearchId(candidates[0].id);
      }
    } catch {
      // safe fallback
    } finally {
      setRecentLoading(false);
    }
  }, [searchId]);

  const executeCorrelation = useCallback(async (idToQuery) => {
    const target = idToQuery || searchId;
    if (!target || !target.trim()) return;
    setLoading(true);
    try {
      const model = await correlateTrace(target.trim());
      setActiveTrace(model);
    } catch (err) {
      setActiveTrace({
        queryId: target,
        status: TRACE_STATUS.UNVERIFIED,
        matchedIdentifiers: {},
        stages: [],
        missingLinks: [`Trace correlation failed: ${err.message}`],
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [searchId]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      loadRecentTraces().then(() => {
        if (active && searchId) {
          executeCorrelation(searchId);
        }
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadRecentTraces, executeCorrelation, searchId]);

  const togglePayload = (stageId) => {
    setExpandedPayloads((prev) => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const statusBadge = activeTrace ? getTraceStatusBadge(activeTrace.status) : null;

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
              background: "linear-gradient(135deg, #14B8A6, #2E7CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(20,184,166,0.3)",
            }}
          >
            <GitCommit size={22} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>
              End-to-End Traceability & Correlation Inspector
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              Multi-service correlation across PRANA, RAJYA, KARMA, BUCKET, SANSKAR, and HARSHA without invented identifiers
            </div>
          </div>
        </div>

        <button
          onClick={loadRecentTraces}
          disabled={recentLoading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: C.surface,
            color: C.text,
            cursor: recentLoading ? "wait" : "pointer",
            fontSize: 12,
            fontFamily: MONO,
          }}
        >
          <RefreshCw size={13} style={{ animation: recentLoading ? "spin 1s linear infinite" : "none" }} />
          <span>Refresh Trace Feed</span>
        </button>
      </div>

      {/* Query Bar & Recent Traces */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && executeCorrelation()}
              placeholder="Search by Trace ID (e.g. trace-001, UUID), Execution ID (exec-...), or Artifact ID..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: 7,
                background: C.elevated,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 12,
                fontFamily: MONO,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <Search size={14} color={C.textMuted} style={{ position: "absolute", left: 12, top: 11 }} />
          </div>
          <button
            onClick={() => executeCorrelation()}
            disabled={loading}
            style={{
              padding: "8px 18px",
              borderRadius: 7,
              background: C.accent,
              color: "#FFFFFF",
              border: "none",
              fontWeight: 600,
              fontSize: 12,
              fontFamily: MONO,
              cursor: loading ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {loading ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <GitCommit size={13} />}
            <span>Correlate Trace</span>
          </button>
        </div>

        {/* Observed Identifiers Quick-Pills */}
        {recentTraces.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, color: C.textMuted, fontFamily: MONO }}>Discovered Identifiers:</span>
            {recentTraces.slice(0, 6).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSearchId(item.id);
                  executeCorrelation(item.id);
                }}
                style={{
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontFamily: MONO,
                  border: `1px solid ${searchId === item.id ? C.accent : C.border}`,
                  background: searchId === item.id ? `${C.accent}22` : C.elevated,
                  color: searchId === item.id ? C.accent : C.textSub,
                  cursor: "pointer",
                }}
              >
                {item.id.length > 18 ? `${item.id.slice(0, 18)}...` : item.id}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Correlated Trace Details */}
      {activeTrace && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Overview Banner */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Trace Lifecycle Overview:</span>
                <span style={{ fontFamily: MONO, color: C.accent, fontSize: 13 }}>{activeTrace.queryId}</span>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10.5,
                  fontFamily: MONO,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 99,
                  background: statusBadge.bg,
                  color: statusBadge.text,
                  border: `1px solid ${statusBadge.border}`,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusBadge.text }} />
                {statusBadge.label}
              </span>
            </div>

            {/* Matched Identifiers Row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <CopyableBadge label="Trace ID" value={activeTrace.matchedIdentifiers?.traceId} />
              <CopyableBadge label="Execution ID" value={activeTrace.matchedIdentifiers?.executionId} />
              <CopyableBadge label="Artifact ID" value={activeTrace.matchedIdentifiers?.artifactId} />
              <CopyableBadge label="Hash" value={activeTrace.matchedIdentifiers?.hash} />
              <CopyableBadge label="Parent Hash" value={activeTrace.matchedIdentifiers?.parentHash} />
              <CopyableBadge label="Exec Token" value={activeTrace.matchedIdentifiers?.executionToken} />
            </div>

            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: MONO }}>
              Inspected at: {new Date(activeTrace.timestamp).toLocaleString()}
            </div>
          </div>

          {/* Explicit Missing Links & Gap Analysis */}
          {activeTrace.missingLinks && activeTrace.missingLinks.length > 0 && (
            <div style={{ background: `${C.crit}0C`, border: `1px solid ${C.crit}44`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.crit, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                <AlertTriangle size={15} />
                <span>Explicit Missing Links & Lifecycle Gaps ({activeTrace.missingLinks.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {activeTrace.missingLinks.map((msg, i) => (
                  <div key={i} style={{ fontSize: 11, fontFamily: MONO, color: C.textSub, display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <span style={{ color: C.crit }}>•</span>
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6-Stage Trace Lifecycle Timeline */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>
              Chronological 6-Stage Sovereign Lifecycle
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeTrace.stages.map((stage) => {
                const IconComponent = getStageIcon(stage.id);
                const badge = getStageBadge(stage.status);
                const isExpanded = expandedPayloads[stage.id];

                return (
                  <div
                    key={stage.id}
                    style={{
                      background: C.elevated,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: `${badge.text}18`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <IconComponent size={14} color={badge.text} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12, color: C.text }}>
                            {stage.name}
                          </div>
                          <div style={{ fontSize: 10, color: C.textMuted, fontFamily: MONO }}>
                            {stage.endpoint}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {stage.timestamp && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textMuted, fontFamily: MONO }}>
                            <Clock size={11} />
                            <span>{new Date(stage.timestamp).toLocaleTimeString()}</span>
                          </div>
                        )}
                        <span
                          style={{
                            fontSize: 9.5,
                            fontFamily: MONO,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 99,
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {stage.error && (
                      <div style={{ fontSize: 10.5, color: C.crit, fontFamily: MONO, background: `${C.crit}11`, padding: "4px 8px", borderRadius: 4 }}>
                        ⚠ {stage.error}
                      </div>
                    )}

                    {stage.matchedData && (
                      <div>
                        <button
                          onClick={() => togglePayload(stage.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 6px",
                            background: "transparent",
                            border: `1px solid ${C.border}`,
                            borderRadius: 4,
                            color: C.textMuted,
                            fontSize: 10,
                            fontFamily: MONO,
                            cursor: "pointer",
                          }}
                        >
                          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          <span>{isExpanded ? "Hide Correlated Payload" : "View Correlated Payload"}</span>
                        </button>

                        {isExpanded && (
                          <pre
                            style={{
                              marginTop: 6,
                              padding: 8,
                              background: C.bg,
                              border: `1px solid ${C.borderHi}`,
                              borderRadius: 6,
                              fontFamily: MONO,
                              fontSize: 9.5,
                              color: C.textSub,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                              margin: 0,
                              maxHeight: 180,
                              overflowY: "auto",
                            }}
                          >
                            {JSON.stringify(stage.matchedData, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
