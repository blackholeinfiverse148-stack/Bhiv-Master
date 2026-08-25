# CHANGELOG — BHIV Master

All notable changes to the `bhiv-master` repository are documented in this file.

---

## [1.0.0-final] - 2026-08-26 (Final Submission Pass)

### Added
- **Root Documentation**:
  - `README.md`: Authoritative root overview, architecture, setup, live vs UI demonstration breakdown, evidence locations, and deployment status.
  - `INTEGRATION.md`: Full integration matrix covering PRANA, KARMA, RAJYA, SANSKAR, TANTRA, BUCKET, HARSHA, SHAKTI, and InsightFlow with endpoint URLs, status classifications, and evidence links.
  - `HANDOVER.md`: Developer handover guide covering repository map, deployment commands, rollback procedures, build history, and known issues.
  - `CHANGELOG.md`: Chronological log of repository modifications.
- **Review Packets**:
  - `review_packets/REVIEW_PACKET.md`: High-level entry points, runtime data flow map, core execution files, failure handling, and proof references.
  - `review_packets/CODE_PACKET.md`: File-by-file code review guide for reviewers.
- **Evidence Packet Artifacts**:
  - `evidence_packet/api_samples/prana_health.json`: Sanitized live HTTP 200 response from PRANA.
  - `evidence_packet/api_samples/karma_health.json`: Sanitized live HTTP 200 response from KARMA.
  - `evidence_packet/api_samples/rajya_health.json`: Sanitized live HTTP 200 response from RAJYA.
  - `evidence_packet/api_samples/sanskar_health.json`: Sanitized live HTTP 200 response from SANSKAR.
  - `evidence_packet/runtime_logs/build.log`: Production build verification log output.
  - `evidence_packet/runtime_logs/lint.log`: ESLint 0-error verification log output.
  - `evidence_packet/deployment_proof/STATUS.md`: Documentation of VM deployment status (`BLOCKED`).
- **UI Demonstration Indicators**:
  - Added `UiOnlyDemoBanner` to `bhiv-dashboard-kit.jsx` rendering clear `UI-ONLY DEMONSTRATION` badges across mock-driven dashboard views (Executive, Operations, Engineering, SOC, Finance, Analytics, Government, Shakti Master).

### Changed
- **Source Code Repair (`src/bhiv-dashboard-kit.jsx`)**:
  - Fixed syntax error in lines 440-475 where `SituationBar` was corrupted by broken `ThreatCard` fragments.
  - Restored intact Section 8 widget components (`KpiCard`, `MetricCard`, `IncidentCard`, `ApprovalCard`, `HealthCard`, `OpCard`, `TimelineCard`, `SystemPulseWidget`).
  - Exported reusable widget components cleanly to satisfy ESLint `no-unused-vars` rules without suppressing global linting.
- **Runtime Health Semantics (`src/runtime-services-widget.jsx`)**:
  - Eliminated hardcoded initial state (`rajya: true`). Services now initialize cleanly in `CHECKING` / `null` state.
  - Implemented deterministic health state classification (`HEALTHY`, `DEGRADED`, `OFFLINE`, `TIMEOUT`, `AUTH_FAILED`, `EMPTY_RESPONSE`, `INVALID_RESPONSE`, `UNKNOWN`) via `checkServiceHealth`.
  - Replaced simplistic `!!response` truthiness checks with status code, JSON validation, and error signal handling.
  - Updated footer text to accurately distinguish live endpoints from UI demonstration areas, removing misleading `"zero mock data"` claim.
- **Dependency Alignments**:
  - Resolved HARSHA documentation contradictions by accurately classifying HARSHA as `CONFIGURED / UNVERIFIED` due to health check timeouts at `https://sl-validator-cet.onrender.com`.
  - Documented SHAKTI Master as a local UI navigation hub (`UI-ONLY DEMONSTRATION`) since no backend federation registry endpoint exists.
  - Documented InsightFlow as `BLOCKED / UNKNOWN` due to absence of canonical endpoint or contract.

### Fixed
- ESLint errors reduced from 83 to **0 errors** (`npm run lint` passes cleanly).
- Vite build failure resolved; production bundle compiles cleanly (`npm run build` succeeds in ~560ms).
