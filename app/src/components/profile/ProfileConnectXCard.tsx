import { useState } from 'react'
import { apiRequest } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import '../../styles/profile-own.css'

const XLogo = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.739l7.727-8.833L1.255 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

// Connect X the way wurk.fun does: no X sign-in. Get a code, post it on X (the
// ready-made post also shares your referral link), then paste the post's link.
// The server reads the post and links its author (services/xverify.service.js).
export function XVerify({ onConnected }: { onConnected?: (handle: string) => void }) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState<'' | 'code' | 'verify'>('')
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const getCode = async () => {
    setBusy('code'); setMsg(null)
    try {
      const r = await apiRequest<{ code: string }>('/social/twitter/code', { method: 'POST' })
      setCode(r.code)
      setMsg({ ok: true, text: `Post this on your X account: ${r.code}` })
    } catch (e: any) { setMsg({ ok: false, text: e?.message || "Couldn't make a code. Try again." }) }
    setBusy('')
  }
  const post = () => {
    const ref = (user as any)?.referralCode
    const text = ["Let's earn together!", '', 'Get paid in Naira or USDC for small jobs on OgaPay.', `Join me: https://ogapay.app${ref ? `/ref/${ref}` : ''}`, '', code].join('\n')
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }
  const copy = () => { navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {}) }
  const verify = async () => {
    setBusy('verify'); setMsg(null)
    try {
      const r = await apiRequest<{ handle: string }>('/social/twitter/verify-post', { method: 'POST', body: JSON.stringify({ url: url.trim() }) })
      setMsg({ ok: true, text: `@${r.handle} is connected.` })
      onConnected?.(r.handle)
    } catch (e: any) { setMsg({ ok: false, text: e?.message || "Couldn't verify that post. Try again." }) }
    setBusy('')
  }

  return (
    <div className="xv">
      <div className="xv-step">
        <span className="xv-n">1</span>
        <div className="xv-body">
          <b>Post verification message</b>
          {code ? (
            <>
              <div className="xv-code"><code>{code}</code><button type="button" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button></div>
              <button type="button" className="po-btn" onClick={post}><XLogo size={14} /> Post on X</button>
            </>
          ) : (
            <button type="button" className="po-btn primary" onClick={getCode} disabled={busy === 'code'}>{busy === 'code' ? 'Generating…' : 'Generate code'}</button>
          )}
        </div>
      </div>
      <div className="xv-step">
        <span className="xv-n">2</span>
        <div className="xv-body">
          <b>Verify your account</b>
          <input className="xv-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://x.com/username/status/..." aria-label="Link to your verification post" inputMode="url" />
          <button type="button" className="po-btn primary xv-verify" onClick={verify} disabled={!code || !url.trim() || busy === 'verify'}>{busy === 'verify' ? 'Verifying…' : 'Verify'}</button>
        </div>
      </div>
      {msg && <div className={`xv-msg${msg.ok ? ' ok' : ''}`} role="status">{msg.text}</div>}
    </div>
  )
}

// Profile: some jobs need a connected X account
export default function ProfileConnectXCard({ connected, handle, onConnected }: { connected: boolean; handle?: string | null; onConnected?: (handle: string) => void }) {
  const [now, setNow] = useState<string | null>(null)
  const linked = connected || !!now
  return (
    <section className="po-card">
      <div className="po-body po-x">
        <span className="logo"><XLogo /></span>
        <div>
          <b>{linked ? 'X account connected' : 'Connect your X account'}</b>
          {linked ? (
            <>
              <p>You can take jobs that require an X account.</p>
              <span className="po-ok"><i className="ti ti-circle-check" /> @{now || handle || 'connected'}</span>
            </>
          ) : (
            <>
              <p>Post your verification message, then verify its link. We never post for you or get access to your account.</p>
              <XVerify onConnected={(h) => { setNow(h); onConnected?.(h) }} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}
