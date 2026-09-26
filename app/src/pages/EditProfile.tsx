import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { uploadImage } from '../lib/upload'
import { useAuth } from '../context/AuthContext'
import '../styles/profile-public.css'
import '../styles/hire.css'
import '../styles/edit-profile.css'

const CATEGORIES: [string, string][] = [
  ['SOCIAL_MEDIA', 'Social media'], ['CONTENT_WRITING', 'Writing'], ['DESIGN', 'Design'], ['DATA_ENTRY', 'Data entry'],
  ['APP_TESTING', 'App testing'], ['SURVEY', 'Surveys'], ['TRANSLATION', 'Translation'], ['WEB_RESEARCH', 'Web research'],
  ['VIDEO_REVIEW', 'Video'], ['OTHER', 'Other'],
]
const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/

type Form = {
  firstName: string; lastName: string; username: string; bio: string; skills: string
  categories: string[]; isAvailable: boolean; isPublic: boolean; showEarnings: boolean; showRank: boolean
  twitter: string; telegram: string; discord: string; website: string
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`ep-switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  )
}

// Real profile editor: loads /users/me, saves only what changed to PATCH /users/me
export default function EditProfile() {
  const { refreshUser } = useAuth()
  const [me, setMe] = useState<any>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const fromUser = (u: any): Form => ({
    firstName: u.firstName || '', lastName: u.lastName || '', username: u.username || '',
    bio: u.workerProfile?.bio || u.workerProfileBio || '',
    skills: (u.workerProfile?.skills || []).join(', '),
    categories: u.workerProfile?.categories || [],
    isAvailable: u.workerProfile?.isAvailable !== false,
    isPublic: u.isPublic !== false,
    showEarnings: u.preferences?.showEarnings === true,
    showRank: u.preferences?.showRank === true,
    twitter: u.twitter || '', telegram: u.telegram || '', discord: u.discord || '', website: u.website || '',
  })

  useEffect(() => {
    apiRequest<any>('/users/me')
      .then((u) => { setMe(u); setForm(fromUser(u)); setAvatar(u.avatarUrl || null) })
      .catch(() => setMsg({ ok: false, text: "Couldn't load your profile. Refresh to try again." }))
  }, [])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => (f ? { ...f, [k]: v } : f)); setMsg(null); setErrors((e) => ({ ...e, [k]: '' })) }

  const pickAvatar = async (file?: File) => {
    if (!file) return
    setUploading(true); setMsg(null)
    try {
      const url = await uploadImage(file, 'avatars') // saves it on the account too
      setAvatar(url)
      refreshUser()
    } catch (e: any) { setMsg({ ok: false, text: e?.message || 'Photo upload failed' }) }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !me) return
    const errs: Record<string, string> = {}
    if (!form.firstName.trim()) errs.firstName = 'First name is required'
    if (!USERNAME_RE.test(form.username.trim())) errs.username = '3-30 letters, numbers or _'
    if (form.website.trim() && !/^https?:\/\//i.test(form.website.trim())) errs.website = 'Start with https://'
    if (Object.keys(errs).length) { setErrors(errs); return }

    const base = fromUser(me)
    const body: Record<string, any> = {}
    for (const k of ['firstName', 'lastName', 'username', 'twitter', 'telegram', 'discord', 'website'] as const) {
      if (form[k].trim() !== base[k]) body[k] = form[k].trim()
    }
    if (form.bio.trim() !== base.bio) body.bio = form.bio.trim()
    const skills = form.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 15)
    if (skills.join('|') !== base.skills.split(',').map((s) => s.trim()).filter(Boolean).join('|')) body.skills = skills
    if (form.categories.join('|') !== base.categories.join('|')) body.categories = form.categories
    if (form.isAvailable !== base.isAvailable) body.isAvailable = form.isAvailable
    if (form.isPublic !== base.isPublic) body.isPublic = form.isPublic
    if (form.showEarnings !== base.showEarnings || form.showRank !== base.showRank) {
      body.preferences = { ...(me.preferences || {}), showEarnings: form.showEarnings, showRank: form.showRank }
    }
    if (!Object.keys(body).length) { setMsg({ ok: true, text: 'No changes to save.' }); return }

    setSaving(true); setMsg(null)
    try {
      await apiRequest('/users/me', { method: 'PATCH', body: JSON.stringify(body) })
      const fresh = await apiRequest<any>('/users/me')
      setMe(fresh); setForm(fromUser(fresh))
      refreshUser()
      setMsg({ ok: true, text: 'Profile saved.' })
    } catch (err: any) {
      const m = err?.message || ''
      setMsg({ ok: false, text: /unique|already|exists/i.test(m) ? 'That username is taken.' : m === 'Validation failed' ? 'Check the highlighted fields.' : m || 'Could not save.' })
    }
    setSaving(false)
  }

  const field = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="ep-field">
      <span>{label}</span>
      <input className="hr-input" value={String(form?.[k] ?? '')} onChange={(e) => set(k, e.target.value as any)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <em>{errors[k]}</em>}
    </label>
  )

  return (
    <Layout>
      <div className="up-wrap" style={{ maxWidth: 760 }}>
        <div className="up-crumb">
          <Link to="/profile" style={{ color: 'var(--text2)', textDecoration: 'none' }}><i className="ti ti-arrow-left" /> Profile</Link>
          <span>Edit profile</span>
        </div>

        {!form ? (
          msg ? <div className="up-empty"><i className="ti ti-cloud-off" />{msg.text}</div> : <div className="up-skel" style={{ height: 320 }} />
        ) : (
          <form onSubmit={save} noValidate>
            <section className="up-card hr-sec">
              <div className="hr-sec-h"><h2>Basics</h2>{me?.username && <Link to={`/user/${me.username}`}>View public profile</Link>}</div>
              <div className="ep-avatar">
                {avatar ? <img className="up-avatar" src={avatar} alt="" /> : <div className="up-avatar">{(form.firstName[0] || '?').toUpperCase()}</div>}
                <div>
                  <button type="button" className="up-btn" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? 'Uploading…' : avatar ? 'Change photo' : 'Add photo'}</button>
                  <p>JPG or PNG, square works best.</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickAvatar(e.target.files?.[0])} />
              </div>
              <div className="hr-row">
                {field('firstName', 'First name', { maxLength: 50, autoComplete: 'given-name' })}
                {field('lastName', 'Last name', { maxLength: 50, autoComplete: 'family-name' })}
              </div>
              {field('username', 'Username', { maxLength: 30, autoCapitalize: 'off', spellCheck: false })}
              <label className="ep-field"><span>Email</span><input className="hr-input" value={me?.email || ''} disabled /><small>Contact support to change your email.</small></label>
              <label className="ep-field">
                <span>Bio</span>
                <textarea className="hr-input hr-area" style={{ minHeight: 110 }} maxLength={1000} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="What you do and what clients can hire you for." />
                <small>{form.bio.length} / 1,000</small>
              </label>
            </section>

            <section className="up-card hr-sec">
              <div className="hr-sec-h"><h2>Work</h2></div>
              {field('skills', 'Skills (comma separated)', { placeholder: 'e.g. Logo design, Figma, Copywriting', maxLength: 600 })}
              <div className="ep-field">
                <span>Categories</span>
                <div className="ep-chips">
                  {CATEGORIES.map(([v, l]) => {
                    const on = form.categories.includes(v)
                    return <button type="button" key={v} className={`ep-chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => set('categories', on ? form.categories.filter((c) => c !== v) : [...form.categories, v].slice(0, 10))}>{l}</button>
                  })}
                </div>
                <small>You'll be notified about new jobs in these categories.</small>
              </div>
              <div className="ep-toggle"><div><b>Available for work</b><small>Shown on your public profile.</small></div><Switch on={form.isAvailable} onChange={(v) => set('isAvailable', v)} label="Available for work" /></div>
            </section>

            <section className="up-card hr-sec">
              <div className="hr-sec-h"><h2>Privacy</h2></div>
              <div className="ep-toggle"><div><b>Public profile</b><small>Off: only your username is shown to others.</small></div><Switch on={form.isPublic} onChange={(v) => set('isPublic', v)} label="Public profile" /></div>
              <div className="ep-toggle"><div><b>Show rank</b><small>Your worker rank and OgaScore on your profile.</small></div><Switch on={form.showRank} onChange={(v) => set('showRank', v)} label="Show rank" /></div>
              <div className="ep-toggle"><div><b>Show earnings</b><small>Your total earned on your profile.</small></div><Switch on={form.showEarnings} onChange={(v) => set('showEarnings', v)} label="Show earnings" /></div>
            </section>

            <section className="up-card hr-sec">
              <div className="hr-sec-h"><h2>Links</h2></div>
              <div className="hr-row">
                {field('twitter', 'X / Twitter', { placeholder: '@handle', maxLength: 100 })}
                {field('telegram', 'Telegram', { placeholder: '@handle', maxLength: 100 })}
              </div>
              <div className="hr-row">
                {field('discord', 'Discord', { placeholder: 'username', maxLength: 100 })}
                {field('website', 'Website', { placeholder: 'https://', maxLength: 200, inputMode: 'url' })}
              </div>
            </section>

            <div className="ep-bar">
              {msg && <div className={`up-note ${msg.ok ? 'ok' : 'err'}`} role="status" style={{ margin: 0, flex: 1 }}>{msg.text}</div>}
              <button type="submit" className="up-btn primary" disabled={saving || uploading} style={{ minWidth: 140, height: 44, marginLeft: 'auto' }}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  )
}
