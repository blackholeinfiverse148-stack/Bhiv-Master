# Module Deployment Unit (MDU) Specification

Details of the application packaging, compilation settings, and runtime environments.

## 1. Build Coordinates
*   **Module Type:** Single Page Application (SPA)
*   **Build Tool:** Vite v8.2.0
*   **Core Languages:** HTML5, React v19.2.8, Vanilla CSS, ESM JavaScript
*   **Output Directory:** `dist/`
*   **Vite Configuration:** `vite.config.js`

## 2. Dependency Registry
*   `lucide-react`: ^1.28.0 (Icons)
*   `react`: ^19.2.8 (UI Framework)
*   `react-dom`: ^19.2.8 (DOM Renderer)
*   `recharts`: ^3.10.1 (Data Visualization)

## 3. Production Compilation Target
Executing `npm run build` transpiles the ES modules, minifies CSS, and yields two main static files:
*   `dist/index.html` (HTML structure)
*   `dist/assets/index-[hash].js` (Compiled ESM JavaScript + styling bundle)
This output is completely self-contained and ready to be served from any static web server (e.g., Nginx, S3, or Render static hosting).
