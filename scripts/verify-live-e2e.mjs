#!/usr/bin/env node
/**
 * Live E2E Backend Reachability & Integration Verification Runner for BHIV Master
 * Executes live probes against actual microservice endpoints.
 * Distinguishes reachable services from unavailable services honestly.
 */

const REACHABLE_TIMEOUT_MS = 6000;

const SERVICE_TARGETS = [
  {
    service: "PRANA",
    endpoint: "http://163.128.209.18:8103/health",
    testType: "Live Health Probe (GET)",
    expectedRole: "Event Propagation & Replay",
  },
  {
    service: "PRANA",
    endpoint: "http://163.128.209.18:8103/prana/propagation-log",
    testType: "Live Propagation Log (GET)",
    expectedRole: "Event Propagation Telemetry",
  },
  {
    service: "KARMA",
    endpoint: "http://163.128.209.18:8102/health",
    testType: "Live Health Probe (GET)",
    expectedRole: "Cryptographic Integrity Helper",
  },
  {
    service: "KARMA",
    endpoint: "http://163.128.209.18:8102/karma/latest-hash",
    testType: "Live Cryptographic State (GET)",
    expectedRole: "Root Block Hash Anchor",
  },
  {
    service: "KARMA",
    endpoint: "http://163.128.209.18:8102/karma/verify",
    method: "POST",
    testType: "Live Event Verification (POST)",
    expectedRole: "Proof Verification Engine",
  },
  {
    service: "RAJYA",
    endpoint: "https://text-risk-scoring-service.onrender.com/health",
    testType: "Live Health Probe (GET)",
    expectedRole: "Enforcement Gateway Health",
  },
  {
    service: "RAJYA",
    endpoint: "https://text-risk-scoring-service.onrender.com/api/v1/rajya/validate",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ execution_id: "EXEC-LIVE-E2E-01" }),
    testType: "Live Decision Validation (POST)",
    expectedRole: "Governance Authority Enforcement",
  },
  {
    service: "TANTRA",
    endpoint: "https://tantra-gated-bridge-infrastructure.onrender.com/health",
    testType: "Live Health Probe (GET)",
    expectedRole: "Gated Bridge Health & Algorithms",
  },
  {
    service: "BUCKET",
    endpoint: "https://bhiv-bucket-i1l6.onrender.com/health",
    testType: "Live Health Probe (GET)",
    expectedRole: "Provenance Store Health",
  },
  {
    service: "BUCKET",
    endpoint: "https://bhiv-bucket-i1l6.onrender.com/bucket/chain-state",
    testType: "Contract-Level Probe (GET)",
    expectedRole: "Provenance Chain State",
  },
  {
    service: "SANSKAR",
    endpoint: "https://full-tantra-constitutional-convergence.onrender.com/health",
    testType: "Live Health Probe (GET)",
    expectedRole: "Constitutional Convergence Health",
  },
  {
    service: "HARSHA",
    endpoint: "https://sl-validator-cet.onrender.com/health",
    testType: "Live Health Probe (GET)",
    expectedRole: "Execution / KSML Validator Health",
  },
];

async function runProbes() {
  console.log("==========================================================================================");
  console.log("BHIV MASTER DASHBOARD — LIVE E2E INTEGRATION & REACHABILITY VERIFICATION MATRIX");
  console.log("Timestamp: " + new Date().toISOString());
  console.log("==========================================================================================\n");

  const matrixRows = [];

  for (const t of SERVICE_TARGETS) {
    const startTime = Date.now();
    let result = "UNKNOWN";
    let evidence = "";
    let limitation = "None";

    try {
      const opts = {
        signal: AbortSignal.timeout(REACHABLE_TIMEOUT_MS),
      };
      if (t.method === "POST") {
        opts.method = "POST";
        opts.headers = t.headers || {};
        opts.body = t.body || "{}";
      }

      const res = await fetch(t.endpoint, opts);
      const latencyMs = Date.now() - startTime;
      const text = await res.text();

      if (res.ok) {
        result = "PASSED (REACHABLE)";
        evidence = `HTTP ${res.status} OK (${latencyMs}ms): ${text.replace(/\s+/g, " ").slice(0, 75)}...`;
        limitation = "Production live runtime active";
      } else if (res.status === 503) {
        result = "UNAVAILABLE (HTTP 503)";
        evidence = `HTTP 503 Service Unavailable (${latencyMs}ms): Gateway HTML returned`;
        limitation = "Render service suspended / gateway failure";
      } else {
        result = `DEGRADED (HTTP ${res.status})`;
        evidence = `HTTP ${res.status} (${latencyMs}ms): ${text.slice(0, 60)}`;
        limitation = "Unexpected HTTP response code";
      }
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        result = "UNAVAILABLE (TIMEOUT)";
        evidence = `Timeout after ${REACHABLE_TIMEOUT_MS}ms`;
        limitation = "Service cold start or instance suspended";
      } else {
        result = "UNAVAILABLE (OFFLINE)";
        evidence = `${err.message} (${latencyMs}ms)`;
        limitation = "Connection refused or DNS resolution failure";
      }
    }

    matrixRows.push({
      service: t.service,
      endpoint: t.endpoint,
      testType: t.testType,
      result,
      evidence,
      limitation,
    });
  }

  // Format table output
  console.log("| SERVICE | ENDPOINT | TEST TYPE | RESULT | EVIDENCE | LIMITATION |");
  console.log("|---|---|---|---|---|---|");
  for (const r of matrixRows) {
    console.log(`| **${r.service}** | \`${r.endpoint}\` | ${r.testType} | ${r.result} | ${r.evidence} | ${r.limitation} |`);
  }
  const reachable = matrixRows.filter((r) => r.result.includes("PASSED"));
  const unavailable = matrixRows.filter((r) => !r.result.includes("PASSED"));
  console.log("\n==========================================================================================");
  console.log(`Summary: ${reachable.length} live probes PASSED (${[...new Set(reachable.map((r) => r.service))].join(", ")}).`);
  console.log(`${unavailable.length} probes UNAVAILABLE / CONTRACT-ONLY (${[...new Set(unavailable.map((r) => r.service))].join(", ")}).`);
  console.log("==========================================================================================");
}

runProbes().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
