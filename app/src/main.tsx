import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { reloadForUpdate } from './lib/staleBuild'
import { initErrorReporting } from './lib/errorReport'
// Text fonts, served from ogapay.app (they used to block the first paint from Google)
import './styles/fonts.css'
// Icons: the Tabler font cut down to the icons we use (scripts/icons-subset.mjs)
import './styles/icons/tabler-icons.css'
import './styles/tokens.css'
import './styles/system.css'
import './styles/variables.css'
import './styles/global.css'
import './styles/homepage.css'
import './styles/ui.css'
import './styles/home-cards.css'
import './styles/dark.css'
import './styles/nav.css'

// A page's code from an older deploy failed to load: reload once for the new version
window.addEventListener('vite:preloadError', (e) => { if (reloadForUpdate()) e.preventDefault() })

// Error alerts (Sentry), only when VITE_SENTRY_DSN is set; loads after the page
initErrorReporting()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
