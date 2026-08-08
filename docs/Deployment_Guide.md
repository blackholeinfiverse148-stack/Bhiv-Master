# BHIV Dashboard Kit Deployment & Execution Guide

This document provides guidelines for setting up, running, building, and deploying the BHIV Dashboard Kit.

## 1. Prerequisites

Ensure you have the following installed on your target system:
*   **Node.js** (v18.0.0 or higher recommended)
*   **npm** (v9.0.0 or higher)
*   **Python** (v3.10.0+ - optional, for running custom utilities or mock service tests)

## 2. Local Setup and Installation

1.  Clone the repository and enter the directory:
    ```bash
    cd bhiv-master
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the local development server:
    ```bash
    npm run dev
    ```
    *Note: The server will run on `http://localhost:5173/` or `http://localhost:5174/` depending on port availability.*

## 3. Configuration & Environment Variables

The application queries various Render-hosted microservices. These base URLs can be updated directly in the configurations:
*   **Bucket Base URL:** Set `BASE_URL` in `src/bucket-integration.jsx` (`https://bhiv-bucket-i1l6.onrender.com`).
*   **Harsha Pawar's Base URL:** Update `URL_HARSHA` at the top of `src/runtime-services-widget.jsx` (currently set to `null` awaiting registration).

## 4. Production Build & Deployment

To generate the optimized static production build bundle:
```bash
npm run build
```
This generates static files inside the `dist/` directory, which can be deployed to static hosting solutions (e.g., Netlify, Vercel, AWS S3, Render Static Sites).

## 5. Troubleshooting & FAQ

*   **Failed to Fetch Errors:** If dashboard panels display "Failed to Fetch", verify that the target service runtime URL is accessible and CORS policies allow connections from your dashboard host.
*   **Chain Validation Fails:** If an artifact shows "Chain Validation Failed", verify that the payload content matches the signature stored in the BUCKET chain state.
