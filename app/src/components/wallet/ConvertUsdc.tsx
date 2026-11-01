import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../lib/api'
import { naira } from '../../lib/wallet'

// Convert some USDC to naira by hand. The server sets the rate (the same one the
// automatic conversion uses) and rounds naira down to the kobo. You see the rate
// and the exact naira amount before confirming; if the rate moves in between,
// nothing is converted and the new amount is shown.
type Quote = { usdcAmount: number; rate: number; ngnAmount: number; available: number }

export default function ConvertUsdc({ available, onDone, onRefresh, onCancel }: { available: number; onDone: () => void; onRefresh?: () => void; onCancel: () => void }) {
  const [amount, setAmount] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState<Quote | null>(null)
  // Goes up whenever the amount changes, so a late answer for an old amount is ignored
  const seq = useRef(0)
  const amt = Number(amount) || 0
  // USDC has 6 decimal places; round down so "Max" never asks for more than you have
  const pick = (part: number) => setAmount(String(Math.floor(available * part * 1e6) / 1e6))

  const getQuote = async (a: number) => {
    const my = seq.current
    setQuoting(true)
    try {
      const q = await apiRequest<Quote>(`/wallet/convert/quote?amount=${a}`)
      if (my === seq.current) { setQuote(q); setErr('') }
    } catch (e: any) {
      if (my === seq.current) { setQuote(null); setErr(e?.message || "Couldn't get the rate") }
    }
    if (my === seq.current) setQuoting(false)
  }
  // A new amount (the number, not just how it's typed: "100" and "100." are the
  // same) drops the old rate and message and asks again after a short pause.
  // The pause counts as getting the rate. (2026-11-01: retyping the same number
  // hid the message and left the button stuck on "Getting the rate…")
  useEffect(() => {
    seq.current++
    setQuote(null); setErr(''); setQuoting(amt >= 0.01)
    if (!(amt >= 0.01)) return
    const t = setTimeout(() => getQuote(amt), 400)
    return () => clearTimeout(t)
  }, [amt])

  const confirm = async () => {
    if (!quote || busy) return
    const my = seq.current
    setBusy(true); setErr('')
    try {
      const out = await apiRequest<Partial<Quote>>('/wallet/convert', { method: 'POST', body: JSON.stringify({ amount: quote.usdcAmount, expectedNgn: quote.ngnAmount }) })
      // Show what the server actually converted
      setDone({ ...quote, ...(out && out.ngnAmount != null ? out : {}) })
      onDone()
    } catch (e: any) {
      // Keep the real reason on screen (not enough USDC, converting paused...).
      // Only a rate change gives a new amount to confirm, and it comes with the reply (409).
      // Anything else clears the quote, so trying again first gets a fresh rate.
      if (my === seq.current) {
        if (e?.status === 409 && e?.data?.ngnAmount != null) setQuote(e.data as Quote)
        else setQuote(null)
        setErr(/timed out/i.test(e?.message || '')
          ? "We didn't get an answer in time, so it may have gone through. Check the USDC available above, and your history, before you try again."
          : e?.message || 'Not converted. Try again.')
      }
      // Some USDC may have been held or spent meanwhile: show the latest balance
      onRefresh?.()
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
  // No rate and none on its way (asking or converting failed): the button asks
  // for a fresh one (it never converts by itself)
  const retry = !quote && !quoting && !busy && !over && amt >= 0.01
  return (
    <div className="wl-cv">
      <label className="ui-label" htmlFor="cv-amt">You convert</label>
      <div className="wl-amount">
        <input id="cv-amt" className="ui-input" inputMode="decimal" placeholder="0.00" value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 14))} />
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

      {/* What went wrong comes first: after a timeout the refreshed balance can be
          below the amount, and "it may have gone through" matters more */}
      {(err || over) && <div className="wl-err" role="alert"><i className="ti ti-alert-circle" /><span>{err || `You have ${available} USDC available.`}</span></div>}
      <div className="ui-actions" style={{ marginTop: 14 }}>
        <button type="button" className="ui-btn ui-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="ui-btn ui-btn-dark" style={{ flex: 1 }} disabled={!retry && (!quote || over || busy || quoting)} onClick={retry ? () => getQuote(amt) : confirm}>
          {busy ? 'Converting…' : retry ? 'Try again' : quote && !over ? `Convert to ${naira(quote.ngnAmount)}` : amt > 0 && amt < 0.01 ? 'At least 0.01 USDC' : amt >= 0.01 && !over ? 'Getting the rate…' : 'Enter an amount'}
        </button>
      </div>
    </div>
  )
}
