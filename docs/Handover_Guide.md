# BHIV Dashboard Handover Guide

Welcome to the BHIV-ECC Dashboard Kit development team. This document enables zero-context onboarding for engineers taking over the dashboard federation.

## 1. Directory Structure

*   `src/bhiv-dashboard-kit.jsx`: The central orchestrator container. Handles sidebar navigation, theme providers, command logging, and the SHAKTI Master federation.
*   `src/bucket-integration.jsx`: Renders the `<BucketWidget />` page. Fetches and validates cryptographic evidence.
*   `src/runtime-services-widget.jsx`: Renders the `<RuntimeServicesWidget />` page. Health checks and controls for the 7 underlying runtimes.
*   `docs/`: Full architecture and integration manuals.

## 2. Federation Mechanism

The SHAKTI Master Dashboard acts as the gateway registry. All sub-dashboards communicate with the master component via the shared contexts:
*   `ThemeCtx` for design tokens
*   `AuditCtx` for action auditing
*   `NotifCtx` for system-wide warning logs

## 3. Core Contacts

*   **Federation Gate & Widget Integration:** Pratik
*   **PRANA & KARMA Telemetry:** Rukayya Ansari
*   **Bucket Evidence Store:** Siddhesh Narkar
*   **Sovereign Core Runtimes & Rajya Validation:** Rajaryan Verma / Raj Prajapati
*   **Gated Bridge Federation:** Ranjit Patil
*   **CET / KSML / SUM-SCRIPT:** Harsha Pawar
*   **SANSKAR Runtimes:** Sakshi
*   **InsightFlow Observability & Telemetry:** Vijay Dhawan
*   **Integration Sessions Scheduling:** Karan
*   **QA & Deployment Testing:** Vinayak Tiwari
