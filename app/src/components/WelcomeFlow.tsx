import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Sheet from './wallet/Sheet'
import { useToast } from './Toast'
import { apiRequest } from '../lib/api'
import { turnOnPush } from '../lib/push'
import { parseReferralInput, type WelcomeStep } from '../lib/welcome'
import '../styles/wallet.css'
import '../styles/welcome.css'

// The welcome flow's sheet (opened by WelcomeHost; the steps are worked out in
// lib/welcome.ts). Each step can be skipped; closing it counts as finished.

const TITLES: Record<WelcomeStep, string> = {
  invite: 'Who invited you?',
  rules: 'Before you start',
  alerts: 'Get job alerts',
  verify: 'Verify Level 1',
}

interface Props {
  steps: WelcomeStep[]
  myCode?: string | null
  onRulesAccepted: () => void
  onClaimed: () => void
  onFinish: () => void
}

const Err = ({ text }: { text: string }) => text ? <div className="wl-err" role="alert"><i className="ti ti-alert-circle" aria-hidden="true" /><span>{text}</span></div> : null

export default function WelcomeFlow({ steps, myCode, onRulesAccepted, onClaimed, onFinish }: Props) {
  const { toast } = useToast()
  const [at, setAt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // The code from a referral link opened before signing up (LoginPage saves it), unless it's their own
  const [code, setCode] = useState(() => {
    try { const c = localStorage.getItem('ogapay_referral') || ''; return c && c.toUpperCase() !== String(myCode || '').toUpperCase() ? c : '' } catch { return '' }
  })
  const body = useRef<HTMLDivElement>(null)
  const step = steps[at]

  // A new step: keyboard and screen-reader users start at its top
  const first = useRef(true)
  useEffect(() => { if (first.current) { first.current = false; return } body.current?.focus() }, [at])

  const next = () => {
    setError('')
    if (at + 1 < steps.length) setAt(at + 1)
    else onFinish()
  }

  const claim = async (e: FormEvent) => {
    e.preventDefault()
    const c = parseReferralInput(code)
    if (!c) { setError('Paste the code or link you were sent, like ogapay.app/ref/ABCD2345.'); return }
    if (myCode && c.toUpperCase() === myCode.toUpperCase()) { setError("That's your own code. Ask the person who invited you for theirs."); return }
    setBusy(true); setError('')
    try {
      const r = await apiRequest<any>('/users/referral/claim', { method: 'POST', body: JSON.stringify({ code: c }) })
      try { localStorage.removeItem('ogapay_referral') } catch { /* storage off */ }
      // { referrer: { username (null for a private profile), firstName } }
      const who = r?.referrer?.username ? `@${r.referrer.username}` : r?.referrer?.firstName || ''
      toast(who ? `Saved. ${who} invited you.` : 'Saved. Thanks!', 'success')
      onClaimed()
      next()
    } catch (err: any) { setError(err?.message || "Couldn't add that code. Please try again.") }
    setBusy(false)
  }

  const accept = async () => {
    setBusy(true); setError('')
    try {
      await apiRequest('/users/me/accept-rules', { method: 'POST' })
      onRulesAccepted()
      next()
    } catch (err: any) { setError(err?.message || "Couldn't save that. Please try again.") }
    setBusy(false)
  }

  // The same switch as Settings > Notifications > Push alerts (lib/push.ts)
  const alertsOn = async () => {
    setBusy(true)
    try {
      const s = await turnOnPush()
      if (s === 'on') toast('Alerts are on for this device', 'success')
      if (s === 'blocked') toast('Notifications are blocked for ogapay.app in this browser. You can allow them later and turn alerts on in Settings.', 'error')
    } catch (err: any) {
      toast(err?.message || "Couldn't turn on alerts. You can try again in Settings.", 'error')
    }
    setBusy(false)
    next()
  }

  if (!step) return null
  return (
    <Sheet title={TITLES[step]} onClose={onFinish} outsideCloses={false}>
      <div className="wf-body" ref={body} tabIndex={-1}>
        {steps.length > 1 && <span className="ui-eyebrow wf-count">Step {at + 1} of {steps.length}</span>}

        {step === 'invite' && (
          <form onSubmit={claim} noValidate>
            <p className="wf-text">If a friend sent you an OgaPay link or code, add it here. They get a reward once you finish your first paid job.</p>
            <div className="wl-field">
              <label className="ui-label" htmlFor="wf-code">Referral code or link</label>
              <input id="wf-code" className="ui-input" value={code} onChange={(e) => { setCode(e.target.value); setError('') }}
                placeholder="ABCD2345 or ogapay.app/ref/ABCD2345" autoComplete="off" autoCorrect="off" autoCapitalize="characters"
                spellCheck={false} maxLength={300} aria-invalid={!!error} />
            </div>
            <Err text={error} />
            <div className="ui-actions wf-actions">
              <button type="button" className="ui-btn ui-btn-ghost" disabled={busy} onClick={next}>Skip</button>
              <button type="submit" className={`ui-btn ui-btn-dark${busy ? ' is-loading' : ''}`} disabled={busy}>Apply</button>
            </div>
          </form>
        )}

        {step === 'rules' && (
          <>
            <p className="wf-text">OgaPay pays for real work. Please keep to these rules:</p>
            <ul className="wf-rules">
              <li><i className="ti ti-file-text" aria-hidden="true" /><span>Read the brief and send real proof of your work.</span></li>
              <li><i className="ti ti-user" aria-hidden="true" /><span>One account per person.</span></li>
              <li><i className="ti ti-ban" aria-hidden="true" /><span>No fake screenshots, copied work, bots or farming.</span></li>
              <li><i className="ti ti-alert-triangle" aria-hidden="true" /><span>Breaking these rules means your work is rejected and your account is banned.</span></li>
            </ul>
            <Err text={error} />
            <button type="button" className={`ui-btn ui-btn-dark wf-wide${busy ? ' is-loading' : ''}`} disabled={busy} onClick={accept}>Accept and continue</button>
          </>
        )}

        {step === 'alerts' && (
          <>
            <p className="wf-text">Get a buzz on this device when a new job you can take is posted, and when you're paid, even with OgaPay closed. You can change this any time in Settings.</p>
            <div className="ui-actions wf-actions">
              <button type="button" className="ui-btn ui-btn-ghost" disabled={busy} onClick={next}>Not now</button>
              <button type="button" className={`ui-btn ui-btn-dark${busy ? ' is-loading' : ''}`} disabled={busy} onClick={alertsOn}><i className="ti ti-bell-ringing" aria-hidden="true" /> Turn on alerts</button>
            </div>
          </>
        )}

        {step === 'verify' && (
          <>
            <p className="wf-text">Level 1 lets you withdraw your earnings. It's free and takes a minute: use a bank account in your own name, or your NIN.</p>
            <p className="wf-text">For the ₦1,000 first job bonus, verify with your NIN and finish your first paid job.</p>
            <div className="ui-actions wf-actions">
              <button type="button" className="ui-btn ui-btn-ghost" onClick={next}>Later</button>
              <Link to="/settings/verification" className="ui-btn ui-btn-dark" onClick={onFinish}>Verify now</Link>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}
