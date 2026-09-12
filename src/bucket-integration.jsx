/**
 * BHIV Bucket Integration Widget
 * Connects to Siddhesh Narkar's Bucket service
 * Base URL: https://bhiv-bucket-i1l6.onrender.com
 *
 * Endpoints:
 *   GET /health                         - Server health and storage stats
 *   GET /bucket/chain-state             - Chain state with artifact count
 *   GET /bucket/artifacts?limit=100     - List latest 100 artifacts
 *   GET /bucket/artifact/{artifact_id}  - Get single artifact by ID
 *   GET /bucket/storage-stats           - Storage statistics
 */

import { useState, useEffect, useCallback } from "react";
import { SERVICE_CONFIG, apiGet } from "./services/api";
import { sanitizeDiagnostic } from "./services/telemetry";

const BASE_URL = SERVICE_CONFIG.BUCKET;

// Design tokens - matches BHIV ECC system
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
};
const MONO = "'JetBrains Mono','IBM Plex Mono',monospace";
const BODY = "'Inter',system-ui,sans-serif";

// ── Helper: try multiple field names from API response ────────────────────────
// Siddhesh's API may use different field names - we try all common variants
function pick(obj, ...keys) {
  if (!obj) return null;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return null;
}

// Format timestamp from any format
function formatTs(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch { return String(val); }
}

// ── API Fetcher ───────────────────────────────────────────────────────────────
function apiFetch(path) {
  return apiGet(BASE_URL, path);
}

// ── Primitives ────────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,0.12)", ...style,
    }}>
      {children}
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontFamily: MONO, fontWeight: 600,
      color, background: color + "18", padding: "2px 8px", borderRadius: 99,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 99, background: color }} />
      {label}
    </span>
  );
}

function Spinner({ size = 16 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 99,
      border: `2px solid ${C.border}`,
      borderTopColor: C.accent,
      animation: "bucket-spin 0.7s linear infinite",
      display: "inline-block", flexShrink: 0,
    }} />
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={e => {
      e.stopPropagation();
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }} style={{
      fontSize: 9.5, fontFamily: MONO, padding: "2px 8px", borderRadius: 4,
      border: `1px solid ${copied ? C.ok : C.border}`,
      background: copied ? C.ok + "18" : "transparent",
      color: copied ? C.ok : C.textMuted,
      cursor: "pointer", flexShrink: 0,
    }}>
      {copied ? "copied!" : "copy"}
    </button>
  );
}

function ErrBox({ msg, onRetry }) {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 8,
      border: `1px solid ${C.crit}44`, background: C.crit + "08",
      display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.crit,
    }}>
      <span style={{ flex: 1 }}>⚠ {sanitizeDiagnostic(msg)}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          fontSize: 11, padding: "3px 10px", borderRadius: 6,
          border: `1px solid ${C.crit}44`, background: C.crit + "15",
          color: C.crit, cursor: "pointer",
        }}>Retry</button>
      )}
    </div>
  );
}

function MetricBox({ label, value, color, mono = true }) {
  return (
    <div style={{
      background: C.elevated, borderRadius: 8, padding: "10px 12px",
      border: `1px solid ${C.border}`,
    }}>
      <div style={{
        fontFamily: mono ? MONO : BODY,
        fontSize: value && String(value).length > 10 ? 11 : 17,
        fontWeight: 700, color: color || C.accent,
        wordBreak: "break-all", lineHeight: 1.2,
      }}>
        {value ?? "-"}
      </div>
      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function RawJson({ data }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{
        fontSize: 10.5, padding: "4px 10px", borderRadius: 6,
        border: `1px solid ${C.border}`, background: "transparent",
        color: C.textMuted, cursor: "pointer",
      }}>
        {open ? "Hide" : "Show"} raw JSON
      </button>
      {open && (
        <div style={{
          marginTop: 6, background: C.elevated, borderRadius: 7,
          padding: "10px 12px", border: `1px solid ${C.borderHi}`,
          position: "relative",
        }}>
          <div style={{ position: "absolute", top: 8, right: 10 }}>
            <CopyBtn text={JSON.stringify(data, null, 2)} />
          </div>
          <pre style={{
            fontFamily: MONO, fontSize: 9, color: C.textSub,
            whiteSpace: "pre-wrap", wordBreak: "break-all",
            maxHeight: 320, overflowY: "auto", margin: 0, paddingTop: 4,
          }}>
            {sanitizeDiagnostic(JSON.stringify(data, null, 2))}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Health Panel ──────────────────────────────────────────────────────────────
function HealthPanel() {
  const [health,  setHealth]  = useState(null);
  const [chain,   setChain]   = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const handleRefresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const results = await Promise.allSettled([
        apiFetch("/health"),
        apiFetch("/bucket/chain-state"),
        apiFetch("/bucket/storage-stats"),
      ]);
      if (results[0].status === "fulfilled") setHealth(results[0].value);
      if (results[1].status === "fulfilled") setChain(results[1].value);
      if (results[2].status === "fulfilled") setStats(results[2].value);
      if (results.every(r => r.status === "rejected")) {
        throw new Error(results[0].reason?.message || "All health endpoints failed");
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiFetch("/health"),
      apiFetch("/bucket/chain-state"),
      apiFetch("/bucket/storage-stats"),
    ]).then(results => {
      if (!active) return;
      if (results[0].status === "fulfilled") setHealth(results[0].value);
      if (results[1].status === "fulfilled") setChain(results[1].value);
      if (results[2].status === "fulfilled") setStats(results[2].value);
      if (results.every(r => r.status === "rejected")) {
        setError(results[0].reason?.message || "All health endpoints failed");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textMuted, fontSize: 12 }}>
        <Spinner /> Checking service health...
      </div>
    </Card>
  );
  if (error && !health && !chain) return <Card><ErrBox msg={error} onRetry={handleRefresh} /></Card>;

  // Resolve status
  // From screenshots: health returns { status: "...", service: "bucket", storage: {...} }
  const rawStatus = pick(health, "status","health","state","service_status") || "ok";
  const isHealthy = ["healthy","ok","running","up","active","online","operational"].includes(
    String(rawStatus).toLowerCase()
  );
  // If we got chain data successfully, service is at minimum operational
  const effectivelyHealthy = isHealthy || (chain !== null);
  const statusColor = effectivelyHealthy ? C.ok : C.warn;
  const statusLabel = effectivelyHealthy ? "healthy" : String(rawStatus).toLowerCase();

  // Resolve artifact count
  // chain-state: { artifact_count, latest_hash } OR { total, count }
  // storage-stats: { artifact_count, total_log_size_kb }
  const artifactCount =
    pick(chain,  "artifact_count","total","count","total_artifacts","artifacts_count","num_artifacts") ??
    pick(stats,  "artifact_count","total","count","total_artifacts","num_artifacts") ??
    pick(health, "artifact_count","total_artifacts") ??
    (health?.storage ? pick(health.storage, "artifact_count","total","count") : null) ??
    "-";

  // Resolve storage KB
  const storageKb =
    pick(stats,  "total_log_size_kb","size_kb","log_size_kb","storage_kb","total_size_kb","size") ??
    pick(health, "total_log_size_kb","log_size_kb") ??
    (health?.storage ? pick(health.storage, "total_log_size_kb","size_kb","log_size_kb","size") : null) ??
    "-";

  // Resolve latest hash
  const latestHash =
    pick(chain,  "latest_hash","last_hash","head_hash","current_hash","tip_hash") ??
    pick(stats,  "latest_hash","last_hash") ??
    pick(health, "latest_hash") ??
    null;

  // Resolve service name
  const serviceName = pick(health, "service","name","service_name") ?? "bucket";

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: statusColor,
          boxShadow: isHealthy ? `0 0 6px ${statusColor}` : "none" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Bucket Service</span>
        <Badge label={statusLabel} color={statusColor} />
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.textMuted, fontFamily: MONO }}>
          {BASE_URL}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <MetricBox label="Total Artifacts" value={String(artifactCount)} color={C.accent} />
        <MetricBox label="Storage (KB)"    value={String(storageKb)}    color={C.info} />
        <MetricBox
          label="Latest Hash"
          value={latestHash ? latestHash.slice(0, 12) + "..." : "-"}
          color={C.ok}
        />
        <MetricBox label="Service"   value={serviceName} color={C.textSub} />
      </div>

      {latestHash && (
        <div style={{
          marginTop: 10, display: "flex", alignItems: "center", gap: 8,
          background: C.elevated, padding: "8px 10px", borderRadius: 7,
          border: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 10, color: C.textMuted, flexShrink: 0 }}>Chain head:</span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.ok, flex: 1, wordBreak: "break-all" }}>
            {latestHash}
          </span>
          <CopyBtn text={latestHash} />
        </div>
      )}

      {/* Show raw responses for debugging if fields are still showing - */}
      {(artifactCount === "-" || storageKb === "-") && (health || chain || stats) && (
        <div style={{ marginTop: 10 }}>
          <RawJson data={{ health, chain, stats }} />
        </div>
      )}
    </Card>
  );
}

// ── Artifact List ─────────────────────────────────────────────────────────────
function ArtifactList({ onSelect, selectedId }) {
  const [artifacts, setArtifacts] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("all");

  const handleRefresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const raw = await apiFetch("/bucket/artifacts?limit=100");
      let list = [];
      if (Array.isArray(raw))               list = raw;
      else if (Array.isArray(raw.artifacts))list = raw.artifacts;
      else if (Array.isArray(raw.items))    list = raw.items;
      else if (Array.isArray(raw.data))     list = raw.data;
      else if (Array.isArray(raw.results))  list = raw.results;
      else {
        const firstArrayKey = Object.keys(raw).find(k => Array.isArray(raw[k]));
        if (firstArrayKey) list = raw[firstArrayKey];
      }
      setArtifacts(list);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch("/bucket/artifacts?limit=100").then(raw => {
      if (!active) return;
      let list = [];
      if (Array.isArray(raw))               list = raw;
      else if (Array.isArray(raw.artifacts))list = raw.artifacts;
      else if (Array.isArray(raw.items))    list = raw.items;
      else if (Array.isArray(raw.data))     list = raw.data;
      else if (Array.isArray(raw.results))  list = raw.results;
      else {
        const firstArrayKey = Object.keys(raw).find(k => Array.isArray(raw[k]));
        if (firstArrayKey) list = raw[firstArrayKey];
      }
      setArtifacts(list);
      setLoading(false);
    }).catch(e => {
      if (!active) return;
      setError(e.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // Get unique types for filter tabs
  const types = ["all", ...new Set(
    artifacts.map(a => String(pick(a, "artifact_type","type","kind","category") || "unknown"))
  )];

  const filtered = artifacts.filter(a => {
    const inner = a.artifact || a;
    const id   = String(pick(inner, "artifact_id","id","_id","uid") || "").toLowerCase();
    const type = String(pick(inner, "artifact_type","type","kind","category") || "unknown").toLowerCase();
    const q    = search.toLowerCase();
    const matchSearch = !q || id.includes(q) || type.includes(q);
    const matchFilter = filter === "all" || type === filter.toLowerCase();
    return matchSearch && matchFilter;
  });


  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>
          Artifacts
          <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 400, marginLeft: 8 }}>
            {loading ? "loading..." : `${filtered.length} / ${artifacts.length}`}
          </span>
        </span>
        <button onClick={handleRefresh} style={{
          fontSize: 11, padding: "3px 10px", borderRadius: 6,
          border: `1px solid ${C.border}`, background: "transparent",
          color: C.textMuted, cursor: "pointer",
        }}>↻ Refresh</button>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by ID or type..."
        style={{
          background: C.elevated, border: `1px solid ${C.border}`,
          borderRadius: 7, padding: "7px 10px", color: C.text,
          fontSize: 12, fontFamily: BODY, outline: "none", width: "100%",
        }}
      />

      {/* Type filter tabs */}
      {types.length > 2 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {types.slice(0, 6).map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              fontSize: 10, padding: "3px 9px", borderRadius: 99, cursor: "pointer",
              border: `1px solid ${filter === t ? C.accent : C.border}`,
              background: filter === t ? C.accent + "1A" : "transparent",
              color: filter === t ? C.accent : C.textMuted,
              fontFamily: MONO, textTransform: "capitalize",
            }}>{t}</button>
          ))}
        </div>
      )}

      {/* States */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textMuted, fontSize: 12, padding: "12px 0" }}>
          <Spinner /> Fetching artifacts from Bucket...
        </div>
      )}
      {error && <ErrBox msg={error} onRetry={handleRefresh} />}

      {/* List */}
      {!loading && !error && (
        <div style={{ overflowY: "auto", maxHeight: 440, display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.length === 0 && (
            <div style={{ color: C.textMuted, fontSize: 12, padding: "20px 0", textAlign: "center" }}>
              No artifacts found
            </div>
          )}
          {filtered.map((a, i) => {
            // Each list item may be { artifact: {...}, storage_type, chain_verified }
            // OR directly { artifact_id, artifact_type, ... }
            const inner = a.artifact || a;
            const id   = String(pick(inner, "artifact_id","id","_id","uid") || i);
            const type = String(pick(inner, "artifact_type","type","kind","category") || "unknown");
            const ts   = pick(inner, "timestamp_utc","timestamp","created_at","stored_at","created","date","time");
            const isSelected = id === selectedId;

            // Color code by type
            const typeColor = {
              task_submit:   C.accent,
              event_records: C.info,
              test:          C.warn,
            }[type] || C.textMuted;

            return (
              <div key={id} onClick={() => onSelect(id)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 11px", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${isSelected ? C.accent : C.border}`,
                background: isSelected ? C.accent + "12" : C.elevated,
                transition: "border-color 0.1s, background 0.1s",
              }}
              onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = "#141A24"; e.currentTarget.style.borderColor = C.borderHi; } }}
              onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = C.elevated; e.currentTarget.style.borderColor = C.border; } }}
              >
                {/* Index number */}
                <div style={{
                  width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                  background: isSelected ? C.accent + "30" : C.accent + "14",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9.5, fontWeight: 700, color: C.accent, fontFamily: MONO,
                }}>
                  {String(i + 1).padStart(2, "0")}
                </div>

                {/* ID + type */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: MONO, fontSize: 10.5, color: C.text,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {id}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span style={{
                      fontSize: 9.5, color: typeColor, fontFamily: MONO,
                      background: typeColor + "14", padding: "0px 5px", borderRadius: 4,
                    }}>
                      {type}
                    </span>
                    {ts && (
                      <span style={{ fontSize: 9, color: C.textMuted }}>
                        {formatTs(ts)}
                      </span>
                    )}
                  </div>
                </div>

                <CopyBtn text={id} />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Artifact Detail ───────────────────────────────────────────────────────────
function ArtifactDetail({ artifactId, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleRefresh = useCallback(async () => {
    if (!artifactId) return;
    setLoading(true); setError(null); setData(null);
    try {
      const res = await apiFetch(`/bucket/artifact/${encodeURIComponent(artifactId)}`);
      setData(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [artifactId]);

  useEffect(() => {
    if (!artifactId) return;
    let active = true;
    apiFetch(`/bucket/artifact/${encodeURIComponent(artifactId)}`).then(res => {
      if (!active) return;
      setData(res);
      setLoading(false);
    }).catch(e => {
      if (!active) return;
      setError(e.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, [artifactId]);

  if (!artifactId) return (
    <Card style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: 240, gap: 8,
    }}>
      <div style={{ fontSize: 28 }}>🪣</div>
      <div style={{ color: C.textMuted, fontSize: 12 }}>Select an artifact from the list</div>
      <div style={{ color: C.textMuted, fontSize: 11 }}>to view its full details and hash</div>
    </Card>
  );

  // API returns: { artifact: { artifact_id, artifact_type, timestamp_utc, payload, parent_hash, ... }, storage_type, chain_verified }
  // We unwrap the nested "artifact" object first, then fall back to the top level
  const inner = data ? (data.artifact || data) : null;

  const type      = inner ? pick(inner, "artifact_type","type","kind","category") : null;
  const status    = data  ? (pick(data,  "storage_type","status","state") || "stored") : null;
  const storedAt  = inner ? pick(inner, "timestamp_utc","timestamp","stored_at","created_at","created","date","time") : null;
  const hash      = inner ? pick(inner, "hash","artifact_hash","sha256","checksum","content_hash","current_hash") : null;
  const payload   = inner ? pick(inner, "payload","content","data","body","artifact_data","record") : null;
  const owner     = inner ? pick(inner, "owner","author","created_by","submitted_by","actor","source_module_id") : null;
  const prevHash  = inner ? pick(inner, "parent_hash","previous_hash","prev_hash") : null;
  const traceId   = inner ? pick(inner, "trace_id","trace","correlation_id") : null;
  const chainVerified = data ? data.chain_verified : null;
  const schemaVer = inner ? pick(inner, "schema_version","version","schema") : null;

  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>
          Artifact Detail
        </span>
        <button onClick={handleRefresh} style={{
          fontSize: 10.5, padding: "3px 9px", borderRadius: 6,
          border: `1px solid ${C.border}`, background: "transparent",
          color: C.textMuted, cursor: "pointer",
        }}>↻</button>
        {onClose && (
          <button onClick={onClose} style={{
            fontSize: 10.5, padding: "3px 9px", borderRadius: 6,
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.textMuted, cursor: "pointer",
          }}>Clear</button>
        )}
      </div>

      {/* ID row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: C.elevated, padding: "8px 10px", borderRadius: 7,
        border: `1px solid ${C.border}`,
      }}>
        <span style={{ fontSize: 10, color: C.textMuted, flexShrink: 0 }}>Artifact ID</span>
        <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.accent, flex: 1, wordBreak: "break-all" }}>
          {artifactId}
        </span>
        <CopyBtn text={artifactId} />
      </div>

      {/* Loading / error */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textMuted, fontSize: 12, padding: "16px 0" }}>
          <Spinner /> Loading artifact data...
        </div>
      )}
      {error && <ErrBox msg={error} onRetry={handleRefresh} />}

      {/* Data */}
      {data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Chain verified banner */}
          {chainVerified !== null && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 10px", borderRadius: 7,
              border: `1px solid ${chainVerified ? C.ok + "55" : C.warn + "55"}`,
              background: chainVerified ? C.ok + "0A" : C.warn + "0A",
            }}>
              <span style={{ fontSize: 13 }}>{chainVerified ? "✓" : "⚠"}</span>
              <span style={{ fontSize: 11, color: chainVerified ? C.ok : C.warn, fontWeight: 600 }}>
                {chainVerified ? "Chain verified — this artifact is authentic and untampered" : "Chain verification failed"}
              </span>
            </div>
          )}

          {/* Metadata grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: C.elevated, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, marginBottom: 3 }}>Artifact Type</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: type ? C.info : C.textMuted }}>
                {type || "not specified"}
              </div>
            </div>
            <div style={{ background: C.elevated, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, marginBottom: 3 }}>Storage Type</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.ok }}>
                {status || "append_only"}
              </div>
            </div>
            <div style={{ background: C.elevated, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, marginBottom: 3 }}>Timestamp (UTC)</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: storedAt ? C.text : C.textMuted }}>
                {storedAt ? formatTs(storedAt) : "not specified"}
              </div>
            </div>
            <div style={{ background: C.elevated, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, marginBottom: 3 }}>Schema Version</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.text }}>
                {schemaVer || "-"}
              </div>
            </div>
            {owner && (
              <div style={{ background: C.elevated, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9.5, color: C.textMuted, marginBottom: 3 }}>Source Module</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.text }}>{owner}</div>
              </div>
            )}
            {traceId && (
              <div style={{ background: C.elevated, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  <span style={{ fontSize: 9.5, color: C.textMuted }}>Trace ID</span>
                  <CopyBtn text={traceId} />
                </div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.textSub, wordBreak: "break-all" }}>{traceId}</div>
              </div>
            )}
          </div>

          {/* Hash */}
          {hash ? (
            <div style={{ background: C.elevated, borderRadius: 7, padding: "9px 10px", border: `1px solid ${C.ok}33` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 9.5, color: C.textMuted }}>Cryptographic Hash</span>
                <span style={{ fontSize: 9, color: C.ok, fontFamily: MONO, background: C.ok + "14", padding: "1px 6px", borderRadius: 4 }}>
                  tamper-proof
                </span>
                <CopyBtn text={hash} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.ok, wordBreak: "break-all", lineHeight: 1.5 }}>
                {hash}
              </div>
            </div>
          ) : (
            <div style={{ background: C.elevated, borderRadius: 7, padding: "9px 10px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9.5, color: C.textMuted }}>Hash — not available for this artifact</div>
            </div>
          )}

          {/* Previous hash (chain link) */}
          {prevHash && (
            <div style={{ background: C.elevated, borderRadius: 7, padding: "8px 10px", border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 9.5, color: C.textMuted }}>Previous Hash (chain link)</span>
                <CopyBtn text={prevHash} />
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.textSub, wordBreak: "break-all" }}>
                {prevHash}
              </div>
            </div>
          )}

          {/* Payload */}
          {payload && (
            <div style={{ background: C.elevated, borderRadius: 7, padding: "9px 10px", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 9.5, color: C.textMuted, marginBottom: 6 }}>Payload / Content</div>
              <pre style={{
                fontFamily: MONO, fontSize: 9, color: C.textSub,
                whiteSpace: "pre-wrap", wordBreak: "break-all",
                maxHeight: 180, overflowY: "auto", margin: 0,
              }}>
                {typeof payload === "object"
                  ? JSON.stringify(payload, null, 2)
                  : String(payload)}
              </pre>
            </div>
          )}

          {/* Raw JSON */}
          <RawJson data={data} />
        </div>
      )}
    </Card>
  );
}

// ── Root Widget ───────────────────────────────────────────────────────────────
export default function BucketWidget() {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div style={{ fontFamily: BODY, color: C.text, padding: "18px 20px 32px" }}>
      <style>{`
        @keyframes bucket-spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input::placeholder { color: #546070; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: #263040; border-radius: 99px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: "linear-gradient(135deg,#22C55E,#06B8D0)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>
          🪣
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>BHIV Bucket</div>
          <div style={{ fontSize: 10.5, color: C.textMuted }}>
            Provenance and evidence store — Siddhesh Narkar
          </div>
        </div>
        <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: C.textMuted }}>
          {BASE_URL}
        </div>
      </div>

      {/* Health */}
      <div style={{ marginBottom: 14 }}>
        <HealthPanel />
      </div>

      {/* Main 2-col layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ArtifactList onSelect={setSelectedId} selectedId={selectedId} />
        <ArtifactDetail artifactId={selectedId} onClose={() => setSelectedId(null)} />
      </div>

      {/* Help strip */}
      <div style={{
        marginTop: 14, padding: "10px 14px", borderRadius: 8,
        border: `1px solid ${C.border}`, background: C.elevated,
        fontSize: 11, color: C.textMuted, lineHeight: 1.6,
      }}>
        <span style={{ color: C.accent, fontWeight: 600 }}>How to use: </span>
        Click any artifact in the list to view its full details and hash on the right.
        Use the search box to filter by ID or type.
        The filter tabs let you view only one type at a time.
        The copy button copies IDs or hashes to your clipboard.
      </div>
    </div>
  );
}
