import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import Code from '../components/DevCode'
import { API_BASE } from '../lib/api'
import '../styles/profile-public.css'
import '../styles/developer.css'

// API reference (/developer/api): every endpoint, read from the public OpenAPI
// file the server publishes, plus webhooks and connecting AI agents over MCP.

const BASE = `${API_BASE}/dev`
const ORIGIN = API_BASE.replace(/\/api\/v1$/, '')
const MCP_URL = `${API_BASE}/mcp`
const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

type Schema = { type?: string | string[]; description?: string; properties?: Record<string, Schema>; required?: string[]; items?: Schema; enum?: unknown[]; example?: unknown; default?: unknown; format?: string; $ref?: string; oneOf?: Schema[]; anyOf?: Schema[]; allOf?: Schema[]; nullable?: boolean }
type Param = { name: string; in: string; required?: boolean; description?: string; schema?: Schema; $ref?: string }
type Op = {
  summary?: string; description?: string; tags?: string[]; operationId?: string
  parameters?: Param[]; security?: Record<string, string[]>[]; 'x-scope'?: string
  requestBody?: { content?: Record<string, { schema?: Schema; example?: unknown; examples?: Record<string, { value?: unknown }> }> }
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: Schema; example?: unknown; examples?: Record<string, { value?: unknown }> }> }>
}
type Spec = { info?: { title?: string; version?: string; description?: string }; tags?: { name: string; description?: string }[]; paths?: Record<string, Record<string, Op>>; components?: { schemas?: Record<string, Schema>; parameters?: Record<string, Param> } }
type Field = { name: string; where: string; type: string; required: boolean; desc: string }
type Entry = { method: string; path: string; full: string; op: Op; scope: 'read' | 'write'; group: string; fields: Field[]; curl: string; response: string | null }

// Turn a spec path into the path after the base URL (/jobs/{id}) and the full URL
function urls(path: string) {
  if (path.startsWith('/api/v1/dev')) return { path: path.slice('/api/v1/dev'.length) || '/', full: ORIGIN + path }
  if (path.startsWith('/api/v1/')) return { path, full: ORIGIN + path }
  if (path.startsWith('/dev/')) return { path: path.slice(4), full: API_BASE + path }
  return { path, full: BASE + path }
}

function makeResolver(spec: Spec) {
  const resolve = <T extends { $ref?: string }>(x: T | undefined, depth = 0): T | undefined => {
    if (!x || !x.$ref || depth > 8) return x
    const parts = x.$ref.replace(/^#\//, '').split('/')
    let cur: any = spec
    for (const p of parts) cur = cur?.[p]
    return resolve(cur as T, depth + 1)
  }
  return resolve
}

function typeOf(s: Schema | undefined, resolve: (x: Schema | undefined) => Schema | undefined): string {
  const r = resolve(s)
  if (!r) return ''
  if (r.enum?.length) return r.enum.map((v) => JSON.stringify(v)).join(' | ')
  const alt = r.oneOf || r.anyOf
  if (alt?.length) return alt.map((a) => typeOf(a, resolve)).join(' | ')
  const t = Array.isArray(r.type) ? r.type.filter((x) => x !== 'null').join(' | ') : r.type || (r.properties ? 'object' : '')
  if (t === 'array') return `${typeOf(r.items, resolve) || 'any'}[]`
  return t + (r.format && t !== 'object' ? ` (${r.format})` : '')
}

// A small example value built from a schema, when the spec gives no example
function sample(s: Schema | undefined, resolve: (x: Schema | undefined) => Schema | undefined, depth = 0): unknown {
  const r = resolve(s)
  if (!r || depth > 5) return null
  if (r.example !== undefined) return r.example
  if (r.default !== undefined) return r.default
  if (r.enum?.length) return r.enum[0]
  if (r.allOf?.length) return Object.assign({}, ...r.allOf.map((a) => (sample(a, resolve, depth + 1) as object) || {}))
  const alt = r.oneOf || r.anyOf
  if (alt?.length) return sample(alt[0], resolve, depth + 1)
  const t = Array.isArray(r.type) ? r.type.find((x) => x !== 'null') : r.type
  if (t === 'object' || r.properties) {
    const o: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(r.properties || {})) o[k] = sample(v, resolve, depth + 1)
    return o
  }
  if (t === 'array') return [sample(r.items, resolve, depth + 1)]
  if (t === 'integer' || t === 'number') return 0
  if (t === 'boolean') return true
  if (r.format === 'date-time') return '2026-11-14T12:00:00.000Z'
  return 'string'
}

function exampleOf(c: { schema?: Schema; example?: unknown; examples?: Record<string, { value?: unknown }> } | undefined, resolve: (x: Schema | undefined) => Schema | undefined) {
  if (!c) return undefined
  if (c.example !== undefined) return c.example
  const first = c.examples && Object.values(c.examples)[0]
  if (first?.value !== undefined) return first.value
  return c.schema ? sample(c.schema, resolve) : undefined
}

function build(spec: Spec): Entry[] {
  const resolve = makeResolver(spec)
  const out: Entry[] = []
  for (const [rawPath, item] of Object.entries(spec.paths || {})) {
    for (const m of METHODS) {
      const op = item?.[m]
      if (!op) continue
      const { path, full } = urls(rawPath)
      const scopes = (op.security || []).flatMap((s) => Object.values(s).flat())
      const scope: 'read' | 'write' = op['x-scope'] === 'write' || scopes.includes('write') || (op['x-scope'] !== 'read' && !scopes.includes('read') && (m !== 'get' || /\/jobs\/\{[^}]+\}\/submissions$/.test(path))) ? 'write' : 'read'
      const fields: Field[] = []
      for (const p0 of [...((item as any).parameters || []), ...(op.parameters || [])] as Param[]) {
        const p = resolve(p0)
        if (!p || p.in === 'header') continue
        fields.push({ name: p.name, where: p.in, type: typeOf(p.schema, resolve), required: !!p.required || p.in === 'path', desc: p.description || resolve(p.schema)?.description || '' })
      }
      const bodyC = op.requestBody?.content?.['application/json']
      const bodyS = resolve(bodyC?.schema)
      const merged: Schema = bodyS?.allOf ? { properties: Object.assign({}, ...bodyS.allOf.map((a) => resolve(a)?.properties || {})), required: bodyS.allOf.flatMap((a) => resolve(a)?.required || []) } : bodyS || {}
      for (const [k, v] of Object.entries(merged.properties || {})) {
        fields.push({ name: k, where: 'body', type: typeOf(v, resolve), required: (merged.required || []).includes(k), desc: resolve(v)?.description || '' })
      }
      const curlPath = full.replace(/\{([^}]+)\}/g, (_, n) => n.toUpperCase().replace(/[^A-Z0-9]/g, '_'))
      const reqQuery = fields.filter((f) => f.where === 'query' && f.required)
      const url = reqQuery.length ? `${curlPath}?${reqQuery.map((f) => `${f.name}=…`).join('&')}` : curlPath
      const body = bodyC ? exampleOf(bodyC, resolve) : undefined
      const lines = [`curl${m === 'get' ? '' : ` -X ${m.toUpperCase()}`} "${url}"`, `  -H "Authorization: Bearer oga_live_YOUR_KEY"`]
      if (body !== undefined && body !== null) lines.push(`  -H "Content-Type: application/json"`, `  -d '${JSON.stringify(body)}'`)
      const ok = op.responses?.['200'] || op.responses?.['201'] || Object.entries(op.responses || {}).find(([k]) => k.startsWith('2'))?.[1]
      const resEx = exampleOf(ok?.content?.['application/json'], resolve)
      out.push({
        method: m.toUpperCase(), path, full, op, scope, fields,
        group: op.tags?.[0] || (path.startsWith('/my') ? 'Your account' : path.split('/')[1] || 'Other'),
        curl: lines.join(' \\\n'),
        response: resEx === undefined ? null : JSON.stringify(resEx, null, 2),
      })
    }
  }
  return out
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function Endpoint({ e }: { e: Entry }) {
  const title = e.op.summary || ''
  const desc = e.op.description && e.op.description !== title ? e.op.description : ''
  return (
    <div className="dv-op" id={`op-${slug(e.method + e.path)}`}>
      <div className="dv-op-h">
        <span className={`dv-method is-${e.method.toLowerCase()}`}>{e.method}</span>
        <code className="dv-path">/dev{e.path}</code>
        {e.scope === 'write' ? <span className="dv-write">write</span> : <span className="dv-read">read</span>}
      </div>
      {(title || desc) && <p>{title && <b style={{ color: 'var(--text)' }}>{title}</b>}{title && desc ? '. ' : ''}{desc}</p>}
      {e.fields.length > 0 && (
        <div className="dv-tw">
          <table className="dv-tbl">
            <thead><tr><th>Field</th><th>In</th><th>Type</th><th>What it is</th></tr></thead>
            <tbody>
              {e.fields.map((f) => (
                <tr key={f.where + f.name}>
                  <td><code>{f.name}</code>{f.required ? <small> required</small> : null}</td>
                  <td>{f.where}</td>
                  <td>{f.type}</td>
                  <td>{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Code label="Example">{e.curl}</Code>
      {e.response && <Code label="Response">{e.response}</Code>}
    </div>
  )
}

const VERIFY_NODE = `// Node.js (Express): check that a webhook really came from OgaPay
import crypto from 'node:crypto'
import express from 'express'

const app = express()
const SECRET = process.env.OGAPAY_WEBHOOK_SECRET // shown once when you added the webhook

// Read the raw body: the signature is over the exact bytes OgaPay sent
app.post('/ogapay-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const timestamp = req.get('X-OgaPay-Timestamp') || ''
  const signature = req.get('X-OgaPay-Signature') || ''
  const expected = 'sha256=' + crypto
    .createHmac('sha256', SECRET)
    .update(\`\${timestamp}.\${req.body}\`)
    .digest('hex')

  const valid = signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))

  // Refuse old deliveries (replays): allow 5 minutes
  const t = Number(timestamp)
  const sentAt = t > 1e12 ? t : t * 1000
  if (!valid || !t || Math.abs(Date.now() - sentAt) > 5 * 60 * 1000) return res.status(401).end()

  const event = JSON.parse(req.body.toString('utf8'))
  // Use X-OgaPay-Delivery to skip a delivery you have already handled
  console.log(req.get('X-OgaPay-Event'), req.get('X-OgaPay-Delivery'), event)
  res.status(200).end() // answer 2xx quickly; do slow work afterwards
})

app.listen(3000)`

const PAYLOAD = `POST /ogapay-webhook
Content-Type: application/json
X-OgaPay-Event: submission.created
X-OgaPay-Delivery: 7f1c…        (unique per delivery)
X-OgaPay-Timestamp: 1763121600
X-OgaPay-Signature: sha256=5d2a…

{
  "id": "7f1c…",
  "type": "submission.created",
  "createdAt": "2026-11-14T12:00:00.000Z",
  "data": {
    "jobId": "…", "jobTitle": "…", "submissionId": "…", "status": "SUBMITTED",
    "reward": 50, "currency": "NGN", "viaApi": false,
    "workerUsername": "…", "posterUsername": "…"
  }
}`

const HOOK_EVENTS: [string, string][] = [
  ['submission.created', 'Someone sent work for one of your jobs (sent to you as the poster).'],
  ['submission.approved', 'Work you sent was approved and you were paid (sent to you as the worker).'],
  ['submission.rejected', 'Work you sent was rejected (sent to you as the worker).'],
  ['submission.sent_back', 'Work you sent was sent back for changes, with the note (sent to you as the worker).'],
  ['job.filled', 'Every place on one of your jobs is taken (sent to you as the poster).'],
]

const MCP_TOOLS: [string, string, boolean?][] = [
  ['list_jobs', 'Find open public jobs (can filter to jobs that allow agents).'],
  ['get_job', 'Read one job in full.'],
  ['get_balance', 'Your wallet balances.'],
  ['list_my_jobs', 'Jobs you posted.'],
  ['list_my_work', 'Jobs you took and the work you sent.'],
  ['post_job', 'Post a job paid from your wallet.', true],
  ['list_submissions', 'Work sent for one of your jobs.', true],
  ['review_submission', 'Approve (pays the worker) or reject work.', true],
  ['take_job', 'Take a place on a job that allows agents.', true],
  ['submit_work', 'Send the work for a job you took.', true],
]

export default function ApiReference() {
  const [spec, setSpec] = useState<Spec | null>(null)
  const [failed, setFailed] = useState(false)
  const { hash } = useLocation()

  useEffect(() => {
    let off = false
    fetch(`${BASE}/openapi.json`, { headers: { Accept: 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: Spec) => { if (!off) { if (d && d.paths) setSpec(d); else setFailed(true) } })
      .catch(() => { if (!off) setFailed(true) })
    return () => { off = true }
  }, [])

  const entries = useMemo(() => (spec ? build(spec) : []), [spec])
  const groups = useMemo(() => {
    const order = (spec?.tags || []).map((t) => t.name)
    const map = new Map<string, Entry[]>()
    for (const e of entries) map.set(e.group, [...(map.get(e.group) || []), e])
    return [...map.entries()].sort(([a], [b]) => {
      const ia = order.indexOf(a), ib = order.indexOf(b)
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
    })
  }, [entries, spec])

  // Jump to #webhooks / #mcp once the page (and the endpoints above them) are drawn
  useEffect(() => {
    if (!hash) return
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 60)
    return () => window.clearTimeout(t)
  }, [hash, spec, failed])

  const desktopConfig = JSON.stringify({
    mcpServers: {
      ogapay: {
        command: 'npx',
        args: ['-y', 'mcp-remote', MCP_URL, '--header', 'Authorization:${OGAPAY_AUTH}'],
        env: { OGAPAY_AUTH: 'Bearer oga_live_YOUR_KEY' },
      },
    },
  }, null, 2)

  return (
    <Layout>
      <div className="up-wrap dv-wrap">
        <div className="dv-head">
          <h1>API reference</h1>
          <p>Every Developer API endpoint, with the fields it takes and what it returns. Create a key on the <Link to="/developer">Developer page</Link>. Every key can read; endpoints marked <b>write</b> need a key with write access. No key can withdraw or send money.</p>
          <div className="dv-links">
            <a className="up-btn" href="#endpoints"><i className="ti ti-list" /> Endpoints</a>
            <a className="up-btn" href="#webhooks"><i className="ti ti-webhook" /> Webhooks</a>
            <a className="up-btn" href="#mcp"><i className="ti ti-robot" /> AI agents (MCP)</a>
          </div>
        </div>

        <section className="up-card dv-card">
          <h2>Basics</h2>
          <p className="dv-sub">Base URL. Send your key as <code>Authorization: Bearer oga_live_…</code> (or <code>X-API-Key</code>). JSON bodies need <code>Content-Type: application/json</code>.</p>
          <Code>{BASE}</Code>
          <p className="dv-sub">Responses look like <code>{'{ "success": true, "data": … }'}</code>; lists add <code>pagination</code> (page size up to 50, default 20). Limit: 60 requests a minute per key. Errors: <code>401</code> missing, wrong or revoked key; <code>403</code> the key can't write; <code>429</code> too many requests.</p>
          <p className="dv-sub" style={{ margin: 0 }}>Machine-readable spec (OpenAPI 3.1): <a href={`${BASE}/openapi.json`} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', fontWeight: 600 }}>{`${BASE}/openapi.json`}</a></p>
        </section>

        <section className="up-card dv-card" id="endpoints">
          <h2>Endpoints</h2>
          {!spec && !failed && <p className="dv-sub">Loading the endpoints…</p>}
          {failed && (
            <p className="dv-sub">The endpoint list couldn't be loaded right now. Try again in a moment, see the short list on the <Link to="/developer">Developer page</Link>, or open <a href={`${BASE}/openapi.json`} target="_blank" rel="noreferrer">openapi.json</a> directly.</p>
          )}
          {spec && groups.length > 1 && (
            <nav className="dv-toc" aria-label="Endpoint groups">
              {groups.map(([g]) => <a key={g} href={`#grp-${slug(g)}`}>{g}</a>)}
            </nav>
          )}
          {groups.map(([g, list]) => (
            <div key={g} id={`grp-${slug(g)}`}>
              <h3 className="dv-grp">{g}</h3>
              {spec?.tags?.find((t) => t.name === g)?.description && <p className="dv-sub">{spec.tags.find((t) => t.name === g)!.description}</p>}
              {list.map((e) => <Endpoint key={e.method + e.path} e={e} />)}
            </div>
          ))}
        </section>

        <section className="up-card dv-card" id="webhooks">
          <h2>Webhooks</h2>
          <p className="dv-sub">Add up to 5 https endpoints on the <Link to="/developer#webhooks">Developer page</Link> and pick the events you want. OgaPay sends a JSON POST to each one when an event happens on your jobs. Answer with a 2xx status within a few seconds; endpoints that keep failing are turned off.</p>
          <ul className="dv-ul">
            {HOOK_EVENTS.map(([e, d]) => <li key={e}><code>{e}</code> · {d}</li>)}
          </ul>
          <Code label="What a delivery looks like">{PAYLOAD}</Code>
          <p className="dv-sub"><b>Check the signature on every delivery.</b> <code>X-OgaPay-Signature</code> is <code>sha256=</code> followed by the hex HMAC-SHA256 of <code>{'`${X-OgaPay-Timestamp}.${rawBody}`'}</code>, keyed with your webhook's signing secret (shown once when you add it). Compare in constant time and refuse old timestamps.</p>
          <Code label="Node.js">{VERIFY_NODE}</Code>
        </section>

        <section className="up-card dv-card" id="mcp">
          <h2>AI agents (MCP)</h2>
          <p className="dv-sub">OgaPay runs a hosted MCP server, so Claude, ChatGPT and other agents can use OgaPay as a set of tools: find jobs, post and review jobs, and do jobs whose posters allow agents. Work an agent sends is marked as sent by an app so posters can check it.</p>
          <Code label="Server URL">{MCP_URL}</Code>

          <p className="dv-sub"><b>Claude Code</b></p>
          <Code>{`claude mcp add --transport http ogapay ${MCP_URL} --header "Authorization: Bearer oga_live_YOUR_KEY"`}</Code>

          <p className="dv-sub"><b>Claude Desktop</b>: Settings, Developer, Edit Config, then add this to <code>claude_desktop_config.json</code> and restart Claude. It needs Node.js installed.</p>
          <Code>{desktopConfig}</Code>

          <p className="dv-sub"><b>ChatGPT and other MCP clients</b>: add a remote MCP server (Streamable HTTP) with the server URL above and the header <code>Authorization: Bearer oga_live_YOUR_KEY</code>. If the client can't send headers, run it through <code>npx mcp-remote</code> as in the Claude Desktop example.</p>

          <p className="dv-sub"><b>Tools</b></p>
          <div className="dv-tw">
            <table className="dv-tbl">
              <thead><tr><th>Tool</th><th>Key</th><th>What it does</th></tr></thead>
              <tbody>
                {MCP_TOOLS.map(([n, d, w]) => <tr key={n}><td><code>{n}</code></td><td>{w ? 'write' : 'read'}</td><td>{d}</td></tr>)}
              </tbody>
            </table>
          </div>

          <p className="dv-note"><b>Keep it safe.</b> Give each agent its own key so you can revoke it alone. Only give a key write access if the agent should post jobs, pay for approved work or do jobs; a read key can only look. No key can withdraw or send money out of OgaPay.</p>
        </section>

        <p className="dv-foot">Something missing? <Link to="/support">Tell us</Link> what you need.</p>
      </div>
    </Layout>
  )
}
