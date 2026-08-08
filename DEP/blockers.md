# Active Blockers Log

This log lists all open blockers impeding final staging/production delivery.

## 1. Open Blockers

*   **Blocker ID:** BLK-01
*   **Description:** Missing base URL configuration for HARSHA (`URL_HARSHA` in `runtime-services-widget.jsx`).
*   **Owner:** Harsha Pawar (CET / KSML / SUM-SCRIPT Owner)
*   **Impact:** CET/KSML compiler interfaces in the Runtime Services panel remain inactive.
*   **Mitigation:** An integration placeholder has been coded; once the URL is received, we can immediately swap it.
