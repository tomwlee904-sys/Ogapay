import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { uploadImage } from '../lib/upload'

// Articles used to be saved only in this browser's localStorage, so nobody else
// ever saw them. They now go to the API; posts by members wait for an admin to
// approve them before they appear on the public blog.

const CATEGORIES = ['News', 'Businesses', 'Freelancers', 'Case Studies']
type Mine = { id: string; title: string; slug: string; status: 'DRAFT' | 'PENDING' | 'PUBLISHED'; createdAt: string; viewCount: number }
const STATUS_LABEL = { DRAFT: 'Draft', PENDING: 'In review', PUBLISHED: 'Published' } as const

const badgeColors: Record<string, { bg: string; color: string }> = {
  News: { bg: '#E6F1FB', color: '#185FA5' },
  Businesses: { bg: '#EAF3DE', color: '#3B6D11' },
  Freelancers: { bg: '#EEEDFE', color: '#534AB7' },
  'Case Studies': { bg: '#FBEAF0', color: '#993556' },
}

export default function BlogEditor() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [preview, setPreview] = useState(false)
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<Mine['status'] | null>(null)
  const [mine, setMine] = useState<Mine[] | null>(null)

  const [form, setForm] = useState({
    title: '',
    category: 'News',
    body: '',
    excerpt: '',
    coverImage: '',
    tags: '',
  })

  const s = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  // The route is behind AuthGuard, so we're signed in here
  const loadMine = () => apiRequest<any>('/blog/user/mine').then((d) => setMine(d?.posts || [])).catch(() => setMine([]))
  useEffect(() => { loadMine() }, [])

  // Load an existing post for editing (its full text; the list omits it)
  useEffect(() => {
    if (!id) return
    apiRequest<any>(`/blog/user/${id}`)
      .then((post) => {
        setForm({
          title: post.title || '',
          category: post.category || 'News',
          body: post.content || '',
          excerpt: post.excerpt || '',
          coverImage: post.coverImage || '',
          tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
        })
        setStatus(post.status)
      })
      .catch(() => setError('Post not found'))
  }, [id])

  // Formatting helpers
  const wrapSelection = (before: string, after: string) => {
    const ta = document.getElementById('blog-body') as HTMLTextAreaElement
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = form.body
    const newText = text.substring(0, start) + before + text.substring(start, end) + after + text.substring(end)
    setForm(f => ({ ...f, body: newText }))
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = start + before.length
      ta.selectionEnd = end + before.length
    }, 0)
  }

  const insertList = () => {
    const ta = document.getElementById('blog-body') as HTMLTextAreaElement
    if (!ta) return
    const text = form.body
    const newText = text + '\n- Item 1\n- Item 2\n- Item 3'
    setForm(f => ({ ...f, body: newText }))
  }

  const bodyLines = form.body.split('\n')
  const autoExcerpt = (bodyLines.find(l => l.trim() && !l.startsWith('-') && !l.startsWith('#')) || form.body).replace(/[*`]/g, '').trim().slice(0, 200)

  const save = async (want: 'draft' | 'published') => {
    if (saving) return
    if (form.title.trim().length < 5) { setError('Give your article a title (at least 5 characters)'); return }
    if (form.body.trim().length < 50) { setError('Write a little more: at least 50 characters'); return }
    setError(''); setSaving(true)
    const payload = {
      title: form.title.trim(),
      category: form.category,
      content: form.body,
      excerpt: form.excerpt.trim() || autoExcerpt,
      coverImage: form.coverImage || null,
      tags: form.tags,
      status: want,
    }
    try {
      const post = id
        ? await apiRequest<any>(`/blog/user/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await apiRequest<any>('/blog/user', { method: 'POST', body: JSON.stringify(payload) })
      setStatus(post?.status || null)
      setSaved(post?.status === 'PUBLISHED' ? 'Published.' : post?.status === 'PENDING' ? "Sent for review. We'll publish it once an admin has approved it." : 'Draft saved.')
      loadMine()
      if (!id && post?.id) navigate(`/blog/edit/${post.id}`, { replace: true })
    } catch (e: any) {
      setError(e?.message || 'Failed to save. Try again.')
    }
    setSaving(false)
  }

  const pickCover = async (file?: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
    setUploading(true)
    try {
      const url = await uploadImage(file, 'blog-covers')
      setForm(f => ({ ...f, coverImage: url }))
      setError('')
    } catch (e: any) {
      setError(e?.message || 'Failed to upload the cover image')
    }
    setUploading(false)
  }

  return (
    <Layout>
      <style>{`
        .be-page{max-width:900px;margin:0 auto;padding:0 0 40px;color:var(--text)}
        .be-title{font-size:22px;font-weight:800;margin:0 0 4px}
        .be-sub{font-size:13px;color:var(--text2);margin-bottom:24px}
        .be-error{background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:10px 14px;font-size:13px;color:#dc2626;margin-bottom:16px}
        .be-saved{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;font-size:13px;color:#16a34a;margin-bottom:16px}
        .be-label{font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px;display:block}
        .be-input{width:100%;height:40px;padding:0 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:13px;font-family:inherit;outline:none;box-sizing:border-box}
        .be-input:focus{border-color:var(--accent)}
        .be-textarea{width:100%;min-height:200px;padding:12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:13px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6}
        .be-textarea:focus{border-color:var(--accent)}
        .be-select{width:100%;height:40px;padding:0 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:13px;font-family:inherit;outline:none;cursor:pointer}
        .be-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
        @media(max-width:600px){.be-grid{grid-template-columns:1fr}}
        .be-toolbar{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap}
        .be-tb-btn{height:34px;padding:0 10px;border:1.5px solid var(--border);border-radius:6px;background:var(--card);color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .13s}
        .be-tb-btn:hover{border-color:var(--accent);color:var(--accent)}
        .be-tb-btn i{font-size:14px}
        .be-actions{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}
        .be-btn-primary{height:42px;padding:0 24px;border-radius:99px;border:none;background:#0a0a0a;color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .15s}
        .be-btn-primary:hover{opacity:.85}
        .be-btn-secondary{height:42px;padding:0 24px;border-radius:99px;border:1.5px solid var(--border);background:transparent;color:var(--text);font-size:14px;font-weight:700;cursor:pointer}
        .be-btn-secondary:hover{border-color:var(--text)}
        .be-btn-danger{height:42px;padding:0 24px;border-radius:99px;border:1.5px solid #fca5a5;background:transparent;color:#dc2626;font-size:14px;font-weight:700;cursor:pointer}
        .color-grid{display:flex;gap:8px;flex-wrap:wrap}
        .be-cover{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .be-cover img{width:84px;height:48px;border-radius:8px;object-fit:cover;border:1px solid var(--border)}
        .be-cover-btn{display:inline-flex;align-items:center;cursor:pointer}
        .be-hint{font-size:12px;color:var(--text3);margin:6px 0 0}
        .be-status{font-size:13px;color:var(--text2);margin-bottom:14px}
        .be-status b{color:var(--text)}
        .be-mine{margin-top:32px;border-top:1px solid var(--border);padding-top:20px}
        .be-mine-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
        .be-mine-h h2{font-size:16px;font-weight:800;margin:0}
        .be-mine-h a,.be-mine-row a{font-size:13px;font-weight:700;color:var(--text)}
        .be-mine-list{border:1px solid var(--border);border-radius:12px;background:var(--card)}
        .be-mine-row{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border)}
        .be-mine-row:last-child{border-bottom:0}
        .be-mine-row.on{background:var(--bg2)}
        .be-mine-t{flex:1;min-width:0}
        .be-mine-t strong{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .be-mine-t span{font-size:12px;color:var(--text3)}
        .be-pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;border:1px solid var(--border);white-space:nowrap;color:var(--text2)}
        .be-pill.pending{color:#b45309}
        .be-pill.published{color:var(--green)}
        .color-swatch{width:34px;height:34px;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:border-color .13s}
        .color-swatch.selected{border-color:var(--text)}
        .color-swatch:hover{border-color:var(--text)}
        .preview-card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:16px}
        .preview-cover{height:160px;display:flex;align-items:center;justify-content:center;font-size:36px;color:rgba(255,255,255,.3)}
        .preview-body{padding:20px;max-width:700px;margin:0 auto;line-height:1.7;font-size:14px;color:var(--text2)}
        .preview-body h1{font-size:24px;font-weight:800;color:var(--text);margin:0 0 8px}
        .preview-body p{margin:0 0 12px}
        .preview-body ul{padding-left:20px;margin:0 0 12px}
        .preview-body li{margin-bottom:4px}
      `}</style>

      <div className="be-page">
        <h1 className="be-title">{id ? 'Edit Article' : 'Write Article'}</h1>
        <p className="be-sub">Share your knowledge with the OgaPay community.</p>

        {status && <div className="be-status">Status: <b>{STATUS_LABEL[status]}</b>{status === 'PUBLISHED' && ' · editing it sends it back for review'}</div>}
        {error && <div className="be-error">{error}</div>}
        {saved && <div className="be-saved">{saved}</div>}

        {/* Preview Toggle */}
        <div style={{display:'flex',gap:10,marginBottom:20}}>
          <button onClick={() => setPreview(false)} style={{height:34,padding:'0 16px',borderRadius:99,border:preview?'1.5px solid var(--border)':'none',background:preview?'transparent':'#0a0a0a',color:preview?'var(--text2)':'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Edit</button>
          <button onClick={() => setPreview(true)} style={{height:34,padding:'0 16px',borderRadius:99,border:preview?'none':'1.5px solid var(--border)',background:preview?'#0a0a0a':'transparent',color:preview?'#fff':'var(--text2)',fontSize:12,fontWeight:700,cursor:'pointer'}}>Preview</button>
        </div>

        {preview ? (
          <div>
            <div className="preview-card">
              <div className="preview-cover" style={{background:'var(--bg2)'}}>
                {form.coverImage
                  ? <img src={form.coverImage} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  : <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
              </div>
              <div className="preview-body">
                <span style={{display:'inline-block',fontSize:11,fontWeight:500,background:badgeColors[form.category]?.bg||'#EEEDFE',color:badgeColors[form.category]?.color||'#534AB7',padding:'3px 10px',borderRadius:20,marginBottom:8}}>{form.category}</span>
                <h1>{form.title || 'Untitled Article'}</h1>
                {form.body.split('\n').map((line, i) => {
                  if (line.startsWith('### ')) return <h3 key={i} style={{fontSize:16,fontWeight:700,margin:'16px 0 8px',color:'var(--text)'}}>{line.replace('### ','')}</h3>
                  if (line.startsWith('## ')) return <h2 key={i} style={{fontSize:18,fontWeight:800,margin:'16px 0 8px',color:'var(--text)'}}>{line.replace('## ','')}</h2>
                  if (line.startsWith('# ')) return <h1 key={i} style={{fontSize:22,fontWeight:800,margin:'16px 0 8px',color:'var(--text)'}}>{line.replace('# ','')}</h1>
                  if (line.startsWith('- ')) return <li key={i} style={{marginLeft:20,marginBottom:4}}>{line.replace('- ','')}</li>
                  if (line.trim() === '') return <br key={i} />
                  return <p key={i}>{line}</p>
                })}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Title */}
            <label className="be-label">Title</label>
            <input className="be-input" value={form.title} onChange={s('title')} placeholder="Enter article title..." style={{marginBottom:16}} />

            {/* Category + Color */}
            <div className="be-grid">
              <div>
                <label className="be-label">Category</label>
                <select className="be-select" value={form.category} onChange={s('category')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="be-label">Cover image (optional)</label>
                <div className="be-cover">
                  {form.coverImage && <img src={form.coverImage} alt="Cover" />}
                  <label className="be-btn-secondary be-cover-btn">
                    <i className="ti ti-photo" style={{fontSize:14,marginRight:6}} />{uploading ? 'Uploading…' : form.coverImage ? 'Change' : 'Upload'}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden disabled={uploading} onChange={(e) => pickCover(e.target.files?.[0])} />
                  </label>
                  {form.coverImage && <button type="button" className="be-btn-danger" onClick={() => setForm(f => ({ ...f, coverImage: '' }))}>Remove</button>}
                </div>
              </div>
            </div>

            {/* Summary */}
            <label className="be-label">Summary (optional, shown on the blog list)</label>
            <input className="be-input" value={form.excerpt} onChange={s('excerpt')} maxLength={300} placeholder={autoExcerpt || 'One or two sentences about the article'} style={{marginBottom:16}} />

            {/* Tags */}
            <label className="be-label">Tags (optional, comma-separated, up to 10)</label>
            <input className="be-input" value={form.tags} onChange={s('tags')} placeholder="e.g. freelancing, tips, crypto" style={{marginBottom:16}} />

            {/* Body */}
            <label className="be-label">Body</label>
            <div className="be-toolbar">
              <button className="be-tb-btn" onClick={() => wrapSelection('**','**')}><i className="ti ti-bold" /> Bold</button>
              <button className="be-tb-btn" onClick={() => wrapSelection('*','*')}><i className="ti ti-italic" /> Italic</button>
              <button className="be-tb-btn" onClick={() => wrapSelection('- ','')}><i className="ti ti-list" /> Bullet</button>
              <button className="be-tb-btn" onClick={() => wrapSelection('## ','')}><i className="ti ti-heading" /> Heading</button>
              <button className="be-tb-btn" onClick={insertList}><i className="ti ti-list-check" /> List</button>
            </div>
            <textarea id="blog-body" className="be-textarea" value={form.body} onChange={s('body')} maxLength={50000} placeholder="Write your article here..." />
            <p className="be-hint">Use ## for headings, - for bullet points, **bold** and *italic*. Links and HTML aren't supported.</p>

            {/* Actions */}
            <div className="be-actions">
              <button className="be-btn-primary" onClick={() => save('published')} disabled={saving || uploading}>
                <i className="ti ti-send" style={{fontSize:14,marginRight:6}} /> {saving ? 'Saving…' : 'Submit for review'}
              </button>
              <button className="be-btn-secondary" onClick={() => save('draft')} disabled={saving || uploading}>
                <i className="ti ti-file-text" style={{fontSize:14,marginRight:6}} /> Save draft
              </button>
              <button className="be-btn-danger" onClick={() => navigate('/blog')}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="be-mine">
          <div className="be-mine-h">
            <h2>My articles</h2>
            {id && <Link to="/blog/write">+ New article</Link>}
          </div>
          {mine === null ? <p className="be-hint">Loading…</p> : mine.length === 0 ? <p className="be-hint">Nothing yet. Your drafts and submitted articles will show here.</p> : (
            <div className="be-mine-list">
              {mine.map((p) => (
                <div key={p.id} className={`be-mine-row${p.id === id ? ' on' : ''}`}>
                  <div className="be-mine-t">
                    <strong>{p.title}</strong>
                    <span>{new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{p.status === 'PUBLISHED' ? ` · ${p.viewCount} views` : ''}</span>
                  </div>
                  <span className={`be-pill ${p.status.toLowerCase()}`}>{STATUS_LABEL[p.status]}</span>
                  {p.status === 'PUBLISHED' && <Link to={`/blog/${p.slug}`}>View</Link>}
                  {p.id !== id && <Link to={`/blog/edit/${p.id}`}>Edit</Link>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
