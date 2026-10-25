import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import { pushState, turnOnPush, type PushState } from '../lib/push'
import { useToast } from './Toast'

// Phone alerts on the Job monitor, like wurk's: turn push on here, and pick the
// smallest reward that may buzz the phone. Same account settings as Settings >
// Notifications > Push alerts (preferences jobPush / jobPushMinReward, used by
// the backend jobAlerts.service); smaller jobs still show in the list and bell.

const AMOUNTS = [0, 100, 200, 500, 1000]
const amountLabel = (n: number) => (n ? `₦${n.toLocaleString('en-US')}+` : 'Any')

const STATE_TEXT: Partial<Record<PushState, string>> = {
  'install-first': 'On iPhone, add OgaPay to your Home Screen first (Share, then Add to Home Screen), then open it from there.',
  blocked: 'Notifications are blocked for ogapay.app. Allow them in your browser or phone settings, then come back.',
  unsupported: "This browser can't show phone alerts. Try Chrome, or the OgaPay app from your Home Screen.",
  unavailable: "Phone alerts aren't available right now.",
}

export default function PhoneJobAlerts() {
  const { toast } = useToast()
  const [state, setState] = useState<PushState | null>(null)
  const [mode, setMode] = useState<string | null>(null)
  const [min, setMin] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    pushState().then((s) => { if (alive) setState(s) }).catch(() => { if (alive) setState('unsupported') })
    apiRequest<any>('/users/me').then((me) => {
      if (!alive) return
      setMode(me?.preferences?.jobPush ?? 'CATEGORIES')
      setMin(Number(me?.preferences?.jobPushMinReward) || 0)
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const turnOn = async () => {
    setBusy(true)
    try {
      const s = await turnOnPush()
      setState(s)
      if (s === 'on') toast('Phone alerts are on', 'success')
    } catch {
      toast("Couldn't turn on phone alerts", 'error')
    } finally { setBusy(false) }
  }

  const pick = async (n: number) => {
    if (n === min || busy) return
    const before = min
    setMin(n)
    setBusy(true)
    try {
      await apiRequest('/users/me/preferences', { method: 'PATCH', body: JSON.stringify({ preferences: { jobPushMinReward: n } }) })
      toast(n ? `Only jobs paying ₦${n.toLocaleString('en-US')} or more will buzz your phone` : 'Jobs of any reward will buzz your phone', 'success')
    } catch (e: any) {
      setMin(before)
      toast(e?.message || "Couldn't save that", 'error')
    } finally { setBusy(false) }
  }

  if (state === null) return null
  return (
    <div className="jm2-phone" aria-labelledby="jm2-phone-h">
      <div className="jm2-phone-head">
        <i className="ti ti-device-mobile" aria-hidden="true" />
        <b id="jm2-phone-h">Phone alerts</b>
        {state === 'on' && <span className="jm2-phone-on">{mode === 'OFF' ? 'Off for new jobs' : 'On'}</span>}
      </div>
      {state === 'off' && (
        <>
          <p>Get a buzz on your phone when a new job you can take is posted, even with OgaPay closed.</p>
          <button type="button" className="ui-btn ui-btn-dark" disabled={busy} onClick={turnOn}>{busy ? 'Turning on…' : 'Turn on phone alerts'}</button>
        </>
      )}
      {state !== 'on' && state !== 'off' && <p>{STATE_TEXT[state]}</p>}
      {state === 'on' && mode === 'OFF' && (
        <p>New jobs don't go to your phone. Change it in <Link to="/settings/notifications">Settings</Link>.</p>
      )}
      {state === 'on' && mode !== 'OFF' && min !== null && (
        <>
          <p id="jm2-phone-min">Only buzz my phone for jobs paying at least:</p>
          <div className="jm2-phone-amts" role="radiogroup" aria-labelledby="jm2-phone-min">
            {AMOUNTS.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={min === n} className={`ui-chip${min === n ? ' on' : ''}`} disabled={busy} onClick={() => pick(n)}>{amountLabel(n)}</button>
            ))}
            {!AMOUNTS.includes(min) && <span className="ui-chip on" aria-current="true">₦{min.toLocaleString('en-US')}+</span>}
          </div>
          <p className="jm2-phone-note">Smaller jobs still show here and in your notifications. More options in <Link to="/settings/notifications">Settings</Link>.</p>
        </>
      )}
    </div>
  )
}
