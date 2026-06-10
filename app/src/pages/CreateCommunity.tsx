import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { uploadImage } from '../lib/upload'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

const CATEGORIES = ['Crypto', 'Business', 'Content', 'Design', 'Marketing', 'Technology', 'Gaming', 'Education', 'Social', 'Other']
const PRESET_COLORS = ['#7C3AED', '#191C6B', '#EC4899', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6']

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
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || form.name.trim().length < 2) {
      setError('Community name must be at least 2 characters')
      return
    }

    const token = localStorage.getItem('ogapay_access_token')
    if (!token) { navigate('/login'); return }

    setSubmitting(true)
    try {
      const res = await fetch(API_BASE + '/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(form),
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
        } catch {}
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

  return (
    <Layout>
      <style>{`
        .cc-wrap{max-width:600px;margin:0 auto;padding:0 0 40px}
        .cc-back{display:inline-flex;align-items:center;gap:6px;margin-bottom:20px;color:var(--text2);font-size:13px;font-weight:600;cursor:pointer;border:none;background:none;padding:0}
        .cc-back:hover{color:var(--text)}
        .cc-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px}
        .cc-card h1{font-family:Outfit;font-size:24px;font-weight:900;margin:0 0 4px}
        .cc-card .cc-sub{color:var(--text2);font-size:13px;margin:0 0 24px}
        .cc-field{margin-bottom:18px}
        .cc-field label{display:block;font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px}
        .cc-field input,.cc-field textarea,.cc-field select{width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;outline:none;transition:border-color .2s;box-sizing:border-box}
        .cc-field input:focus,.cc-field textarea:focus,.cc-field select:focus{border-color:#191C6B}
        .cc-field textarea{min-height:100px;resize:vertical}
        .cc-field select{cursor:pointer}
        .cc-colors{display:flex;gap:8px;flex-wrap:wrap}
        .cc-color{width:36px;height:36px;border-radius:50%;border:3px solid transparent;cursor:pointer;transition:all .15s}
        .cc-color:hover{transform:scale(1.1)}
        .cc-color.active{border-color:var(--text)}
        .cc-toggle{display:flex;gap:8px}
        .cc-toggle button{flex:1;padding:10px;border:1.5px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text2);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s}
        .cc-toggle button.active{border-color:#191C6B;color:#191C6B;background:rgba(25,28,107,.05)}
        .cc-error{background:rgba(239,68,68,.08);color:#EF4444;padding:10px 14px;border-radius:10px;font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:8px}
        .cc-submit{width:100%;height:46px;border:0;border-radius:12px;background:#191C6B;color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px}
        .cc-submit:hover{opacity:.9}
        .cc-submit:disabled{opacity:.5;cursor:not-allowed}
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
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
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
                  <img src={coverPreview} alt="Cover preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

            <button type="submit" className="cc-submit" disabled={submitting}>
              {submitting ? <><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><i className="ti ti-users" /> Create Community</>}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Layout>
  )
}
