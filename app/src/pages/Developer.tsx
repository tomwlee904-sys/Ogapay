// @ts-nocheck
import Layout from '../components/Layout'

const Icon = ({ n, s = 18, c }) => (
  <i className={`ti ti-${n}`} style={{ fontSize: s, color: c || "var(--text2)", lineHeight: 1, flexShrink: 0 }} />
)

const endpoints = [
  { method: 'GET', path: '/api/v1/tasks', desc: 'List all available tasks', auth: false },
  { method: 'GET', path: '/api/v1/tasks/:id', desc: 'Get task details', auth: false },
  { method: 'POST', path: '/api/v1/tasks', desc: 'Create a new task', auth: true },
  { method: 'POST', path: '/api/v1/tasks/:id/apply', desc: 'Apply to a task', auth: true },
  { method: 'POST', path: '/api/v1/tasks/:id/submit', desc: 'Submit proof for a task', auth: true },
  { method: 'PATCH', path: '/api/v1/tasks/submissions/:id/review', desc: 'Review a submission', auth: true },
  { method: 'GET', path: '/api/v1/auth/me', desc: 'Get current user profile', auth: true },
  { method: 'POST', path: '/api/v1/auth/login', desc: 'Login with email/password', auth: false },
  { method: 'POST', path: '/api/v1/auth/register', desc: 'Create account', auth: false },
  { method: 'GET', path: '/api/v1/communities', desc: 'List communities', auth: false },
  { method: 'GET', path: '/api/v1/wallet/balance', desc: 'Get wallet balance', auth: true },
]

export default function Developer() {
  return (
    <Layout>
      <style>{`
        .dev-page{max-width:900px;margin:0 auto;padding:0 0 60px}
        .dev-hero{background:linear-gradient(135deg,#191C6B,#191C6B);border-radius:16px;padding:40px 36px;margin-bottom:32px;color:#fff}
        .dev-hero h1{font-family:Outfit;font-size:32px;font-weight:900;margin:0 0 8px}
        .dev-hero p{font-size:14px;opacity:.85;line-height:1.6;margin:0;max-width:600px}
        .dev-section{margin-bottom:32px}
        .dev-section h2{font-family:Outfit;font-size:20px;font-weight:800;margin:0 0 4px}
        .dev-section .sub{color:var(--text2);font-size:13px;margin:0 0 16px}
        .dev-card{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden}
        .dev-card-head{padding:16px 20px;border-bottom:1px solid var(--border);font-size:14px;font-weight:700;display:flex;align-items:center;gap:8px}
        .endpoint-row{display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid var(--border);font-size:13px}
        .endpoint-row:last-child{border-bottom:none}
        .method{display:inline-flex;align-items:center;justify-content:center;min-width:52px;height:24px;border-radius:5px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;flex-shrink:0}
        .method.get{background:#16a34a18;color:#16a34a}
        .method.post{background:#191C6B18;color:#191C6B}
        .method.patch{background:#F59E0B18;color:#F59E0B}
        .endpoint-path{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text);font-weight:600;flex-shrink:0}
        .endpoint-desc{color:var(--text2);flex:1}
        .endpoint-auth{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;flex-shrink:0}
        .endpoint-auth.public{background:var(--bg2);color:var(--text3)}
        .endpoint-auth.private{background:#F59E0B18;color:#F59E0B}
        .code-block{background:#0a0a0a;border-radius:8px;padding:16px 18px;font-family:'JetBrains Mono',monospace;font-size:12px;color:#e5e5e5;overflow-x:auto;line-height:1.6;margin:12px 0}
        .code-block .comment{color:#6b7280}
        .code-block .keyword{color:#191C6B}
        .code-block .string{color:#86efac}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px}
        @media(max-width:600px){.grid-2{grid-template-columns:1fr}}
        .quick-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;transition:all .2s}
        .quick-card:hover{border-color:var(--accent)}
        .quick-card .qc-icon{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;margin-bottom:12px}
        .quick-card h3{font-family:Outfit;font-size:15px;font-weight:800;margin:0 0 4px}
        .quick-card p{font-size:12px;color:var(--text2);margin:0 0 14px;line-height:1.5}
        .quick-card a{font-size:13px;font-weight:700;color:var(--accent);text-decoration:none;display:inline-flex;align-items:center;gap:6px}
      `}</style>

      <div className="dev-page">
        {/* Hero */}
        <div className="dev-hero">
          <h1><Icon n="code" s={28} c="#fff" /> Developer API</h1>
          <p>Integrate OgaPay into your AI agents, applications, and workflows. Our REST API allows you to create tasks, manage submissions, and interact with the platform programmatically.</p>
        </div>

        {/* Quick Start */}
        <div className="grid-2">
          {[
            { icon: "key", color: "#191C6B", title: "API Key", desc: "Get your API key from your profile settings to authenticate requests.", link: "/settings", label: "Go to Settings" },
            { icon: "book", color: "#16a34a", title: "Documentation", desc: "Read the full API reference with examples and response schemas.", link: "#", label: "View Docs" },
            { icon: "terminal", color: "#8B5CF6", title: "Quick Start", desc: "Learn the basics of creating tasks, applying, and submitting proofs.", link: "#", label: "Get Started" },
            { icon: "message", color: "#F59E0B", title: "Support", desc: "Join our Telegram group for developer support and updates.", link: "https://t.me/ogapay", label: "Join Telegram" },
          ].map(c => (
            <div className="quick-card" key={c.title}>
              <div className="qc-icon" style={{background:`${c.color}18`,color:c.color}}><Icon n={c.icon} s={20} c={c.color} /></div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              <a href={c.link}><span>{c.label}</span> <i className="ti ti-arrow-right" style={{fontSize:12}} /></a>
            </div>
          ))}
        </div>

        {/* Base URL */}
        <div className="dev-section">
          <h2>Base URL</h2>
          <p className="sub">All API requests should be made to this base endpoint.</p>
          <pre className="code-block" style={{whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
{`// Base URL for all API requests
const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'`}
          </pre>
        </div>

        {/* Authentication */}
        <div className="dev-section">
          <h2>Authentication</h2>
          <p className="sub">Protected endpoints require a Bearer token in the Authorization header.</p>
          <div className="dev-card">
            <div className="dev-card-head"><Icon n="lock" s={16} /> Authentication Header</div>
            <pre className="code-block" style={{margin:0,borderRadius:0,whiteSpace:'pre-wrap',wordBreak:'break-all'}}>
{`// Include this header for authenticated requests
'Authorization': 'Bearer <your_access_token>'`}
          </pre>
          </div>
        </div>

        {/* Endpoints */}
        <div className="dev-section">
          <h2>API Endpoints</h2>
          <p className="sub">Available endpoints across the OgaPay platform.</p>
          <div className="dev-card">
            <div className="dev-card-head"><Icon n="list" s={16} /> All Endpoints</div>
            {endpoints.map((ep, i) => (
              <div className="endpoint-row" key={i}>
                <span className={`method ${ep.method.toLowerCase()}`}>{ep.method}</span>
                <span className="endpoint-path">{ep.path}</span>
                <span className="endpoint-desc">{ep.desc}</span>
                <span className={`endpoint-auth ${ep.auth ? 'private' : 'public'}`}>{ep.auth ? 'Auth' : 'Public'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Example */}
        <div className="dev-section">
          <h2>Example: Fetch Tasks</h2>
          <p className="sub">A simple example showing how to fetch available tasks.</p>
          <div className="dev-card">
            <div className="dev-card-head"><Icon n="code" s={16} /> JavaScript Example</div>
            <pre className="code-block" style={{margin:0,borderRadius:0,whiteSpace:'pre-wrap',wordBreak:'break-all',lineHeight:1.8}}>
{`// Fetch available tasks from OgaPay
const response = await fetch('https://ogapay-production.up.railway.app/api/v1/tasks')
const json = await response.json()

if (json.success) {
  }`}
            </pre>
          </div>
        </div>
      </div>
    </Layout>
  )
}
