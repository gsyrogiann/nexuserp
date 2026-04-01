import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initializeObservability } from '@/lib/observability'

initializeObservability()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
