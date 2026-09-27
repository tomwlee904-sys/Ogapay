import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import FundWalletModal from '../components/FundWalletModal'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { MIN_DEPOSIT_NGN, kycOf, naira } from '../lib/wallet'
import '../styles/wallet.css'

// Add money: bank transfer to the user's own account number (Flutterwave
// virtual account), card / USSD / bank app through Flutterwave's checkout, or
// USDC on Solana. After the checkout, the provider sends people back here and
// the page confirms that exact payment by its reference (the old pop-up called
// it done as soon as the balance was at least the amount, so anyone who already
// had that much saw "success" whether or not they paid).

type Method = 'bank' | 'card' | 'usdc'
type Dva = { accountNumber: string; bankName: string; accountName?: string | null }
type Check = { phase: 'checking' | 'done' | 'failed' | 'cancelled' | 'slow'; amount?: number; reference: string }

const BACK_KEY = 'oga_deposit_back'
const QUICK = [1000, 5000, 10000, 20000]
// Only same-site paths
const safeBack = (p?: string | null) => (p && p.startsWith('/') && !p.startsWith('//') ? p : '')

export default function Deposit() {
  const { user, refreshUser } = useAuth()
  const { refresh: refreshBalance } = useWalletBalance()
  const [params, setParams] = useSearchParams()
  const kycOk = kycOf(user).approved

  const [method, setMethod] = useState<Method>(() => {
    const m = params.get('method')
    return m === 'card' || m === 'usdc' ? m : 'bank'
  })
  const [amount, setAmount] = useState(() => { const a = Number(params.get('amount')); return a > 0 ? String(Math.ceil(a)) : '' })
  const [provider, setProvider] = useState<'FLUTTERWAVE' | 'PAYSTACK'>('FLUTTERWAVE')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [dva, setDva] = useState<Dva | null | undefined>(undefined)
  const [dvaBusy, setDvaBusy] = useState(false)
  const [dvaErr, setDvaErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [usdcOpen, setUsdcOpen] = useState(false)
  const [back] = useState(() => {
    const b = safeBack(params.get('back'))
    if (b) try { sessionStorage.setItem(BACK_KEY, b) } catch { /* private mode */ }
    return b || (() => { try { return safeBack(sessionStorage.getItem(BACK_KEY)) } catch { return '' } })()
  })

  // ── Coming back from the checkout ──
  // Flutterwave adds ?status=&tx_ref=; Paystack adds ?reference=&trxref=
  const returned = params.get('tx_ref') || params.get('reference') || params.get('trxref')
  const [check, setCheck] = useState<Check | null>(() => returned
    ? { phase: params.get('status') === 'cancelled' ? 'cancelled' : params.get('status') === 'failed' ? 'failed' : 'checking', reference: returned }
    : null)
  const stopped = useRef(false)

  useEffect(() => {
    if (!check || check.phase !== 'checking') return
    stopped.current = false
    const ref = check.reference
    let tries = 0
    const tick = async () => {
      if (stopped.current) return
      tries++
      // Ask the provider directly (the webhook may not have arrived yet), then read ours
      await apiRequest(`/payments/${encodeURIComponent(ref)}/verify`, { method: 'POST' }).catch(() => null)
      const tx = await apiRequest<{ status: string; amount: number }>(`/wallet/transactions/${encodeURIComponent(ref)}`).catch(() => null)
      if (stopped.current) return
      const st = String(tx?.status || '').toUpperCase()
      if (st === 'COMPLETED') {
        setCheck({ phase: 'done', amount: tx!.amount, reference: ref })
        refreshBalance(); refreshUser()
        try { sessionStorage.removeItem(BACK_KEY) } catch { /* ignore */ }
        return
      }
      if (st === 'FAILED' || st === 'CANCELLED') { setCheck({ phase: 'failed', amount: tx?.amount, reference: ref }); return }
      if (tries >= 20) { setCheck({ phase: 'slow', amount: tx?.amount, reference: ref }); return }
      setTimeout(tick, 3000)
    }
    tick()
    return () => { stopped.current = true }
  }, [check?.phase, check?.reference]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Your account number ──
  useEffect(() => {
    if (!kycOk) { setDva(null); return }
    apiRequest<Dva | null>('/wallet/dva').then((d) => setDva(d && d.accountNumber ? d : null)).catch(() => setDva(null))
  }, [kycOk])

  async function createDva() {
    setDvaBusy(true); setDvaErr('')
    try {
      const d = await apiRequest<Dva>('/wallet/dva', { method: 'POST' })
      setDva(d)
    } catch (e: any) { setDvaErr(e?.message || "Couldn't create your account number. Try again in a minute.") }
    setDvaBusy(false)
  }

  const copy = async () => {
    if (!dva) return
    try { await navigator.clipboard.writeText(dva.accountNumber); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }

  const amt = Number(amount) || 0
  async function pay() {
    if (amt < MIN_DEPOSIT_NGN) { setError(`The minimum is ${naira(MIN_DEPOSIT_NGN, 0)}.`); return }
    setPaying(true); setError('')
    try {
      const r = await apiRequest<{ paymentUrl?: string; reference: string }>('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: amt, currency: 'NGN', provider, callbackUrl: `${window.location.origin}/deposit` }),
      })
      if (!r?.paymentUrl) throw new Error("The payment page didn't open. Try again.")
      window.location.assign(r.paymentUrl)
    } catch (e: any) {
      setError(e?.message || "The payment page didn't open. Try again.")
      setPaying(false)
    }
  }

  const leave = () => { setCheck(null); setParams({}, { replace: true }) }

  // ── Result of a checkout ──
  if (check) {
    const a = check.amount ? naira(check.amount) : ''
    return (
      <Layout>
        <div className="ui-page">
          <section className="ui-card dp-status" aria-live="polite">
            <div className="wl-done">
              {check.phase === 'checking' ? (
                <>
                  <div className="wl-done-ic wait"><span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} /></div>
                  <h3>Confirming your payment…</h3>
                  <p>This usually takes a few seconds. You can leave this page: the money is added as soon as it's confirmed.</p>
                </>
              ) : check.phase === 'done' ? (
                <>
                  <div className="wl-done-ic"><i className="ti ti-check" /></div>
                  <h3>{a} added to your wallet</h3>
                  <p>It's ready to use.</p>
                </>
              ) : check.phase === 'slow' ? (
                <>
                  <div className="wl-done-ic wait"><i className="ti ti-clock" /></div>
                  <h3>Still waiting for confirmation</h3>
                  <p>Your bank hasn't confirmed the payment yet. If money left your account, it will be added to your wallet automatically and you'll get a notification.</p>
                </>
              ) : (
                <>
                  <div className="wl-done-ic bad"><i className="ti ti-x" /></div>
                  <h3>{check.phase === 'cancelled' ? 'Payment cancelled' : "Payment didn't go through"}</h3>
                  <p>{check.phase === 'cancelled' ? 'Nothing was charged.' : "Nothing was added to your wallet. If you were charged, contact support with the reference below."}</p>
                </>
              )}
              <div className="ref">Reference {check.reference}</div>
              <div className="ui-actions">
                {check.phase === 'done' && back ? <Link className="ui-btn ui-btn-dark" to={back}>Continue where you were</Link> : null}
                {(check.phase === 'failed' || check.phase === 'cancelled') && <button type="button" className="ui-btn ui-btn-dark" onClick={() => { leave(); setMethod('card') }}>Try again</button>}
                <Link className={`ui-btn ${check.phase === 'done' && !back ? 'ui-btn-dark' : 'ui-btn-ghost'}`} to="/wallet">Go to wallet</Link>
              </div>
            </div>
          </section>
        </div>
      </Layout>
    )
  }

  const METHODS: { id: Method; icon: string; title: string; text: string; tag?: string }[] = [
    { id: 'bank', icon: 'ti-building-bank', title: 'Bank transfer', text: 'Send to your own OgaPay account number from any bank app.' },
    { id: 'card', icon: 'ti-credit-card', title: 'Card, USSD or bank app', text: 'Pay now with a Nigerian card, USSD code or your bank app.' },
    { id: 'usdc', icon: 'ti-currency-dollar', title: 'USDC on Solana', text: 'From Phantom, Backpack or Solflare.' },
  ]

  return (
    <Layout>
      <div className="ui-page">
        <div className="ui-head">
          <div>
            <Link to={back || '/wallet'} className="wl-link"><i className="ti ti-arrow-left" /> {back ? 'Back' : 'Wallet'}</Link>
            <h1 className="ui-title">Add money</h1>
          </div>
        </div>

        <div className="dp-grid">
          <div className="dp-methods" role="group" aria-label="How do you want to pay?">
            {METHODS.map((m) => (
              <button key={m.id} type="button" className="dp-method" aria-pressed={method === m.id} onClick={() => { setMethod(m.id); setError('') }}>
                <span className="wl-bank-ic"><i className={`ti ${m.icon}`} /></span>
                <span className="dp-m-text">
                  <strong>{m.title}{m.tag && <em>{m.tag}</em>}</strong>
                  <span>{m.text}</span>
                </span>
              </button>
            ))}
          </div>

          <section className="ui-card dp-panel" aria-live="polite">
            {method === 'bank' ? (
              <>
                <h2>Bank transfer</h2>
                <p>Your own account number. Anything you send to it is added to your naira balance, usually within minutes.</p>
                {!kycOk ? (
                  <div className="dp-lock">
                    <i className="ti ti-shield-check" />
                    <h3>Verify your identity to get your account number</h3>
                    <p>Banks need your NIN or BVN before they can open an account number in your name. Until then, you can pay by card, USSD or bank app.</p>
                    <div className="ui-actions" style={{ justifyContent: 'center' }}>
                      <Link className="ui-btn ui-btn-dark" to="/settings/verification">Verify now</Link>
                      <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setMethod('card')}>Pay by card instead</button>
                    </div>
                  </div>
                ) : dva === undefined ? (
                  <div className="ui-sk" style={{ height: 150, borderRadius: 16 }} />
                ) : dva ? (
                  <>
                    <div className="dp-acct">
                      <div className="dp-acct-row">
                        <span>Account number</span>
                        <button type="button" className="ui-btn ui-btn-ghost" style={{ height: 32 }} onClick={copy}><i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} /> {copied ? 'Copied' : 'Copy'}</button>
                      </div>
                      <b className="dp-acct-num" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)' }}>{dva.accountNumber}</b>
                      <div className="dp-acct-row"><span>Bank</span><b>{dva.bankName}</b></div>
                      {dva.accountName && <div className="dp-acct-row"><span>Name</span><b>{dva.accountName}</b></div>}
                    </div>
                    <ol className="dp-steps">
                      <li>Open your bank app and send any amount to this account.</li>
                      <li>The money shows in your wallet once the bank confirms it. We'll notify you.</li>
                      <li>Keep using the same number: it's yours.</li>
                    </ol>
                  </>
                ) : (
                  <div className="dp-lock">
                    <i className="ti ti-building-bank" />
                    <h3>Get your account number</h3>
                    <p>A permanent account number in your name. Transfers to it land in your wallet.</p>
                    {dvaErr && <div className="wl-err" role="alert" style={{ textAlign: 'left' }}><i className="ti ti-alert-circle" /><span>{dvaErr}</span></div>}
                    <button type="button" className="ui-btn ui-btn-dark" disabled={dvaBusy} onClick={createDva}>{dvaBusy ? 'Creating…' : 'Get my account number'}</button>
                  </div>
                )}
              </>
            ) : method === 'card' ? (
              <>
                <h2>Card, USSD or bank app</h2>
                <p>You'll pay on {provider === 'FLUTTERWAVE' ? 'Flutterwave' : 'Paystack'}'s secure page, then come back here.</p>
                <div className="wl-field">
                  <label className="ui-label" htmlFor="dp-amt">Amount</label>
                  <div className="wl-amount">
                    <span>₦</span>
                    <input id="dp-amt" className="ui-input" style={{ paddingRight: 14 }} inputMode="numeric" placeholder="0" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/\D/g, '').slice(0, 9)); setError('') }} onKeyDown={(e) => { if (e.key === 'Enter') pay() }} />
                  </div>
                  <div className="wl-quick">
                    {QUICK.map((q) => <button key={q} type="button" className={`ui-chip${amt === q ? ' on' : ''}`} onClick={() => { setAmount(String(q)); setError('') }}>{naira(q, 0)}</button>)}
                  </div>
                </div>
                {error && <div className="wl-err" role="alert"><i className="ti ti-alert-circle" /><span>{error}</span></div>}
                <button type="button" className="ui-btn ui-btn-dark ui-btn-lg wl-full" disabled={paying || !amt} onClick={pay}>
                  {paying ? 'Opening payment page…' : amt ? `Pay ${naira(amt, 0)}` : 'Enter an amount'}
                </button>
                <p className="wl-note" style={{ margin: '12px 0 0', textAlign: 'center' }}>
                  Minimum {naira(MIN_DEPOSIT_NGN, 0)}. No OgaPay fee.{' '}
                  <button type="button" className="wl-link" style={{ display: 'inline', fontWeight: 600, color: 'var(--text)' }} onClick={() => setProvider(provider === 'FLUTTERWAVE' ? 'PAYSTACK' : 'FLUTTERWAVE')}>
                    Pay with {provider === 'FLUTTERWAVE' ? 'Paystack' : 'Flutterwave'} instead
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2>USDC on Solana</h2>
                <p>Send USDC from a Solana wallet in this browser (Phantom, Backpack or Solflare). It's added to your USDC balance once the network confirms it.</p>
                <ol className="dp-steps" style={{ margin: '0 0 18px' }}>
                  <li>Enter your wallet address and the amount.</li>
                  <li>Approve the transfer in your wallet.</li>
                  <li>It shows in your wallet after confirmation, usually within a minute.</li>
                </ol>
                <button type="button" className="ui-btn ui-btn-dark ui-btn-lg wl-full" onClick={() => setUsdcOpen(true)}>Deposit USDC</button>
              </>
            )}
          </section>
        </div>
      </div>
      {usdcOpen && <FundWalletModal initialStep="deposit" initialTab="crypto" onClose={() => setUsdcOpen(false)} onDone={() => { refreshBalance(); refreshUser() }} />}
    </Layout>
  )
}
