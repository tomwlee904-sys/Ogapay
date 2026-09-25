import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../lib/api'
import { uploadImage } from '../../lib/upload'
import '../../styles/profile-own.css'
import '../../styles/profile-public.css'

type Item = { id: string; title: string; description: string | null; url: string | null; imageUrl: string | null }
const blank = { title: '', description: '', url: '', imageUrl: '' }

// Work samples shown on your public profile's Portfolio tab
export default function ProfilePortfolioCard() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [editing, setEditing] = useState<Item | 'new' | null>(null)
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => apiRequest<Item[]>('/users/me/portfolio').then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => setItems([]))
  useEffect(() => { load() }, [])

  const open = (it: Item | 'new') => {
    setEditing(it); setErr('')
    setForm(it === 'new' ? blank : { title: it.title, description: it.description || '', url: it.url || '', imageUrl: it.imageUrl || '' })
  }

  const upload = async (f?: File) => {
    if (!f) return
    setUploading(true); setErr('')
    try { setForm((x) => ({ ...x, imageUrl: '' })); const url = await uploadImage(f, 'store'); setForm((x) => ({ ...x, imageUrl: url })) }
    catch (e: any) { setErr(e?.message || 'Upload failed') }
    setUploading(false)
  }

  const save = async () => {
    if (!form.title.trim()) { setErr('Give it a title'); return }
    if (form.url && !/^https?:\/\//i.test(form.url.trim())) { setErr('Links must start with http:// or https://'); return }
    setSaving(true); setErr('')
    const body = JSON.stringify({ title: form.title.trim(), description: form.description.trim() || null, url: form.url.trim() || null, imageUrl: form.imageUrl || null })
    try {
      if (editing === 'new') await apiRequest('/users/me/portfolio', { method: 'POST', body })
      else if (editing) await apiRequest('/users/me/portfolio/' + editing.id, { method: 'PATCH', body })
      setEditing(null)
      load()
    } catch (e: any) { setErr(e?.message || 'Could not save') }
    setSaving(false)
  }

  const remove = async (it: Item) => {
    if (!window.confirm(`Remove "${it.title}" from your portfolio?`)) return
    try { await apiRequest('/users/me/portfolio/' + it.id, { method: 'DELETE' }); load() } catch { /* ignore */ }
  }

  return (
    <section className="po-card">
      <div className="po-head">
        <h3><i className="ti ti-photo" /> Portfolio</h3>
        {items && items.length > 0 && <button className="lnk" onClick={() => open('new')}>+ Add work</button>}
      </div>
      <div className="po-body">
        {items === null ? (
          <div className="up-skel" style={{ height: 60 }} />
        ) : items.length === 0 ? (
          <div className="po-empty">
            <div className="ic"><i className="ti ti-photo-plus" /></div>
            <b>Show your best work</b>
            <p>Add links and images of past work. They appear on your public profile.</p>
            <button className="po-btn primary" onClick={() => open('new')}><i className="ti ti-plus" /> Add work</button>
          </div>
        ) : (
          <div className="po-pf">
            {items.map((it) => (
              <div className="po-pf-item" key={it.id}>
                <div className="img">{it.imageUrl ? <img src={it.imageUrl} alt="" loading="lazy" /> : <i className="ti ti-photo" />}</div>
                <div className="b"><b>{it.title}</b>{it.description && <p>{it.description}</p>}</div>
                <div className="acts">
                  <button className="po-btn" onClick={() => open(it)}>Edit</button>
                  <button className="po-btn" onClick={() => remove(it)} aria-label={`Remove ${it.title}`}><i className="ti ti-trash" /></button>
                  {it.url && <a className="po-btn" href={it.url} target="_blank" rel="noopener noreferrer nofollow" style={{ height: 30, padding: '0 10px', fontSize: 12 }}>Open</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="up-modal" onClick={() => !saving && setEditing(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="pf-h" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 id="pf-h">{editing === 'new' ? 'Add work' : 'Edit work'}</h3>
              <button className="x" aria-label="Close" onClick={() => setEditing(null)}><i className="ti ti-x" /></button>
            </div>
            <label className="po-field"><span>Title</span><input maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Launch video for a fintech" /></label>
            <label className="po-field"><span>Link (optional)</span><input maxLength={2048} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" inputMode="url" /></label>
            <label className="po-field"><span>Description (optional)</span><textarea maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What you did and the result" /></label>
            <div className="po-field">
              <span>Image (optional)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {form.imageUrl && <img src={form.imageUrl} alt="" style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />}
                <button type="button" className="po-btn" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? 'Uploading…' : form.imageUrl ? 'Replace image' : 'Upload image'}</button>
                {form.imageUrl && <button type="button" className="po-btn" onClick={() => setForm({ ...form, imageUrl: '' })}>Remove</button>}
                <input ref={fileRef} type="file" hidden accept="image/*" onChange={(e) => upload(e.target.files?.[0])} />
              </div>
            </div>
            {err && <p className="po-err" role="alert">{err}</p>}
            <button className="po-btn primary" style={{ width: '100%', height: 44 }} disabled={saving || uploading} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}
    </section>
  )
}
