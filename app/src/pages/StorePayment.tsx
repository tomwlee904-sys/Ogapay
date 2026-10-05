import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import Avatar from '../components/Avatar'
import FundWalletModal from '../components/FundWalletModal'
import { itemCategoryLabel } from '../components/ItemCover'
import { useAuth } from '../context/AuthContext'
import { useWalletBalance } from '../context/WalletBalanceContext'
import { API_BASE, apiRequest, getAccessToken } from '../lib/api'
import { CURRENCY_SYMBOLS, type Currency } from '../lib/currency'
import { sized } from '../lib/img'
import { uploadImage } from '../lib/upload'
import '../styles/checkout.css'

// Store checkout, in the steps wurk.fun uses: Product > Order details > Payment.
//  - Order details: an optional brief and attachments for the seller, with the
//    product, the seller and the order total.
//  - Payment: from the buyer's OgaPay wallet in the item's currency (there's no
//    other payment path); short of money, "Add money" opens the wallet top-up.
// The brief and attachment links become the first message in the buyer's
// private chat with the seller once the order is paid. OgaPay's own items (perks)
// have no seller, so they skip straight to payment.

type Item = {
  id: string; title: string; description: string; price: number; currency: Currency
  seller: string; sellerId?: string; sellerAvatar: string | null; image: string
  stock: number | null; isActive?: boolean; category?: string; official?: boolean
  metadata?: { delivery?: string; revisions?: number; subcategory?: string }
}
type Seller = { username: string; name: string; avatarUrl: string | null; bio: string | null; rating: number; reviews: number }
type MyJob = { id: string; title: string; status: string; expiresAt?: string | null; hiredWorkerId?: string | null }
type Upload = { name: string; url: string }

// OgaPay's own items (no seller): what each one does, and what's permanent
const PERKS: Record<string, { kind: string; what: string; permanent?: boolean }> = {
  BADGE: { kind: 'PREMIUM_BADGE', what: 'A Premium badge next to your name on your profile, jobs and the workers list.', permanent: true },
  COSMETIC: { kind: 'WORKER_FRAME', what: 'A frame around your profile photo on your profile and in the workers list.', permanent: true },
  SERVICE: { kind: 'PRIORITY_SUPPORT', what: 'Your support tickets go to the top of our queue for 30 days. Buying again adds 30 days.' },
  BOOST: { kind: 'TASK_BOOST', what: 'Your chosen open job is listed first on the jobs page for 24 hours, with a Boosted tag.' },
}

const BRIEF_MAX = 4000 // the chat message holds 5,000 characters, links included
const MAX_FILES = 5

const money = (n: number, c: Currency) =>
  `${CURRENCY_SYMBOLS[c] || ''}${n.toLocaleString('en-US', { minimumFractionDigits: c === 'NGN' ? 0 : 2, maximumFractionDigits: c === 'SOL' ? 4 : 2 })}${c === 'NGN' ? '' : ' ' + c}`

// The brief survives a reload or a trip back to the product page
const draftKey = (id: string) => `ogapay_order_draft_${id}`
const readDraft = (id: string): { brief: string; files: Upload[] } => {
  try { const d = JSON.parse(sessionStorage.getItem(draftKey(id)) || ''); return { brief: String(d.brief || ''), files: Array.isArray(d.files) ? d.files : [] } } catch { return { brief: '', files: [] } }
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
  const { balances, refresh } = useWalletBalance()
  const [item, setItem] = useState<Item | null>(null)
  const [seller, setSeller] = useState<Seller | null>(null)
  const [loadError, setLoadError] = useState('')
  const [topUp, setTopUp] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [more, setMore] = useState(false)
  // Order details
  const [brief, setBrief] = useState(() => readDraft(id).brief)
  const [files, setFiles] = useState<Upload[]>(() => readDraft(id).files)
  const [uploading, setUploading] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
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

  const available = balances?.[item.currency]?.available ?? 0
  const short = Math.max(0, item.price - available)
  const own = !!user && !item.official && item.sellerId === user.id
  const soldOut = item.isActive === false || item.stock === 0
  const alreadyHave = !!perk?.permanent && owned.includes(perk.kind)
  const needJob = perk?.kind === 'TASK_BOOST' && !jobId
  const canPay = !own && !soldOut && !alreadyHave && !needJob && short === 0 && !paying
  const delivery = item.metadata?.delivery || '3 days'
  const revisions = item.metadata?.revisions ?? 3
  const category = [itemCategoryLabel(item.category, item.title), item.metadata?.subcategory].filter(Boolean).join(' / ')

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return
    setFileError('')
    const room = MAX_FILES - files.length
    const pick = Array.from(list).slice(0, room)
    if (list.length > room) setFileError(`Up to ${MAX_FILES} files.`)
    setUploading(true)
    for (const f of pick) {
      if (f.size > 10 * 1024 * 1024) { setFileError(`${f.name} is over 10 MB.`); continue }
      try {
        const url = await uploadImage(f, 'task-attachments')
        setFiles((prev) => [...prev, { name: f.name, url }])
      } catch (e: any) {
        setFileError(`${f.name}: ${e?.message || 'upload failed'}`)
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // The brief and attachments, as the first message to the seller
  const briefMessage = () => {
    const parts = [`Order brief for "${item.title}":`]
    if (brief.trim()) parts.push(brief.trim())
    if (files.length) parts.push('Attachments:\n' + files.map((f) => `${f.name}: ${f.url}`).join('\n'))
    return parts.join('\n\n')
  }

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
      // Send the brief; if that fails the order still stands and they can send it in the chat
      let briefSent = true
      if ((brief.trim() || files.length) && order.conversationId) {
        briefSent = await apiRequest('/messages', { method: 'POST', body: JSON.stringify({ conversationId: order.conversationId, content: briefMessage() }) }).then(() => true, () => false)
      }
      try { sessionStorage.removeItem(draftKey(item.id)) } catch { /* storage off */ }
      navigate(`/orders/${order.id}`, { replace: true, state: { title: item.title, seller: item.seller, total: item.price, currency: item.currency, conversationId: order.conversationId, briefSent: (brief.trim() || files.length) ? briefSent : undefined } })
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

  const blocked = own ? "This is your own product, so you can't buy it." : soldOut ? "This product isn't available right now." : alreadyHave ? 'You already have this.' : ''

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
          <div><span><i className="ti ti-refresh" aria-hidden="true" /> Revisions</span><b>{revisions}</b></div>
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
                <p className="sc-lead" style={{ marginTop: 4 }}>Up to {MAX_FILES} files, 10 MB each.</p>
                <div className="sc-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}>
                  <i className="ti ti-upload" aria-hidden="true" />
                  <span>Drop files here or choose them from your device.</span>
                  <button type="button" className="ui-btn ui-btn-ghost" disabled={uploading || files.length >= MAX_FILES} onClick={() => fileRef.current?.click()}>
                    <i className="ti ti-paperclip" aria-hidden="true" /> {uploading ? 'Uploading…' : 'Choose files'}
                  </button>
                  <small>Images and PDF files.</small>
                  <input ref={fileRef} type="file" hidden multiple accept="image/*,application/pdf" onChange={(e) => addFiles(e.target.files)} />
                </div>
                {fileError && <p className="sc-error" role="alert">{fileError}</p>}
                {files.length > 0 && (
                  <ul className="sc-files">
                    {files.map((f) => (
                      <li key={f.url}>
                        <i className="ti ti-file" aria-hidden="true" /><span>{f.name}</span>
                        <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y.url !== f.url))}><i className="ti ti-x" aria-hidden="true" /></button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="sc-note"><i className="ti ti-lock" aria-hidden="true" /> Your brief and attachments go to the seller in your private chat once you pay.</p>
              </section>
            </div>

            <aside className="sc-side">
              {ProductCard}
              <section className="ui-card ui-card-pad">
                <h2 className="sc-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="ti ti-receipt" aria-hidden="true" /> Order summary</h2>
                <div className="sc-line total" style={{ marginTop: 6 }}><span>Order total</span><span>{money(item.price, item.currency)}</span></div>
                <p className="sc-fine" style={{ marginTop: 0 }}>No fees for buyers.</p>
                <p className="sc-note"><i className="ti ti-shield-check" aria-hidden="true" /> Buyer protection: OgaPay holds your payment until you confirm you received the order.</p>
                {blocked && <p className="sc-note warn"><i className="ti ti-info-circle" aria-hidden="true" /> {blocked}</p>}
                <button className="ui-btn ui-btn-dark ui-btn-lg sc-pay" disabled={!!blocked || uploading} onClick={() => setParams({ step: 'pay' })}>
                  Proceed to payment <i className="ti ti-arrow-right" aria-hidden="true" />
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
                    <b>{money(item.price, item.currency)}</b>
                  </div>

                  <div className="sc-opt-head"><span className="n">1</span> Pay from your OgaPay wallet</div>
                  <div className="sc-method">
                    <span className="sc-method-ic"><i className="ti ti-wallet" aria-hidden="true" /></span>
                    <div className="sc-method-t">
                      <strong>Your {item.currency} wallet</strong>
                      <span>Available: {money(available, item.currency)}</span>
                    </div>
                    <span className={`sc-state${short ? ' warn' : ''}`}>{short ? 'Not enough' : 'Ready'}</span>
                  </div>
                  <button className="ui-btn ui-btn-dark ui-btn-lg sc-pay" disabled={!canPay} onClick={pay}>
                    {paying ? <><i className="ti ti-loader-2 sc-spin" aria-hidden="true" /> Paying…</> : <>Pay {money(item.price, item.currency)}</>}
                  </button>
                  {error && <p className="sc-error" role="alert">{error}</p>}
                  {blocked && <p className="sc-note warn"><i className="ti ti-info-circle" aria-hidden="true" /> {blocked}</p>}

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
                  <div className="sc-line"><span>{item.title}</span><span>{money(item.price, item.currency)}</span></div>
                  {!item.official && <div className="sc-line"><span>Seller</span><span>@{item.seller}</span></div>}
                  {!item.official && <div className="sc-line"><span>Delivery</span><span>{delivery}</span></div>}
                  <div className="sc-line"><span>Fees</span><span>None</span></div>
                  <div className="sc-line total"><span>Total</span><span>{money(item.price, item.currency)}</span></div>
                  {!item.official && (
                    <div className="sc-brief-sum">
                      <div className="sc-sec-head"><span className="ui-label" style={{ margin: 0 }}>Your brief</span><button type="button" className="sc-more" onClick={() => setParams({})}>Edit</button></div>
                      {brief.trim() ? <p>{brief.trim()}</p> : <p className="empty">No message. You can still talk to the seller in your chat after paying.</p>}
                      {files.length > 0 && <small><i className="ti ti-paperclip" aria-hidden="true" /> {files.length} attachment{files.length === 1 ? '' : 's'}</small>}
                    </div>
                  )}
                  {item.official
                    ? <p className="sc-note"><i className="ti ti-bolt" aria-hidden="true" /> Takes effect as soon as you pay. Not refundable once applied.</p>
                    : <p className="sc-note"><i className="ti ti-shield-check" aria-hidden="true" /> Buyer protection: the seller gets your payment when you confirm you received the order, or 3 days after they mark it delivered. Something wrong? Report it before then and the money stays on hold.</p>}
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
