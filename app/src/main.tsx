import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/variables.css'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// Unregister any old service worker and clear caches
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // Clear all old caches
    const cacheKeys = await caches.keys()
    await Promise.all(cacheKeys.map(key => caches.delete(key)))
    // Unregister all SWs
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map(r => r.unregister()))
  })
}
