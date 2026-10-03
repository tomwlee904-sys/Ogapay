import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { useWalletBalance } from '../context/WalletBalanceContext'
import '../styles/profile-public.css'
import '../styles/my-store.css'

// What the user bought in the store. The payment is held by OgaPay until they
// confirm they received it, or 3 days after the seller marks it delivered; until
// then they can report a problem (or cancel, before the seller starts).

export type StoreOrder = {
  id: string; quantity: number; total: number; currency: string; createdAt: string
  status: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'DISPUTED' | 'COMPLETED' | 'CANCELLED'
  protected: boolean; held: boolean
  deliveredAt: string | null; releaseAt: string | null; releasedAt: string | null; refundedAt: string | null
  disputedAt: string | null; disputeReason: string | null
  product: { id: string; name: string; imageUrl: string | null }
  conversationId: string | null
}
type Bought = StoreOrder & { seller: { username: string; name: string; avatarUrl: string | null } | null }

export const orderMoney = (n: number, cur = 'NGN') =>
  cur === 'NGN' ? '₦' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) : `${Number(n).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${cur}`
export const orderWhen = (d: string) =>
  new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Status chip for either side of the order
export function orderBadge(o: StoreOrder): { label: string; cls: string } {
  switch (o.status) {
    case 'IN_PROGRESS': return { label: 'In progress', cls: 'work' }
    case 'DELIVERED': return { label: 'Delivered', cls: 'done' }
    case 'DISPUTED': return { label: 'Problem reported', cls: 'bad' }
    case 'COMPLETED': return { label: 'Completed', cls: 'done' }
    case 'CANCELLED': return { label: 'Refunded', cls: '' }
    default: return { label: 'New', cls: '' }
  }
}

const isOpen = (o: StoreOrder) => o.held || o.status === 'PENDING' || o.status === 'IN_PROGRESS'

export default function StoreOrders() {
  const { refresh } = useWalletBalance()
  const [orders, setOrders] = useState<Bought[] | null>(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [show, setShow] = useState<'open' | 'all'>('open')
  const [reporting, setReporting] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const load = () => apiRequest<Bought[]>('/store/my-purchases')
    .then((d) => setOrders(Array.isArray(d) ? d : []))
    .catch((e: any) => { setOrders([]); setError(e?.message || "Couldn't load your orders.") })
  useEffect(() => { load() }, [])

  const act = async (o: Bought, path: string, done: string, body?: object) => {
    setBusy(o.id); setError(''); setNote('')
    try {
      await apiRequest(`/store/orders/${o.id}/${path}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
      setNote(done); setReporting(null); setReason('')
      await load(); refresh()
    } catch (e: any) { setError(e?.message || 'Something went wrong. Try again.') }
    setBusy('')
  }
  const confirmReceived = (o: Bought) => {
    if (!window.confirm(`Release ${orderMoney(o.total, o.currency)} to @${o.seller?.username || 'the seller'}? Only confirm if you received what you paid for. This can't be undone.`)) return
    act(o, 'confirm', 'Thanks. The payment is now with the seller.')
  }
  const cancel = (o: Bought) => {
    if (!window.confirm(`Cancel your order for "${o.product.name}"? ${orderMoney(o.total, o.currency)} goes back to your wallet.`)) return
    act(o, 'cancel', 'Order cancelled. The money is back in your wallet.')
  }

  const list = (orders || []).filter((o) => show === 'all' || isOpen(o))
  const openCount = (orders || []).filter(isOpen).length
  const heldTotal = (orders || []).filter((o) => o.held).reduce<Record<string, number>>((by, o) => ({ ...by, [o.currency]: (by[o.currency] || 0) + o.total }), {})

  return (
    <Layout>
      <div className="up-wrap">
        <div className="ms2-head">
          <div>
            <h1>My orders</h1>
            <p>What you bought in the store. Your payment is held by OgaPay until you confirm you received it.</p>
          </div>
          <div className="acts">
            <Link className="up-btn" to="/store"><i className="ti ti-building-store" /> Browse the store</Link>
          </div>
        </div>

        <div className="up-card so-how">
          <i className="ti ti-shield-check" aria-hidden="true" />
          <div>
            <b>How buyer protection works</b>
            <p>
              The seller gets your payment when you press <b>Confirm received</b>, or 3 days after they mark the order delivered.
              If something is wrong, report a problem before then and the payment stays on hold while OgaPay looks into it.
              {Object.keys(heldTotal).length > 0 && <> Held for you now: <b>{Object.entries(heldTotal).map(([c, v]) => orderMoney(v, c)).join(' · ')}</b>.</>}
            </p>
          </div>
        </div>

        <div className="up-tabs-row" style={{ marginTop: 0 }}>
          <div className="up-tabs" role="tablist">
            <button role="tab" aria-selected={show === 'open'} className={`up-tab ${show === 'open' ? 'on' : ''}`} onClick={() => setShow('open')}><i className="ti ti-clock" /> Open {openCount ? <em>{openCount}</em> : null}</button>
            <button role="tab" aria-selected={show === 'all'} className={`up-tab ${show === 'all' ? 'on' : ''}`} onClick={() => setShow('all')}><i className="ti ti-receipt" /> All {orders?.length ? <em>{orders.length}</em> : null}</button>
          </div>
        </div>

        {note && <div className="up-note ok" role="status" style={{ marginBottom: 12 }}><i className="ti ti-circle-check" /> {note}</div>}
        {error && <div className="up-note err" role="alert" style={{ marginBottom: 12 }}>{error}</div>}

        {orders === null ? <div className="up-skel" style={{ height: 140 }} />
          : list.length === 0 ? (
            <div className="up-empty">
              <i className="ti ti-shopping-bag" />
              {orders.length === 0 ? 'You haven\'t bought anything yet.' : 'No open orders. Everything you bought is settled.'}
              {orders.length === 0 && <div style={{ marginTop: 14 }}><Link className="up-btn primary" to="/store">Browse the store</Link></div>}
            </div>
          ) : list.map((o) => {
            const b = orderBadge(o)
            const payState = !o.protected ? 'paid at purchase' : o.refundedAt ? 'refunded' : o.releasedAt ? 'paid to seller' : 'held by OgaPay'
            return (
              <div className="up-card ms2-order" key={o.id}>
                <div className="who">
                  <span className="ms2-thumb so-thumb">{o.product.imageUrl ? <img src={o.product.imageUrl} alt="" loading="lazy" /> : <i className="ti ti-package" />}</span>
                  <div style={{ minWidth: 0 }}>
                    <b><Link to={`/store/${o.product.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{o.product.name}</Link>{o.quantity > 1 ? ` × ${o.quantity}` : ''}</b>
                    <small>
                      {o.seller ? <>from <Link to={`/user/${o.seller.username}`} style={{ color: 'var(--text2)' }}>@{o.seller.username}</Link> · </> : null}
                      {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </small>
                  </div>
                </div>
                <div className="amt">{orderMoney(o.total, o.currency)}<small>{payState}</small></div>

                {o.held && o.status === 'DELIVERED' && o.releaseAt && (
                  <p className="so-line"><i className="ti ti-clock" aria-hidden="true" /><span>The seller marked this delivered. Confirm you received it, or report a problem before <b>{orderWhen(o.releaseAt)}</b>. After that the payment goes to the seller.</span></p>
                )}
                {o.held && (o.status === 'PENDING' || o.status === 'IN_PROGRESS') && (
                  <p className="so-line"><i className="ti ti-shield-check" aria-hidden="true" /><span>{o.status === 'PENDING' ? 'Waiting for the seller to start. You can still cancel.' : 'The seller is working on it.'} Your payment is held until you confirm.</span></p>
                )}
                {o.status === 'DISPUTED' && (
                  <p className="so-line bad"><i className="ti ti-alert-triangle" aria-hidden="true" /><span>You reported: "{o.disputeReason}" The payment is on hold while OgaPay reviews it. Keep talking to the seller in your chat.</span></p>
                )}

                {reporting === o.id ? (
                  <div className="so-report">
                    <label htmlFor={`why-${o.id}`}>What went wrong?</label>
                    <textarea id={`why-${o.id}`} rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)}
                      placeholder="For example: the files never arrived, or it isn't what the listing described." />
                    <div className="row-acts" style={{ gridColumn: 'auto' }}>
                      <button className="up-btn primary" disabled={busy === o.id || reason.trim().length < 10} onClick={() => act(o, 'dispute', 'Problem reported. The payment stays on hold while OgaPay reviews it.', { reason })}>
                        {busy === o.id ? 'Sending…' : 'Report problem'}
                      </button>
                      <button className="up-btn" disabled={busy === o.id} onClick={() => { setReporting(null); setReason('') }}>Never mind</button>
                      {reason.trim().length < 10 && <small style={{ color: 'var(--text3)' }}>At least 10 characters.</small>}
                    </div>
                  </div>
                ) : (
                  <div className="row-acts">
                    <span className={`ms2-badge ${b.cls}`}>{b.label}</span>
                    <span style={{ flex: 1 }} />
                    {o.conversationId && <Link className="up-btn" to={`/messages?c=${o.conversationId}`}><i className="ti ti-message" /> Message seller</Link>}
                    {o.held && o.status === 'PENDING' && <button className="up-btn" disabled={busy === o.id} onClick={() => cancel(o)}>Cancel order</button>}
                    {o.held && o.status !== 'DISPUTED' && <button className="up-btn" disabled={busy === o.id} onClick={() => { setReporting(o.id); setReason('') }}>Report a problem</button>}
                    {o.held && <button className="up-btn primary" disabled={busy === o.id} onClick={() => confirmReceived(o)}><i className="ti ti-check" /> Confirm received</button>}
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </Layout>
  )
}
