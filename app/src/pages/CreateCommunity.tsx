import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { uploadImage } from '../lib/upload'
import { apiRequest } from '../lib/api'
import { useMoney } from '../lib/useMoney'
import { useToast } from '../components/Toast'

// Same rank names as the leaders' Join rules (0 = anyone), so the saved value matches (2026-11-08)
const RANKS = ['Anyone', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Legend']
const CATEGORIES = ['Crypto', 'Business', 'Content', 'Design', 'Marketing', 'Technology', 'Gaming', 'Education', 'Social', 'Other']
// Real hex colours only: the server drops anything else and saves purple (2026-11-08)
const PRESET_COLORS = ['#7C3AED', '#0A0A0A', '#EC4899', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6']

export default function CreateCommunity() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const { toast } = useToast()
  const show = useMoney()

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Technology',
    accentColor: '#7C3AED',
    isPublic: true,
    twitter: '',
    telegram: '',
    discord: '',
    minRank: '',
    minTasks: '',
    requireKyc: false,
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // Creating a community costs ₦500 from your naira wallet (free for admins).
  // Shown before you create; nothing is charged if creating fails.
  // A failed lookup is "unknown", not "free": Create stays off until the fee loads (2026-11-08)
  const [fee, setFee] = useState<{ fee: number; available: number; canPay: boolean } | null>(null)
  const [feeState, setFeeState] = useState<'loading' | 'ok' | 'error'>('loading')
  const loadFee = () => {
    setFeeState('loading')
    apiRequest<{ fee: number; available: number; canPay: boolean }>('/communities/create/fee', { fresh: true })
      .then((d) => { setFee(d); setFeeState('ok') })
      .catch(() => { setFee(null); setFeeState('error') })
  }
  useEffect(loadFee, [])
  // Exact, in the member's display currency (cedis for Ghana); the charge is in naira
  const feeText = (n: number) => show(n, 'NGN', { exact: true })

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || form.name.trim().length < 2) {
      setError('Community name must be at least 2 characters')
      return
    }
    if (feeState !== 'ok' || !fee) { setError("We couldn't load the fee yet. Tap Try again."); return }
    if (fee.fee > 0 && !window.confirm(`Create "${form.name.trim()}"? ${feeText(fee.fee)} will be taken from your naira wallet.`)) return

    if (!localStorage.getItem('ogapay_access_token')) { navigate('/login'); return }

    setSubmitting(true)
    try {
      // The entry requirements go with the create call and are saved with it
      // (same names as Join rules); they used to be thrown away (2026-11-08)
      const rules = { minRank: Number(form.minRank) || 0, minJobsDone: Number(form.minTasks) || 0, requiresKyc: form.requireKyc }
      const created = await apiRequest<any>('/communities', {
        method: 'POST',
        timeoutMs: 30000,
        body: JSON.stringify({
          name: form.name, description: form.description, category: form.category, accentColor: form.accentColor,
          isPublic: form.isPublic, twitter: form.twitter, telegram: form.telegram, discord: form.discord, ...rules,
          // The fee shown: the server refuses (FEE_CHANGED) instead of charging a different one
          expectedFee: fee.fee,
        }),
      })
      const communityId = created?.id
      // An older server ignores them on create: save them the usual way then
      if (communityId && (rules.minRank || rules.minJobsDone || rules.requiresKyc)
        && (Number(created.joinMinRank || 0) !== rules.minRank || Number(created.joinMinJobs || 0) !== rules.minJobsDone || !!created.joinRequiresKyc !== rules.requiresKyc)) {
        await apiRequest(`/communities/${communityId}/join-settings`, { method: 'PATCH', body: JSON.stringify(rules) })
          .catch(() => toast("Community created, but the entry requirements didn't save. Set them again in Join rules.", 'error'))
      }
      // Say what was charged (the server's real amount, not the page's guess)
      const charged = Number(created?.feeCharged) || 0
      toast(charged > 0 ? `Community created. ${feeText(charged)} was taken from your naira wallet.` : 'Community created', 'success')
      if (coverImage && communityId) {
        // A cover that fails is said, not hidden (the community is made and paid for already)
        let coverOk = false
        try {
          const coverUrl = await uploadImage(coverImage, 'community-covers')
          if (coverUrl) {
            await apiRequest(`/communities/${communityId}/cover`, { method: 'POST', body: JSON.stringify({ coverUrl }) })
            coverOk = true
          }
        } catch (e: any) { console.error(e) }
        if (!coverOk) toast("Your cover picture didn't upload. Use a JPG, PNG or WebP picture and add it in Settings.", 'error')
      }
      if (communityId) {
        navigate('/communities/' + communityId)
      } else {
        navigate('/communities')
      }
    } catch (err: any) {
      if (err?.code === 'FEE_CHANGED') {
        setError('The fee changed. Please check it again.')
        loadFee()
        return
      }
      // No answer is not "it failed": the community may exist and be paid for, so don't invite a blind second try
      setError(/timed out|failed to fetch|network/i.test(err?.message || '')
        ? "We couldn't confirm it. Check My communities before you try again, so you don't pay twice."
        : err?.message || "Couldn't create the community")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <style>{`
        .cc-wrap{max-width:600px;margin:0 auto;padding:0 0 40px}
        .cc-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:20px;color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;border:none;background:none;padding:0}
        .cc-back:hover{color:var(--text)}
        .cc-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px}
        .cc-card h1{font-family:Inter;font-size:24px;font-weight:900;margin:0 0 4px}
        .cc-card .cc-sub{color:var(--text2);font-size:13px;margin:0 0 24px}
        .cc-field{margin-bottom:18px}
        .cc-field label{display:block;font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px}
        .cc-field input,.cc-field textarea,.cc-field select{width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;outline:none;transition:border-color .2s;box-sizing:border-box}
        .cc-field input:focus,.cc-field textarea:focus,.cc-field select:focus{border-color:var(--accent)}
        .cc-field textarea{min-height:100px;resize:vertical}
        .cc-field select{cursor:pointer}
        .cc-colors{display:flex;gap:8px;flex-wrap:wrap}
        .cc-color{width:36px;height:36px;border-radius:50%;border:3px solid transparent;cursor:pointer;transition:all .15s}
        .cc-color:hover{transform:scale(1.1)}
        .cc-color.active{border-color:var(--text)}
        .cc-toggle{display:flex;gap:8px}
        .cc-toggle button{flex:1;padding:10px;border:1.5px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text2);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
        .cc-toggle button.active{border-color:var(--accent);color:var(--accent);background:rgba(var(--accent-rgb),.05)}
        .cc-error{background:rgba(239,68,68,.08);color:#EF4444;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:8px}
        .cc-submit{width:100%;height:46px;border:0;border-radius:12px;background:var(--accent);color:var(--on-accent);font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px}
        .cc-submit:hover{opacity:.9}
        .cc-submit:disabled{opacity:.5;cursor:not-allowed}
        .cc-fee{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:var(--bg2,var(--card2));margin:4px 0 12px;font-size:13px;line-height:1.5}
        .cc-fee i{font-size:18px;color:var(--text2);margin-top:1px}
        .cc-fee div{display:flex;flex-direction:column;gap:2px}
        .cc-fee span{color:var(--text2)}
        .cc-retry{align-self:flex-start;border:0;background:none;padding:0;font:inherit;color:var(--text);font-weight:600;text-decoration:underline;min-height:32px;cursor:pointer}
        .cc-fee a{color:var(--text);font-weight:600;text-decoration:underline;min-height:32px;display:inline-flex;align-items:center}
      `}</style>

      <div className="cc-wrap">
        <button className="cc-back" onClick={() => navigate('/communities')}>
          <i className="ti ti-arrow-left" /> Back to Communities
        </button>

        <div className="cc-card">
          <h1>Create a Community</h1>
          <p className="cc-sub">Bring people together around a shared interest. Set up your community in minutes.</p>

          {error && <div className="cc-error"><i className="ti ti-alert-circle" /> {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="cc-field">
              <label>Community Name *</label>
              <input type="text" placeholder="e.g. Crypto Traders Hub" value={form.name} onChange={e => update('name', e.target.value)} maxLength={60} />
            </div>

            <div className="cc-field">
              <label>Description</label>
              <textarea placeholder="What is this community about? What kind of content and discussions will members find here?" value={form.description} onChange={e => update('description', e.target.value)} maxLength={500} />
            </div>

            <div className="cc-field">
              <label>Category</label>
              <select value={form.category} onChange={e => update('category', e.target.value)}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="cc-field">
              <label>Accent Color</label>
              <div className="cc-colors">
                {PRESET_COLORS.map(color => (
                  <div key={color} className={`cc-color ${form.accentColor === color ? 'active' : ''}`} style={{ background: color }} onClick={() => update('accentColor', color)} />
                ))}
              </div>
            </div>

            <div className="cc-field">
              <label>Social Links (optional)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-brand-x" style={{ fontSize: 18, color: 'var(--text3)', width: 20 }} />
                  <input type="text" placeholder="https://x.com/yourcommunity" value={form.twitter} onChange={e => update('twitter', e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-send" style={{ fontSize: 18, color: 'var(--text3)', width: 20 }} />
                  <input type="text" placeholder="https://t.me/yourcommunity" value={form.telegram} onChange={e => update('telegram', e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-brand-discord" style={{ fontSize: 18, color: 'var(--text3)', width: 20 }} />
                  <input type="text" placeholder="https://discord.gg/yourcommunity" value={form.discord} onChange={e => update('discord', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="cc-field">
              <label>Cover Image (optional)</label>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files?.[0] || null
                setCoverImage(file)
                setCoverPreview(file ? URL.createObjectURL(file) : null)
              }} />
              <div onClick={() => fileRef.current?.click()} style={{
                width: '100%',
                height: 160,
                borderRadius: 12,
                border: '1.5px dashed var(--border)',
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
              }}>
                {coverPreview ? (
                  <img loading="lazy" src={coverPreview} alt="Cover preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text3)', fontSize: 13 }}>
                    <i className="ti ti-photo" style={{ fontSize: 28 }} />
                    <span>Click to upload cover image</span>
                  </div>
                )}
                {coverPreview && (
                  <div onClick={e => { e.stopPropagation(); setCoverImage(null); setCoverPreview(null); if (fileRef.current) fileRef.current.value = '' }} style={{
                    position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,.5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: 16,
                  }}>
                    <i className="ti ti-x" />
                  </div>
                )}
              </div>
            </div>

            <div className="cc-field">
              <label>Visibility</label>
              <div className="cc-toggle">
                <button type="button" className={form.isPublic ? 'active' : ''} onClick={() => update('isPublic', true)}>
                  <i className="ti ti-world" style={{ marginRight: 6 }} /> Public
                </button>
                <button type="button" className={!form.isPublic ? 'active' : ''} onClick={() => update('isPublic', false)}>
                  <i className="ti ti-lock" style={{ marginRight: 6 }} /> Private
                </button>
              </div>
            </div>

            <div className="cc-field">
              <label>Entry Requirements (optional)</label>
              <p style={{fontSize:12,color:'var(--text3)',marginTop:-4,marginBottom:8}}>
                Set conditions users must meet to join this community.
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',border:'1.5px solid var(--border)',borderRadius:10,background:'var(--bg)'}}>
                  <span style={{fontSize:13}}>Minimum OgaPay Rank</span>
                  <select value={form.minRank} onChange={e => update('minRank', e.target.value)}
                    style={{border:'1px solid var(--border)',borderRadius:6,padding:'4px 8px',background:'var(--card)',color:'var(--text)',fontSize:12}}>
                    {RANKS.map((r, i) => <option key={r} value={i === 0 ? '' : String(i)}>{i === 0 ? r : `${r} or higher`}</option>)}
                  </select>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',border:'1.5px solid var(--border)',borderRadius:10,background:'var(--bg)'}}>
                  <span style={{fontSize:13}}>Minimum Tasks Completed</span>
                  <select value={form.minTasks} onChange={e => update('minTasks', e.target.value)}
                    style={{border:'1px solid var(--border)',borderRadius:6,padding:'4px 8px',background:'var(--card)',color:'var(--text)',fontSize:12}}>
                    <option value="">None</option>
                    <option value="5">5+ tasks</option>
                    <option value="10">10+ tasks</option>
                    <option value="25">25+ tasks</option>
                    <option value="50">50+ tasks</option>
                  </select>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',border:'1.5px solid var(--border)',borderRadius:10,background:'var(--bg)'}}>
                  <span style={{fontSize:13}}>Level 1 verification (KYC) required</span>
                  <input type="checkbox" checked={form.requireKyc} onChange={e => update('requireKyc', e.target.checked)}
                    style={{width:18,height:18,cursor:'pointer'}} />
                </div>
              </div>
            </div>
            {feeState === 'loading' && <div className="cc-fee" role="status"><i className="ti ti-loader" aria-hidden="true" /><div><span>Checking the fee…</span></div></div>}
            {feeState === 'error' && (
              <div className="cc-fee" role="alert">
                <i className="ti ti-alert-circle" aria-hidden="true" />
                <div>
                  <b>We couldn't load the fee</b>
                  <span>Creating a community may cost money, so you can create it once we know the fee.</span>
                  <button type="button" className="cc-retry" onClick={loadFee}>Try again</button>
                </div>
              </div>
            )}
            {feeState === 'ok' && fee && fee.fee > 0 && (
              <div className="cc-fee" role="note">
                <i className="ti ti-receipt" aria-hidden="true" />
                <div>
                  <b>Creating a community costs {feeText(fee.fee)}</b>
                  <span>Taken from your naira wallet when you create it (you have {feeText(fee.available)} available). It keeps spam communities out. If creating fails, nothing is charged.</span>
                  {!fee.canPay && <Link to="/deposit?back=/communities/create">Add money first</Link>}
                </div>
              </div>
            )}
            <button type="submit" className="cc-submit" disabled={submitting || feeState !== 'ok' || !fee || !fee.canPay}>
              {submitting ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><i className="ti ti-users" /> {fee && fee.fee > 0 ? `Pay ${feeText(fee.fee)} and create` : 'Create Community'}</>}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Layout>
  )
}
