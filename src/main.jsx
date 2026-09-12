import React from 'react'
import ReactDOM from 'react-dom/client'
import BHIVDashboardKit from './bhiv-dashboard-kit'
import ErrorBoundary from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary name="Application Root">
      <BHIVDashboardKit />
    </ErrorBoundary>
  </React.StrictMode>,
)