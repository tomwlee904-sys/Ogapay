import { useEffect, useState } from 'react'
import { apiRequest } from '../../lib/api'

// "Report this user" on a public profile: a reason and a note go to the admin
// queue (Admin > Moderation, the same queue as job reports). One open report
// per person; the server refuses a second until the first is handled.
const REASONS = [
  { id: 'scam', label: 'Scam or asking for money outside OgaPay' },
  { id: 'fake_proof', label: 'Fake proof or fake accounts' },
  { id: 'harassment', label: 'Harassment or abuse' },
  { id: 'spam', label: 'Spam' },
  { id: 'impersonation', label: 'Pretending to be someone else' },
  { id: 'inappropriate', label: 'Inappropriate profile content' },
  { id: 'other', label: 'Something else' },
]

export default function ReportUser({ userId, username, onClose }: { userId: string; username: string; onClose: () => void }) {
  const [reason, setReason] = useState(REASONS[0].id)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const send = async () => {
    if (note.trim().length < 10) { setErr('Tell us what happened (at least 10 characters).'); return }
    setBusy(true); setErr('')
    try {
      await apiRequest('/reports', { method: 'POST', body: JSON.stringify({ category: reason, description: note.trim(), targetType: 'user', targetId: userId }) })
      setSent(true)
    } catch (e: any) { setErr(e?.message || "Couldn't send the report") }
    setBusy(false)
  }

  return (
    <div className="up-modal" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="ru-h" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3 id="ru-h">Report @{username}</h3>
          <button className="x" aria-label="Close" onClick={onClose} style={{ width: 44, height: 44 }}><i className="ti ti-x" /></button>
        </div>
        {sent ? (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>Thanks. Our team will look at it within 24 hours. You can follow it under Support, My tickets.</p>
            <button className="up-btn primary" style={{ width: '100%', minHeight: 44 }} onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: '8px 0 14px', lineHeight: 1.55 }}>Only OgaPay staff see reports. The person isn't told who reported them.</p>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Reason</legend>
              {REASONS.map((r) => (
                <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40, fontSize: 13.5, cursor: 'pointer' }}>
                  <input type="radio" name="ru-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <label style={{ display: 'block', marginTop: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>What happened?</span>
              <textarea style={{ display: 'block', width: '100%', minHeight: 100, marginTop: 6, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg2)', color: 'var(--text)', font: '400 14px/1.5 Inter, sans-serif', resize: 'vertical', boxSizing: 'border-box' }} maxLength={2000} value={note} onChange={(e) => { setNote(e.target.value); setErr('') }}
                placeholder="Links to the job, messages or posts help us check it quickly." />
            </label>
            {err && <div className="up-note err" role="alert" style={{ marginTop: 8 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="up-btn" style={{ minHeight: 44 }} onClick={onClose} disabled={busy}>Cancel</button>
              <button className="up-btn primary" style={{ flex: 1, minHeight: 44 }} onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
