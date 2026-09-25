import { useState } from 'react'
import { apiRequest } from '../../lib/api'
import '../../styles/profile-own.css'

const XLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.739l7.727-8.833L1.255 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

// Some jobs require a connected X account; connecting is OAuth (no posting a code)
export default function ProfileConnectXCard({ connected, handle }: { connected: boolean; handle?: string | null }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const connect = async () => {
    setBusy(true); setErr('')
    try {
      const res: any = await apiRequest('/social/twitter/init', { method: 'POST' })
      if (res?.authUrl) { window.location.href = res.authUrl; return }
      setErr('Could not start X sign-in.')
    } catch (e: any) {
      setErr(e?.message || 'Could not start X sign-in.')
    }
    setBusy(false)
  }

  return (
    <section className="po-card">
      <div className="po-body po-x">
        <span className="logo"><XLogo /></span>
        <div>
          <b>{connected ? 'X account connected' : 'Connect your X account'}</b>
          {connected ? (
            <>
              <p>You can take jobs that require an X account.</p>
              <span className="po-ok"><i className="ti ti-circle-check" /> {handle ? `@${handle}` : 'Connected'}</span>
            </>
          ) : (
            <>
              <p>Some jobs need a connected X account. Sign in with X to link it. We only read your public profile.</p>
              {err && <div className="po-err">{err}</div>}
              <button className="po-btn primary" onClick={connect} disabled={busy}><XLogo /> {busy ? 'Opening X…' : 'Connect X'}</button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
