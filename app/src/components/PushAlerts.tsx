import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listenForAlertTaps, pushState, resyncPush, sendTestPush, turnOffPush, turnOnPush, type PushState } from '../lib/push'
import { startInstall } from './InstallApp'
import '../styles/install.css'

// Push alerts: the Settings card (PushSettingsCard), a one-line offer on the
// Notifications page (PushOffer) and the app-wide part (PushHost). See lib/push.ts.

export function usePushState() {
  const [state, setState] = useState<PushState | null>(null)
  useEffect(() => { let alive = true; pushState().then((s) => { if (alive) setState(s) }); return () => { alive = false } }, [])
  return [state, setState] as const
}

const WHAT = 'Payments, messages, job updates and community invites, as they happen.'

export function PushSettingsCard({ toast }: { toast: (m: string, t?: 'success' | 'error') => void }) {
  const [state, setState] = usePushState()
  const [busy, setBusy] = useState(false)
  if (!state || state === 'unavailable') return null

  const toggle = async (on: boolean) => {
    setBusy(true)
    try {
      const s = on ? await turnOnPush() : await turnOffPush()
      setState(s)
      if (on && s === 'on') toast('Alerts are on for this device', 'success')
      if (on && s === 'blocked') toast('Notifications are blocked for ogapay.app in this browser', 'error')
    } catch (e: any) {
      toast(e?.message || "Couldn't change alerts on this device", 'error')
      setState(await pushState())
    } finally { setBusy(false) }
  }
  const test = async () => {
    setBusy(true)
    try { await sendTestPush(); toast('Test sent. It should arrive in a few seconds.', 'success') }
    catch (e: any) { toast(e?.message || "Couldn't send a test", 'error') }
    finally { setBusy(false) }
  }

  return (
    <section className="up-card st2-card">
      <h2>Push alerts</h2>
      {state === 'install-first' && (
        <>
          <p className="st2-card-sub">On iPhone and iPad, alerts work once OgaPay is on your home screen. Add it, open it from there, then turn alerts on here.</p>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => startInstall()}><i className="ti ti-square-plus" aria-hidden="true" /> Show me how</button>
        </>
      )}
      {state === 'unsupported' && (
        <p className="st2-card-sub">This browser can't show OgaPay alerts. Chrome, Edge, Firefox and Samsung Internet can, and so can the app on your home screen.</p>
      )}
      {state === 'blocked' && (
        <p className="st2-card-sub">Notifications are blocked for ogapay.app in this browser. Allow them in the site settings (the icon beside the address), then come back here.</p>
      )}
      {(state === 'on' || state === 'off') && (
        <>
          <p className="st2-card-sub">{WHAT} Switch them on for every phone or computer you use.</p>
          <div className="st2-row">
            <div className="st2-row-t">
              <div className="st2-row-title" id="push-device">Alerts on this device</div>
              <div className="st2-row-sub">{state === 'on' ? 'On. Your browser shows them even when OgaPay is closed.' : 'Off'}</div>
            </div>
            <div className="st2-row-c">
              <button type="button" role="switch" aria-checked={state === 'on'} aria-labelledby="push-device" disabled={busy}
                className={`st2-toggle${state === 'on' ? ' on' : ''}`} onClick={() => toggle(state !== 'on')}><span /></button>
            </div>
          </div>
          {state === 'on' && (
            <button type="button" className="ui-btn ui-btn-ghost" disabled={busy} onClick={test} style={{ marginTop: 12 }}>
              <i className="ti ti-bell-ringing" aria-hidden="true" /> Send a test
            </button>
          )}
        </>
      )}
    </section>
  )
}

// On the Notifications page: one line offering alerts on this device
export function PushOffer() {
  const [state, setState] = usePushState()
  const [busy, setBusy] = useState(false)
  if (state !== 'off') return null
  return (
    <div className="push-offer" role="note">
      <i className="ti ti-bell-ringing" aria-hidden="true" />
      <span>Get these on this device as they happen, even with OgaPay closed.</span>
      <button type="button" disabled={busy} onClick={async () => {
        setBusy(true)
        try { setState(await turnOnPush()) } catch { setState(await pushState()) } finally { setBusy(false) }
      }}>Turn on</button>
    </div>
  )
}

// App-wide: a tapped alert opens its page in the window that's already open,
// and a device that's on stays linked to whoever is signed in
export function PushHost() {
  const navigate = useNavigate()
  const { user } = useAuth()
  useEffect(() => listenForAlertTaps((url) => navigate(url)), [navigate])
  useEffect(() => { if (user?.id) resyncPush() }, [user?.id])
  return null
}
