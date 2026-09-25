import { useState, useEffect, useRef } from 'react'
import { apiRequest } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// Send NGN to another OgaPay user (POST /wallet/send — internal ledger, instant).
interface Recipient {
  id: string
  username?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string | null
  email?: string // set when the sender typed an email instead of picking a user
}

interface Props {
  onClose: () => void
  onSuccess?: () => void
}

const MIN_SEND = 100
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MODAL_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const INNER_STYLE: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
  maxWidth: 440, width: '100%', padding: 24, maxHeight: '90vh', overflowY: 'auto',
}
const BTN: React.CSSProperties = {
  height: 46, width: '100%', borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none',
  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 7, fontFamily: 'inherit', background: 'var(--text)', color: 'var(--bg)',
}
const INPUT: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 14px', border: '1.5px solid var(--border)',
  borderRadius: 10, background: 'var(--card)', color: 'var(--text)', fontSize: 14,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '.05em',
}

const naira = (n: number) => '₦' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
const handle = (r: Recipient) => (r.email ? r.email : '@' + r.username)

function Avatar({ r, size }: { r: Recipient; size: number }) {
  const initials = r.email
    ? r.email[0].toUpperCase()
    : ((r.firstName?.[0] || r.username?.[0] || 'U') + (r.lastName?.[0] || '')).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: size * 0.36, overflow: 'hidden', flexShrink: 0 }}>
      {r.avatarUrl ? <img src={r.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : r.email ? <i className="ti ti-mail" /> : initials}
    </div>
  )
}

function Person({ r }: { r: Recipient }) {
  const name = r.email ? 'Send by email' : `${r.firstName || ''} ${r.lastName || ''}`.trim() || r.username
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{handle(r)}</div>
    </div>
  )
}

export default function TransferModal({ onClose, onSuccess }: Props) {
  const { user } = useAuth()
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Recipient[]>([])
  const [searching, setSearching] = useState(false)
  const [recipient, setRecipient] = useState<Recipient | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [available, setAvailable] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [reference, setReference] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Available = balance minus money held in escrow; that's what the backend lets you send
  useEffect(() => {
    apiRequest<any>('/wallet/balance')
      .then(d => setAvailable(Number(d?.NGN?.available ?? 0)))
      .catch(() => setAvailable(0))
  }, [])

  // Debounced user search (username / name); an email is offered as-is
  useEffect(() => {
    if (recipient) return
    if (timer.current) clearTimeout(timer.current)
    const q = query.trim().replace(/^@/, '')
    if (q.length < 2 || EMAIL_RE.test(q)) { setResults([]); setSearching(false); return }
    setSearching(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await apiRequest<any>('/users/directory/list?search=' + encodeURIComponent(q) + '&limit=6')
        const list: Recipient[] = Array.isArray(res) ? res : res?.data || []
        setResults(list.filter(u => u.username && u.id !== user?.id))
      } catch { setResults([]) }
      setSearching(false)
    }, 350)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [query, recipient, user?.id])

  const q = query.trim()
  const emailOption = !recipient && EMAIL_RE.test(q) && q.toLowerCase() !== (user as any)?.email?.toLowerCase()
  const amt = Number(amount || 0)
  const tooMuch = available !== null && amt > available
  const ready = !!recipient && amt >= MIN_SEND && !tooMuch

  const review = () => {
    if (!recipient) return setError('Choose who to send to')
    if (amt < MIN_SEND) return setError(`Minimum is ${naira(MIN_SEND)}`)
    if (tooMuch) return setError('Amount is more than your available balance')
    setError('')
    setStep('confirm')
  }

  const send = async () => {
    if (!recipient || submitting) return
    setSubmitting(true); setError('')
    try {
      const res = await apiRequest<any>('/wallet/send', {
        method: 'POST',
        body: JSON.stringify({
          recipient: recipient.email || recipient.username,
          amount: amt,
          currency: 'NGN',
          note: note.trim() || undefined,
        }),
      })
      setReference(res?.reference || '')
      setStep('done')
      onSuccess?.()
    } catch (e: any) {
      setError(e?.message || 'Transfer failed. Please try again.')
      setStep('form')
    }
    setSubmitting(false)
  }

  const header = (title: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
      <h3 style={{ fontFamily: 'Geist', fontSize: 18, fontWeight: 800, margin: 0 }}>{title}</h3>
      <button aria-label="Close" onClick={onClose} style={{ width: 32, height: 32, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg2)', cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--text3)', fontSize: 18 }}>
        <i className="ti ti-x" />
      </button>
    </div>
  )

  const errorBox = error && (
    <div role="alert" style={{ padding: '10px 14px', background: 'color-mix(in srgb, var(--red) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--red) 30%, transparent)', borderRadius: 10, fontSize: 13, color: 'var(--red)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
      <i className="ti ti-alert-triangle" style={{ fontSize: 16 }} />{error}
    </div>
  )

  return (
    <div style={MODAL_STYLE} onClick={() => { if (!submitting) onClose() }}>
      <div style={INNER_STYLE} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">

        {step === 'form' && (
          <>
            {header('Send money')}
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
              Available: <strong style={{ color: 'var(--text)' }}>{available === null ? '…' : naira(available)}</strong>
            </div>

            <label style={LABEL}>To</label>
            {recipient ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16, background: 'var(--bg2)' }}>
                <Avatar r={recipient} size={34} />
                <Person r={recipient} />
                <button onClick={() => { setRecipient(null); setQuery(''); setResults([]) }} style={{ background: 'none', border: 'none', color: 'var(--text)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>Change</button>
              </div>
            ) : (
              <div style={{ marginBottom: 16 }}>
                <input style={INPUT} autoFocus placeholder="Username or email" value={query}
                  onChange={e => { setQuery(e.target.value); setError('') }} />
                {searching && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Searching…</div>}
                {(results.length > 0 || emailOption) && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginTop: 6, overflow: 'hidden', maxHeight: 240, overflowY: 'auto' }}>
                    {emailOption && (
                      <button onClick={() => setRecipient({ id: 'email', email: q })} style={rowStyle}>
                        <Avatar r={{ id: 'email', email: q }} size={30} />
                        <Person r={{ id: 'email', email: q }} />
                      </button>
                    )}
                    {results.map(u => (
                      <button key={u.id} onClick={() => { setRecipient(u); setResults([]) }} style={rowStyle}>
                        <Avatar r={u} size={30} />
                        <Person r={u} />
                      </button>
                    ))}
                  </div>
                )}
                {!searching && q.replace(/^@/, '').length >= 2 && !emailOption && results.length === 0 && !EMAIL_RE.test(q) && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>No users found. Try their exact username or email.</div>
                )}
              </div>
            )}

            <label style={LABEL}>Amount (NGN)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text3)' }}>₦</span>
              <input style={{ ...INPUT, paddingLeft: 30, fontWeight: 700, borderColor: tooMuch ? 'var(--red)' : undefined }} inputMode="decimal" placeholder="0" value={amount}
                onChange={e => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); setError('') }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: tooMuch ? 'var(--red)' : 'var(--text3)', margin: '6px 0 16px' }}>
              <span>{tooMuch ? 'More than your available balance' : `Minimum ${naira(MIN_SEND)} · no fee`}</span>
              {!!available && available >= MIN_SEND && (
                <button onClick={() => { setAmount(String(Math.floor(available * 100) / 100)); setError('') }} style={{ background: 'none', border: 'none', padding: '10px 0 10px 12px', margin: '-10px 0', color: 'var(--text)', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Send max</button>
              )}
            </div>

            <label style={LABEL}>Note (optional)</label>
            <input style={{ ...INPUT, marginBottom: 18 }} placeholder="What's it for?" value={note} maxLength={140}
              onChange={e => setNote(e.target.value)} />

            {errorBox}
            <button style={{ ...BTN, opacity: ready ? 1 : 0.45, cursor: ready ? 'pointer' : 'not-allowed' }} disabled={!ready} onClick={review}>
              Review
            </button>
          </>
        )}

        {step === 'confirm' && recipient && (
          <>
            {header('Confirm transfer')}
            <div style={{ textAlign: 'center', padding: '6px 0 18px' }}>
              <div style={{ fontFamily: 'Geist', fontSize: 30, fontWeight: 900, letterSpacing: '-.03em' }}>{naira(amt)}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>to</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12 }}>
              <Avatar r={recipient} size={36} />
              <Person r={recipient} />
            </div>
            {note.trim() && <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Note: <span style={{ color: 'var(--text)' }}>{note.trim()}</span></div>}
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 18 }}>
              Arrives instantly and can't be reversed. Check the recipient before you send.
            </div>
            {errorBox}
            <button style={{ ...BTN, opacity: submitting ? 0.6 : 1 }} disabled={submitting} onClick={send}>
              {submitting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Sending…</> : <><i className="ti ti-send" /> Send {naira(amt)}</>}
            </button>
            <button onClick={() => setStep('form')} disabled={submitting} style={{ ...BTN, background: 'transparent', color: 'var(--text2)', marginTop: 8, height: 40, fontWeight: 700 }}>Back</button>
          </>
        )}

        {step === 'done' && recipient && (
          <>
            {header('Sent')}
            <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'color-mix(in srgb, var(--green) 10%, transparent)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <i className="ti ti-circle-check" style={{ fontSize: 32, color: 'var(--green)' }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{naira(amt)} sent to {handle(recipient)}</div>
              {reference && (
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Reference: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text2)' }}>{reference}</span>
                </div>
              )}
            </div>
            <button style={BTN} onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </div>
  )
}

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', border: 'none',
  borderBottom: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
}
