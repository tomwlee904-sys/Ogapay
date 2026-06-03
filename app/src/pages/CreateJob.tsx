import { useState } from 'react'
import Layout from '../components/Layout'

// ─── Platform Data (Social Cluster) ───
const platforms = [
  { id: 'x', name: 'X / Twitter', icon: 'ti-brand-x', color: '#000000', bg: '#f0f0f0', darkBg: '#1a1a1a' },
  { id: 'instagram', name: 'Instagram', icon: 'ti-brand-instagram', color: '#E4405F', bg: '#fce8ed', darkBg: '#2a151b' },
  { id: 'youtube', name: 'YouTube', icon: 'ti-brand-youtube', color: '#FF0000', bg: '#ffe5e5', darkBg: '#2a1515' },
  { id: 'telegram', name: 'Telegram', icon: 'ti-brand-telegram', color: '#0088cc', bg: '#e5f4ff', darkBg: '#101f2a' },
  { id: 'discord', name: 'Discord', icon: 'ti-brand-discord', color: '#5865F2', bg: '#eef0ff', darkBg: '#14182a' },
  { id: 'tiktok', name: 'TikTok', icon: 'ti-brand-tiktok', color: '#000000', bg: '#f5f5f5', darkBg: '#1a1a1a' },
  { id: 'facebook', name: 'Facebook', icon: 'ti-brand-facebook', color: '#1877F2', bg: '#e5f0ff', darkBg: '#0f1d2a' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'ti-brand-linkedin', color: '#0A66C2', bg: '#e5f0fa', darkBg: '#0f1a25' },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'ti-brand-whatsapp', color: '#25D366', bg: '#e5fcee', darkBg: '#102a1a' },
  { id: 'website', name: 'Website', icon: 'ti-world', color: '#6366F1', bg: '#eeeffc', darkBg: '#14152a' },
]

const categories = [
  'Social Media', 'Content Creation', 'Testing & Review', 'Design', 
  'Video & Animation', 'Data Entry', 'Research', 'Development'
]

const difficulties = ['Easy', 'Medium', 'Hard']
const rankRequirements = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum']

export default function CreateJob() {
  // Tab state
  const [activeTab, setActiveTab] = useState<'social' | 'custom'>('social')

  // Social Cluster state
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, { enabled: boolean; quantity: number; rewardPerAction: number }>>({})
  // Custom Job state
  const [customForm, setCustomForm] = useState({
    title: '',
    description: '',
    category: 'Social Media',
    difficulty: 'Easy',
    reward: 0.025,
    currency: 'SOL',
    slots: 50,
    verificationRequired: false,
    rankRequired: 'None',
    estimatedTime: '10 min',
    instructions: '',
  })

  const [showSuccess, setShowSuccess] = useState(false)

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => {
      const existing = prev[id]
      if (existing) {
        return { ...prev, [id]: { ...existing, enabled: !existing.enabled } }
      }
      return { ...prev, [id]: { enabled: true, quantity: 10, rewardPerAction: 0.005 } }
    })
  }

  const updatePlatform = (id: string, field: 'quantity' | 'rewardPerAction', value: number) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
  }

  const updateCustomForm = (field: string, value: any) => {
    setCustomForm(prev => ({ ...prev, [field]: value }))
  }

  // Computed totals
  const socialTotal = Object.entries(selectedPlatforms)
    .filter(([, v]) => v.enabled)
    .reduce((sum, [, v]) => sum + v.quantity * v.rewardPerAction, 0)

  const platformFee = socialTotal * 0.05
  const socialGrandTotal = socialTotal + platformFee

  const enabledCount = Object.values(selectedPlatforms).filter(v => v.enabled).length
  const totalActions = Object.values(selectedPlatforms)
    .filter(v => v.enabled)
    .reduce((sum, v) => sum + v.quantity, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 4000)
  }

  return (
    <Layout>
      <style>{`
        .page{max-width:100%!important;padding:0}
        .create-page{width:100%;max-width:1000px;margin:0 auto;padding:2rem 1rem 4rem}
        .create-page .page-head{margin-bottom:2rem}
        .create-page .page-head h1{font-family:Outfit;font-size:1.75rem;font-weight:900;margin:0;letter-spacing:-.02em}
        .create-page .page-head p{color:var(--text2);font-size:.875rem;margin:.25rem 0 0;line-height:1.5}
        .create-page .page-head .back-link{display:inline-flex;align-items:center;gap:.35rem;font-size:.8125rem;color:var(--text2);margin-bottom:.75rem;cursor:pointer;transition:color .2s}
        .create-page .page-head .back-link:hover{color:var(--text)}

        /* ── Tab Switcher ── */
        .create-tabs{display:flex;gap:.5rem;margin-bottom:2rem;background:var(--bg2);border-radius:.75rem;padding:.375rem;border:1px solid var(--border)}
        .create-tab{flex:1;padding:.625rem 1rem;border:0;border-radius:.5rem;background:transparent;color:var(--text2);font-size:.8125rem;font-weight:700;cursor:pointer;transition:all .15s;text-align:center}
        .create-tab:hover{color:var(--text)}
        .create-tab.active{background:var(--card);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.06)}
        .create-tab i{font-size:1.125rem;display:block;margin-bottom:.25rem}

        /* ── Social Cluster Grid ── */
        .components-list{max-width:100%;margin:0 auto}
        .social-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;margin-bottom:1.5rem}
        .component-card{background:var(--card);border:2px solid var(--border);border-radius:.875rem;overflow:hidden;transition:all .25s cubic-bezier(.4,0,.2,1);position:relative;cursor:pointer}
        .component-card:hover{border-color:rgba(124,58,237,.2);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.06)}
        [data-theme="dark"] .component-card:hover{border-color:rgba(167,139,250,.2);box-shadow:0 8px 24px rgba(0,0,0,.15)}
        .component-card.selected{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent),0 8px 24px rgba(124,58,237,.08)}
        .component-card .card-header{display:flex;align-items:center;gap:.75rem;padding:.875rem 1rem;border-bottom:1px solid var(--border);background:var(--bg2)}
        .component-card .card-header .platform-icon{width:36px;height:36px;border-radius:.5rem;display:grid;place-items:center;font-size:1.125rem;flex-shrink:0}
        .component-card .card-header .platform-name{font-size:.875rem;font-weight:800;flex:1}
        .component-card .card-header .check-wrap{position:relative;width:22px;height:22px;flex-shrink:0}
        .component-card .card-header .check-wrap input{width:22px;height:22px;cursor:pointer;accent-color:var(--accent)}
        .component-card .card-body{padding:1rem;display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
        .component-card .card-body .field{display:flex;flex-direction:column;gap:.25rem}
        .component-card .card-body .field label{font-size:.6875rem;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.04em}
        .component-card .card-body .field input{height:36px;padding:0 .625rem;border:1.5px solid var(--border);border-radius:.5rem;background:var(--bg);color:var(--text);font-size:.8125rem;font-weight:600;outline:none;transition:border-color .2s}
        .component-card .card-body .field input:focus{border-color:var(--accent)}
        .component-card .card-body .field input:disabled{opacity:.4;cursor:not-allowed}
        .component-card .card-actions{display:flex;gap:.5rem;padding:.75rem 1rem;border-top:1px solid var(--border)}
        .component-card .card-actions .action-btn{flex:1;height:34px;border:1.5px solid var(--border);border-radius:.5rem;background:var(--card);color:var(--text2);font-size:.75rem;font-weight:700;cursor:pointer;transition:all .15s}
        .component-card .card-actions .action-btn:hover{border-color:var(--text2);color:var(--text)}
        .component-card .card-actions .action-btn.primary{background:var(--accent);color:#fff;border-color:var(--accent)}

        /* ── Custom Form ── */
        .custom-form{display:grid;gap:1.25rem}
        .form-card{background:var(--card);border:1px solid var(--border);border-radius:.875rem;padding:1.5rem}
        .form-card .card-title{font-family:Outfit;font-size:1.0625rem;font-weight:800;margin:0 0 1.25rem;padding-bottom:.75rem;border-bottom:1px solid var(--border)}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
        .form-group{display:flex;flex-direction:column;gap:.35rem}
        .form-group.full{grid-column:1/-1}
        .form-group label{font-size:.75rem;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.04em}
        .form-group input,.form-group select,.form-group textarea{height:42px;padding:0 .75rem;border:1.5px solid var(--border);border-radius:.5rem;background:var(--bg);color:var(--text);font-size:.8125rem;outline:none;transition:border-color .2s}
        .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(124,58,237,.08)}
        .form-group textarea{height:100px;padding:.625rem .75rem;resize:vertical;font-family:inherit;line-height:1.5}
        .form-group .hint{font-size:.6875rem;color:var(--text3);margin-top:.15rem}
        .form-group .toggle-wrap{display:flex;align-items:center;gap:.75rem;padding:.5rem 0}
        .form-group .toggle-wrap input[type=checkbox]{width:44px;height:24px;border-radius:999px;border:1.5px solid var(--border);background:var(--bg2);cursor:pointer;position:relative;appearance:none;transition:all .2s;flex-shrink:0}
        .form-group .toggle-wrap input[type=checkbox]:checked{background:var(--accent);border-color:var(--accent)}
        .form-group .toggle-wrap input[type=checkbox]:before{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:white;transition:all .2s}
        .form-group .toggle-wrap input[type=checkbox]:checked:before{left:22px}

        /* ── Summary Card ── */
        .form-summary{margin-top:1.5rem;padding:1.25rem 1.5rem;background:linear-gradient(135deg,var(--bg2),var(--card));border:2px solid var(--border);border-radius:.875rem}
        .summary-row{display:flex;justify-content:space-between;align-items:center;padding:.5rem 0;font-size:.875rem;color:var(--text2)}
        .summary-row strong{color:var(--text);font-size:1rem}
        .summary-row.summary-row-total{border-top:1px solid var(--border);margin-top:.5rem;padding-top:1rem;flex-direction:row}
        .summary-row.summary-row-total .summary-total-values{display:flex;flex-direction:column;align-items:flex-end;gap:.15rem}
        .summary-row.summary-row-total .total-amount{font-family:Outfit;font-size:1.375rem;font-weight:900;color:var(--text)}
        .summary-row.summary-row-total .total-label{color:var(--text2);font-weight:700}

        /* ── Submit ── */
        .form-actions-row{display:flex;justify-content:flex-end;gap:.75rem;margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border)}
        .btn-primary-submit{height:48px;padding:0 2rem;border:0;border-radius:.625rem;background:linear-gradient(135deg,var(--accent),#9333EA);color:#fff;font-size:.9375rem;font-weight:800;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:.625rem;box-shadow:0 4px 14px rgba(124,58,237,.25)}
        .btn-primary-submit:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(124,58,237,.35)}
        .btn-primary-submit:disabled{opacity:.5;cursor:not-allowed;transform:none}
        .btn-secondary{height:48px;padding:0 1.5rem;border:1.5px solid var(--border);border-radius:.625rem;background:var(--card);color:var(--text);font-size:.875rem;font-weight:700;cursor:pointer;transition:all .15s}
        .btn-secondary:hover{border-color:var(--text2)}

        /* ── Success State ── */
        .success-overlay{position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);animation:fadeIn .2s ease}
        .success-card{background:var(--card);border:1px solid var(--border);border-radius:1rem;padding:2.5rem;text-align:center;max-width:420px;width:90%;box-shadow:0 24px 48px rgba(0,0,0,.15)}
        .success-card .success-icon{width:56px;height:56px;border-radius:50%;background:rgba(22,163,74,.12);color:var(--green);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:1.5rem}
        .success-card h2{font-family:Outfit;font-weight:900;margin:0 0 .25rem;font-size:1.25rem}
        .success-card p{color:var(--text2);font-size:.875rem;margin:0 0 1.5rem;line-height:1.5}
        .success-card .btn-done{height:44px;padding:0 1.5rem;border:0;border-radius:.5rem;background:var(--accent);color:#fff;font-weight:700;font-size:.875rem;cursor:pointer;transition:all .2s}

        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

        @media(max-width:768px){
          .create-page{padding:1.25rem .75rem 3rem}
          .social-grid{grid-template-columns:1fr}
          .component-card .card-body{grid-template-columns:1fr 1fr}
          .form-row{grid-template-columns:1fr}
          .form-summary{padding:1rem}
          .form-actions-row{flex-direction:column}
          .form-actions-row .btn-primary-submit{width:100%;justify-content:center}
          .form-actions-row .btn-secondary{width:100%;justify-content:center}
        }
      `}</style>

      <div className="create-page">
        {/* Page Header */}
        <div className="page-head">
          <a className="back-link" href="/app/tasks">
            <i className="ti ti-arrow-left" />
            Back to Tasks
          </a>
          <h1>Create Job</h1>
          <p>Post a task and earn rewards. Choose between social media campaigns or custom jobs.</p>
        </div>

        {/* Tab Switcher */}
        <div className="create-tabs">
          <button className={`create-tab ${activeTab === 'social' ? 'active' : ''}`} onClick={() => setActiveTab('social')}>
            <i className="ti ti-share" />
            Social Cluster
          </button>
          <button className={`create-tab ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => setActiveTab('custom')}>
            <i className="ti ti-tool" />
            Custom Job
          </button>
        </div>

        {/* ════════════════════════════════════ */}
        {/* SOCIAL CLUSTER TAB */}
        {/* ════════════════════════════════════ */}
        {activeTab === 'social' && (
          <form onSubmit={handleSubmit}>
            <div className="components-list">
              <div className="social-grid">
                {platforms.map(p => {
                  const selected = selectedPlatforms[p.id]
                  const enabled = selected?.enabled ?? false
                  return (
                    <div key={p.id} className={`component-card ${enabled ? 'selected' : ''}`}>
                      <div className="card-header">
                        <div className="platform-icon" style={{ 
                          background: `color-mix(in srgb, ${p.color} 12%, transparent)`, 
                          color: p.color 
                        }}>
                          <i className={`ti ${p.icon}`} />
                        </div>
                        <span className="platform-name">{p.name}</span>
                        <div className="check-wrap">
                          <input type="checkbox" checked={enabled} onChange={() => togglePlatform(p.id)} />
                        </div>
                      </div>
                      <div className="card-body">
                        <div className="field">
                          <label>Quantity</label>
                          <input 
                            type="number" min={1} max={1000} 
                            value={enabled ? (selected?.quantity ?? 10) : 10}
                            disabled={!enabled}
                            onChange={e => updatePlatform(p.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </div>
                        <div className="field">
                          <label>Reward (SOL)</label>
                          <input 
                            type="number" min={0.001} step={0.001} 
                            value={enabled ? (selected?.rewardPerAction ?? 0.005) : 0.005}
                            disabled={!enabled}
                            onChange={e => updatePlatform(p.id, 'rewardPerAction', Math.max(0.001, parseFloat(e.target.value) || 0.001))}
                          />
                        </div>
                      </div>
                      {enabled && (
                        <div className="card-actions">
                          <div className="action-btn" style={{ cursor: 'default', borderColor: 'transparent', background: 'transparent', color: 'var(--text2)', fontSize: '.6875rem' }}>
                            {selected!.quantity} × ◎{selected!.rewardPerAction.toFixed(3)}
                          </div>
                          <div className="action-btn primary" style={{ cursor: 'default' }}>
                            = ◎{(selected!.quantity * selected!.rewardPerAction).toFixed(3)}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="form-summary">
              <div className="summary-row">
                <span>Platforms Selected</span>
                <strong>{enabledCount} of {platforms.length}</strong>
              </div>
              <div className="summary-row">
                <span>Total Actions</span>
                <strong>{totalActions}</strong>
              </div>
              <div className="summary-row">
                <span>Rewards Total</span>
                <strong>◎ {socialTotal.toFixed(3)}</strong>
              </div>
              <div className="summary-row">
                <span>Platform Fee (5%)</span>
                <strong>◎ {platformFee.toFixed(3)}</strong>
              </div>
              <div className="summary-row summary-row-total">
                <span className="total-label">Total to Fund</span>
                <div className="summary-total-values">
                  <span className="total-amount">◎ {socialGrandTotal.toFixed(3)}</span>
                  <span style={{ fontSize: '.75rem', color: 'var(--green)' }}>≈ ${(socialGrandTotal * 128).toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions-row">
              <button type="button" className="btn-secondary">
                <i className="ti ti-file-text" />
                Save as Template
              </button>
              <button type="submit" className="btn-primary-submit" disabled={enabledCount === 0}>
                <i className="ti ti-wallet" />
                Create & Fund Job
              </button>
            </div>
          </form>
        )}

        {/* ════════════════════════════════════ */}
        {/* CUSTOM JOB TAB */}
        {/* ════════════════════════════════════ */}
        {activeTab === 'custom' && (
          <form onSubmit={handleSubmit}>
            <div className="custom-form">
              {/* Basic Info */}
              <div className="form-card">
                <h3 className="card-title">Basic Information</h3>
                <div className="form-row">
                  <div className="form-group full">
                    <label>Job Title</label>
                    <input 
                      type="text" placeholder="e.g. Social Media Engagement" 
                      value={customForm.title}
                      onChange={e => updateCustomForm('title', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group full">
                    <label>Description</label>
                    <textarea 
                      placeholder="Describe what workers need to do. Be specific about requirements, steps, and expected output."
                      value={customForm.description}
                      onChange={e => updateCustomForm('description', e.target.value)}
                      required
                    />
                    <span className="hint">Provide clear instructions to get the best results.</span>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={customForm.category} onChange={e => updateCustomForm('category', e.target.value)}>
                      {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Difficulty</label>
                    <select value={customForm.difficulty} onChange={e => updateCustomForm('difficulty', e.target.value)}>
                      {difficulties.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Reward & Slots */}
              <div className="form-card">
                <h3 className="card-title">Reward & Slots</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Reward per Worker</label>
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      <input 
                        type="number" min={0.001} step={0.001} style={{ flex: 1 }}
                        value={customForm.reward}
                        onChange={e => updateCustomForm('reward', Math.max(0.001, parseFloat(e.target.value) || 0.001))}
                      />
                      <select 
                        value={customForm.currency}
                        onChange={e => updateCustomForm('currency', e.target.value)}
                        style={{ width: '80px', padding: '0 .5rem', border: '1.5px solid var(--border)', borderRadius: '.5rem', background: 'var(--bg)', color: 'var(--text)', fontWeight: 700, outline: 'none' }}
                      >
                        <option>SOL</option>
                        <option>USDC</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Available Slots</label>
                    <input 
                      type="number" min={1} max={10000}
                      value={customForm.slots}
                      onChange={e => updateCustomForm('slots', Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Est. Completion Time</label>
                    <input 
                      type="text" placeholder="e.g. 10 min, 1 hour"
                      value={customForm.estimatedTime}
                      onChange={e => updateCustomForm('estimatedTime', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Minimum Rank</label>
                    <select value={customForm.rankRequired} onChange={e => updateCustomForm('rankRequired', e.target.value)}>
                      {rankRequirements.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: '.75rem' }}>
                  <div className="toggle-wrap">
                    <input 
                      type="checkbox" 
                      checked={customForm.verificationRequired}
                      onChange={e => updateCustomForm('verificationRequired', e.target.checked)}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '.8125rem' }}>Require Verification</div>
                      <div style={{ fontSize: '.75rem', color: 'var(--text3)' }}>Workers must complete KYC to apply</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="form-card">
                <h3 className="card-title">Instructions</h3>
                <div className="form-group full">
                  <label>Worker Instructions</label>
                  <textarea 
                    placeholder="Provide detailed step-by-step instructions for workers. Include links, screenshots, or any resources they might need."
                    style={{ height: '140px' }}
                    value={customForm.instructions}
                    onChange={e => updateCustomForm('instructions', e.target.value)}
                  />
                  <span className="hint">Good instructions lead to better quality work.</span>
                </div>
              </div>

              {/* Summary */}
              <div className="form-summary">
                <div className="summary-row">
                  <span>Reward per Worker</span>
                  <strong>◎ {customForm.reward.toFixed(3)}</strong>
                </div>
                <div className="summary-row">
                  <span>Available Slots</span>
                  <strong>{customForm.slots}</strong>
                </div>
                <div className="summary-row">
                  <span>Total Rewards</span>
                  <strong>◎ {(customForm.reward * customForm.slots).toFixed(3)}</strong>
                </div>
                <div className="summary-row">
                  <span>Platform Fee (5%)</span>
                  <strong>◎ {(customForm.reward * customForm.slots * 0.05).toFixed(3)}</strong>
                </div>
                <div className="summary-row summary-row-total">
                  <span className="total-label">Total to Fund</span>
                  <div className="summary-total-values">
                    <span className="total-amount">◎ {(customForm.reward * customForm.slots * 1.05).toFixed(3)}</span>
                    <span style={{ fontSize: '.75rem', color: 'var(--green)' }}>≈ ${(customForm.reward * customForm.slots * 1.05 * 128).toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="form-actions-row">
                <button type="button" className="btn-secondary">
                  <i className="ti ti-file-text" />
                  Save as Template
                </button>
                <button type="submit" className="btn-primary-submit" disabled={!customForm.title || !customForm.description}>
                  <i className="ti ti-wallet" />
                  Create & Fund Job
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Success Overlay */}
        {showSuccess && (
          <div className="success-overlay" onClick={() => setShowSuccess(false)}>
            <div className="success-card" onClick={e => e.stopPropagation()}>
              <div className="success-icon">
                <i className="ti ti-check" />
              </div>
              <h2>Job Created!</h2>
              <p>Your job has been posted successfully. Workers can now start applying and completing tasks.</p>
              <button className="btn-done" onClick={() => setShowSuccess(false)}>
                View My Jobs
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
