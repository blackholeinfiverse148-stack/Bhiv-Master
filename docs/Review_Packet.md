# Integration Review Packet

This document guides reviewers through the code changes and validation evidence.

## 1. Scope of Code Edits

The integration changes are localized to:
1.  `src/bhiv-dashboard-kit.jsx`:
    *   Added the `SHAKTI Master` registry mapping.
    *   Created and integrated the `<ShaktiMasterDashboard />` component.
    *   Configured the default load view to `shakti`.
    *   Implemented interactive cross-dashboard federation: clicking any node row in the SHAKTI registry table dynamically redirects to that node's sub-dashboard.
    *   Implemented a Topbar breadcrumb trail (`SHAKTI Master > Active Dashboard`) allowing immediate back-to-master navigation.
2.  `src/bucket-integration.jsx`:
    *   Wired dynamic REST fetch functions against `https://bhiv-bucket-i1l6.onrender.com`.
3.  `src/runtime-services-widget.jsx`:
    *   Connected status endpoints for PRANA, KARMA, RAJYA, TANTRA, BUCKET, and SANSKAR.

## 2. Review Checklist

- [x] Verify SHAKTI Master Dashboard is loaded by default.
- [x] Verify registry table rows click-to-navigate to corresponding sub-dashboards.
- [x] Verify Topbar breadcrumb appears for sub-dashboards and returns the user to SHAKTI Master.
- [x] Click "Synchronize Federation" and verify log update.
- [x] Navigate to "Bucket / Evidence" and check that artifacts are listed and validated.
- [x] Navigate to "Runtime Services" and check live service health checks.
- [x] Confirm that no static mocks remain in the BUCKET or Runtime panels.
