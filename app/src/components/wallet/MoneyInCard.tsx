import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../../lib/api'

type Dva = { accountNumber: string; bankName: string; accountName?: string | null }

// 10-digit NUBAN as 3-3-4, easier to read out and type
const spaced = (n: string) => (/^\d{10}$/.test(n) ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : n)

// Wallet: the account number people transfer to, to add money (shown in full,
// with Copy). An account number someone already has is always shown, since
// money sent to it still arrives; getting a new one needs Level 1+.
export default function MoneyInCard({ verified }: { verified: boolean }) {
  const [dva, setDva] = useState<Dva | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    apiRequest<Dva | null>('/wallet/dva').then((d) => setDva(d && d.accountNumber ? d : null)).catch(() => setDva(null))
  }, [verified])

  const create = async () => {
    setBusy(true); setErr('')
    try { setDva(await apiRequest<Dva>('/wallet/dva', { method: 'POST' })) }
    catch (e: any) { setErr(e?.message || "Couldn't create your account number. Try again in a minute.") }
    setBusy(false)
  }
  const copy = async () => {
    if (!dva) return
    try { await navigator.clipboard.writeText(dva.accountNumber); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }

  return (
    <section className="ui-card wl-sec wl-dir-card" aria-labelledby="wl-in">
      <div className="wl-dir-label"><span className="wl-dir in"><i className="ti ti-arrow-down-left" /></span> Money in</div>
      <h2 id="wl-in" className="wl-dir-title">Your OgaPay account number</h2>
      {dva === undefined ? (
        <div className="ui-sk" style={{ height: 78, borderRadius: 12 }} />
      ) : dva ? (
        <>
          <div className="wl-acct-num">{spaced(dva.accountNumber)}</div>
          <div className="wl-acct-sub">{dva.bankName}{dva.accountName ? ` · ${dva.accountName}` : ''}</div>
          <p className="wl-note wl-dir-note">Transfer here from any bank app to add money to your wallet.</p>
          <div className="wl-dir-actions">
            <button type="button" className="ui-btn ui-btn-ghost" onClick={copy}><i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} /> {copied ? 'Copied' : 'Copy number'}</button>
            <Link className="wl-link" to="/deposit">Other ways to add money</Link>
          </div>
        </>
      ) : verified ? (
        <>
          <p className="wl-note wl-dir-note">Get a permanent account number in your name. Transfers to it land in your wallet.</p>
          {err && <div className="wl-err" role="alert"><i className="ti ti-alert-circle" /><span>{err}</span></div>}
          <div className="wl-dir-actions">
            <button type="button" className="ui-btn ui-btn-dark" disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Get my account number'}</button>
          </div>
        </>
      ) : (
        <>
          <p className="wl-note wl-dir-note">Verify your identity to get your own account number. Until then you can add money by card or USSD.</p>
          <div className="wl-dir-actions">
            <Link className="ui-btn ui-btn-ghost" to="/settings/verification">Verify now</Link>
            <Link className="wl-link" to="/deposit">Add money by card</Link>
          </div>
        </>
      )}
    </section>
  )
}
