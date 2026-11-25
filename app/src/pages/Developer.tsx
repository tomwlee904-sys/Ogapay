import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { API_BASE, apiRequest, getAccessToken } from '../lib/api'
import { openSignIn } from '../lib/signin'
import { useToast } from '../components/Toast'
import Code from '../components/DevCode'
import '../styles/profile-public.css'
import '../styles/developer.css'

// Developer API: keys and their docs. Every key reads; a key made with write
// access can also post jobs from the owner's wallet, review work, pick contest
// winners and cancel jobs. No key can withdraw or send money.

type Hook = { id: string; url: string; events: string[]; active: boolean; failCount: number; lastStatus: number | null; lastAt: string | null; createdAt: string }
const HOOK_EVENTS: [string, string][] = [
  ['submission.created', 'Work sent for your job'],
  ['submission.approved', 'Work approved and paid'],
  ['submission.rejected', 'Work rejected'],
  ['submission.sent_back', 'Work sent back for changes'],
  ['job.filled', 'Every place on a job is filled'],
]

type Key = { id: string; name: string; prefix: string; scopes?: string[]; usageCount: number; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }

const BASE = `${API_BASE}/dev`
const ENDPOINTS: { method?: string; path: string; desc: string; params?: string; write?: boolean }[] = [
  { path: '/me', desc: 'Your account: username, name, OgaScore, KYC level.' },
  { path: '/jobs', desc: 'Open public jobs, newest first.', params: 'category, search, page, limit' },
  { path: '/jobs/:id', desc: 'One public job.' },
  { path: '/my/jobs', desc: 'Jobs you posted, any status.', params: 'page, limit' },
  { path: '/my/submissions', desc: 'Work you submitted, with its status and payment.', params: 'page, limit' },
  { path: '/my/balance', desc: 'Your wallets: balance, locked and available.' },
  { path: '/my/transactions', desc: 'Your balance history.', params: 'page, limit' },
  { method: 'POST', write: true, path: '/jobs', desc: 'Post a job, a contest or a members-only job (same fields as the website). The budget and 10% fee are reserved from your balance. Up to 30 an hour per key.', params: 'title, description, category, reward, currency, maxWorkers, deadline?, isContest?, prizes?, entryTarget?, randomDraw? (contests: winners drawn at random when entries close), communityId?, payoutCooldownMinutes? (social jobs: 0, 5, 30, 60, 360 or 1440; work can only be paid that long after it is sent, then the X post is checked again)' },
  { write: true, path: '/jobs/:id/submissions', desc: 'Work sent for your job, with the proof. On jobs with a payout check, payoutCheck is WAITING until payoutCheckDueAt, then PASSED, SKIPPED, FAILED or UNKNOWN with payoutCheckReason; approving is refused while it is WAITING.' },
  { method: 'POST', write: true, path: '/submissions/:id/approve', desc: 'Approve work: the worker is paid from the job budget.', params: 'rating? (1-5), feedback?' },
  { method: 'POST', write: true, path: '/submissions/:id/reject', desc: 'Reject work with a reason the worker sees; the place opens again.', params: 'reason' },
  { method: 'POST', write: true, path: '/jobs/:id/winners', desc: 'Pay a contest\'s winners after it ends, 1st place first. Refused for a random-draw contest (randomDraw: true): its winners are drawn when entries close.', params: 'winners: [submissionId, …]' },
  { method: 'POST', write: true, path: '/jobs/:id/cancel', desc: 'Cancel a job nobody has taken; the budget and fee come back.' },
]
const day = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function Keys() {
  const { toast } = useToast()
  const [keys, setKeys] = useState<Key[] | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [fresh, setFresh] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [write, setWrite] = useState(false)
  const [otp, setOtp] = useState('')
  const [needOtp, setNeedOtp] = useState(false)

  const load = () => apiRequest<Key[]>('/apikeys').then((d) => setKeys(Array.isArray(d) ? d : [])).catch(() => setKeys([]))
  useEffect(() => { load() }, [])

  const create = async () => {
    setBusy(true); setErr('')
    try {
      const r = await apiRequest<Key & { key: string }>('/apikeys', { method: 'POST', body: JSON.stringify({ name: name.trim(), write, ...(otp && { otp }) }) })
      setFresh(r.key); setName(''); setWrite(false); setOtp(''); setNeedOtp(false)
      load()
    } catch (e: any) {
      const msg = e?.message || "Couldn't create the key"
      if (/2FA|authenticator/i.test(msg)) setNeedOtp(true)
      setErr(msg)
    }
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
      <p className="dv-sub">Up to 5 active keys. Treat them like passwords: anyone with a key can read your balance and history, and a key with write access can also spend your balance on jobs.</p>

      {fresh && (
        <div className="dv-fresh" role="status">
          <strong>Copy your new key now. It won't be shown again.</strong>
          <Code>{fresh}</Code>
          <button className="up-btn" onClick={() => setFresh(null)}>I've saved it</button>
        </div>
      )}

      <form className="dv-create" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create() }}>
        <input className="dv-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. My dashboard" aria-label="Key name" />
        <button className="up-btn primary" disabled={busy || !name.trim() || active.length >= 5 || (needOtp && !otp)}>{busy ? 'Creating…' : 'Create key'}</button>
      </form>
      <label className="dv-check">
        <input type="checkbox" checked={write} onChange={(e) => setWrite(e.target.checked)} />
        <span><b>Allow writing</b>: this key can post jobs paid from your balance, approve or reject work and cancel jobs. It can never withdraw or send money.</span>
      </label>
      {needOtp && (
        <input className="dv-input" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))} placeholder="Code from your authenticator app" aria-label="2FA code" style={{ marginTop: 10 }} />
      )}
      {err && <p className="dv-err">{err}</p>}

      {keys === null ? <p className="dv-sub">Loading…</p> : active.length === 0 ? <p className="dv-sub">No active keys yet.</p> : (
        <div className="dv-keys">
          {active.map((k) => (
            <div key={k.id} className="dv-key">
              <div className="dv-key-t">
                <strong>{k.name}{k.scopes?.includes('write') && <span className="dv-write">Can write</span>}</strong>
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

function Webhooks() {
  const { toast } = useToast()
  const [hooks, setHooks] = useState<Hook[] | null>(null)
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(HOOK_EVENTS.map(([e]) => e))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [secret, setSecret] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [tested, setTested] = useState<Record<string, string>>({})

  const load = () => apiRequest<Hook[]>('/developer/webhooks').then((d) => setHooks(Array.isArray(d) ? d : [])).catch(() => setHooks([]))
  useEffect(() => { load() }, [])

  const httpsOk = /^https:\/\/[^\s/]+\.[^\s]+$/i.test(url.trim())
  const full = (hooks || []).length >= 5

  const add = async () => {
    if (!httpsOk) { setErr('Use a full https:// address.'); return }
    if (!events.length) { setErr('Tick at least one event.'); return }
    setBusy(true); setErr('')
    try {
      const r = await apiRequest<Hook & { secret: string }>('/developer/webhooks', { method: 'POST', body: JSON.stringify({ url: url.trim(), events }) })
      setSecret(r.secret || null); setUrl('')
      load()
    } catch (e: any) { setErr(e?.message || "Couldn't add the webhook") }
    setBusy(false)
  }

  const test = async (h: Hook) => {
    setTesting(h.id)
    try {
      const r = await apiRequest<{ status?: number | string }>(`/developer/webhooks/${h.id}/test`, { method: 'POST' })
      const st = r?.status
      const ok = typeof st === 'number' ? st >= 200 && st < 300 : /^2\d\d$/.test(String(st))
      setTested((t) => ({ ...t, [h.id]: st == null ? 'Sent' : ok ? `Delivered (${st})` : `Your server answered ${st}` }))
      load()
    } catch (e: any) { setTested((t) => ({ ...t, [h.id]: e?.message || "Couldn't send the test" })) }
    setTesting(null)
  }

  const remove = async (h: Hook) => {
    if (!window.confirm(`Delete the webhook for ${h.url}? OgaPay stops sending events there.`)) return
    try {
      await apiRequest(`/developer/webhooks/${h.id}`, { method: 'DELETE' })
      toast('Webhook deleted', 'success')
      load()
    } catch (e: any) { toast(e?.message || "Couldn't delete the webhook", 'error') }
  }

  return (
    <section className="up-card dv-card" id="webhooks">
      <h2>Webhooks</h2>
      <p className="dv-sub">OgaPay sends a signed POST to your server when something happens on your jobs, so your app or agent doesn't have to keep asking. Up to 5 endpoints, https only. <Link to="/developer/api#webhooks">How to check the signature</Link>.</p>

      {secret && (
        <div className="dv-fresh" role="status">
          <strong>Copy your signing secret now. It won't be shown again.</strong>
          <Code>{secret}</Code>
          <span className="dv-sub" style={{ margin: 0 }}>Keep it on your server only. Use it to check the X-OgaPay-Signature header on every request.</span>
          <button className="up-btn" onClick={() => setSecret(null)}>I've saved it</button>
        </div>
      )}

      <form className="dv-create" onSubmit={(e) => { e.preventDefault(); add() }}>
        <input className="dv-input" type="url" inputMode="url" value={url} maxLength={500} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/ogapay-webhook" aria-label="Webhook URL" />
        <button className="up-btn primary" disabled={busy || !url.trim() || full}>{busy ? 'Adding…' : 'Add webhook'}</button>
      </form>
      <div className="dv-events" role="group" aria-label="Events to send">
        {HOOK_EVENTS.map(([e, label]) => (
          <label key={e} className="dv-check">
            <input type="checkbox" checked={events.includes(e)} onChange={(ev) => setEvents((l) => ev.target.checked ? [...l, e] : l.filter((x) => x !== e))} />
            <span><b>{e}</b> · {label}</span>
          </label>
        ))}
      </div>
      {full && <p className="dv-sub">You have 5 webhooks, the most allowed. Delete one to add another.</p>}
      {err && <p className="dv-err">{err}</p>}

      {hooks === null ? <p className="dv-sub">Loading…</p> : hooks.length === 0 ? <p className="dv-sub">No webhooks yet.</p> : (
        <div className="dv-keys">
          {hooks.map((h) => (
            <div key={h.id} className="dv-key">
              <div className="dv-key-t">
                <strong style={{ overflowWrap: 'anywhere' }}>{h.url}</strong>
                <span>{(h.events || []).join(', ')}</span>
                <span>
                  {!h.active ? <span className="dv-hook-off">Turned off after failed deliveries. Delete it and add it again once your server is fixed.</span>
                    : h.lastAt ? `Last sent ${day(h.lastAt)}${h.lastStatus != null ? `, answered ${h.lastStatus}` : ''}` : 'Nothing sent yet'}
                  {h.active && h.failCount > 0 && <> · <span className="dv-hook-off">{h.failCount} failed in a row</span></>}
                </span>
                {tested[h.id] && <span role="status">Test: {tested[h.id]}</span>}
              </div>
              <div className="dv-key-a">
                <button className="up-btn" disabled={testing === h.id || !h.active} onClick={() => test(h)}>{testing === h.id ? 'Sending…' : 'Test'}</button>
                <button className="up-btn" onClick={() => remove(h)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
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
          <p>Read your OgaPay data and public jobs from your own apps, and let your app or AI agent post jobs and pay for approved work. An agent can also take and do jobs whose posters allow agents. Every key can read; give a key write access when it should post jobs, review work or do jobs. No key can withdraw or send money.</p>
          <div className="dv-links">
            <Link className="up-btn" to="/developer/api"><i className="ti ti-book" /> API reference</Link>
            <Link className="up-btn" to="/developer/api#mcp"><i className="ti ti-robot" /> Agents &amp; MCP</Link>
          </div>
        </div>

        {signedIn ? <><Keys /><Webhooks /></> : (
          <section className="up-card dv-card">
            <h2>Your API keys</h2>
            <p className="dv-sub">Sign in to create a key and add webhooks.</p>
            <button className="up-btn primary" onClick={() => openSignIn({ redirect: '/developer' })}>Sign in</button>
          </section>
        )}

        <section className="up-card dv-card">
          <h2>Agents &amp; MCP</h2>
          <p className="dv-sub">Connect Claude, ChatGPT or any MCP client to OgaPay with one URL and your key. The agent can find jobs, post and review jobs (write key), and do jobs that allow agents. <Link to="/developer/api#mcp">Setup steps</Link>.</p>
          <Code>{`claude mcp add --transport http ogapay ${API_BASE}/mcp --header "Authorization: Bearer oga_live_YOUR_KEY"`}</Code>
        </section>

        <section className="up-card dv-card">
          <h2>Authentication</h2>
          <p className="dv-sub">Send your key in the <code>Authorization</code> header (or <code>X-API-Key</code>). Base URL:</p>
          <Code>{BASE}</Code>
          <Code>{`curl ${BASE}/me \\\n  -H "Authorization: Bearer oga_live_YOUR_KEY"`}</Code>
          <p className="dv-sub">Responses look like <code>{'{ "success": true, "data": … }'}</code>; lists add <code>pagination</code>. Limit: 60 requests a minute per key. Errors: <code>401</code> missing, wrong or revoked key; <code>429</code> too many requests.</p>
        </section>

        <section className="up-card dv-card">
          <h2>Endpoints</h2>
          <p className="dv-sub">Every endpoint with its fields, examples and responses is in the <Link to="/developer/api">API reference</Link>. Page size is up to 50 (default 20). Endpoints marked <b>write</b> need a key with write access (<code>403</code> otherwise). Send JSON bodies with <code>Content-Type: application/json</code>.</p>
          <div className="dv-eps">
            {ENDPOINTS.map((e) => (
              <div key={e.path} className="dv-ep">
                <span className="dv-method">{e.method || 'GET'}</span>
                <div>
                  <code className="dv-path">/dev{e.path}</code>{e.write && <span className="dv-write">write</span>}
                  <p>{e.desc}{e.params && <> {e.method === 'POST' ? 'Body' : 'Query'}: <code>{e.params}</code></>}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="dv-sub" style={{ marginTop: 14 }}>Example: open design jobs</p>
          <Code>{`curl "${BASE}/jobs?category=DESIGN&limit=5" \\\n  -H "Authorization: Bearer oga_live_YOUR_KEY"`}</Code>
          <p className="dv-sub">Categories: SOCIAL_MEDIA, DATA_ENTRY, CONTENT_WRITING, APP_TESTING, SURVEY, DESIGN, TRANSLATION, WEB_RESEARCH, VIDEO_REVIEW, OTHER.</p>
          <p className="dv-sub" style={{ marginTop: 14 }}>Example: post a job for 20 people at ₦200 each (a key with write access)</p>
          <Code>{`curl -X POST ${BASE}/jobs \\\n  -H "Authorization: Bearer oga_live_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"title":"Try our app and tell us what broke","description":"Install the app, sign up and send a screenshot of the home page.","category":"APP_TESTING","reward":200,"currency":"NGN","maxWorkers":20}'`}</Code>
        </section>

        <p className="dv-foot">Building something bigger? <Link to="/support">Tell us</Link> what you need.</p>
      </div>
    </Layout>
  )
}
