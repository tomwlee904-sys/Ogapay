import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'
import { useWalletBalance } from '../context/WalletBalanceContext'
import '../styles/profile-public.css'
import '../styles/my-store.css'
import { sized } from '../lib/img'
import { StoreTabs, RowMenu, type MenuItem } from '../components/store/StoreUi'

// What the user bought in the store. The payment is held by OgaPay until they
// confirm they received it, or 3 days after the seller marks it delivered; until
// then they can report a problem (or cancel, before the seller starts).

export type StoreOrder = {
  id: string; quantity: number; total: number; currency: string; createdAt: string
  status: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'DISPUTED' | 'COMPLETED' | 'CANCELLED'
  protected: boolean; held: boolean
  deliveredAt: string | null; releaseAt: string | null; releasedAt: string | null; refundedAt: string | null
  disputedAt: string | null; disputeReason: string | null
  // available: false once the seller deletes the product; the order keeps its name, price and picture
  product: { id: string; name: string; imageUrl: string | null; price?: number; available?: boolean }
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
  const [loadFailed, setLoadFailed] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [show, setShow] = useState<'open' | 'all'>('open')
  const [reporting, setReporting] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  // A failed load keeps what was shown; on the first load it shows Try again, never "nothing bought"
  const load = () => apiRequest<Bought[]>('/store/my-purchases')
    .then((d) => { setOrders(Array.isArray(d) ? d : []); setLoadFailed(false) })
    .catch(() => setLoadFailed(true))
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

  const heldLine = Object.entries(heldTotal).map(([c, v]) => orderMoney(v, c)).join(' · ')
  const heldCount = (orders || []).filter((o) => o.held).length

  // The side panel: what OgaPay holds for you and how buyer protection works.
  // Desktop: beside the list, staying in view. Phone and tablet: above the list, one line folded.
  const Side = (
    <aside className="ui-split-side ui-split-side-first so-side">
      {heldLine && (
        <div className="ui-card so-held">
          <span>Held for you now</span>
          <b>{heldLine}</b>
          <small>in {heldCount} order{heldCount === 1 ? '' : 's'}, until you confirm</small>
        </div>
      )}
      <details className="ui-card so-how">
        <summary><i className="ti ti-shield-check" aria-hidden="true" /> Your payment is held until you confirm. <u>How it works</u></summary>
        <p>
          The seller gets your payment when you press <b>Confirm received</b>, or 3 days after they mark the order delivered.
          If something is wrong, report a problem before then and the payment stays on hold while OgaPay looks into it.
        </p>
        <Link className="ui-btn ui-btn-ghost so-browse" to="/store"><i className="ti ti-building-store" /> Browse the store</Link>
      </details>
    </aside>
  )

  return (
    <Layout>
      <div className="ui-page so-page">
        <header className="ui-head">
          <div>
            <h1 className="ui-title" style={{ marginTop: 0 }}>My orders</h1>
            <p className="ui-sub">What you bought in the store, and where each order is.</p>
          </div>
        </header>
        <StoreTabs active="orders" />

        <div className="ui-split so-split">
          <div className="so-main">
            {orders !== null && (
              <div className="st-seg so-filter" role="tablist" aria-label="Orders">
                <button role="tab" aria-selected={show === 'open'} className={show === 'open' ? 'on' : ''} onClick={() => setShow('open')}>Open {openCount ? <em>{openCount}</em> : null}</button>
                <button role="tab" aria-selected={show === 'all'} className={show === 'all' ? 'on' : ''} onClick={() => setShow('all')}>All {orders.length ? <em>{orders.length}</em> : null}</button>
              </div>
            )}

            {note && <div className="up-note ok" role="status" style={{ marginBottom: 12 }}><i className="ti ti-circle-check" /> {note}</div>}
            {error && <div className="up-note err" role="alert" style={{ marginBottom: 12 }}>{error}</div>}

            {orders === null ? (loadFailed ? <LoadError what="your orders" onRetry={() => { setLoadFailed(false); load() }} /> : <div className="ui-sk" style={{ height: 160 }} />)
              : list.length === 0 ? (
                <div className="ui-empty">
                  <strong>{orders.length === 0 ? "You haven't bought anything yet" : 'No open orders'}</strong>
                  {orders.length === 0 ? 'What you buy in the store shows here, with its payment held until you confirm.' : 'Everything you bought is settled. See them all under All.'}
                  {orders.length === 0 && <div style={{ marginTop: 14 }}><Link className="ui-btn ui-btn-dark" to="/store">Browse the store</Link></div>}
                </div>
              ) : list.map((o) => {
                const b = orderBadge(o)
                const payState = !o.protected ? 'paid at purchase' : o.refundedAt ? 'refunded' : o.releasedAt ? 'paid to seller' : 'held by OgaPay'
                const delivered = o.held && o.status === 'DELIVERED'
                // One main action for the order's state; the rest in the ⋯ menu.
                // Releasing money or cancelling still asks first (confirmReceived / cancel).
                const menu: MenuItem[] = []
                if (o.held && !delivered) menu.push({ label: 'Confirm received', icon: 'ti-check', disabled: busy === o.id, onSelect: () => confirmReceived(o) })
                if (o.held && o.status !== 'DISPUTED' && !delivered) menu.push({ label: 'Report a problem', icon: 'ti-alert-triangle', disabled: busy === o.id, onSelect: () => { setReporting(o.id); setReason('') } })
                if (o.held && o.status === 'PENDING') menu.push({ label: 'Cancel order', icon: 'ti-x', danger: true, disabled: busy === o.id, onSelect: () => cancel(o) })
                return (
                  <div className="up-card ms2-order so-order" key={o.id}>
                    <div className="who">
                      <span className="ms2-thumb so-thumb">{o.product.imageUrl ? <img src={sized(o.product.imageUrl, 44, true)} alt="" loading="lazy" /> : <i className="ti ti-package" />}</span>
                      <div style={{ minWidth: 0 }}>
                        <b className="so-name">
                          <Link to={o.product.available === false ? `/orders/${o.id}` : `/store/${o.product.id}`}>{o.product.name}</Link>{o.quantity > 1 ? ` × ${o.quantity}` : ''}
                          <span className={`ms2-badge ${b.cls}`}>{b.label}</span>
                        </b>
                        <small>
                          {o.seller ? <>from <Link className="tap" to={`/user/${o.seller.username}`} style={{ color: 'var(--text2)' }}>@{o.seller.username}</Link> · </> : null}
                          {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </small>
                      </div>
                    </div>
                    <div className="amt">{orderMoney(o.total, o.currency)}<small>{payState}</small></div>

                    {delivered && o.releaseAt && (
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
                        <div className="so-acts">
                          <button className="ui-btn ui-btn-dark" disabled={busy === o.id || reason.trim().length < 10} onClick={() => act(o, 'dispute', 'Problem reported. The payment stays on hold while OgaPay reviews it.', { reason })}>
                            {busy === o.id ? 'Sending…' : 'Report problem'}
                          </button>
                          <button className="ui-btn ui-btn-ghost" disabled={busy === o.id} onClick={() => { setReporting(null); setReason('') }}>Never mind</button>
                          {reason.trim().length < 10 && <small style={{ color: 'var(--text3)' }}>At least 10 characters.</small>}
                        </div>
                      </div>
                    ) : (
                      <div className="so-acts">
                        {delivered ? (
                          <>
                            <button className="ui-btn ui-btn-dark so-main-btn" disabled={busy === o.id} onClick={() => confirmReceived(o)}><i className="ti ti-check" /> Confirm received</button>
                            <button className="ui-btn ui-btn-ghost" disabled={busy === o.id} onClick={() => { setReporting(o.id); setReason('') }}>Report a problem</button>
                            {o.conversationId && <Link className="ui-btn ui-btn-ghost" to={`/messages?c=${o.conversationId}`}><i className="ti ti-message" /> Message</Link>}
                          </>
                        ) : (
                          o.conversationId && <Link className="ui-btn ui-btn-ghost" to={`/messages?c=${o.conversationId}`}><i className="ti ti-message" /> Message seller</Link>
                        )}
                        <RowMenu label={`More actions for ${o.product.name}`} items={menu} />
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
          {Side}
        </div>
      </div>
    </Layout>
  )
}
