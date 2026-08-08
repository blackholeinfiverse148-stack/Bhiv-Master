# BHIV Dashboard & Widget Layout Mapping

This document details the layout structure, page routing, and dashboard widgets within `bhiv-dashboard-kit.jsx`.

## 1. Sidebar Dashboard Navigation

The main sidebar routes `activeDash` to different layouts:

| Navigation ID | Label | Renders Component | Purpose |
| :--- | :--- | :--- | :--- |
| `shakti` | **SHAKTI Master** | `<ShaktiMasterDashboard />` | Master federation node aggregating state for all dashboards and runtimes. |
| `executive` | **Executive** | `<ExecutiveDashboard />` | Main corporate status metrics, transaction logs, and KPI charts. |
| `operations` | **Operations** | `<OperationsDashboard />` | Infrastructure monitoring, cluster stats, and active incidence log. |
| `engineering` | **Engineering** | `<EngineeringDashboard />` | CPU loads, response time distributions, and mesh settings. |
| `soc` | **SOC Dashboard** | `<SOCDashboard />` | Security metrics, threat level indicators, and firewall events. |
| `finance` | **Finance** | `<FinanceDashboard />` | Revenue metrics, payment status trackers, and balance summaries. |
| `analytics` | **Analytics** | `<AnalyticsDashboard />` | Service traffic trends, user load charts, and performance ratios. |
| `government` | **Gov Command Center** | `<GovernmentDashboard />` | Policy checks, administrative validation logs, and status audits. |
| `bucket` | **Bucket / Evidence** | `<BucketWidget />` | Provenance storage, artifact search, and chain authenticity checks. |
| `runtime` | **Runtime Services** | `<RuntimeServicesWidget />` | Real-time health, details, and controls for the 7 Sovereign runtimes. |

## 2. Layout Components

*   **`<Sidebar />`** (`bhiv-dashboard-kit.jsx:L988`): Renders navigation buttons, logo banner, user account profiles (Raghav Shah), and links to settings/reports.
*   **`<Topbar />`** (`bhiv-dashboard-kit.jsx:L1060`): Displays the current view title dynamically, the system date/time in IST, the `<SystemPulseWidget />` pulse bar, theme toggle controls (dark/light), and notification center dropdown.
*   **`<CommandPanel />`** (`bhiv-dashboard-kit.jsx:L1155`): Slides out from the right to display terminal outputs, log archives, and let users execute system-wide control scripts.
