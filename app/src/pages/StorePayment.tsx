import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import FundWalletModal from '../components/FundWalletModal'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { API_BASE, apiRequest, getAccessToken } from '../lib/api'
import { CURRENCY_SYMBOLS, type Currency } from '../lib/currency'
import '../styles/checkout.css'

// Store checkout. A purchase takes the item's price from the buyer's wallet in the
// item's currency (POST /store/:id/purchase); there is no other payment path, so the
// old card/crypto/manual options (which showed a made-up address and charged the
// wallet after a card payment) and the 5% fee the backend never charged are gone.
// Short of money? "Add money" opens the wallet top-up, then you pay from the wallet.

type Item = {
  id: string; title: string; description: string; price: number; currency: Currency
  seller: string; sellerId?: string; sellerAvatar: string | null; image: string
  stock: number | null; isActive?: boolean; category?: string; official?: boolean
}
type MyJob = { id: string; title: string; status: string; expiresAt?: string | null; hiredWorkerId?: string | null }

// OgaPay's own items (no seller): what each one does, and what's permanent
const PERKS: Record<string, { kind: string; what: string; permanent?: boolean }> = {
  BADGE: { kind: 'PREMIUM_BADGE', what: 'A Premium badge next to your name on your profile, jobs and the workers list.', permanent: true },
  COSMETIC: { kind: 'WORKER_FRAME', what: 'A frame around your profile photo on your profile and in the workers list.', permanent: true },
  SERVICE: { kind: 'PRIORITY_SUPPORT', what: 'Your support tickets go to the top of our queue for 30 days. Buying again adds 30 days.' },
  BOOST: { kind: 'TASK_BOOST', what: 'Your chosen open job is listed first on the jobs page for 24 hours, with a Boosted tag.' },
}

const money = (n: number, c: Currency) =>
  `${CURRENCY_SYMBOLS[c] || ''}${n.toLocaleString('en-US', { minimumFractionDigits: c === 'NGN' ? 0 : 2, maximumFractionDigits: c === 'SOL' ? 4 : 2 })}${c === 'NGN' ? '' : ' ' + c}`

export default function StorePayment() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { balances, refresh } = useWalletBalance()
  const [item, setItem] = useState<Item | null>(null)
  const [loadError, setLoadError] = useState('')
  const [topUp, setTopUp] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  // OgaPay's own items
  const [owned, setOwned] = useState<string[]>([])
  const [jobs, setJobs] = useState<MyJob[] | null>(null)
  const [jobId, setJobId] = useState('')
  const [done, setDone] = useState<{ message: string; taskId?: string | null } | null>(null)

  useEffect(() => {
    if (!id) return
    apiRequest<Item>('/store/' + id, { auth: false })
      .then(setItem)
      .catch((e: any) => setLoadError(e?.message || "This product couldn't be loaded"))
  }, [id])

  const perk = item?.official ? PERKS[String(item.category || '').toUpperCase()] : undefined
  useEffect(() => {
    if (!item?.official || !user) return
    apiRequest<{ kind: string }[]>('/store/my-perks').then((l) => setOwned((l || []).map((p) => p.kind))).catch(() => {})
    if (perk?.kind === 'TASK_BOOST') {
      apiRequest<MyJob[]>('/tasks/my/created?limit=100').then((l) => {
        const open = (Array.isArray(l) ? l : []).filter((t) => ['OPEN', 'COOLING_DOWN'].includes(t.status) && !t.hiredWorkerId && !(t.expiresAt && new Date(t.expiresAt) < new Date()))
        setJobs(open)
        if (open.length === 1) setJobId(open[0].id)
      }).catch(() => setJobs([]))
    }
  }, [item?.id, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loadError) {
    return (
      <Layout>
        <div className="ui-page sc-wrap">
          <div className="ui-empty">
            <p>{loadError}</p>
            <Link className="ui-btn ui-btn-ghost" to="/store">Back to the store</Link>
          </div>
        </div>
      </Layout>
    )
  }
  if (!item) {
    return (
      <Layout>
        <div className="ui-page sc-wrap">
          <div className="ui-sk" style={{ height: 28, width: 180 }} />
          <div className="sc-grid" style={{ marginTop: 24 }}>
            <div className="ui-sk" style={{ height: 320 }} />
            <div className="ui-sk" style={{ height: 240 }} />
          </div>
        </div>
      </Layout>
    )
  }

  const available = balances?.[item.currency]?.available ?? 0
  const short = Math.max(0, item.price - available)
  const own = !!user && !item.official && item.sellerId === user.id
  const soldOut = item.isActive === false || item.stock === 0
  const alreadyHave = !!perk?.permanent && owned.includes(perk.kind)
  const needJob = perk?.kind === 'TASK_BOOST' && !jobId
  const canPay = !own && !soldOut && !alreadyHave && !needJob && short === 0 && !paying

  const pay = async () => {
    setPaying(true); setError('')
    try {
      if (item.official) {
        // Takes effect straight away; there's no seller or delivery
        const res = await fetch(`${API_BASE}/store/${item.id}/purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
          body: JSON.stringify(jobId ? { taskId: jobId } : {}),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.message || 'Payment failed. You have not been charged.')
        refresh()
        setDone({ message: json.message || 'Done. It has taken effect.', taskId: json.data?.perk?.taskId })
        return
      }
      const order = await apiRequest<{ id: string; conversationId?: string }>(`/store/${item.id}/purchase`, { method: 'POST', body: JSON.stringify({ quantity: 1 }) })
      refresh()
      navigate(`/orders/${order.id}`, { replace: true, state: { title: item.title, seller: item.seller, total: item.price, currency: item.currency, conversationId: order.conversationId } })
    } catch (e: any) {
      setError(e?.message || 'Payment failed. You have not been charged.')
      setPaying(false)
    }
  }

  if (done) {
    return (
      <Layout>
        <div className="ui-page sc-wrap">
          <section className="ui-card ui-card-pad" style={{ maxWidth: 520, margin: '32px auto 0', textAlign: 'center' }}>
            <i className="ti ti-circle-check" style={{ fontSize: 44, color: 'var(--green)' }} />
            <h1 style={{ margin: '10px 0 6px', fontSize: 20, fontWeight: 600 }}>{item.title}</h1>
            <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.6, color: 'var(--text2)' }}>{done.message}</p>
            <div className="ui-actions" style={{ justifyContent: 'center' }}>
              {perk?.kind === 'TASK_BOOST' && done.taskId && <Link className="ui-btn ui-btn-dark" to={`/tasks/${done.taskId}`}>Open the job</Link>}
              {(perk?.kind === 'PREMIUM_BADGE' || perk?.kind === 'WORKER_FRAME') && user?.username && <Link className="ui-btn ui-btn-dark" to={`/user/${user.username}`}>See your profile</Link>}
              {perk?.kind === 'PRIORITY_SUPPORT' && <Link className="ui-btn ui-btn-dark" to="/support">Open the help centre</Link>}
              <Link className="ui-btn ui-btn-ghost" to="/store">Back to the store</Link>
            </div>
          </section>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="ui-page sc-wrap">
        <Link to={`/store/${item.id}`} className="sc-back"><i className="ti ti-arrow-left" /> Back to product</Link>
        <span className="ui-eyebrow">Checkout</span>
        <h1 className="ui-title">Review and pay</h1>

        <div className="sc-grid">
          <div className="sc-main">
            <section className="ui-card sc-product">
              <div className="sc-thumb">{item.image ? <img src={item.image} alt="" /> : <i className="ti ti-package" />}</div>
              <div className="sc-product-t">
                <h2>{item.title}</h2>
                {item.official ? <p className="sc-by">Sold by OgaPay</p> : <p className="sc-by">Sold by <Link to={`/user/${item.seller}`}>@{item.seller}</Link></p>}
                {perk ? <p className="sc-desc">{perk.what}</p> : item.description && <p className="sc-desc">{item.description}</p>}
              </div>
            </section>

            {perk?.kind === 'TASK_BOOST' && (
              <section className="ui-card ui-card-pad">
                <label className="ui-label" htmlFor="sc-job">Job to boost</label>
                {jobs === null ? <div className="ui-sk" style={{ height: 42, borderRadius: 10 }} />
                  : jobs.length === 0 ? <p className="sc-desc" style={{ margin: 0 }}>You have no open jobs to boost. <Link to="/create">Post a job</Link> first.</p>
                  : (
                    <select id="sc-job" className="ui-select" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                      <option value="">Choose one of your open jobs</option>
                      {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>
                  )}
              </section>
            )}

            <section className="ui-card ui-card-pad">
              <span className="ui-label">Pay with</span>
              <div className="sc-method">
                <span className="sc-method-ic"><i className="ti ti-wallet" /></span>
                <div className="sc-method-t">
                  <strong>Your {item.currency} wallet</strong>
                  <span>Available: {money(available, item.currency)}</span>
                </div>
                <span className={`sc-state${short ? ' warn' : ''}`}>{short ? 'Not enough' : 'Ready'}</span>
              </div>
              {short > 0 && !own && !soldOut && (
                <div className="sc-short">
                  <p>You need <b>{money(short, item.currency)}</b> more. Add money by card, bank transfer or crypto, then come back here to pay.</p>
                  <button className="ui-btn ui-btn-ghost" onClick={() => setTopUp(true)}><i className="ti ti-plus" /> Add money</button>
                </div>
              )}
            </section>
          </div>

          <aside className="ui-card ui-card-pad sc-summary">
            <span className="ui-label">Order summary</span>
            <div className="sc-line"><span>{item.title}</span><span>{money(item.price, item.currency)}</span></div>
            <div className="sc-line"><span>Quantity</span><span>1</span></div>
            <div className="sc-line total"><span>Total</span><span>{money(item.price, item.currency)}</span></div>

            {own && <p className="sc-note warn"><i className="ti ti-info-circle" /> This is your own product, so you can't buy it.</p>}
            {alreadyHave && <p className="sc-note"><i className="ti ti-circle-check" /> You already have this.</p>}
            {soldOut && !own && <p className="sc-note warn"><i className="ti ti-info-circle" /> This product isn't available right now.</p>}

            <button className="ui-btn ui-btn-dark ui-btn-lg sc-pay" disabled={!canPay} onClick={pay}>
              {paying ? <><i className="ti ti-loader-2 sc-spin" /> Paying…</> : <>Pay {money(item.price, item.currency)}</>}
            </button>
            {error && <p className="sc-error" role="alert">{error}</p>}

            {item.official ? (
              <p className="sc-note"><i className="ti ti-bolt" /> Takes effect as soon as you pay. Not refundable once applied.</p>
            ) : (
              <p className="sc-note">
                <i className="ti ti-shield-check" /> Buyer protection: OgaPay holds your payment. The seller gets it when you confirm you received the order, or 3 days after they mark it delivered. Something wrong? Report it before then and the money stays on hold.
              </p>
            )}
            <p className="sc-fine">By paying you agree to the <Link to="/terms">Terms of Service</Link>.</p>
          </aside>
        </div>
      </div>
      {topUp && <FundWalletModal initialStep="deposit" initialTab={item.currency === 'NGN' ? 'bank' : 'crypto'} onClose={() => { setTopUp(false); refresh() }} onDone={() => refresh()} />}
    </Layout>
  )
}
