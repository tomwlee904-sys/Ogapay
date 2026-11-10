import { useState } from 'react'
import { Link } from 'react-router-dom'
import Sheet from './wallet/Sheet'
import { apiRequest } from '../lib/api'
import '../styles/wallet.css'

// Store moderation on the website (store audit B2, F12, F31; 2026-11-10):
// remove a product with a reason (admins and store moderators), report a
// product (any signed-in buyer), and the Moderate bar on the product page.

const REASON_MIN = 10
const CHECK_CSS = '.smod-check{display:flex;align-items:center;gap:10px;min-height:44px;font-size:13.5px;cursor:pointer}'

// Remove a product: a reason for the seller, and (admins) delete for good
export function RemoveSheet({ row, isAdmin, onClose, onDone }: { row: { id: string; name: string }; isAdmin: boolean; onClose: () => void; onDone: (message: string) => void }) {
  const [reason, setReason] = useState('')
  const [del, setDel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const send = async () => {
    if (reason.trim().length < REASON_MIN) { setErr(`Tell the seller why (at least ${REASON_MIN} characters).`); return }
    if (del && !window.confirm(`Delete "${row.name}" for good? It can't be put back.`)) return
    setBusy(true); setErr('')
    try {
      await apiRequest(`/store/admin/products/${row.id}/delist`, { method: 'POST', body: JSON.stringify({ reason: reason.trim(), delete: del }) })
      onDone(del ? 'Product deleted. The seller has been told.' : 'Product removed. The seller has been told.')
    } catch (e: any) { setErr(e?.message || 'That didn’t work') }
    setBusy(false)
  }
  return (
    <Sheet title="Remove from the store" onClose={() => !busy && onClose()}>
      <style>{CHECK_CSS}</style>
      <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--text2)' }}>"{row.name}" will be hidden from buyers right away. The seller gets a notification with your reason and can't put it back on sale. Orders already made are not affected.</p>
      <label className="ui-label" htmlFor="as-reason">Reason <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(the seller sees this)</span></label>
      <textarea id="as-reason" className="ui-input" style={{ height: 96, padding: 10, resize: 'vertical' }} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }}
        placeholder="For example: Branded watches need proof they are real. This looks like a copy." />
      {isAdmin && (
        <label className="smod-check" style={{ marginTop: 6 }}>
          <input type="checkbox" checked={del} onChange={(e) => setDel(e.target.checked)} /> Also delete it for good (can't be put back)
        </label>
      )}
      {err && <p role="alert" style={{ color: 'var(--red)', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
      <div className="ui-actions" style={{ marginTop: 14 }}>
        <button type="button" className="ui-btn ui-btn-ghost" style={{ minHeight: 44 }} disabled={busy} onClick={onClose}>Cancel</button>
        <button type="button" className="ui-btn ui-btn-dark" style={{ flex: 1, minHeight: 44 }} disabled={busy} onClick={send}>{busy ? 'Removing…' : del ? 'Remove and delete' : 'Remove'}</button>
      </div>
    </Sheet>
  )
}


// "Report product": same reasons the store queue shows. One open report per
// product; the server says so if there already is one.
const REPORT_REASONS = [
  { id: 'counterfeit', label: 'Fake or counterfeit' },
  { id: 'scam', label: 'Scam, or asks for payment outside OgaPay' },
  { id: 'prohibited', label: 'Not allowed on OgaPay' },
  { id: 'misleading', label: 'Misleading or in the wrong category' },
  { id: 'offensive', label: 'Offensive' },
  { id: 'other', label: 'Something else' },
]

export function ReportProductSheet({ product, onClose }: { product: { id: string; title: string }; onClose: () => void }) {
  const [reason, setReason] = useState(REPORT_REASONS[0].id)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)
  const send = async () => {
    if (note.trim().length < REASON_MIN) { setErr(`Tell us what is wrong (at least ${REASON_MIN} characters).`); return }
    setBusy(true); setErr('')
    try {
      await apiRequest('/reports', { method: 'POST', body: JSON.stringify({ category: reason, description: note.trim(), targetType: 'store', targetId: product.id }) })
      setSent(true)
    } catch (e: any) { setErr(e?.message || "Couldn't send the report") }
    setBusy(false)
  }
  return (
    <Sheet title="Report this product" onClose={() => !busy && onClose()}>
      <style>{CHECK_CSS}</style>
      {sent ? (
        <>
          <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.6, color: 'var(--text2)' }}>Thanks. Our team will look at it within 24 hours. You can follow it under <Link to="/support" style={{ color: 'var(--text)', fontWeight: 600 }}>Support, My tickets</Link>.</p>
          <button type="button" className="ui-btn ui-btn-dark" style={{ width: '100%', minHeight: 44 }} onClick={onClose}>Done</button>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.55, color: 'var(--text2)' }}>Only OgaPay staff see reports. The seller isn't told who reported "{product.title}".</p>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="ui-label">Reason</legend>
            {REPORT_REASONS.map((r) => (
              <label key={r.id} className="smod-check">
                <input type="radio" name="rp-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} /> {r.label}
              </label>
            ))}
          </fieldset>
          <label className="ui-label" htmlFor="rp-note" style={{ marginTop: 8 }}>What is wrong?</label>
          <textarea id="rp-note" className="ui-input" style={{ height: 96, padding: 10, resize: 'vertical' }} maxLength={2000} value={note} onChange={(e) => { setNote(e.target.value); setErr('') }}
            placeholder="For example: the pictures are copied from another shop." />
          {err && <p role="alert" style={{ color: 'var(--red)', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
          <div className="ui-actions" style={{ marginTop: 14 }}>
            <button type="button" className="ui-btn ui-btn-ghost" style={{ minHeight: 44 }} disabled={busy} onClick={onClose}>Cancel</button>
            <button type="button" className="ui-btn ui-btn-dark" style={{ flex: 1, minHeight: 44 }} disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send report'}</button>
          </div>
        </>
      )}
    </Sheet>
  )
}

// The Moderate bar on a product page, for admins and store moderators
export function ModerateBar({ product, isAdmin, onChanged }: {
  product: { id: string; title: string; official?: boolean; moderation?: { delistedAt: string | null; delistReason: string | null; openReports: number } | null }
  isAdmin: boolean
  onChanged: (message: string) => void
}) {
  const [removing, setRemoving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const m = product.moderation
  if (!m || (product.official && !isAdmin)) return null
  const relist = async () => {
    setBusy(true); setErr('')
    try {
      await apiRequest(`/store/admin/products/${product.id}/relist`, { method: 'POST', body: JSON.stringify({}) })
      onChanged('Product is back')
    } catch (e: any) { setErr(e?.message || 'That didn’t work') }
    setBusy(false)
  }
  return (
    <div className="ui-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="ui-label" style={{ margin: 0 }}><i className="ti ti-shield" aria-hidden="true" /> Moderate</span>
      <span style={{ fontSize: 12.5, color: 'var(--text2)' }}>
        {m.openReports > 0 ? `${m.openReports} open ${m.openReports === 1 ? 'report' : 'reports'}. ` : 'No open reports. '}
        {m.delistedAt ? `Removed: ${m.delistReason}` : ''}
      </span>
      {m.delistedAt
        ? <button type="button" className="ui-btn ui-btn-ghost" style={{ minHeight: 40 }} disabled={busy} onClick={relist}><i className="ti ti-arrow-back-up" /> Put back in the store</button>
        : <button type="button" className="ui-btn ui-btn-ghost" style={{ minHeight: 40 }} onClick={() => setRemoving(true)}><i className="ti ti-eye-off" /> Remove from the store</button>}
      <Link className="ui-btn ui-btn-ghost" style={{ minHeight: 40 }} to={`/admin/store?q=${encodeURIComponent(product.title.slice(0, 80))}`}><i className="ti ti-flag" /> Open in the store queue</Link>
      {err && <span role="alert" style={{ color: 'var(--red)', fontSize: 12.5 }}>{err}</span>}
      {removing && <RemoveSheet row={{ id: product.id, name: product.title }} isAdmin={isAdmin} onClose={() => setRemoving(false)} onDone={(msg) => { setRemoving(false); onChanged(msg) }} />}
    </div>
  )
}
