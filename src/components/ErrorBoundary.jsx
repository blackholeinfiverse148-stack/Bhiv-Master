import React from "react";
import { recordTelemetryEvent, sanitizeDiagnostic } from "../services/telemetry";

/**
 * Production-ready React Error Boundary for BHIV Master Dashboard
 * - Application-level and section-level fault containment
 * - Redacts secrets and sensitive diagnostic data
 * - Integrates with the central telemetry/audit stream
 * - Provides safe retry/recovery behavior
 * - Preserves existing visual design and styling
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    const zoneName = this.props.name || "Dashboard Module";
    const sanitizedMsg = sanitizeDiagnostic(error?.message || error?.toString());

    // 1. Central telemetry stream integration
    try {
      recordTelemetryEvent({
        service: zoneName,
        action: "COMPONENT_RENDER_ERROR",
        status: "error",
        metadata: {
          error: sanitizedMsg,
          componentStack: sanitizeDiagnostic(errorInfo?.componentStack || ""),
        },
      });
    } catch {
      // Telemetry should never throw or disrupt error handling
    }

    // 2. Existing notification / audit callback hooks
    if (typeof this.props.onAudit === "function") {
      try {
        this.props.onAudit({
          label: `Module Failure: ${zoneName}`,
          target: zoneName,
          status: "failure",
        });
      } catch {
        // Safe execution
      }
    }

    if (typeof this.props.onNotif === "function") {
      try {
        this.props.onNotif({
          text: `Module error in ${zoneName}: ${sanitizedMsg}`,
          severity: "critical",
        });
      } catch {
        // Safe execution
      }
    }

    if (typeof this.props.onError === "function") {
      this.props.onError(error, errorInfo);
    }

    console.error(`[BHIV ErrorBoundary] Subtree failure in <${zoneName}>:`, sanitizedMsg);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === "function"
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback;
      }

      const zoneName = this.props.name || "Dashboard Module";
      const sanitizedError = sanitizeDiagnostic(this.state.error?.message || this.state.error?.toString() || "Unknown error encountered");
      const sanitizedStack = sanitizeDiagnostic(this.state.errorInfo?.componentStack || "");
      const isCompact = this.props.compact || false;

      return (
        <div
          role="alert"
          style={{
            margin: isCompact ? "4px 0" : "16px 20px",
            padding: isCompact ? "12px 14px" : "20px 24px",
            borderRadius: 12,
            border: "1px solid rgba(239, 68, 68, 0.4)",
            background: "#101520",
            color: "#FCA5A5",
            fontFamily: "'Inter', system-ui, sans-serif",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isCompact ? 8 : 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: isCompact ? 16 : 20 }}>🛡️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: isCompact ? 12.5 : 14, color: "#EF4444" }}>
                  Isolated Zone Failure: {zoneName}
                </div>
                <div style={{ fontSize: isCompact ? 10 : 11, color: "#8892A6" }}>
                  Failure safely contained. Surrounding views and controls remain operational.
                </div>
              </div>
            </div>
            <button
              onClick={this.handleReset}
              style={{
                padding: isCompact ? "4px 10px" : "6px 14px",
                borderRadius: 6,
                border: "1px solid #EF4444",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#FECACA",
                fontWeight: 600,
                fontSize: isCompact ? 11 : 12,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              🔄 Retry Module
            </button>
          </div>

          <div
            style={{
              padding: isCompact ? "6px 8px" : "10px 12px",
              borderRadius: 6,
              background: "#090C12",
              border: "1px solid #1C2230",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: isCompact ? 10 : 11,
              color: "#F87171",
              wordBreak: "break-all",
              whiteSpace: "pre-wrap",
            }}
          >
            {sanitizedError}
          </div>

          {sanitizedStack && !isCompact && (
            <details style={{ marginTop: 10, fontSize: 10, color: "#546070", cursor: "pointer" }}>
              <summary style={{ outline: "none", marginBottom: 4 }}>Diagnostic Stack Trace (Sanitized)</summary>
              <pre
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9.5,
                  padding: "8px 10px",
                  borderRadius: 4,
                  background: "#090C12",
                  overflowX: "auto",
                  color: "#8892A6",
                  margin: 0,
                }}
              >
                {sanitizedStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
