import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initializeObservability, reportOperationalEvent } from '@/lib/observability'

initializeObservability()
reportOperationalEvent('boot_start', {
  path: typeof window !== 'undefined' ? window.location.pathname : '/',
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
