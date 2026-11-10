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
  firstName: string; lastName: string; username: string; bio: string; about: string; skills: string
  categories: string[]; isAvailable: boolean; isPublic: boolean; showFullName: boolean; showEarnings: boolean; showRank: boolean
  twitter: string; telegram: string; discord: string; website: string
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`ep-switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  )
}

// Real profile editor: loads /users/me, saves only what changed to PATCH /users/me.
// Everything, the photo too, is saved only when Save changes is pressed (2026-11-08):
// the photo used to be saved the moment it was picked, so leaving or changing your
// mind didn't undo it. Leaving with unsaved changes asks first.
export default function EditProfile() {
  const { refreshUser } = useAuth()
  const [me, setMe] = useState<any>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  // A picked photo waits here (with a preview) until Save changes
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null)
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.preview) }, [photo])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const fromUser = (u: any): Form => ({
    firstName: u.firstName || '', lastName: u.lastName || '', username: u.username || '',
    bio: u.workerProfile?.bio || u.workerProfileBio || '',
    about: u.about || '',
    skills: (u.workerProfile?.skills || []).join(', '),
    categories: u.workerProfile?.categories || [],
    isAvailable: u.workerProfile?.isAvailable !== false,
    isPublic: u.isPublic !== false,
    showFullName: u.showFullName !== false,
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

  // Only shows the photo; it is uploaded when Save changes is pressed (2026-11-08)
  const pickAvatar = (file?: File) => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { setMsg({ ok: false, text: 'Pick a JPG, PNG, WebP or GIF photo.' }); return }
    setPhoto({ file, preview: URL.createObjectURL(file) })
    setMsg(null)
  }

  // What would be sent to PATCH /users/me: only the fields that changed
  const changes = (): Record<string, any> => {
    if (!form || !me) return {}
    const base = fromUser(me)
    const body: Record<string, any> = {}
    for (const k of ['firstName', 'lastName', 'username', 'twitter', 'telegram', 'discord', 'website'] as const) {
      if (form[k].trim() !== base[k]) body[k] = form[k].trim()
    }
    if (form.bio.trim() !== base.bio) body.bio = form.bio.trim()
    if (form.about.trim() !== base.about) body.about = form.about.trim() || null
    const skills = form.skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 15)
    if (skills.join('|') !== base.skills.split(',').map((s) => s.trim()).filter(Boolean).join('|')) body.skills = skills
    if (form.categories.join('|') !== base.categories.join('|')) body.categories = form.categories
    if (form.isAvailable !== base.isAvailable) body.isAvailable = form.isAvailable
    if (form.isPublic !== base.isPublic) body.isPublic = form.isPublic
    if (form.showFullName !== base.showFullName) body.showFullName = form.showFullName
    // Only the switches that changed: sending every preference back failed the
    // whole save for anyone who never chose job alerts (2026-11-10)
    const prefs: Record<string, boolean> = {}
    if (form.showEarnings !== base.showEarnings) prefs.showEarnings = form.showEarnings
    if (form.showRank !== base.showRank) prefs.showRank = form.showRank
    if (Object.keys(prefs).length) body.preferences = prefs
    return body
  }
  const dirty = !!photo || Object.keys(changes()).length > 0

  // Unsaved changes: closing or reloading the tab, or following a link on the page
  // (Cancel, the Profile link, the menus), asks first (2026-11-08)
  const dirtyRef = useRef(false)
  dirtyRef.current = dirty && !saving
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = '' } }
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.getAttribute('href')?.startsWith('#')) return
      if (!window.confirm('You have unsaved changes. Leave without saving?')) { e.preventDefault(); e.stopPropagation() }
    }
    window.addEventListener('beforeunload', onUnload)
    document.addEventListener('click', onClick, true)
    return () => { window.removeEventListener('beforeunload', onUnload); document.removeEventListener('click', onClick, true) }
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form || !me) return
    const errs: Record<string, string> = {}
    if (!form.firstName.trim()) errs.firstName = 'First name is required'
    if (!USERNAME_RE.test(form.username.trim())) errs.username = '3-30 letters, numbers or _'
    if (form.website.trim() && !/^https?:\/\//i.test(form.website.trim())) errs.website = 'Start with https://'
    if (Object.keys(errs).length) { setErrors(errs); setMsg({ ok: false, text: 'Check the highlighted fields.' }); return }

    const body = changes()
    if (!Object.keys(body).length && !photo) { setMsg({ ok: true, text: 'No changes to save.' }); return }

    setSaving(true); setMsg(null)
    // The photo first: if it fails, nothing else is saved, so the page and the
    // account still match (2026-11-08)
    if (photo) {
      setUploading(true)
      try {
        const url = await uploadImage(photo.file, 'avatars') // saves it on the account
        if (url) setAvatar(url)
        setPhoto(null)
      } catch (err: any) {
        setUploading(false); setSaving(false)
        setMsg({ ok: false, text: `${err?.message || 'Photo upload failed'}. Nothing was saved.` })
        return
      }
      setUploading(false)
    }
    try {
      if (Object.keys(body).length) {
        await apiRequest('/users/me', { method: 'PATCH', body: JSON.stringify(body) })
        const fresh = await apiRequest<any>('/users/me')
        setMe(fresh); setForm(fromUser(fresh))
      }
      refreshUser()
      setMsg({ ok: true, text: 'Profile saved.' })
    } catch (err: any) {
      const m = err?.message || ''
      setMsg({ ok: false, text: /unique|already|exists/i.test(m) ? 'That username is taken.' : m === 'Validation failed' ? 'Check the highlighted fields.' : m || 'Could not save.' })
    }
    setSaving(false)
  }

  // A verified name (matched with a NIN or a bank account) can't be changed
  const nameLocked = me?.kyc?.status === 'APPROVED' && Number(me?.kyc?.kycTier || 0) >= 1

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
          <Link to="/profile" className="tap" style={{ color: 'var(--text2)', textDecoration: 'none' }}><i className="ti ti-arrow-left" aria-hidden="true" /> Profile</Link>
        </div>
        {/* A real page title, and how saving works (2026-11-08) */}
        <div className="ep-head">
          <h1 className="page-title">Edit profile</h1>
          <p>Nothing changes, not even your photo, until you press Save changes.</p>
        </div>

        {!form ? (
          msg ? <div className="up-empty"><i className="ti ti-cloud-off" />{msg.text}</div> : <div className="up-skel" style={{ height: 320 }} />
        ) : (
          <form onSubmit={save} noValidate>
            <section className="up-card hr-sec">
              <div className="hr-sec-h"><h2>Basics</h2>{me?.username && <Link to={`/user/${me.username}`} className="tap">View public profile</Link>}</div>
              <div className="ep-avatar">
                {photo || avatar ? <img className="up-avatar" src={photo?.preview || avatar || ''} alt="" /> : <div className="up-avatar">{(form.firstName[0] || '?').toUpperCase()}</div>}
                <div>
                  <button type="button" className="up-btn" disabled={uploading || saving} onClick={() => fileRef.current?.click()}>{uploading ? 'Uploading…' : photo || avatar ? 'Change photo' : 'Add photo'}</button>
                  {photo && <button type="button" className="up-btn" style={{ marginLeft: 8 }} disabled={saving} onClick={() => setPhoto(null)}>Undo</button>}
                  <p>{photo ? 'New photo picked. It is saved when you press Save changes.' : 'JPG or PNG, square works best.'}</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickAvatar(e.target.files?.[0])} />
              </div>
              <div className="hr-row">
                {field('firstName', 'First name', { maxLength: 50, autoComplete: 'given-name', disabled: nameLocked })}
                {field('lastName', 'Last name', { maxLength: 50, autoComplete: 'family-name', disabled: nameLocked })}
              </div>
              {nameLocked && <p className="ep-note" style={{ margin: '-6px 0 12px', fontSize: 13, color: 'var(--text2)' }}><i className="ti ti-lock" aria-hidden="true" /> Your name is verified, so it can't be changed here. <Link to="/support">Contact support</Link> if it's wrong.</p>}
              {field('username', 'Username', { maxLength: 30, autoCapitalize: 'off', spellCheck: false })}
              <label className="ep-field"><span>Email</span><input className="hr-input" value={me?.email || ''} disabled /><small>Contact support to change your email.</small></label>
              <label className="ep-field">
                <span>Bio</span>
                <textarea className="hr-input hr-area" style={{ minHeight: 110 }} maxLength={1000} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="What you do and what clients can hire you for." />
                <small>{form.bio.length} / 1,000</small>
              </label>
              <label className="ep-field">
                <span>More about you (optional)</span>
                <textarea className="hr-input hr-area" style={{ minHeight: 150 }} maxLength={2000} value={form.about} onChange={(e) => set('about', e.target.value)} placeholder="Your experience, tools you use, past clients, the kind of work you enjoy." />
                <small>{form.about.length} / 2,000 · shown under "More about you" on your public profile</small>
              </label>
              <p className="ep-note" role="note" style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text2)' }}>
                <i className="ti ti-shield-lock" aria-hidden="true" /> Keep phone numbers, bank details and your home address out of your bio. Anyone can read it. Clients can message you on OgaPay.
              </p>
            </section>

            <section className="up-card hr-sec">
              <div className="hr-sec-h"><h2>Verified creator</h2></div>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text2)' }}>
                Have an audience on X, Instagram, TikTok or YouTube? Add it to get the verified creator badge and be listed where brands look for creators.
              </p>
              <Link to="/settings/creator" className="up-btn" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 6 }}><i className="ti ti-rosette-discount-check" aria-hidden="true" /> Apply for verified creator</Link>
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
              {/* Off: others see the first name and last initial, e.g. "Ada O." (2026-11-10) */}
              <div className="ep-toggle"><div><b>Show my full name</b><small>Off: others see your first name and the first letter of your last name{form.firstName ? `, e.g. ${form.firstName.trim()}${form.lastName.trim() ? ` ${form.lastName.trim()[0].toUpperCase()}.` : ''}` : ''}</small></div><Switch on={form.showFullName} onChange={(v) => set('showFullName', v)} label="Show my full name" /></div>
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

            {/* Always in reach at the bottom of the screen, with Cancel (2026-11-08) */}
            <div className="ep-bar">
              {msg ? <div className={`up-note ${msg.ok ? 'ok' : 'err'}`} role="status" style={{ margin: 0, flex: 1 }}>{msg.text}</div>
                : <span className="ep-bar-hint">{dirty ? 'You have unsaved changes.' : 'No unsaved changes.'}</span>}
              <div className="ep-bar-acts">
                <Link to="/profile" className="up-btn" style={{ height: 44, display: 'inline-flex', alignItems: 'center' }}>Cancel</Link>
                <button type="submit" className="up-btn primary" disabled={saving || uploading} style={{ minWidth: 140, height: 44 }}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Layout>
  )
}
