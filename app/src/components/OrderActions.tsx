import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'
import type { OrderFile } from '../lib/upload'
import { useToast } from './Toast'
import OrderFilePicker from './OrderFilePicker'
import { canReviewOrder, orderMoney, type StoreOrder } from '../pages/StoreOrders'
import '../styles/profile-public.css'
import '../styles/my-store.css'
import '../styles/order-brief.css'

// What the buyer or the seller can do with one store order (2026-11-10). Used
// on My orders, the seller's orders in My Store and the order page, so all
// three offer the same steps:
//   buyer:  cancel (before the seller starts), report a problem (with files),
//           confirm received (once delivered), withdraw a report, review and
//           compliment the seller once it's finished
//   seller: start, mark delivered (a note or files are needed), cancel and
//           refund, and tell OgaPay their side of a reported problem
// 2026-11-10: the buyer can also ask for changes (while revisions last) and ask
// to cancel after the seller started (and withdraw that); the seller marks a
// physical item shipped (courier and tracking number), delivers changes, and
// accepts (refund) or declines a cancel request.
// The server checks every step again. onDone gets the message to show, and
// 'confirmed' when the buyer just paid the seller (to ask for a review).

export type ActionOrder = StoreOrder & { seller?: { username: string } | null; buyer?: { username: string } | null }
type Panel = 'report' | 'deliver' | 'reply' | 'revise' | 'cancelask' | 'ship' | null

const PANELS: Record<Exclude<Panel, null>, { label: string; max: number; files?: string; send: string; sending: string; placeholder: string; hint: string; min?: number }> = {
  report: {
    label: 'What went wrong?', max: 1000, files: 'Add photos or files (optional)', send: 'Report problem', sending: 'Sending…',
    placeholder: 'For example: the files never arrived, or it isn\'t what the listing described.',
    hint: 'At least 10 characters.',
  },
  deliver: {
    label: 'What did you deliver?', max: 5000, files: 'Add the files you delivered', send: 'Mark delivered', sending: 'Saving…',
    placeholder: 'For example: the final logo in PNG and PDF, sent in our chat. Or add the files here.',
    hint: 'Write at least 10 characters, or add a file.',
  },
  reply: {
    label: 'Your side, for OgaPay', max: 2000, files: 'Add proof (optional)', send: 'Send to OgaPay', sending: 'Sending…',
    placeholder: 'For example: I delivered on Monday and the buyer said it was fine in our chat.',
    hint: 'At least 10 characters.',
  },
  revise: {
    label: 'What should the seller change?', max: 2000, send: 'Ask for changes', sending: 'Sending…',
    placeholder: 'For example: please make the blue darker and the name bigger.',
    hint: 'At least 10 characters.',
  },
  cancelask: {
    label: 'Why do you want to cancel? (optional)', max: 500, send: 'Ask to cancel', sending: 'Sending…', min: 0,
    placeholder: 'For example: I no longer need it.',
    hint: '',
  },
  ship: {
    label: 'Courier or delivery company', max: 60, send: 'Mark shipped', sending: 'Saving…', min: 2,
    placeholder: 'For example: GIG Logistics, or my own rider',
    hint: 'Enter the courier.',
  },
}

// A finished order whose seller the buyer can compliment (F19)
const finished = (o: StoreOrder) => o.status === 'COMPLETED' || (!o.protected && o.status !== 'CANCELLED')

export default function OrderActions({ order: o, role, onDone, lead, details = true, checkCompliment = false }: {
  order: ActionOrder; role: 'BUYER' | 'SELLER'; onDone: (msg: string, what?: 'confirmed') => unknown; lead?: ReactNode; details?: boolean; checkCompliment?: boolean
}) {
  const [panel, setPanel] = useState<Panel>(null)
  const [text, setText] = useState('')
  const [tracking, setTracking] = useState('')
  const [files, setFiles] = useState<OrderFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const open = (p: Panel, start = '', track = '') => { setPanel(p); setText(start); setTracking(track); setFiles([]); setError('') }
  const send = async (method: 'POST' | 'PATCH', path: string, body: object | null, done: string, what?: 'confirmed') => {
    setBusy(true); setError('')
    try {
      await apiRequest(`/store/orders/${o.id}${path}`, { method, body: body ? JSON.stringify(body) : undefined })
      open(null)
      await onDone(done, what)
    } catch (e: any) { setError(e?.message || 'Something went wrong. Try again.') }
    setBusy(false)
  }

  const seller = `@${o.seller?.username || 'the seller'}`
  const amount = orderMoney(o.total, o.currency)
  const buyer = role === 'BUYER'
  const delivered = !!o.deliveredAt || !!o.shippedAt
  const physical = o.kind === 'PHYSICAL'
  const asking = !!o.cancelRequestedAt
  const hold = o.holdDays || 3
  // Revisions left: a number, or null for unlimited (the server checks again)
  const left = o.revisionsLeft
  const canRevise = o.held && o.status === 'DELIVERED' && !physical && !asking && (left === null || (left ?? 0) > 0)
  const canAskCancel = o.held && ['IN_PROGRESS', 'SHIPPED', 'DELIVERED', 'REVISION_REQUESTED'].includes(o.status) && !asking && o.cancelOutcome !== 'DECLINED'

  // ── Buyer steps ──
  const cancel = () => {
    if (!window.confirm(`Cancel your order for "${o.product.name}"? ${amount} goes back to your wallet.`)) return
    send('POST', '/cancel', null, 'Order cancelled. The money is back in your wallet.')
  }
  // Only once the seller marks it delivered (the server checks too). On a
  // reported order it drops the report and pays the seller.
  const confirmReceived = () => {
    const ask = o.status === 'DISPUTED'
      ? `Withdraw your report and release ${amount} to ${seller}? Only do this if the problem is sorted. This can't be undone.`
      : `Release ${amount} to ${seller}? Only confirm if you received what you paid for. This can't be undone.`
    if (!window.confirm(ask)) return
    send('POST', '/confirm', null, o.status === 'DISPUTED' ? 'Report withdrawn. The payment is now with the seller.' : 'Thanks. The payment is now with the seller.', 'confirmed')
  }
  const withdraw = () => {
    const next = delivered
      ? `The order goes on: the payment goes to ${seller} in ${hold} days unless you confirm sooner or report again.`
      : `${seller} carries on with your order, and your payment stays held.`
    if (!window.confirm(`Withdraw your report? ${next}`)) return
    send('POST', '/dispute/withdraw', null, 'Report withdrawn. Your order goes on as normal.')
  }
  const withdrawCancel = () => {
    if (!window.confirm('Withdraw your request to cancel? The order goes on as normal.')) return
    send('POST', '/cancel-request/withdraw', null, 'Request withdrawn. Your order goes on as normal.')
  }

  // ── Seller steps ──
  const start = () => send('PATCH', '', { status: 'IN_PROGRESS' }, 'Marked as started. The buyer was told.')
  const refund = () => {
    if (!window.confirm(`Cancel @${o.buyer?.username || 'the buyer'}'s order for "${o.product.name}" and refund ${amount} to them? This can't be undone.`)) return
    send('POST', '/cancel', null, 'Order cancelled. The buyer was refunded.')
  }
  const acceptCancel = () => {
    if (!window.confirm(`Accept the request and refund ${amount} to @${o.buyer?.username || 'the buyer'}? This can't be undone.`)) return
    send('POST', '/cancel-request/accept', null, 'Order cancelled. The buyer was refunded.')
  }
  const declineCancel = () => {
    if (!window.confirm('Decline the request? The order goes on and the buyer is told. They can still report a problem to OgaPay.')) return
    send('POST', '/cancel-request/decline', null, 'Request declined. The order goes on and the buyer was told.')
  }

  const submit = () => {
    const t = text.trim()
    if (panel === 'report') send('POST', '/dispute', { reason: t, ...(files.length && { files }) }, 'Problem reported. The payment stays on hold while OgaPay reviews it.')
    if (panel === 'deliver') send('PATCH', '', { status: 'DELIVERED', ...(t && { note: t }), ...(files.length && { files }) }, 'Marked delivered. The buyer was told and can see what you sent.')
    if (panel === 'reply') send('POST', '/dispute/respond', { text: t, ...(files.length && { files }) }, 'Your side was sent to OgaPay.')
    if (panel === 'revise') send('POST', '/revise', { note: t }, 'Changes requested. The seller was told, and the payment waits until they deliver again.')
    if (panel === 'cancelask') send('POST', '/cancel-request', t ? { reason: t } : {}, 'Request sent. The seller can accept (you get a refund) or decline.')
    if (panel === 'ship') send('PATCH', '', { status: 'SHIPPED', courier: t, ...(tracking.trim() && { tracking: tracking.trim() }) }, o.status === 'SHIPPED' ? 'Shipping details updated. The buyer was told.' : 'Marked shipped. The buyer was told.')
  }

  if (panel) {
    const p = PANELS[panel]
    const t = text.trim()
    const ready = panel === 'deliver' ? t.length >= 10 || files.length > 0 : t.length >= (p.min ?? 10)
    return (
      <div className="so-report">
        <label htmlFor={`oa-${panel}-${o.id}`}>{p.label}</label>
        {panel === 'deliver' && <small style={{ fontSize: 12, color: 'var(--text2)' }}>The buyer sees this on the order and in your chat.{o.held ? ` They get ${o.status === 'SHIPPED' ? 'at least 3' : hold} days to check it, then the payment comes to you.` : ''}</small>}
        {panel === 'reply' && o.sellerResponse && <small style={{ fontSize: 12, color: 'var(--text2)' }}>Sending again replaces your earlier reply and its files.</small>}
        {panel === 'revise' && <small style={{ fontSize: 12, color: 'var(--text2)' }}>The order goes back to {seller}. The payment waits until they deliver again.{left != null ? ` After this you have ${left - 1} revision${left - 1 === 1 ? '' : 's'} left.` : ''}</small>}
        {panel === 'cancelask' && <small style={{ fontSize: 12, color: 'var(--text2)' }}>{seller} can accept (you get {amount} back) or decline (the order goes on). The payment waits until they answer.</small>}
        {panel === 'ship' && <small style={{ fontSize: 12, color: 'var(--text2)' }}>{o.status === 'SHIPPED' ? 'Fix the courier or tracking number. The payment date stays the same.' : `The buyer sees this on the order and in your chat. They get ${hold} days to receive and check it, then the payment comes to you.`}</small>}
        {panel === 'ship'
          ? <input id={`oa-${panel}-${o.id}`} className="ui-input" maxLength={p.max} value={text} onChange={(e) => setText(e.target.value)} placeholder={p.placeholder} />
          : <textarea id={`oa-${panel}-${o.id}`} rows={3} maxLength={p.max} value={text} onChange={(e) => setText(e.target.value)} placeholder={p.placeholder} />}
        {panel === 'ship' && <>
          <label htmlFor={`oa-track-${o.id}`}>Tracking or waybill number (if you have one)</label>
          <input id={`oa-track-${o.id}`} className="ui-input" maxLength={100} value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="For example: GIG-1234567" />
        </>}
        {p.files && <OrderFilePicker files={files} onChange={setFiles} onBusy={setUploading} label={p.files} />}
        <div className="row-acts" style={{ gridColumn: 'auto' }}>
          <button className="up-btn primary" disabled={busy || uploading || !ready} onClick={submit}>{busy ? p.sending : p.send}</button>
          <button className="up-btn" disabled={busy} onClick={() => open(null)}>Never mind</button>
          {!ready && p.hint && <small style={{ color: 'var(--text3)' }}>{p.hint}</small>}
        </div>
        {error && <div className="up-note err" role="alert">{error}</div>}
      </div>
    )
  }

  return (
    <>
      <div className="row-acts">
        {lead}
        {buyer ? (
          <>
            {o.held && o.status === 'PENDING' && <button className="up-btn" disabled={busy} onClick={cancel}>Cancel order</button>}
            {canAskCancel && <button className="up-btn" disabled={busy} onClick={() => open('cancelask')}>Ask to cancel</button>}
            {o.held && asking && <button className="up-btn" disabled={busy} onClick={withdrawCancel}><i className="ti ti-arrow-back-up" /> Withdraw cancel request</button>}
            {o.held && o.status !== 'DISPUTED' && <button className="up-btn" disabled={busy} onClick={() => open('report')}>Report a problem</button>}
            {o.held && o.status === 'DISPUTED' && <button className="up-btn" disabled={busy} onClick={withdraw}><i className="ti ti-arrow-back-up" /> Withdraw report</button>}
            {details && <Link className="up-btn" to={`/orders/${o.id}`}>Order details</Link>}
            {canReviewOrder(o) && o.seller && <Link className="up-btn" to={`/store/${o.product.id}#review`}><i className="ti ti-star" /> {o.reviewed ? 'Edit review' : 'Leave a review'}</Link>}
            {finished(o) && o.seller && <ComplimentButton username={o.seller.username} check={checkCompliment} />}
            {canRevise && <button className="up-btn" disabled={busy} onClick={() => open('revise')}><i className="ti ti-refresh" /> Ask for changes {left === null ? '' : `(${left} left)`}</button>}
            {o.held && ['SHIPPED', 'DELIVERED', 'REVISION_REQUESTED'].includes(o.status) && <button className="up-btn primary" disabled={busy} onClick={confirmReceived}><i className="ti ti-check" /> Confirm received</button>}
            {o.held && o.status === 'DISPUTED' && <button className="up-btn" disabled={busy} onClick={confirmReceived}>Withdraw report and pay seller</button>}
          </>
        ) : (
          <>
            {details && <Link className="up-btn" to={`/orders/${o.id}`}>Order details</Link>}
            {o.held && asking ? (
              <>
                <button className="up-btn" disabled={busy} onClick={declineCancel}>Decline cancel</button>
                <button className="up-btn primary" disabled={busy} onClick={acceptCancel}>Accept and refund</button>
              </>
            ) : (
              <>
                {o.held && o.status !== 'COMPLETED' && <button className="up-btn" disabled={busy} onClick={refund}>Cancel and refund</button>}
                {o.status === 'DISPUTED' && o.held && <button className="up-btn" disabled={busy} onClick={() => open('reply', o.sellerResponse || '')}><i className="ti ti-message" /> {o.sellerResponse ? 'Edit your side' : 'Tell OgaPay your side'}</button>}
                {o.status === 'PENDING' && <button className="up-btn" disabled={busy} onClick={start}>Start</button>}
                {physical && o.status === 'SHIPPED' && <button className="up-btn" disabled={busy} onClick={() => open('ship', o.courier || '', o.trackingNumber || '')}><i className="ti ti-pencil" /> Edit tracking</button>}
                {physical && (o.status === 'PENDING' || o.status === 'IN_PROGRESS') && <button className="up-btn primary" disabled={busy} onClick={() => open('ship')}><i className="ti ti-send" /> Mark shipped</button>}
                {['PENDING', 'IN_PROGRESS', 'SHIPPED', 'REVISION_REQUESTED'].includes(o.status) && (
                  <button className={`up-btn${physical && o.status !== 'SHIPPED' ? '' : ' primary'}`} disabled={busy} onClick={() => open('deliver')}>{o.status === 'REVISION_REQUESTED' ? 'Deliver changes' : 'Mark delivered'}</button>
                )}
              </>
            )}
          </>
        )}
      </div>
      {error && <div className="up-note err" role="alert" style={{ gridColumn: '1 / -1' }}>{error}</div>}
    </>
  )
}

// Compliment the seller after a finished order (F19). The server keeps one
// compliment per person (sending again changes nothing). check: ask first
// whether this person already complimented them (the order page does; lists
// don't, to save a request per order).
export function ComplimentButton({ username, check = false, className = 'up-btn' }: { username: string; check?: boolean; className?: string }) {
  const { toast } = useToast()
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  useEffect(() => {
    if (!check) return
    let live = true
    apiRequest<{ complimented: boolean }>(`/users/${encodeURIComponent(username)}/compliment`)
      .then((r) => { if (live && r?.complimented) setState('done') })
      .catch(() => {})
    return () => { live = false }
  }, [username, check])
  const give = async () => {
    setState('busy')
    try {
      await apiRequest(`/users/${encodeURIComponent(username)}/compliment`, { method: 'POST' })
      setState('done')
      toast(`Compliment sent to @${username}`)
    } catch (e: any) {
      setState('idle')
      toast(e?.message || 'The compliment could not be sent. Try again.', 'error')
    }
  }
  return (
    <button type="button" className={className} disabled={state !== 'idle'} onClick={give} aria-pressed={state === 'done'}>
      <i className={`ti ${state === 'done' ? 'ti-heart-filled' : 'ti-heart'}`} aria-hidden="true" /> {state === 'done' ? 'Complimented' : `Compliment @${username}`}
    </button>
  )
}
