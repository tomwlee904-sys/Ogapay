import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { getAccessToken } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Campaigns() {
  const { user: authUser } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', platform: 'X/Twitter', budget: '', description: '' })

  const fetchData = async () => {
    try {
      const res = await apiRequest<any>('/campaigns')
      const items = Array.isArray(res) ? res : res?.data || []
      setCampaigns(items)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const onFocus = () => fetchData()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [authUser])

  const handleCreate = async () => {
    if (!form.name || !form.budget) return
    setSaving(true)
    try {
      const token = getAccessToken()
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://ogapay-production.up.railway.app/api/v1'}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          platforms: [form.platform],
          budget: parseFloat(form.budget),
          currency: 'NGN',
          description: form.description,
        }),
      })
      const json = await res.json()
      if (json.data) {
        setCampaigns(prev => [json.data, ...prev])
        setShowModal(false)
        setForm({ name: '', platform: 'X/Twitter', budget: '', description: '' })
      }
    } catch {}
    setSaving(false)
  }

  return (
    <Layout>
      <style>{`
        .cmp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px}
        .cmp-head h1{font-family:Outfit;font-size:28px;font-weight:900;margin:0 0 4px}
        .cmp-head p{color:var(--text2);font-size:14px;margin:0}
        .cmp-create{display:flex;align-items:center;gap:16px;padding:18px 20px;background:var(--card);border:1px solid var(--border);border-radius:14px;margin-bottom:24px;flex-wrap:wrap}
        .cmp-create h3{font-family:Outfit;font-size:15px;font-weight:800;margin:0 0 2px}
        .cmp-create p{color:var(--text2);font-size:13px;margin:0;flex:1}
        .cmp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
        .cmp-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;transition:all .25s}
        .cmp-card:hover{transform:translateY(-2px);border-color:var(--accent);box-shadow:0 0 20px rgba(31,140,255,.06)}
        .cmp-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
        .cmp-name{font-weight:800;font-size:14px}
        .cmp-status{padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700}
        .cmp-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
        .cmp-m-item{font-size:12px}
        .cmp-m-item .cmm-label{color:var(--text3);font-size:10px;font-weight:600;text-transform:uppercase}
        .cmp-m-item .cmm-val{font-weight:700;margin-top:1px}
        .cmp-bar{height:4px;border-radius:2px;background:var(--bg2);overflow:hidden;margin-bottom:10px}
        .cmp-bar .cmp-fill{height:100%;border-radius:2px}
        .cmp-actions{display:flex;gap:6px}
        .cmp-btn{height:30px;padding:0 10px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;gap:4px}
        .cmp-btn:hover{border-color:var(--accent);color:var(--accent)}
        .cmp-btn.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
        .cmp-btn.primary:hover{box-shadow:0 4px 12px rgba(31,140,255,.2)}
        .cmp-empty{text-align:center;padding:48px;color:var(--text2)}
        .cmp-empty i{font-size:36px;color:var(--text3);margin-bottom:10px;display:block}
        .cmp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:400;display:none;align-items:center;justify-content:center;padding:20px}
        .cmp-overlay.open{display:flex}
        .cmp-modal{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;width:min(480px,100%);max-height:80vh;overflow-y:auto}
        .cmp-modal h2{font-family:Outfit;font-size:20px;font-weight:900;margin:0 0 16px}
        .cmp-field{margin-bottom:12px}
        .cmp-field label{display:block;font-size:11px;font-weight:700;color:var(--text3);margin-bottom:4px;text-transform:uppercase}
        .cmp-field input,.cmp-field select{width:100%;height:38px;padding:0 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg2);color:var(--text);font-size:13px;outline:0}
        .cmp-field input:focus,.cmp-field select:focus{border-color:var(--accent)}
        .cmp-modal-actions{display:flex;gap:8px;margin-top:16px;justify-content:flex-end}
        .cmp-loading{text-align:center;padding:48px;color:var(--text2);display:flex;align-items:center;justify-content:center;gap:8px}
      `}</style>

      <div className="cmp-head">
        <div>
          <h1>Campaigns</h1>
          <p>Multi-platform marketing campaigns — set a budget, choose platforms, and track results</p>
        </div>
        <button className="cmp-btn primary" style={{height:36,padding:'0 16px'}} onClick={() => setShowModal(true)}>
          <i className="ti ti-plus" /> New Campaign
        </button>
      </div>

      <div className="cmp-create">
        <div style={{flex:1}}>
          <h3>Ready to launch?</h3>
          <p>Create a campaign and reach thousands of workers across X, Telegram, Instagram, and more.</p>
        </div>
        <button className="cmp-btn primary" style={{height:36,padding:'0 14px'}} onClick={() => setShowModal(true)}>
          <i className="ti ti-megaphone" /> Create Campaign
        </button>
      </div>

      {loading ? (
        <div className="cmp-loading"><span className="spinner" /> Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="cmp-empty">
          <i className="ti ti-megaphone" />
          <h3 style={{fontFamily:'Outfit',fontWeight:800,margin:'0 0 4px',color:'var(--text)'}}>No campaigns yet</h3>
          <p style={{fontSize:13,margin:0}}>Create your first campaign to get started</p>
        </div>
      ) : (
        <div className="cmp-grid">
          {campaigns.map(c => {
            const platform = Array.isArray(c.platforms) ? c.platforms.join(', ') : c.platform || '—'
            const budget = c.currency === 'NGN' ? `NGN ${Number(c.budget).toLocaleString()}` : `${c.currency} ${Number(c.budget).toLocaleString()}`
            const status = (c.status || 'draft').replace(/_/g, ' ')
            const statusColor = status.toLowerCase() === 'active' ? '#16a34a' : status.toLowerCase() === 'paused' ? '#F59E0B' : '#191C6B'
            return (
              <div className="cmp-card" key={c.id}>
                <div className="cmp-top">
                  <span className="cmp-name">{c.name}</span>
                  <span className="cmp-status" style={{background: `${statusColor}15`, color: statusColor}}>
                    {status.replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <div className="cmp-meta">
                  <div className="cmp-m-item">
                    <div className="cmm-label">Platform</div>
                    <div className="cmm-val">{platform}</div>
                  </div>
                  <div className="cmp-m-item">
                    <div className="cmm-label">Budget</div>
                    <div className="cmm-val">{budget}</div>
                  </div>
                  <div className="cmp-m-item">
                    <div className="cmm-label">Spent</div>
                    <div className="cmm-val">—</div>
                  </div>
                  <div className="cmp-m-item">
                    <div className="cmm-label">Engagements</div>
                    <div className="cmm-val">—</div>
                  </div>
                </div>
                <div className="cmp-bar">
                  <div className="cmp-fill" style={{width:'0%',background:'var(--accent)'}} />
                </div>
                <div className="cmp-actions">
                  <button className="cmp-btn" onClick={() => document.getElementById('appToast') && (document.getElementById('appToast')!.textContent = 'Edit coming soon') || document.getElementById('appToast')!.classList.add('show') || setTimeout(() => document.getElementById('appToast')?.classList.remove('show'), 2000)}><i className="ti ti-edit" /> Edit</button>
                  <button className="cmp-btn" onClick={() => document.getElementById('appToast') && (document.getElementById('appToast')!.textContent = 'Stats coming soon') || document.getElementById('appToast')!.classList.add('show') || setTimeout(() => document.getElementById('appToast')?.classList.remove('show'), 2000)}><i className="ti ti-chart-bar" /> Stats</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className={`cmp-overlay ${showModal ? 'open' : ''}`} onClick={() => setShowModal(false)}>
        <div className="cmp-modal" onClick={e => e.stopPropagation()}>
          <h2>New Campaign</h2>
          <div className="cmp-field">
            <label>Campaign Name</label>
            <input type="text" placeholder="e.g. Brand Awareness Q3" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>
          <div className="cmp-field">
            <label>Platform</label>
            <select value={form.platform} onChange={e => setForm(f => ({...f, platform: e.target.value}))}>
              <option>X/Twitter</option>
              <option>Telegram</option>
              <option>Instagram</option>
              <option>Multi-platform</option>
            </select>
          </div>
          <div className="cmp-field">
            <label>Budget (NGN)</label>
            <input type="number" placeholder="e.g. 50000" value={form.budget} onChange={e => setForm(f => ({...f, budget: e.target.value}))} />
          </div>
          <div className="cmp-field">
            <label>Description</label>
            <input type="text" placeholder="Campaign description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
          </div>
          <div className="cmp-modal-actions">
            <button className="cmp-btn" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="cmp-btn primary" disabled={saving} onClick={handleCreate}>{saving ? 'Creating...' : 'Launch Campaign'}</button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
