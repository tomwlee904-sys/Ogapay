import { useEffect, useState } from 'react'
import { apiRequest } from '../../lib/api'
import { naira } from '../../lib/wallet'

// Convert some USDC to naira by hand. The server sets the rate (the same one the
// automatic conversion uses) and rounds naira down to the kobo. You see the rate
// and the exact naira amount before confirming; if the rate moves in between,
// nothing is converted and the new amount is shown.
type Quote = { usdcAmount: number; rate: number; ngnAmount: number; available: number }

export default function ConvertUsdc({ available, onDone, onCancel }: { available: number; onDone: () => void; onCancel: () => void }) {
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<Quote | null>(null)
  const amt = Number(amount) || 0
  // USDC has 6 decimal places; round down so "Max" never asks for more than you have
  const pick = (part: number) => { setAmount(String(Math.floor(available * part * 1e6) / 1e6)); setErr('') }

  const getQuote = async (a: number) => {
    setQuoting(true)
    try { setQuote(await apiRequest<Quote>(`/wallet/convert/quote?amount=${a}`)); setErr('') }
    catch (e: any) { setQuote(null); setErr(e?.message || "Couldn't get the rate") }
    setQuoting(false)
  }
  useEffect(() => {
    setQuote(null)
    if (!(amt >= 0.01)) return
    const t = setTimeout(() => getQuote(amt), 400)
    return () => clearTimeout(t)
  }, [amt])

  const confirm = async () => {
    if (!quote || busy) return
    setBusy(true); setErr('')
    try {
      await apiRequest('/wallet/convert', { method: 'POST', body: JSON.stringify({ amount: quote.usdcAmount, expectedNgn: quote.ngnAmount }) })
      setDone(quote)
      onDone()
    } catch (e: any) {
      setErr(e?.message || 'Not converted. Try again.')
      // The rate may have moved: show the new amount to confirm
      getQuote(quote.usdcAmount)
    }
    setBusy(false)
  }

  if (done) return (
    <div className="wl-cv-done" role="status">
      <i className="ti ti-circle-check" aria-hidden="true" />
      <b>{done.usdcAmount} USDC converted</b>
      <p>{naira(done.ngnAmount)} is now in your naira balance.</p>
      <button type="button" className="ui-btn ui-btn-dark wl-full" onClick={onCancel}>Done</button>
    </div>
  )

  const over = amt > available
  return (
    <div className="wl-cv">
      <label className="ui-label" htmlFor="cv-amt">You convert</label>
      <div className="wl-amount">
        <input id="cv-amt" className="ui-input" inputMode="decimal" placeholder="0.00" value={amount}
          onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 14)); setErr('') }} />
        <span>USDC</span>
      </div>
      <div className="wl-quick">
        <button type="button" className="ui-chip" onClick={() => pick(0.25)}>25%</button>
        <button type="button" className="ui-chip" onClick={() => pick(0.5)}>50%</button>
        <button type="button" className="ui-chip" onClick={() => pick(1)}>Max</button>
      </div>
      <p className="wl-note">{available} USDC available. USDC held for jobs or withdrawals can't be converted.</p>

      <div className="wl-cv-sum" aria-live="polite">
        <div><span>Rate</span><b>{quote ? `₦${quote.rate.toLocaleString('en-NG', { maximumFractionDigits: 2 })} per USDC` : quoting ? '…' : '—'}</b></div>
        <div><span>You get</span><b>{quote && !over ? naira(quote.ngnAmount) : quoting ? '…' : '—'}</b></div>
        <small>No fee. Naira is rounded down to the kobo.</small>
      </div>

      {(err || over) && <div className="wl-err" role="alert"><i className="ti ti-alert-circle" /><span>{over ? `You have ${available} USDC available.` : err}</span></div>}
      <div className="ui-actions" style={{ marginTop: 14 }}>
        <button type="button" className="ui-btn ui-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="ui-btn ui-btn-dark" style={{ flex: 1 }} disabled={!quote || over || busy || quoting} onClick={confirm}>
          {busy ? 'Converting…' : quote && !over ? `Convert to ${naira(quote.ngnAmount)}` : amt > 0 && amt < 0.01 ? 'At least 0.01 USDC' : 'Enter an amount'}
        </button>
      </div>
    </div>
  )
}
