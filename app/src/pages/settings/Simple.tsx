import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { useCurrency } from '../../context/CurrencyContext'
import type { DisplayMode } from '../../lib/currency'
import { Card, PrefRow, Row, Toggle, type SectionProps } from './ui'

// Email alerts. Push notifications and "USDC alerts" were removed: nothing sent them.
export function Notifications(props: SectionProps) {
  const { toast } = useToast()
  const { me } = props
  const off = !me.preferences.emailNotifications
  return (
    <>
      {!me.isEmailVerified && (
        <div className="st2-banner"><i className="ti ti-mail-exclamation" /> Verify your email to get these. <Link to="/settings/account">Resend the link</Link></div>
      )}
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
    <Card title="Developer API" sub="Build on OgaPay with API keys.">
      <Row title="Show Developer API in the menu" id="dev-toggle"><Toggle on={on} onChange={toggle} labelledBy="dev-toggle" /></Row>
      <Row title="API keys and documentation"><Link className="up-btn" to="/developer">Open Developer API</Link></Row>
    </Card>
  )
}
