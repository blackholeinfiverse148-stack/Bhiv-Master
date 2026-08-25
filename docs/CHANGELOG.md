# CHANGELOG.md
## BHIV-ECC Dashboard Kit v3 — Change History

All notable changes to this project are documented here.
Format: [Version] — Date — Author — Change description

---

## [3.1.0] — August 2026 — Rahil Mulani
### Live Runtime Federation Sprint

#### Added
- `src/runtime-services-widget.jsx` (1,146 lines) — live integration with 7 runtime services
  - PranaPanel: `/health`, `/prana/system/health`, `/prana/propagation-log`, `/replay/{id}`
  - KarmaPanel: `/health`, `/karma/latest-hash`, `/karma/verify` (on-demand)
  - RajyaPanel: POST `/api/v1/rajya/validate` with ALLOW/DENY/ABSTAIN test buttons
  - TantraPanel: `/health` (raw response — contract pending Ranjit Patil)
  - BucketPanel: `/health`, `/bucket/chain-state`
  - SanskarPanel: `/health` — Sakshi's constitutional convergence service
  - HarshaPanel: 6 POST endpoints wired — awaiting base URL from Harsha Pawar
  - ReplayPanel: PRANA `/replay/{trace_id}` with live trace ID input
  - OverviewStrip: 7-service health dot row on mount
- `src/bucket-integration.jsx` updated — critical fix for nested `artifact.artifact` unwrap
  - Fixed: Type, Stored at, Hash, timestamp_utc, source_module_id, trace_id, parent_hash all now display correctly
  - Added: chain_verified banner (green/red)
  - Added: Type filter tabs (task_submit / event_records / test / unknown)
  - Added: Copy buttons on all hash and ID fields
- `ShaktiMasterDashboard` component in `bhiv-dashboard-kit.jsx`
  - 9-node federation registry table
  - Click-to-navigate to each sub-dashboard
  - Topbar breadcrumb: SHAKTI Master → Active Dashboard
  - Synchronize Federation button with log output
- `GovernmentDashboard` component added (was missing from Test 3 delivery)
  - Active events list with severity-ordered display
  - Resource deployment utilization cards
  - Immutable decision log with actor and timestamp
- `TelemetryCard`, `WorkflowCard`, `ReplayCard`, `ExecutiveMetricCard` components added
  - These were specified in the brief but missing from initial Test 3 delivery
- Full documentation package (12 files in `docs/`)
- `DEP/` folder: Daily Engineering Packet with 7 files
- `evidence_packet/` folder structure with subfolders for all required evidence
- `review_packets/REVIEW_PACKET.md` — reviewer entry point

#### Fixed
- Bucket integration: API returns `{ artifact: { ... }, storage_type, chain_verified }`
  Previously code read top-level fields — all showed "—". Now unwraps correctly.
- KARMA panel: `GET /karma/verify` was incorrectly called — changed to `POST /karma/verify`
- CommandPanel: `setPanelOpen` was assigned as implicit global variable (missing `var`) — fixed
- Unused imports removed from `bhiv-dashboard-kit.jsx` (useRef, useMemo, PieIcon, etc.)
- `useReducer` correctly used for command state machine (was previously using multiple useState)
- Duplicate function declarations from append operations — complete file rewrite resolved all

#### Known issues documented
- PRANA/KARMA on HTTP — mixed content blocks on HTTPS deployments (Rukayya to resolve)
- HARSHA base URL not received — panel shows waiting state (Harsha Pawar to provide)
- TANTRA endpoint contract missing — raw JSON only (Ranjit Patil to provide)
- InsightFlow not integrated — no endpoints from Vijay Dhawan
- SHAKTI API federation pending — UI-level only (Pratik's format not received)
- 7 demo tabs still use MOCK data object from Test 1-3 deliverables

---

## [3.0.0] — August 2026 — Rahil Mulani
### Test 3 — Dashboard Capability Starter Kit

#### Added
- 7 dashboard types (Executive, Operations, Engineering, SOC, Finance, Analytics, Government)
- 19 reusable components across primitives, widgets, charts, commands
- Command engine: `useCommand` hook + `CommandDialog` — 11 command types, full state machine
- Design system: 8 specification files (colors, typography, spacing, layout, components, iconography, motion, charts)
- Research: 9-system analysis (Bloomberg, Grafana, Datadog, Splunk, Azure, AWS, NASA, Airport, Government)
- Cognition study: F-pattern, Z-pattern, zoning model, density, urgency, executives vs operators
- 4 React Contexts: ThemeCtx, AuditCtx, PanelCtx, NotifCtx
- Dark/light theme with complete token-based switching
- System Pulse widget in topbar
- Command Panel drawer with History/Pending/Running tabs

---

## [2.0.0] — August 2026 — Rahil Mulani
### Test 2 — Command Layer

#### Added
- `useCommand` state machine hook (idle → confirm → executing → success/failure → rollback)
- `CommandDialog` reusable wrapper for all command types
- `MockService` layer mapping to future REST endpoints
- `CommandPanel` drawer (history/pending/running tabs)
- Cmd+K global search
- `SituationBar` 6-metric situational awareness strip
- Audit log via AuditCtx
- Notification system

---

## [1.0.0] — August 2026 — Rahil Mulani
### Test 1 — Executive Control Center Foundation

#### Added
- Single-file React dashboard with 9 sections
- Executive Summary (8 KPI cards + sparklines)
- Operational Health (9 services), Business Intelligence (5 charts)
- Engineering Dashboard, Sprint Execution, Critical Alerts
- Team Performance, Activity Timeline, Quick Actions
- Dark/light mode, sidebar navigation
