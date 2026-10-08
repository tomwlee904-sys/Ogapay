import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { installMode, promptInstall, useInstallMode } from '../lib/install'
import '../styles/install.css'

// "Get the OgaPay app": a small card above the bottom bar on phones, a menu
// item (InstallMenuItem) and, on iPhone/iPad, the steps to add it from the
// Share menu. See lib/install.ts for when installing is possible.

const OPEN_STEPS = 'ogapay:install-steps'
const DISMISSED = 'ogapay_install_card' // when the card was closed (ms)
const QUIET_DAYS = 30
const DELAY_MS = 12000 // let people look around first
// Not while someone is paying, submitting work or filling in a job
const BUSY = /^\/(login|join|pair|ref|admin|deposit|create|orders|store\/pay|tasks\/[^/]+\/submit|verify|auth|reset-password)/

// Install now if the browser can; on iPhone show the steps. Used by the menu item.
export function startInstall() {
  if (installMode() === 'prompt') promptInstall()
  else window.dispatchEvent(new Event(OPEN_STEPS))
}

const closedRecently = () => {
  try { return Date.now() - Number(localStorage.getItem(DISMISSED) || 0) < QUIET_DAYS * 864e5 } catch { return false }
}

export function InstallHost() {
  const mode = useInstallMode()
  const { pathname } = useLocation()
  const [ready, setReady] = useState(false)
  const [closed, setClosed] = useState(closedRecently)
  const [steps, setSteps] = useState(false)

  useEffect(() => { const t = window.setTimeout(() => setReady(true), DELAY_MS); return () => window.clearTimeout(t) }, [])
  useEffect(() => {
    const open = () => setSteps(true)
    window.addEventListener(OPEN_STEPS, open)
    return () => window.removeEventListener(OPEN_STEPS, open)
  }, [])

  const close = useCallback(() => {
    setClosed(true)
    try { localStorage.setItem(DISMISSED, String(Date.now())) } catch { /* private mode: closes for this visit */ }
  }, [])
  const closeSteps = useCallback(() => { setSteps(false); close() }, [close])
  const install = async () => {
    if (mode === 'ios') { setSteps(true); return }
    if (await promptInstall()) setClosed(true)
  }

  const showCard = !!mode && ready && !closed && !steps && !BUSY.test(pathname)
  return (
    <>
      {showCard && (
        <aside className="ia-card" aria-label="Get the OgaPay app">
          <img className="ia-icon" src="/favicon-192.png" alt="" width={44} height={44} />
          <div className="ia-copy">
            <strong>Get the OgaPay app</strong>
            <span>Opens from your home screen. No app store.</span>
          </div>
          <button type="button" className="ia-install" onClick={install}>Install</button>
          <button type="button" className="ia-close" onClick={close} aria-label="Not now"><i className="ti ti-x" aria-hidden="true" /></button>
        </aside>
      )}
      {steps && <IosSteps onClose={closeSteps} />}
    </>
  )
}

function IosSteps({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="ia-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ia-sheet" role="dialog" aria-modal="true" aria-labelledby="ia-title">
        <div className="ia-sheet-head">
          <h2 id="ia-title">Add OgaPay to your home screen</h2>
          <button ref={closeRef} type="button" className="ia-close" onClick={onClose} aria-label="Close"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
        <ol className="ia-steps">
          <li><span className="ia-n">1</span><span>Tap the <b>Share</b> button <i className="ti ti-share-2" aria-hidden="true" /> in your browser. In Safari it's in the bar at the bottom of the screen.</span></li>
          <li><span className="ia-n">2</span><span>Scroll down and tap <b>Add to Home Screen</b> <i className="ti ti-square-plus" aria-hidden="true" /></span></li>
          <li><span className="ia-n">3</span><span>Tap <b>Add</b>. OgaPay appears on your home screen and opens like any app.</span></li>
        </ol>
        <button type="button" className="ia-done" onClick={onClose}>Got it</button>
      </div>
    </div>
  )
}

// For the menu: only shows when installing is possible
export function InstallMenuItem({ onDone }: { onDone: () => void }) {
  const mode = useInstallMode()
  if (!mode) return null
  return (
    <button type="button" className="oga-drawer-item" onClick={() => { onDone(); startInstall() }}>
      <span className="oga-drawer-icon"><i className="ti ti-device-mobile-down" /></span>
      <span><strong>Install the app</strong><small>Open OgaPay from your home screen</small></span>
    </button>
  )
}
