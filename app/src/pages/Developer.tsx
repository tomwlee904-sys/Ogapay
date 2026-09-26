import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE, apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import { useToast } from '../components/Toast'
import '../styles/profile-public.css'
import '../styles/developer.css'

// Developer API: read-only keys and their docs. The old page listed endpoints
// that keys never worked with, and creating a key always failed.

type Key = { id: string; name: string; prefix: string; usageCount: number; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }

const BASE = `${API_BASE}/dev`
const ENDPOINTS: { path: string; desc: string; params?: string }[] = [
  { path: '/me', desc: 'Your account: username, name, OgaScore, KYC level.' },
  { path: '/jobs', desc: 'Open public jobs, newest first.', params: 'category, search, page, limit' },
  { path: '/jobs/:id', desc: 'One public job.' },
  { path: '/my/jobs', desc: 'Jobs you posted, any status.', params: 'page, limit' },
  { path: '/my/submissions', desc: 'Work you submitted, with its status and payment.', params: 'page, limit' },
  { path: '/my/balance', desc: 'Your wallets: balance, locked and available.' },
  { path: '/my/transactions', desc: 'Your wallet history.', params: 'page, limit' },
]
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function Code({ children }: { children: string }) {
  const { toast } = useToast()
  return (
    <div className="dv-code">
      <pre><code>{children}</code></pre>
      <button className="dv-copy" aria-label="Copy" onClick={() => navigator.clipboard?.writeText(children).then(() => toast('Copied', 'success')).catch(() => {})}><i className="ti ti-copy" /></button>
    </div>
  )
}

function Keys() {
  const { toast } = useToast()
  const [keys, setKeys] = useState<Key[] | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [fresh, setFresh] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const load = () => apiRequest<Key[]>('/apikeys').then((d) => setKeys(Array.isArray(d) ? d : [])).catch(() => setKeys([]))
  useEffect(() => { load() }, [])

  const create = async () => {
    setBusy(true); setErr('')
    try {
      const r = await apiRequest<Key & { key: string }>('/apikeys', { method: 'POST', body: JSON.stringify({ name: name.trim() }) })
      setFresh(r.key); setName('')
      load()
    } catch (e: any) { setErr(e?.message || "Couldn't create the key") }
    setBusy(false)
  }

  const revoke = async (k: Key) => {
    if (!window.confirm(`Revoke "${k.name}"? Anything using it stops working straight away.`)) return
    try {
      await apiRequest(`/apikeys/${k.id}`, { method: 'DELETE' })
      toast('Key revoked', 'success')
      load()
    } catch (e: any) { toast(e?.message || "Couldn't revoke the key", 'error') }
  }

  const active = (keys || []).filter((k) => !k.revokedAt)
  const revoked = (keys || []).filter((k) => k.revokedAt)

  return (
    <section className="up-card dv-card">
      <h2>Your API keys</h2>
      <p className="dv-sub">Up to 5 active keys. Treat them like passwords: anyone with a key can read your balance and history.</p>

      {fresh && (
        <div className="dv-fresh" role="status">
          <strong>Copy your new key now. It won't be shown again.</strong>
          <Code>{fresh}</Code>
          <button className="up-btn" onClick={() => setFresh(null)}>I've saved it</button>
        </div>
      )}

      <form className="dv-create" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create() }}>
        <input className="dv-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. My dashboard" aria-label="Key name" />
        <button className="up-btn primary" disabled={busy || !name.trim() || active.length >= 5}>{busy ? 'Creating…' : 'Create key'}</button>
      </form>
      {err && <p className="dv-err">{err}</p>}

      {keys === null ? <p className="dv-sub">Loading…</p> : active.length === 0 ? <p className="dv-sub">No active keys yet.</p> : (
        <div className="dv-keys">
          {active.map((k) => (
            <div key={k.id} className="dv-key">
              <div className="dv-key-t">
                <strong>{k.name}</strong>
                <span><code>{k.prefix}…</code> · created {day(k.createdAt)} · {k.lastUsedAt ? `last used ${day(k.lastUsedAt)}` : 'never used'}</span>
              </div>
              <button className="up-btn" onClick={() => revoke(k)}>Revoke</button>
            </div>
          ))}
        </div>
      )}
      {revoked.length > 0 && <p className="dv-sub dv-revoked">{revoked.length === 1 ? '1 revoked key no longer works.' : `${revoked.length} revoked keys no longer work.`}</p>}
    </section>
  )
}

export default function Developer() {
  const signedIn = !!getAccessToken()
  return (
    <Layout>
      <div className="up-wrap dv-wrap">
        <div className="dv-head">
          <h1>Developer API</h1>
          <p>Read your OgaPay data and public jobs from your own apps. Keys are read-only: they can't move money, post jobs or change anything.</p>
        </div>

        {signedIn ? <Keys /> : (
          <section className="up-card dv-card">
            <h2>Your API keys</h2>
            <p className="dv-sub">Sign in to create a key.</p>
            <button className="up-btn primary" onClick={() => openSignIn({ redirect: '/developer' })}>Sign in</button>
          </section>
        )}

        <section className="up-card dv-card">
          <h2>Authentication</h2>
          <p className="dv-sub">Send your key in the <code>Authorization</code> header (or <code>X-API-Key</code>). Base URL:</p>
          <Code>{BASE}</Code>
          <Code>{`curl ${BASE}/me \\\n  -H "Authorization: Bearer oga_live_YOUR_KEY"`}</Code>
          <p className="dv-sub">Responses look like <code>{'{ "success": true, "data": … }'}</code>; lists add <code>pagination</code>. Limit: 60 requests a minute per key. Errors: <code>401</code> missing, wrong or revoked key; <code>429</code> too many requests.</p>
        </section>

        <section className="up-card dv-card">
          <h2>Endpoints</h2>
          <p className="dv-sub">All are <code>GET</code>. Page size is up to 50 (default 20).</p>
          <div className="dv-eps">
            {ENDPOINTS.map((e) => (
              <div key={e.path} className="dv-ep">
                <span className="dv-method">GET</span>
                <div>
                  <code className="dv-path">/dev{e.path}</code>
                  <p>{e.desc}{e.params && <> Query: <code>{e.params}</code></>}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="dv-sub" style={{ marginTop: 14 }}>Example: open design jobs</p>
          <Code>{`curl "${BASE}/jobs?category=DESIGN&limit=5" \\\n  -H "Authorization: Bearer oga_live_YOUR_KEY"`}</Code>
          <p className="dv-sub">Categories: SOCIAL_MEDIA, DATA_ENTRY, CONTENT_WRITING, APP_TESTING, SURVEY, DESIGN, TRANSLATION, WEB_RESEARCH, VIDEO_REVIEW, OTHER.</p>
        </section>

        <p className="dv-foot">Need to post jobs or pay people from code? <Link to="/support">Tell us</Link> what you're building.</p>
      </div>
    </Layout>
  )
}
