import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import FundWalletModal from '../components/FundWalletModal'
import { itemCategoryLabel } from '../components/ItemCover'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { API_BASE, apiRequest, getAccessToken, invalidateInFlight } from '../lib/api'
import { CURRENCY_SYMBOLS, type Currency } from '../lib/currency'
import { sized } from '../lib/img'
import { ORDER_FILE_ACCEPT, ORDER_FILE_MB, uploadOrderFile, type OrderFile } from '../lib/upload'
import { newKey } from '../lib/wallet'
import '../styles/checkout.css'

// Store checkout, in the steps wurk.fun uses: Product > Order details > Payment.
//  - Order details: an optional brief and attachments for the seller, with the
//    product, the seller and the order total.
//  - Payment: from the buyer's OgaPay wallet in the item's currency (there's no
//    other payment path); short of money, "Add money" opens the wallet top-up.
// 2026-11-10: the brief and attachments are sent with Pay and saved on the order
// in the same step as the payment (the server also posts them in the chat), so
// they can't be lost. Attachments go to private storage, never public links.
// OgaPay's own items (perks) have no seller, so they skip straight to payment.
// 2026-11-10 (B7, F15): a physical item asks for the delivery details (sent with
// Pay and saved on the order, seen only by the buyer, the seller and OgaPay) and
// lets the buyer pick a quantity, up to the stock left (100 at most).

type Item = {
  id: string; title: string; description: string; price: number; currency: Currency
  seller: string; sellerId?: string; sellerAvatar: string | null; image: string
  stock: number | null; isActive?: boolean; category?: string; official?: boolean
  metadata?: { delivery?: string; revisions?: number; subcategory?: string }
  productKind?: 'DIGITAL' | 'SERVICE' | 'PHYSICAL' | null
}
type Shipping = { name: string; phone: string; address: string; city: string; state: string; country: 'NG' | 'GH' }
// The same checks as the server (storeOrder.service cleanShipping)
const SHIP_FIELDS: [keyof Omit<Shipping, 'country'>, string, number, number, string][] = [
  ['name', 'Full name', 2, 80, 'name'], ['phone', 'Phone number', 7, 20, 'tel'], ['address', 'Address', 5, 200, 'street-address'],
  ['city', 'City or town', 2, 60, 'address-level2'], ['state', 'State or region', 2, 60, 'address-level1'],
]
const shippingProblem = (a: Shipping) => {
  for (const [key, label, min, max] of SHIP_FIELDS) {
    const v = a[key].trim()
    if (v.length < min || v.length > max) return `Enter your ${label.toLowerCase()}.`
  }
  if (!/^\+?[\d\s()-]+$/.test(a.phone.trim()) || a.phone.replace(/\D/g, '').length < 7) return 'Enter a phone number the courier can call.'
  return ''
}
type Seller = { username: string; name: string; avatarUrl: string | null; bio: string | null; rating: number; reviews: number }
type MyJob = { id: string; title: string; status: string; expiresAt?: string | null; hiredWorkerId?: string | null }
// A file still uploading, or one that failed (kept so it can be tried again)
type Pending = { id: string; file: File; pct: number; error?: string }

// OgaPay's own items (no seller): what each one does, and what's permanent
const PERKS: Record<string, { kind: string; what: string; permanent?: boolean }> = {
  BADGE: { kind: 'PREMIUM_BADGE', what: 'A Premium badge next to your name on your profile, jobs and the workers list.', permanent: true },
  COSMETIC: { kind: 'WORKER_FRAME', what: 'A frame around your profile photo on your profile and in the workers list.', permanent: true },
  SERVICE: { kind: 'PRIORITY_SUPPORT', what: 'Your support tickets go to the top of our queue for 30 days. Buying again adds 30 days.' },
  BOOST: { kind: 'TASK_BOOST', what: 'Your chosen open job is listed first on the jobs page for 24 hours, with a Boosted tag.' },
}

const BRIEF_MAX = 10000 // saved on the order (2026-11-10)
const MAX_FILES = 5
const PARALLEL = 2 // uploads at a time

const money = (n: number, c: Currency) =>
  `${CURRENCY_SYMBOLS[c] || ''}${n.toLocaleString('en-US', { minimumFractionDigits: c === 'NGN' ? 0 : 2, maximumFractionDigits: c === 'SOL' ? 4 : 2 })}${c === 'NGN' ? '' : ' ' + c}`

// The brief survives a reload or a trip back to the product page
const draftKey = (id: string) => `ogapay_order_draft_${id}`
// (files saved by an older version had public links and no path: dropped)
const readDraft = (id: string): { brief: string; files: OrderFile[] } => {
  try {
    const d = JSON.parse(sessionStorage.getItem(draftKey(id)) || '')
    return { brief: String(d.brief || ''), files: Array.isArray(d.files) ? d.files.filter((f: any) => typeof f?.path === 'string').slice(0, MAX_FILES) : [] }
  } catch { return { brief: '', files: [] } }
}

function Steps({ step, itemId, official }: { step: 'details' | 'pay'; itemId: string; official?: boolean }) {
  const steps = official ? ['Product', 'Payment'] : ['Product', 'Order details', 'Payment']
  const at = official ? (step === 'pay' ? 1 : 0) : step === 'details' ? 1 : 2
  return (
    <ol className="sc-steps" aria-label="Checkout steps">
      {steps.map((s, i) => (
        <li key={s} className={i < at ? 'done' : i === at ? 'on' : ''} aria-current={i === at ? 'step' : undefined}>
          {i === 0 ? (
            <Link to={`/store/${itemId}`}><span className="n"><i className="ti ti-check" aria-hidden="true" /></span>{s}</Link>
          ) : (
            <><span className="n">{i < at ? <i className="ti ti-check" aria-hidden="true" /> : i + 1}</span>{s}</>
          )}
        </li>
      ))}
    </ol>
  )
}

export default function StorePayment() {
  const { id = '' } = useParams<{ id: string }>()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { balances, refresh, loading: balanceLoading, error: balanceError } = useWalletBalance()
  const [item, setItem] = useState<Item | null>(null)
  const [seller, setSeller] = useState<Seller | null>(null)
  const [loadError, setLoadError] = useState('')
  const [topUp, setTopUp] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [more, setMore] = useState(false)
  // Order details
  const [brief, setBrief] = useState(() => readDraft(id).brief)
  const [files, setFiles] = useState<OrderFile[]>(() => readDraft(id).files)
  const [pending, setPending] = useState<Pending[]>([])
  const [fileError, setFileError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  // OgaPay's own items
  const [owned, setOwned] = useState<string[]>([])
  const [jobs, setJobs] = useState<MyJob[] | null>(null)
  const [jobId, setJobId] = useState('')
  const [done, setDone] = useState<{ message: string; taskId?: string | null } | null>(null)
  // 2026-11-08: one key per checkout visit. The server keeps it on the order, so
  // a second tap after a timeout returns the first order instead of charging again
  const purchaseKey = useRef(newKey())
  // Set when the price changed after the page loaded: the new price is shown and
  // the buyer has to tap Pay again to agree to it
  const [priceChanged, setPriceChanged] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  // Physical items: how many, and where to send them
  const [qty, setQty] = useState(1)
  const [ship, setShip] = useState<Shipping>(() => ({ name: [user?.firstName, user?.lastName].filter(Boolean).join(' '), phone: '', address: '', city: '', state: '', country: user?.country === 'GH' ? 'GH' : 'NG' }))
  const [shipTried, setShipTried] = useState(false)

  useEffect(() => {
    if (!id) return
    // Signed in, the server's 30-second public copy is skipped: checkout shows the
    // price as it is now (2026-11-08)
    apiRequest<Item>('/store/' + id, { fresh: true })
      // A price-on-request product has no fixed price to pay: ask the seller instead
      .then((d: any) => { if (d?.priceOnRequest) setLoadError('This product is priced on request. Message the seller from the product page for a price.'); else setItem(d) })
      .catch((e: any) => setLoadError(e?.message || "This product couldn't be loaded"))
  }, [id])

  useEffect(() => {
    if (!item?.seller || item.official) return
    apiRequest<any>('/users/' + encodeURIComponent(item.seller), { auth: false })
      .then((d) => d?.username && setSeller({
        username: d.username,
        name: [d.firstName, d.lastName].filter(Boolean).join(' ') || d.username,
        avatarUrl: d.avatarUrl || null,
        bio: d.workerProfile?.bio || null,
        rating: Number(d.workerProfile?.avgRating || 0),
        reviews: Number(d.workerProfile?.totalRatings || 0),
      }))
      .catch(() => {})
  }, [item?.seller, item?.official])

  useEffect(() => {
    try { sessionStorage.setItem(draftKey(id), JSON.stringify({ brief, files })) } catch { /* storage off */ }
  }, [id, brief, files])

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

  // Perks have no order details; everything else starts there
  const step: 'details' | 'pay' = item?.official || params.get('step') === 'pay' ? 'pay' : 'details'
  useEffect(() => { window.scrollTo({ top: 0 }) }, [step])

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
          <div className="ui-sk" style={{ height: 28, width: 280 }} />
          <div className="sc-grid" style={{ marginTop: 24 }}>
            <div className="ui-sk" style={{ height: 360 }} />
            <div className="ui-sk" style={{ height: 300 }} />
          </div>
        </div>
      </Layout>
    )
  }

  // No balance yet (still loading, or the load failed) is not ₦0: don't say
  // "Not enough" until it's known (2026-11-08)
  const balanceKnown = balances != null
  const available = balances?.[item.currency]?.available ?? 0
  const physical = item.productKind === 'PHYSICAL' && !item.official
  const maxQty = physical ? Math.max(1, Math.min(item.stock ?? 100, 100)) : 1
  const quantity = Math.min(qty, maxQty)
  const total = Math.round(item.price * quantity * 1e8) / 1e8
  const shipError = physical ? shippingProblem(ship) : ''
  const short = balanceKnown ? Math.max(0, total - available) : 0
  const own = !!user && !item.official && item.sellerId === user.id
  const soldOut = item.isActive === false || item.stock === 0
  const alreadyHave = !!perk?.permanent && owned.includes(perk.kind)
  const needJob = perk?.kind === 'TASK_BOOST' && !jobId
  const canPay = !own && !soldOut && !alreadyHave && !needJob && !shipError && balanceKnown && short === 0 && !paying
  const delivery = item.metadata?.delivery || '3 days'
  const revisions = item.metadata?.revisions ?? 3
  const category = [itemCategoryLabel(item.category, item.title), item.metadata?.subcategory].filter(Boolean).join(' / ')

  // Each file uploads on its own with its progress, two at a time. A failed one
  // stays in the list with its reason, to try again or remove (2026-11-10).
  const uploading = pending.some((p) => !p.error)
  const runUploads = async (jobs: Pending[]) => {
    const queue = [...jobs]
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const { id: jobId, file } = job
        try {
          const saved = await uploadOrderFile(file, (pct) => setPending((prev) => prev.map((p) => (p.id === jobId ? { ...p, pct } : p))))
          setPending((prev) => prev.filter((p) => p.id !== jobId))
          setFiles((prev) => (prev.length < MAX_FILES ? [...prev, saved] : prev))
        } catch (e: any) {
          setPending((prev) => prev.map((p) => (p.id === jobId ? { ...p, error: e?.message || 'Upload failed' } : p)))
        }
      }
    }
    await Promise.all(Array.from({ length: PARALLEL }, worker))
  }
  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    setFileError('')
    const room = MAX_FILES - files.length - pending.length
    const all = Array.from(list)
    if (all.length > room) setFileError(`Up to ${MAX_FILES} files.`)
    const big = all.slice(0, Math.max(0, room)).filter((f) => f.size > ORDER_FILE_MB * 1024 * 1024)
    if (big.length) setFileError(`${big.map((f) => f.name).join(', ')} ${big.length === 1 ? 'is' : 'are'} over ${ORDER_FILE_MB} MB.`)
    const jobs = all.slice(0, Math.max(0, room)).filter((f) => f.size <= ORDER_FILE_MB * 1024 * 1024)
      .map((file) => ({ id: newKey(), file, pct: 0 }))
    if (fileRef.current) fileRef.current.value = ''
    if (!jobs.length) return
    setPending((prev) => [...prev, ...jobs])
    runUploads(jobs)
  }
  const retry = (p: Pending) => {
    const job = { ...p, pct: 0, error: undefined }
    setPending((prev) => prev.map((x) => (x.id === p.id ? job : x)))
    runUploads([job])
  }

  // After a placed order: the brief went with it, so open the order page
  const finish = async (order: { id: string; conversationId?: string | null }) => {
    refresh()
    try { sessionStorage.removeItem(draftKey(item.id)) } catch { /* storage off */ }
    navigate(`/orders/${order.id}`, { replace: true, state: { title: item.title, seller: item.seller, total, currency: item.currency, conversationId: order.conversationId } })
  }

  // The price or currency changed since the page loaded (409 PRICE_CHANGED): nothing
  // was charged. Show the new price; the buyer taps Pay again to agree to it.
  const onPriceChanged = (data: any) => {
    const was = money(item.price, item.currency)
    const price = Number(data?.price)
    const currency = (data?.currency || item.currency) as Currency
    if (Number.isFinite(price) && price > 0) setItem({ ...item, price, currency })
    else apiRequest<Item>('/store/' + item.id, { fresh: true }).then(setItem, () => {})
    setPriceChanged(was)
    refresh()
  }

  // No answer (timed out, connection dropped or a gateway error): the order may
  // still have gone through. Look for it before letting the buyer pay again.
  const recheck = async (startedAt: number) => {
    setChecking(true)
    refresh()
    try {
      // 2026-11-08: ask for the order this tap's key made, so an earlier order of
      // the same product is never shown as if this one worked
      const hit = await apiRequest<{ found: boolean; id?: string; itemId?: string; conversationId?: string | null; perk?: { taskId?: string | null } | null }>(
        `/store/my-purchases/by-key/${encodeURIComponent(purchaseKey.current)}`, { fresh: true })
      if (hit?.found && hit.id && hit.itemId === item.id) {
        if (item.official) { refresh(); setChecking(false); setDone({ message: 'Done. It has taken effect.', taskId: hit.perk?.taskId || undefined }); return }
        await finish({ id: hit.id, conversationId: hit.conversationId }); return
      }
    } catch (e: any) {
      // An older server without that lookup: look for a new order of this product
      if (e?.status === 404 && !item.official) {
        try {
          const list = await apiRequest<{ id: string; createdAt: string; conversationId: string | null; product: { id: string } }[]>('/store/my-purchases', { fresh: true })
          // Two minutes' slack for a phone clock that's a little off
          const placed = (Array.isArray(list) ? list : []).find((o) => o.product?.id === item.id && new Date(o.createdAt).getTime() >= startedAt - 120000)
          if (placed) { await finish(placed); return }
        } catch { /* still unknown: say so below */ }
      }
    }
    setChecking(false)
    setPaying(false)
    // The same key goes with the next tap, so trying again can't charge twice
    setError(item.official
      ? "We couldn't confirm your payment. Check your wallet history before you try again. Trying again won't charge you twice."
      : "We couldn't confirm your payment. Check My orders before you try again. Trying again won't charge you twice.")
  }

  const pay = async () => {
    if (paying) return
    setPaying(true); setError(''); setPriceChanged(null)
    const startedAt = Date.now()
    // What the buyer saw: the server refuses with PRICE_CHANGED if it's different
    const agreed = { expectedPrice: item.price, currency: item.currency, idempotencyKey: purchaseKey.current }
    try {
      if (item.official) {
        // Takes effect straight away; there's no seller or delivery
        let res: Response
        try {
          res = await fetch(`${API_BASE}/store/${item.id}/purchase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
            body: JSON.stringify(jobId ? { taskId: jobId, ...agreed } : agreed),
          })
        } finally { invalidateInFlight() }
        const json = await res.json().catch(() => ({}))
        if (res.status === 409 && json.code === 'PRICE_CHANGED') { onPriceChanged(json.data); setPaying(false); return }
        if (res.status >= 500) { await recheck(startedAt); return }
        if (!res.ok) throw Object.assign(new Error(json.message || 'Payment failed. You have not been charged.'), { status: res.status })
        refresh()
        setDone({ message: json.message || 'Done. It has taken effect.', taskId: json.data?.perk?.taskId })
        return
      }
      // The brief and files are saved on the order with the payment (2026-11-10)
      const order = await apiRequest<{ id: string; conversationId?: string }>(`/store/${item.id}/purchase`, {
        method: 'POST',
        body: JSON.stringify({
          quantity, ...agreed, ...(brief.trim() && { brief: brief.trim() }), ...(files.length && { attachments: files }),
          ...(physical && { shipping: { ...ship, name: ship.name.trim(), phone: ship.phone.trim(), address: ship.address.trim(), city: ship.city.trim(), state: ship.state.trim() } }),
        }),
      })
      await finish(order)
    } catch (e: any) {
      if (e?.status === 409 && (e.code === 'PRICE_CHANGED' || e.data?.price != null)) { onPriceChanged(e.data); setPaying(false); return }
      // No status: timed out or the connection dropped. 5xx: a gateway may have
      // given up after the server took the money. Either way, check first.
      if (!e?.status || e.status >= 500) { await recheck(startedAt); return }
      // The server said no, so nothing was taken
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

  const blocked = own ? "This is your own product, so you can't buy it." : item.isActive !== false && item.stock === 0 ? 'This product is sold out.' : soldOut ? "This product isn't available right now." : alreadyHave ? 'You already have this.' : ''

  const ProductCard = (
    <section className="ui-card ui-card-pad sc-side-card">
      <div className="sc-side-head"><h2>Your product</h2><Link to={`/store/${item.id}`}>View product <i className="ti ti-arrow-up-right" aria-hidden="true" /></Link></div>
      <div className="sc-prod">
        <div className="sc-thumb sm">{item.image ? <img src={sized(item.image, 96, true)} alt="" /> : <i className="ti ti-package" />}</div>
        <div style={{ minWidth: 0 }}>
          <b className="sc-prod-t">{item.title}</b>
          {category && <span className="sc-prod-c">{category}</span>}
        </div>
      </div>
      {!item.official && (
        <div className="sc-facts">
          <div><span><i className="ti ti-clock" aria-hidden="true" /> Delivery</span><b>{delivery}</b></div>
          {!physical && <div><span><i className="ti ti-refresh" aria-hidden="true" /> Revisions</span><b>{revisions >= 999 ? 'Unlimited' : revisions}</b></div>}
        </div>
      )}
      {(perk?.what || item.description) && (
        <>
          <p className={`sc-desc2${more ? ' open' : ''}`}>{perk ? perk.what : item.description}</p>
          {!perk && item.description.length > 180 && (
            <button type="button" className="sc-more" onClick={() => setMore(!more)}>{more ? 'Show less' : 'Read more'} <i className={`ti ti-chevron-${more ? 'up' : 'down'}`} aria-hidden="true" /></button>
          )}
        </>
      )}
      {!item.official && (
        <div className="sc-seller">
          <span className="ui-label">Your seller</span>
          <Link to={`/user/${item.seller}`} className="sc-seller-row">
            <Avatar src={seller?.avatarUrl || item.sellerAvatar} name={seller?.name || item.seller} size={40} />
            <span style={{ minWidth: 0 }}>
              <b>{seller?.name || '@' + item.seller} <i className="ti ti-arrow-up-right" aria-hidden="true" /></b>
              <small>{seller && seller.reviews > 0 ? `${seller.rating.toFixed(1)} / 5 · ${seller.reviews} review${seller.reviews === 1 ? '' : 's'}` : 'No reviews yet'}</small>
            </span>
          </Link>
          {seller?.bio && <p className="sc-seller-bio">{seller.bio}</p>}
        </div>
      )}
    </section>
  )

  return (
    <Layout>
      <div className="ui-page sc-wrap">
        <Steps step={step} itemId={item.id} official={item.official} />

        {step === 'details' ? (
          <div className="sc-grid">
            <div className="sc-main">
              {physical && (
                <section className="ui-card ui-card-pad">
                  <div className="sc-sec-head">
                    <h1 className="sc-h"><i className="ti ti-map-pin" aria-hidden="true" /> Delivery details</h1>
                  </div>
                  <p className="sc-lead">Where should the seller send it? Only the seller and OgaPay support see this.</p>
                  {SHIP_FIELDS.map(([key, label, min, max, auto]) => (
                    <div key={key}>
                      <label className="sc-label" htmlFor={`sc-ship-${key}`}>{label}</label>
                      <input id={`sc-ship-${key}`} className="ui-input" maxLength={max} autoComplete={auto} type={key === 'phone' ? 'tel' : 'text'} value={ship[key]}
                        aria-invalid={shipTried && ship[key].trim().length < min ? true : undefined}
                        onChange={(e) => setShip({ ...ship, [key]: e.target.value })} />
                    </div>
                  ))}
                  <label className="sc-label" htmlFor="sc-ship-country">Country</label>
                  <select id="sc-ship-country" className="ui-select" value={ship.country} onChange={(e) => setShip({ ...ship, country: e.target.value === 'GH' ? 'GH' : 'NG' })}>
                    <option value="NG">Nigeria</option>
                    <option value="GH">Ghana</option>
                  </select>
                  {shipTried && shipError && <p className="sc-error" role="alert">{shipError}</p>}
                </section>
              )}
              <section className="ui-card ui-card-pad">
                <div className="sc-sec-head">
                  <h1 className="sc-h"><i className="ti ti-file-pencil" aria-hidden="true" /> Message to the seller</h1>
                  <span className="sc-opt">Optional</span>
                </div>
                <p className="sc-lead">Add the requirements, goals or context the seller needs for your order.</p>
                <label className="sc-label" htmlFor="sc-brief">Your order brief</label>
                <textarea id="sc-brief" className="sc-brief" rows={8} maxLength={BRIEF_MAX} value={brief} onChange={(e) => setBrief(e.target.value)}
                  placeholder="Describe your preferred style, sizes, deadline or anything else the seller should know..." />
                <div className="sc-count">{brief.length.toLocaleString()} / {BRIEF_MAX.toLocaleString()}</div>

                <div className="sc-divider" />
                <div className="sc-sec-head">
                  <h2 className="sc-h2">Attachments</h2>
                  <span className="sc-opt">{files.length} / {MAX_FILES}</span>
                </div>
                <p className="sc-lead" style={{ marginTop: 4 }}>Up to {MAX_FILES} files, {ORDER_FILE_MB} MB each.</p>
                <div className="sc-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}>
                  <i className="ti ti-upload" aria-hidden="true" />
                  <span>Drop files here or choose them from your device.</span>
                  <button type="button" className="ui-btn ui-btn-ghost" disabled={files.length + pending.length >= MAX_FILES} onClick={() => fileRef.current?.click()}>
                    <i className="ti ti-paperclip" aria-hidden="true" /> Choose files
                  </button>
                  <small>Photos, voice notes, videos, PDF, Word, Excel or text files.</small>
                  <input ref={fileRef} type="file" hidden multiple accept={ORDER_FILE_ACCEPT} onChange={(e) => addFiles(e.target.files)} />
                </div>
                {fileError && <p className="sc-error" role="alert">{fileError}</p>}
                {(files.length > 0 || pending.length > 0) && (
                  <ul className="sc-files">
                    {files.map((f) => (
                      <li key={f.path}>
                        <i className="ti ti-file" aria-hidden="true" /><span>{f.name}</span>
                        <small className="sc-file-ok"><i className="ti ti-check" aria-hidden="true" /> Uploaded</small>
                        <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y.path !== f.path))}><i className="ti ti-x" aria-hidden="true" /></button>
                      </li>
                    ))}
                    {pending.map((p) => (
                      <li key={p.id} className={p.error ? 'err' : undefined}>
                        <i className={`ti ${p.error ? 'ti-alert-circle' : 'ti-loader-2 sc-spin'}`} aria-hidden="true" />
                        <span title={p.error || undefined}>{p.file.name}{p.error ? `: ${p.error}` : ''}</span>
                        {p.error
                          ? <button type="button" className="sc-file-retry" onClick={() => retry(p)}>Try again</button>
                          : <small aria-live="polite">{p.pct}%</small>}
                        {p.error && <button type="button" aria-label={`Remove ${p.file.name}`} onClick={() => setPending((x) => x.filter((y) => y.id !== p.id))}><i className="ti ti-x" aria-hidden="true" /></button>}
                        {!p.error && <span className="sc-file-bar" aria-hidden="true"><span style={{ width: `${p.pct}%` }} /></span>}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="sc-note"><i className="ti ti-lock" aria-hidden="true" /> Your brief and attachments are saved privately on your order when you pay. Only you, the seller and OgaPay support can see them.</p>
              </section>
            </div>

            <aside className="sc-side">
              {ProductCard}
              <section className="ui-card ui-card-pad">
                <h2 className="sc-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="ti ti-receipt" aria-hidden="true" /> Order summary</h2>
                {physical && (
                  <div className="sc-line" style={{ alignItems: 'center' }}>
                    <label htmlFor="sc-qty">Quantity{item.stock != null ? ` (${item.stock} left)` : ''}</label>
                    <select id="sc-qty" className="ui-select" style={{ width: 96 }} value={quantity} onChange={(e) => setQty(Number(e.target.value) || 1)}>
                      {Array.from({ length: maxQty }, (_, i) => i + 1).map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                )}
                {quantity > 1 && <div className="sc-line"><span>Price each</span><span>{money(item.price, item.currency)} × {quantity}</span></div>}
                <div className="sc-line total" style={{ marginTop: 6 }}><span>Order total</span><span>{money(total, item.currency)}</span></div>
                <p className="sc-fine" style={{ marginTop: 0 }}>No fees for buyers.</p>
                <p className="sc-note"><i className="ti ti-shield-check" aria-hidden="true" /> Buyer protection: OgaPay holds your payment until you confirm you received the order.</p>
                {blocked && <p className="sc-note warn"><i className="ti ti-info-circle" aria-hidden="true" /> {blocked}</p>}
                {physical && shipTried && shipError && <p className="sc-note warn"><i className="ti ti-info-circle" aria-hidden="true" /> Add your delivery details first.</p>}
                <button className="ui-btn ui-btn-dark ui-btn-lg sc-pay" disabled={!!blocked || uploading} onClick={() => { setShipTried(true); if (!shipError) setParams({ step: 'pay' }) }}>
                  {uploading ? 'Uploading your files…' : <>Proceed to payment <i className="ti ti-arrow-right" aria-hidden="true" /></>}
                </button>
              </section>
            </aside>
          </div>
        ) : (
          <>
            <div className="sc-terms">
              <span>By paying you agree to our Terms of Service.</span>
              <Link className="ui-btn ui-btn-ghost" to="/terms" target="_blank">Read terms</Link>
            </div>
            <div className="sc-grid">
              <div className="sc-main">
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
                  <h1 className="sc-h"><i className="ti ti-credit-card" aria-hidden="true" /> Payment details</h1>
                  <div className="sc-amount">
                    <span>Total to pay</span>
                    <b>{money(total, item.currency)}</b>
                  </div>

                  <div className="sc-opt-head"><span className="n">1</span> Pay from your OgaPay wallet</div>
                  <div className="sc-method">
                    <span className="sc-method-ic"><i className="ti ti-wallet" aria-hidden="true" /></span>
                    <div className="sc-method-t">
                      <strong>Your {item.currency} wallet</strong>
                      {balanceKnown
                        ? <span>Available: {money(available, item.currency)}</span>
                        : balanceError && !balanceLoading
                          ? <span>Couldn't load your balance. <button type="button" className="sc-more tap" style={{ marginTop: 0 }} onClick={() => refresh()}>Try again</button></span>
                          : <span>Checking your balance…</span>}
                    </div>
                    {balanceKnown && <span className={`sc-state${short ? ' warn' : ''}`}>{short ? 'Not enough' : 'Ready'}</span>}
                  </div>
                  {priceChanged && (
                    <p className="sc-note warn" role="alert"><i className="ti ti-info-circle" aria-hidden="true" /> The price changed from {priceChanged} to <b>{money(item.price, item.currency)}</b>. You have not been charged. Check it, then tap Pay again if you still want it.</p>
                  )}
                  <button className="ui-btn ui-btn-dark ui-btn-lg sc-pay" disabled={!canPay} onClick={pay}>
                    {checking ? <><i className="ti ti-loader-2 sc-spin" aria-hidden="true" /> Checking your order…</>
                      : paying ? <><i className="ti ti-loader-2 sc-spin" aria-hidden="true" /> Paying…</>
                      : <>{priceChanged ? 'Confirm and pay' : 'Pay'} {money(total, item.currency)}</>}
                  </button>
                  {error && <p className="sc-error" role="alert">{error}</p>}
                  {blocked && <p className="sc-note warn"><i className="ti ti-info-circle" aria-hidden="true" /> {blocked}</p>}
                  {shipError && !blocked && <p className="sc-note warn"><i className="ti ti-info-circle" aria-hidden="true" /> {shipError} <button type="button" className="sc-more" onClick={() => setParams({})}>Edit delivery details</button></p>}

                  <div className="sc-or"><span>or</span></div>

                  <div className="sc-opt-head"><span className="n">2</span> Add money, then pay</div>
                  <p className="sc-lead" style={{ marginTop: 0 }}>
                    {short > 0
                      ? <>You need <b>{money(short, item.currency)}</b> more. </>
                      : null}
                    {item.currency === 'NGN'
                      ? 'Top up by card or bank transfer (or to your own OgaPay account number once you’re verified). The money lands in your wallet and you come back here to pay.'
                      : `Send ${item.currency} to your OgaPay wallet address. It lands in your wallet and you come back here to pay.`}
                  </p>
                  <div className="sc-methods">
                    {item.currency === 'NGN' ? (
                      <>
                        <span><i className="ti ti-credit-card" aria-hidden="true" /> Card</span>
                        <span><i className="ti ti-building-bank" aria-hidden="true" /> Bank transfer</span>
                        <span><i className="ti ti-currency-dollar" aria-hidden="true" /> USDC</span>
                      </>
                    ) : (
                      <span><i className="ti ti-currency-solana" aria-hidden="true" /> {item.currency} on Solana</span>
                    )}
                  </div>
                  <button type="button" className="ui-btn ui-btn-ghost ui-btn-lg sc-pay" onClick={() => setTopUp(true)}><i className="ti ti-plus" aria-hidden="true" /> Add money</button>
                </section>
              </div>

              <aside className="sc-side">
                <section className="ui-card ui-card-pad">
                  <h2 className="sc-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="ti ti-list-details" aria-hidden="true" /> Overview</h2>
                  <div className="sc-line"><span>{item.title}{quantity > 1 ? ` × ${quantity}` : ''}</span><span>{money(total, item.currency)}</span></div>
                  {!item.official && <div className="sc-line"><span>Seller</span><span>@{item.seller}</span></div>}
                  {!item.official && <div className="sc-line"><span>Delivery</span><span>{delivery}</span></div>}
                  <div className="sc-line"><span>Fees</span><span>None</span></div>
                  <div className="sc-line total"><span>Total</span><span>{money(total, item.currency)}</span></div>
                  {physical && (
                    <div className="sc-brief-sum">
                      <div className="sc-sec-head"><span className="ui-label" style={{ margin: 0 }}>Deliver to</span><button type="button" className="sc-more" onClick={() => setParams({})}>Edit</button></div>
                      <p>{ship.name.trim()} · {ship.phone.trim()}{'\n'}{[ship.address, ship.city, ship.state].map((x) => x.trim()).filter(Boolean).join(', ')}, {ship.country === 'GH' ? 'Ghana' : 'Nigeria'}</p>
                    </div>
                  )}
                  {!item.official && (
                    <div className="sc-brief-sum">
                      <div className="sc-sec-head"><span className="ui-label" style={{ margin: 0 }}>Your brief</span><button type="button" className="sc-more" onClick={() => setParams({})}>Edit</button></div>
                      {brief.trim() ? <p>{brief.trim()}</p> : <p className="empty">No message. You can still talk to the seller in your chat after paying.</p>}
                      {files.length > 0 && <small><i className="ti ti-paperclip" aria-hidden="true" /> {files.length} attachment{files.length === 1 ? '' : 's'}</small>}
                    </div>
                  )}
                  {item.official
                    ? <p className="sc-note"><i className="ti ti-bolt" aria-hidden="true" /> Takes effect as soon as you pay. Not refundable once applied.</p>
                    : <p className="sc-note"><i className="ti ti-shield-check" aria-hidden="true" /> Buyer protection: the seller gets your payment when you confirm you received the order, or {physical ? '7 days after they mark it shipped' : '3 days after they mark it delivered'}. Something wrong? Report it before then and the money stays on hold.</p>}
                </section>
                {item.official && ProductCard}
              </aside>
            </div>
          </>
        )}
      </div>
      {topUp && <FundWalletModal initialStep="deposit" initialTab={item.currency === 'NGN' ? 'bank' : 'crypto'} onClose={() => { setTopUp(false); refresh() }} onDone={() => refresh()} />}
    </Layout>
  )
}
