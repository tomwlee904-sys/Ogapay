import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { useCurrency } from '../../context/CurrencyContext'
import type { DisplayMode } from '../../lib/currency'
import { Card, PrefRow, Row, Toggle, savePref, type Prefs, type SectionProps } from './ui'
import { PushSettingsCard } from '../../components/PushAlerts'

// Alerts on this device (push, components/PushAlerts.tsx) and email alerts
export function Notifications(props: SectionProps) {
  const { toast } = useToast()
  const { me } = props
  const off = !me.preferences.emailNotifications
  return (
    <>
      {!me.isEmailVerified && (
        <div className="st2-banner"><i className="ti ti-mail-exclamation" /> Verify your email to get these. <Link to="/settings/account">Resend the link</Link></div>
      )}
      <PushSettingsCard toast={toast}><NewJobsOnPhone {...props} toast={toast} /></PushSettingsCard>
      <Card title="Email alerts" sub={`Sent to ${me.email}. You'll always see everything under Notifications in the app.`}>
        <PrefRow {...props} toast={toast} k="emailNotifications" title="Email me" sub="Turn off to stop all emails below" />
        <PrefRow {...props} toast={toast} k="taskAlerts" disabled={off} title="Job updates" sub="Applications, submissions, approvals, rejections and disputes on your jobs" />
        <PrefRow {...props} toast={toast} k="payoutAlerts" disabled={off} title="Money in and out" sub="Payments, transfers you receive, refunds, bonuses and withdrawals" />
        <PrefRow {...props} toast={toast} k="communityAlerts" disabled={off} title="Communities" sub="Invites and join requests" />
      </Card>
      <Card title="Digests">
        <PrefRow {...props} toast={toast} k="newTaskAlerts" disabled={off} title="New jobs for you" sub={<>A daily email with new jobs in the categories on <Link to="/edit-profile">your profile</Link></>} />
        <PrefRow {...props} toast={toast} k="weeklyDigest" disabled={off} title="Weekly earnings summary" sub="On Mondays, what you earned from jobs the week before" />
      </Card>
    </>
  )
}

type JobPush = 'OFF' | 'CATEGORIES' | 'ALL'
const JOB_PUSH: { id: JobPush; label: string }[] = [
  { id: 'OFF', label: 'Off' },
  { id: 'CATEGORIES', label: 'My categories' },
  { id: 'ALL', label: 'All jobs' },
]
const MAX_MIN_REWARD = 10000000 // same cap as the backend (user.service)

// New jobs on the phone, inside the Push alerts card. Saved on the account, so
// it's the same for every device with alerts on (backend jobAlerts.service).
// Never chosen works like My categories, so that's what shows.
function NewJobsOnPhone({ me, setMe, toast }: SectionProps & { toast: (m: string, t?: 'success' | 'error') => void }) {
  const mode: JobPush = me.preferences.jobPush ?? 'CATEGORIES'
  const saved = me.preferences.jobPushMinReward || 0
  const [min, setMin] = useState(saved ? String(saved) : '')
  const [busy, setBusy] = useState(false)
  const setPrefs = (p: Partial<Prefs>) => setMe((m) => ({ ...m, preferences: { ...m.preferences, ...p } }))

  const pick = async (m: JobPush) => {
    if (m === me.preferences.jobPush) return
    const before = me.preferences.jobPush
    setPrefs({ jobPush: m })
    try { await savePref('jobPush', m) }
    catch (e: any) { setPrefs({ jobPush: before }); toast(e?.message || "Couldn't save that", 'error') }
  }
  const typed = Number(min || 0)
  const saveMin = async () => {
    if (typed === saved || busy) return
    if (typed > MAX_MIN_REWARD) { toast('The most you can set is ₦10,000,000', 'error'); return }
    setBusy(true)
    try {
      await savePref('jobPushMinReward', typed)
      setPrefs({ jobPushMinReward: typed })
      toast(typed ? `Only jobs paying ₦${typed.toLocaleString('en-US')} or more will go to your phone` : 'Jobs of any reward will go to your phone', 'success')
    } catch (e: any) {
      toast(e?.message || "Couldn't save that", 'error')
    } finally { setBusy(false) }
  }

  return (
    <div className="st2-jobs">
      <div className="st2-row-title" id="push-jobs">New jobs on this phone</div>
      <div className="st2-row-sub">
        {mode === 'OFF' && 'None go to your phone. Jobs in your categories still show under Notifications.'}
        {mode === 'CATEGORIES' && <>New jobs in the categories on <Link to="/edit-profile">your profile</Link> that you can take.</>}
        {mode === 'ALL' && 'Every new job you can take, whatever the category.'}
      </div>
      <div className="st2-seg" role="radiogroup" aria-labelledby="push-jobs">
        {JOB_PUSH.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} className={mode === m.id ? 'on' : ''} onClick={() => pick(m.id)}>{m.label}</button>
        ))}
      </div>
      {mode !== 'OFF' && (
        <form className="st2-jobs-min" onSubmit={(e) => { e.preventDefault(); saveMin() }}>
          <label className="st2-f" htmlFor="push-jobs-min"><span>Minimum reward (optional)</span></label>
          <div className="st2-inline">
            <div className="st2-naira">
              <b aria-hidden="true">₦</b>
              <input id="push-jobs-min" inputMode="numeric" autoComplete="off" placeholder="Any amount" value={min}
                onChange={(e) => setMin(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 8))} onBlur={saveMin} />
            </div>
            {typed !== saved && <button type="submit" className="ui-btn ui-btn-ghost" disabled={busy}>Save</button>}
          </div>
          <small className="st2-muted">Smaller jobs stay off your phone. Jobs paid in USDC or SOL are compared at today's rate.</small>
        </form>
      )}
      <small className="st2-muted">At most 10 a day. After that, one alert says how many more there are.</small>
    </div>
  )
}

export function Privacy(props: SectionProps) {
  const { toast } = useToast()
  return (
    <Card title="Who can see you" sub={<>See the <Link to="/privacy">privacy policy</Link> for what's public.</>}>
      <PrefRow {...props} toast={toast} k="isPublic" title="Public profile" sub="Off: your profile, and you in search, Find workers and leaderboards, are hidden. People can still pay you by your exact username." />
      <PrefRow {...props} toast={toast} k="showEarnings" title="Show my earnings" sub="Your total earned on your profile, and amounts next to your name on leaderboards" />
      <PrefRow {...props} toast={toast} k="showRank" title="Show my OgaScore badge" sub="On your public profile" />
    </Card>
  )
}

const MODES: { id: DisplayMode; label: string }[] = [
  { id: 'NGN', label: '₦ Naira' },
  { id: 'USDC', label: '$ USDC' },
  { id: 'BOTH', label: 'Both' },
]

export function Payments(props: SectionProps) {
  const { toast } = useToast()
  const { preferredCurrency, setPreferredCurrency } = useCurrency()
  const [mode, setMode] = useState<string>(props.me.preferences.defaultCurrency || preferredCurrency)
  const pick = async (m: DisplayMode) => {
    setMode(m)
    // Updates the display everywhere and saves it (it only saved it before)
    await setPreferredCurrency(m)
    props.setMe((x) => ({ ...x, preferences: { ...x.preferences, defaultCurrency: m } }))
    toast('Display currency updated', 'success')
  }
  return (
    <>
      <Card title="Display currency" sub="How amounts are shown across OgaPay. Your balances don't change.">
        <div className="st2-seg" role="radiogroup" aria-label="Display currency">
          {MODES.map((m) => (
            <button key={m.id} role="radio" aria-checked={mode === m.id} className={mode === m.id ? 'on' : ''} onClick={() => pick(m.id)}>{m.label}</button>
          ))}
        </div>
      </Card>
      <Card title="USDC">
        <PrefRow {...props} toast={toast} k="autoConvert" title="Convert USDC to naira automatically" sub="When USDC arrives in your wallet, it's converted to NGN at the current rate" />
      </Card>
      <Card title="Wallet">
        <Row title="Deposits, withdrawals and your balance live in your wallet"><Link className="up-btn" to="/wallet">Open wallet</Link></Row>
        <Row title="Withdrawal limits depend on your verification level"><Link className="up-btn" to="/settings/verification">See limits</Link></Row>
      </Card>
    </>
  )
}

export const DEV_MODE_KEY = 'ogapay_developer_mode'

export function Developer() {
  const [on, setOn] = useState(() => { try { return localStorage.getItem(DEV_MODE_KEY) === 'true' } catch { return false } })
  const toggle = (v: boolean) => {
    setOn(v)
    try { localStorage.setItem(DEV_MODE_KEY, String(v)) } catch {}
    // Let the sidebar show or hide the link without a reload
    window.dispatchEvent(new Event('ogapay:devmode'))
  }
  return (
    <Card title="Developer API" sub="API keys for your own apps and agents: read your jobs and balance, and (with write access) post jobs and pay for approved work.">
      <Row title="Show Developer API in the menu" id="dev-toggle"><Toggle on={on} onChange={toggle} labelledBy="dev-toggle" /></Row>
      <Row title="Create keys and read the docs"><Link className="up-btn" to="/developer">Open Developer API</Link></Row>
    </Card>
  )
}
