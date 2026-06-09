import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { uploadImage } from '../lib/upload'
import { apiRequest } from '../lib/api'

const CATEGORIES = ['News', 'Businesses', 'Freelancers', 'Case Studies']
const COVER_COLORS = ['#534AB7', '#185FA5', '#3B6D11', '#854F0B', '#993556', '#0F6E56', '#121566', '#121566']

const badgeColors: Record<string, { bg: string; color: string }> = {
  News: { bg: '#E6F1FB', color: '#185FA5' },
  Businesses: { bg: '#EAF3DE', color: '#3B6D11' },
  Freelancers: { bg: '#EEEDFE', color: '#534AB7' },
  'Case Studies': { bg: '#FBEAF0', color: '#993556' },
}

interface PostData {
  id: number
  title: string
  category: string
  body: string
  coverColor: string
  authorName: string
  authorInitials: string
  date: string
  tags: string
  status: 'draft' | 'published'
}

function generateId(): number {
  return Date.now() + Math.floor(Math.random() * 1000)
}

function formatDate(): string {
  const d = new Date()
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export default function BlogEditor() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { isAuthed } = useAuth()
  const [preview, setPreview] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    category: 'News',
    body: '',
    coverColor: '#534AB7',
    coverImage: '',
    tags: '',
    status: 'published' as 'draft' | 'published',
  })
  const [uploadingCover, setUploadingCover] = useState(false)

  const s = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Auth guard
  useEffect(() => {
    if (!isAuthed) navigate('/login')
  }, [isAuthed, navigate])

  // Load existing post for editing
  useEffect(() => {
    if (!id) return
    apiRequest<PostData[]>('/blog/user/mine')
      .then(posts => {
        const post = posts.find(p => p.id === parseInt(id))
        if (post) {
          setForm({
            title: post.title,
            category: post.category,
            body: post.body,
            coverColor: post.coverColor || '#534AB7',
            coverImage: (post as any).coverImage || '',
            tags: post.tags,
            status: post.status,
          })
        } else {
          setError('Post not found')
        }
      })
      .catch(() => setError('Failed to load post'))
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

  const save = async (status: 'draft' | 'published') => {
    if (!form.title.trim()) {
      setError('Please enter a title')
      return
    }
    setError('')

    const user = (() => {
      try { return JSON.parse(localStorage.getItem('ogapay_user') || '{}') } catch { return {} }
    })()
    const firstName = user.firstName || 'User'
    const lastName = user.lastName || ''
    const authorName = `${firstName} ${lastName}`.trim() || 'OgaPay Member'
    const initials = (firstName[0] || 'U') + (lastName[0] || 'M')

    const payload = {
      title: form.title,
      category: form.category,
      content: form.body,
      coverColor: form.coverColor,
      coverImage: form.coverImage,
      authorName,
      authorInitials: initials,
      date: formatDate(),
      tags: form.tags,
      status,
    }

    try {
      if (id) {
        await apiRequest(`/blog/user/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await apiRequest('/blog/user', { method: 'POST', body: JSON.stringify(payload) })
      }
      setSaved(true)
      setTimeout(() => {
        if (status === 'published') navigate('/blog')
        else navigate('/profile')
      }, 600)
    } catch {
      setError('Failed to save. Try again.')
    }
  }

  const bodyLines = form.body.split('\n')
  const excerpt = bodyLines.find(l => l.trim() && !l.startsWith('-') && !l.startsWith('#')) || form.body.substring(0, 120)

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
        .be-btn-primary{height:42px;padding:0 24px;border-radius:99px;border:none;background:#121566;color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:opacity .15s}
        .be-btn-primary:hover{opacity:.85}
        .be-btn-secondary{height:42px;padding:0 24px;border-radius:99px;border:1.5px solid var(--border);background:transparent;color:var(--text);font-size:14px;font-weight:700;cursor:pointer}
        .be-btn-secondary:hover{border-color:var(--text)}
        .be-btn-danger{height:42px;padding:0 24px;border-radius:99px;border:1.5px solid #fca5a5;background:transparent;color:#dc2626;font-size:14px;font-weight:700;cursor:pointer}
        .color-grid{display:flex;gap:8px;flex-wrap:wrap}
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

        {error && <div className="be-error">{error}</div>}
        {saved && <div className="be-saved">{id ? 'Changes saved!' : 'Article saved!'}</div>}

        {/* Preview Toggle */}
        <div style={{display:'flex',gap:10,marginBottom:20}}>
          <button onClick={() => setPreview(false)} style={{height:34,padding:'0 16px',borderRadius:99,border:preview?'1.5px solid var(--border)':'none',background:preview?'transparent':'#121566',color:preview?'var(--text2)':'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Edit</button>
          <button onClick={() => setPreview(true)} style={{height:34,padding:'0 16px',borderRadius:99,border:preview?'none':'1.5px solid var(--border)',background:preview?'#121566':'transparent',color:preview?'#fff':'var(--text2)',fontSize:12,fontWeight:700,cursor:'pointer'}}>Preview</button>
        </div>

        {preview ? (
          <div>
            <div className="preview-card">
              <div className="preview-cover" style={{background:form.coverColor, backgroundImage:form.coverImage ? `url(${form.coverImage})` : undefined, backgroundSize:'cover', backgroundPosition:'center'}}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
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
                <label className="be-label">Cover Color</label>
                <div className="color-grid">
                  {COVER_COLORS.map(c => (
                    <div key={c} className={`color-swatch ${form.coverColor===c?'selected':''}`} style={{background:c}} onClick={() => setForm(f => ({...f, coverColor: c}))} />
                  ))}
                </div>
              </div>
            </div>

            {/* Cover Image */}
            <div style={{marginBottom:16}}>
              <label className="be-label">Cover Image <span style={{fontWeight:400,color:'var(--text3)'}}>(optional)</span></label>
              <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                {form.coverImage && (
                  <img src={form.coverImage} alt="cover" style={{width:80,height:48,borderRadius:6,objectFit:'cover',border:'1px solid var(--border)'}} />
                )}
                <label style={{
                  display:'inline-flex',alignItems:'center',gap:6,height:36,padding:'0 16px',
                  borderRadius:8,border:'1.5px solid var(--border)',background:'var(--bg2)',
                  cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--text2)',fontFamily:'inherit'
                }}>
                  <i className="ti ti-photo" /> {form.coverImage ? 'Change Image' : 'Upload Cover'}
                  <input type="file" accept="image/*" style={{display:'none'}}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
                      setUploadingCover(true)
                      try {
                        const url = await uploadImage(file, 'blog-covers')
                        setForm(f => ({...f, coverImage: url}))
                        setError('')
                      } catch (err) {
                        setError('Failed to upload cover image')
                      }
                      setUploadingCover(false)
                    }} />
                </label>
                {uploadingCover && <span style={{fontSize:11,color:'var(--text3)'}}>Uploading...</span>}
                {form.coverImage && (
                  <button type="button" onClick={() => setForm(f => ({...f, coverImage: ''}))}
                    style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:11,textDecoration:'underline',fontFamily:'inherit'}}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Tags */}
            <label className="be-label">Tags (optional, comma-separated)</label>
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
            <textarea id="blog-body" className="be-textarea" value={form.body} onChange={s('body')} placeholder="Write your article here..." />

            {/* Actions */}
            <div className="be-actions">
              <button className="be-btn-primary" onClick={() => save('published')}>
                <i className="ti ti-send" style={{fontSize:14,marginRight:6}} /> Publish
              </button>
              <button className="be-btn-secondary" onClick={() => save('draft')}>
                <i className="ti ti-file-text" style={{fontSize:14,marginRight:6}} /> Save Draft
              </button>
              <button className="be-btn-danger" onClick={() => navigate('/blog')}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
