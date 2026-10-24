import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { uploadImage } from '../lib/upload'
import { API_BASE, apiRequest } from '../lib/api'
import { inkOn } from '../components/community/colors'
import '../styles/store.css'

const CATEGORIES = ['Crypto', 'Business', 'Content', 'Design', 'Marketing', 'Technology', 'Gaming', 'Education', 'Social', 'Other']
// Fixed colours only: the theme colour ("var(--accent)") used to be offered and
// turned a community white in dark mode, hiding its initials
const PRESET_COLORS: [string, string][] = [['#7C3AED', 'Purple'], ['#18181B', 'Black'], ['#EC4899', 'Pink'], ['#22C55E', 'Green'], ['#F59E0B', 'Amber'], ['#EF4444', 'Red'], ['#06B6D4', 'Cyan'], ['#2563EB', 'Blue']]
// The same names the Join rules editor on the community page uses
const RANK_OPTIONS: [string, string][] = [['', 'Anyone'], ['2', 'Intermediate or higher'], ['3', 'Advanced or higher'], ['4', 'Expert or higher'], ['5', 'Legend']]
const JOB_OPTIONS: [string, string][] = [['', 'Any'], ['5', '5 or more'], ['10', '10 or more'], ['25', '25 or more'], ['50', '50 or more']]
const initialsOf = (s: string) => s.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'C'

export default function CreateCommunity() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

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
  const [fee, setFee] = useState<{ fee: number; available: number; canPay: boolean } | null>(null)
  useEffect(() => {
    apiRequest<{ fee: number; available: number; canPay: boolean }>('/communities/create/fee').then(setFee).catch(() => setFee(null))
  }, [])
  const feeText = (n: number) => '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 2 })

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || form.name.trim().length < 2) {
      setError('Community name must be at least 2 characters')
      return
    }
    if (fee && fee.fee > 0 && !window.confirm(`Create "${form.name.trim()}"? ${feeText(fee.fee)} will be taken from your naira wallet.`)) return

    const token = localStorage.getItem('ogapay_access_token')
    if (!token) { navigate('/login'); return }

    setSubmitting(true)
    try {
      // Build requirements array
      const requirements = []
      if (form.minRank) requirements.push('Minimum rank: ' + form.minRank)
      if (form.minTasks) requirements.push('Min tasks: ' + form.minTasks)
      if (form.requireKyc) requirements.push('KYC verified')
      const body = { ...form, requirements }
      const res = await fetch(API_BASE + '/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to create community')
      const communityId = json.data?.id
      if (coverImage && communityId) {
        try {
          const coverUrl = await uploadImage(coverImage, 'community-covers')
          if (coverUrl) {
            await fetch(API_BASE + '/communities/' + communityId + '/cover', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify({ coverUrl }),
            })
          }
        } catch (e: any) { console.error(e) }
      }
      if (communityId) {
        navigate('/communities/' + communityId)
      } else {
        navigate('/communities')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const name = form.name.trim()
  const short = !!fee && !fee.canPay
  // Why the button can't be pressed yet, said in one line
  const reason = submitting ? '' : name.length < 2 ? 'Add a name (2 or more characters)' : short ? `Add money first: you have ${feeText(fee!.available)}` : ''
  const submitLabel = submitting ? 'Creating…' : fee && fee.fee > 0 ? `Pay ${feeText(fee.fee)} and create` : 'Create community'

  return (
    <Layout>
      <style>{`
        .cc-back{display:inline-flex;align-items:center;gap:6px;min-height:44px;margin-bottom:8px;color:var(--text2);font-size:13px;font-weight:500;cursor:pointer;border:none;background:none;padding:0;font-family:inherit}
        .cc-back:hover{color:var(--text)}
        .cc-fee{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:var(--sp-4);padding:10px 14px;border:1px solid var(--border);border-radius:var(--r-ctl);background:var(--card2);font-size:13px;line-height:1.5;color:var(--text2)}
        .cc-fee i{font-size:17px;color:var(--text)}
        .cc-fee b{color:var(--text);font-weight:600}
        .cc-fee a{margin-left:auto;color:var(--text);font-weight:600;text-decoration:underline;min-height:36px;display:inline-flex;align-items:center}
        .cc-form{display:grid;gap:var(--sp-4);margin-top:var(--sp-5)}
        .cc-sec{padding:20px}
        .cc-sec h2{margin:0 0 14px;font-size:15px;font-weight:600;color:var(--text)}
        .cc-field{margin-bottom:16px}
        .cc-field:last-child{margin-bottom:0}
        .cc-field textarea.ui-input{height:auto;min-height:100px;padding:12px 14px;resize:vertical;line-height:1.5}
        .cc-colors{display:grid;grid-template-columns:repeat(8,minmax(0,40px));gap:8px}
        .cc-color{width:100%;aspect-ratio:1;border-radius:50%;border:3px solid var(--card);box-shadow:0 0 0 1px var(--border);cursor:pointer;padding:0}
        .cc-color[aria-checked="true"]{box-shadow:0 0 0 2px var(--text)}
        .cc-cover{position:relative;width:100%;aspect-ratio:3/1;border-radius:var(--r-md);border:1.5px dashed var(--border2);background:var(--card2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;overflow:hidden;color:var(--text2);font:500 13px var(--font);padding:0}
        .cc-cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .cc-cover small{font-size:12px;color:var(--text3)}
        .cc-cover-x{position:absolute;top:8px;right:8px;width:40px;height:40px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;display:grid;place-items:center;cursor:pointer;font-size:16px}
        .cc-vis{width:100%;margin-bottom:8px}
        .cc-reqs{display:grid;gap:12px;margin-top:4px}
        .cc-req{display:grid;grid-template-columns:minmax(0,1fr) 220px;align-items:center;gap:12px}
        .cc-req .ui-label{margin:0;font-size:13px}
        .cc-switch{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px;font-size:13px;color:var(--text)}
        .cc-socials summary{display:flex;align-items:center;gap:8px;min-height:44px;font-weight:600;font-size:14px;color:var(--text);cursor:pointer}
        .cc-social{position:relative;margin-top:8px}
        .cc-social i{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:16px;color:var(--text3)}
        .cc-social .ui-input{padding-left:40px}
        .cc-error{background:color-mix(in srgb,var(--red) 10%,transparent);color:var(--red);padding:10px 14px;border-radius:10px;font-size:13px;display:flex;align-items:center;gap:8px}
        .cc-preview{overflow:hidden;padding:0}
        .cc-preview .cv{height:110px;background-size:cover;background-position:center;border-bottom:1px solid var(--border)}
        .cc-preview .lg{width:56px;height:56px;margin:-30px 0 0 20px;border-radius:14px;border:3px solid var(--card);display:grid;place-items:center;font:700 18px var(--font);position:relative}
        .cc-preview .bd{padding:10px 20px 20px}
        .cc-preview b{display:block;font-size:16px;font-weight:600;color:var(--text);overflow-wrap:anywhere}
        .cc-preview small{display:block;margin-top:2px;font-size:12.5px;color:var(--text2)}
        .cc-preview-l{display:block;margin:0 0 8px;font:500 var(--fs-label) var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--text2)}
        .cc-side-pay{margin-top:12px;padding:16px 20px}
        .cc-side-pay p{margin:0 0 12px;font-size:13px;color:var(--text2);line-height:1.5}
        .cc-bar{margin-top:var(--sp-4)}
        @media(min-width:1024px){.cc-bar{display:none}}
        @media(max-width:1023.98px){.cc-side{display:none}}
        @media(max-width:767.98px){.cc-sec{padding:16px}.cc-req{grid-template-columns:1fr;gap:6px}.cc-colors{gap:6px}}
      `}</style>

      <div className="ui-page">
        <button className="cc-back" onClick={() => navigate('/communities')}><i className="ti ti-arrow-left" /> Communities</button>
        <header className="ui-head">
          <div>
            <h1 className="ui-title" style={{ marginTop: 0 }}>Create a community</h1>
            <p className="ui-sub">Bring people together to work and earn on OgaPay.</p>
          </div>
        </header>
        {/* The fee up front, not after the whole form */}
        {fee && fee.fee > 0 && (
          <div className="cc-fee ui-narrow" role="note">
            <i className="ti ti-receipt" aria-hidden="true" />
            <span><b>Costs {feeText(fee.fee)}</b> from your naira wallet · you have {feeText(fee.available)}. Nothing is charged if creating fails.</span>
            {!fee.canPay && <Link to="/deposit?back=/communities/create">Add money</Link>}
          </div>
        )}

        <div className="ui-split">
          <form id="cc-form" className="cc-form" onSubmit={handleSubmit}>
            {error && <div className="cc-error" role="alert"><i className="ti ti-alert-circle" /> {error}</div>}

            <section className="ui-card cc-sec">
              <h2>Basics</h2>
              <div className="cc-field">
                <label className="ui-label" htmlFor="cc-name">Community name</label>
                <input id="cc-name" className="ui-input" type="text" placeholder="e.g. Lagos Crypto Traders" value={form.name} onChange={e => update('name', e.target.value)} maxLength={60} />
              </div>
              <div className="cc-field">
                <label className="ui-label" htmlFor="cc-desc">Description</label>
                <textarea id="cc-desc" className="ui-input" placeholder="What is this community about, and who should join?" value={form.description} onChange={e => update('description', e.target.value)} maxLength={500} />
              </div>
              <div className="cc-field">
                <label className="ui-label" htmlFor="cc-cat">Category</label>
                <select id="cc-cat" className="ui-select" value={form.category} onChange={e => update('category', e.target.value)}>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </section>

            <section className="ui-card cc-sec">
              <h2>Look</h2>
              <div className="cc-field">
                <span className="ui-label" id="cc-colour">Colour</span>
                <div className="cc-colors" role="radiogroup" aria-labelledby="cc-colour">
                  {PRESET_COLORS.map(([color, label]) => (
                    <button key={color} type="button" role="radio" aria-checked={form.accentColor === color} aria-label={label} className="cc-color" style={{ background: color }} onClick={() => update('accentColor', color)} />
                  ))}
                </div>
              </div>
              <div className="cc-field">
                <span className="ui-label">Cover picture (optional)</span>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0] || null
                  setCoverImage(file)
                  setCoverPreview(file ? URL.createObjectURL(file) : null)
                }} />
                <div style={{ position: 'relative' }}>
                  <button type="button" className="cc-cover" onClick={() => fileRef.current?.click()}>
                    {coverPreview ? <img src={coverPreview} alt="Cover preview" /> : <><i className="ti ti-photo" style={{ fontSize: 24 }} aria-hidden="true" /><span>Tap to add a cover</span><small>Wide picture, about 1200 × 400</small></>}
                  </button>
                  {coverPreview && (
                    <button type="button" className="cc-cover-x" aria-label="Remove cover" onClick={() => { setCoverImage(null); setCoverPreview(null); if (fileRef.current) fileRef.current.value = '' }}>
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>
              </div>
              <details className="cc-socials">
                <summary><i className="ti ti-plus" aria-hidden="true" /> Social links (X, Telegram, Discord)</summary>
                <div className="cc-social"><i className="ti ti-brand-x" aria-hidden="true" /><input className="ui-input" type="text" aria-label="X link" placeholder="https://x.com/yourcommunity" value={form.twitter} onChange={e => update('twitter', e.target.value)} /></div>
                <div className="cc-social"><i className="ti ti-brand-telegram" aria-hidden="true" /><input className="ui-input" type="text" aria-label="Telegram link" placeholder="https://t.me/yourcommunity" value={form.telegram} onChange={e => update('telegram', e.target.value)} /></div>
                <div className="cc-social"><i className="ti ti-brand-discord" aria-hidden="true" /><input className="ui-input" type="text" aria-label="Discord link" placeholder="https://discord.gg/yourcommunity" value={form.discord} onChange={e => update('discord', e.target.value)} /></div>
              </details>
            </section>

            <section className="ui-card cc-sec">
              <h2>Who can join</h2>
              <div className="st-seg cc-vis" role="radiogroup" aria-label="Visibility">
                <button type="button" role="radio" aria-checked={form.isPublic} className={form.isPublic ? 'on' : ''} onClick={() => update('isPublic', true)}><i className="ti ti-world" aria-hidden="true" /> Public</button>
                <button type="button" role="radio" aria-checked={!form.isPublic} className={!form.isPublic ? 'on' : ''} onClick={() => update('isPublic', false)}><i className="ti ti-lock" aria-hidden="true" /> Private</button>
              </div>
              <p className="ui-hint" style={{ margin: '0 0 14px' }}>{form.isPublic ? 'Public: anyone can find it and join.' : 'Private: people ask to join and you approve them.'}</p>
              <div className="cc-reqs">
                <div className="cc-req">
                  <label className="ui-label" htmlFor="cc-rank">Minimum rank</label>
                  <select id="cc-rank" className="ui-select" value={form.minRank} onChange={e => update('minRank', e.target.value)}>
                    {RANK_OPTIONS.map(([v, l]) => <option key={v || 'any'} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="cc-req">
                  <label className="ui-label" htmlFor="cc-jobs">Jobs done on OgaPay</label>
                  <select id="cc-jobs" className="ui-select" value={form.minTasks} onChange={e => update('minTasks', e.target.value)}>
                    {JOB_OPTIONS.map(([v, l]) => <option key={v || 'any'} value={v}>{l}</option>)}
                  </select>
                </div>
                <label className="cc-switch ui-switch">
                  <span>Verified identity (Level 1)</span>
                  <input type="checkbox" checked={form.requireKyc} onChange={e => update('requireKyc', e.target.checked)} />
                  <span className="ui-switch-track" aria-hidden="true" />
                </label>
              </div>
            </section>

            {/* Phone and tablet: the price and the button stay above the bottom bar */}
            <div className="ui-actionbar cc-bar">
              <div className="ui-actionbar-text">{reason ? reason : <><b>{fee && fee.fee > 0 ? feeText(fee.fee) : 'Free'}</b>{fee && fee.fee > 0 ? 'from your naira wallet' : 'No fee'}</>}</div>
              <button type="submit" className="ui-btn ui-btn-dark" disabled={submitting || short}>{submitLabel}</button>
            </div>
          </form>

          {/* Desktop: what the community card will look like, and the Create button */}
          <aside className="ui-split-side cc-side">
            <span className="cc-preview-l">Preview</span>
            <div className="ui-card cc-preview">
              <div className="cv" style={coverPreview ? { backgroundImage: `url("${coverPreview}")` } : { background: `linear-gradient(135deg, ${form.accentColor}, color-mix(in srgb, ${form.accentColor} 35%, #0a0a0a))` }} />
              <div className="lg" style={{ background: form.accentColor, color: inkOn(form.accentColor) }}>{initialsOf(name)}</div>
              <div className="bd">
                <b>{name || 'Your community'}</b>
                <small>{form.category} · {form.isPublic ? 'Public' : 'Private'}</small>
              </div>
            </div>
            <div className="ui-card cc-side-pay">
              <p>{reason || (fee && fee.fee > 0 ? `${feeText(fee.fee)} is taken from your naira wallet when you create it.` : 'Ready when you are.')}</p>
              <button type="submit" form="cc-form" className="ui-btn ui-btn-dark ui-btn-lg" style={{ width: '100%' }} disabled={submitting || short}>{submitLabel}</button>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  )
}
