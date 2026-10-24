import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { uploadImage } from '../lib/upload'
import { renderBlog } from '../lib/blogMarkdown'

// Articles used to be saved only in this browser's localStorage, so nobody else
// ever saw them. They now go to the API; posts by members wait for an admin to
// approve them before they appear on the public blog.
//
// Layout: the writing comes first (title, then the body with a toolbar that
// stays in view). Category, cover, summary and tags sit in "Article details".
// Desktop: a side panel with Submit / Save draft and the details. Phone and
// tablet: Save draft and Submit stay on screen in a bar above the bottom menu.

const CATEGORIES = ['News', 'Businesses', 'Freelancers', 'Case Studies']
type Status = 'DRAFT' | 'PENDING' | 'PUBLISHED'
const STATUS_LABEL = { DRAFT: 'Draft', PENDING: 'In review', PUBLISHED: 'Published' } as const
const DESKTOP = '(min-width: 1024px)'

export default function BlogEditor() {
  const navigate = useNavigate()
  const { id } = useParams()
  // write: the form; preview: the article as readers see it; split: writing and
  // preview side by side (desktop only, phones and tablets get the two tabs)
  const [mode, setMode] = useState<'write' | 'preview' | 'split'>('write')
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESKTOP).matches)
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP)
    const on = () => setWide(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  const view = mode === 'split' && !wide ? 'write' : mode
  const preview = view === 'preview'
  // Article details start open on desktop (side panel), folded on phone and tablet
  const [detailsOpen, setDetailsOpen] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESKTOP).matches)
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)

  const [form, setForm] = useState({
    title: '',
    category: 'News',
    body: '',
    excerpt: '',
    coverImage: '',
    tags: '',
  })

  const s = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Autosave: the form as it was last saved (or loaded), so only real changes are saved
  const lastSaved = useRef(JSON.stringify(form))
  const postId = useRef<string | undefined>(id)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const dirty = JSON.stringify(form) !== lastSaved.current

  // Load an existing post for editing (its full text; the list omits it)
  useEffect(() => {
    if (!id) return
    apiRequest<any>(`/blog/user/${id}`)
      .then((post) => {
        const loaded = {
          title: post.title || '',
          category: post.category || 'News',
          body: post.content || '',
          excerpt: post.excerpt || '',
          coverImage: post.coverImage || '',
          tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
        }
        lastSaved.current = JSON.stringify(loaded)
        postId.current = id
        setForm(loaded)
        setStatus(post.status)
      })
      .catch(() => setError('Post not found'))
  }, [id])

  // Leaving with unsaved text asks first (Cancel used to throw it away at once)
  const leave = (to: string) => {
    if (dirty && !window.confirm('Discard your unsaved changes? Anything you typed since the last save will be lost.')) return
    navigate(to)
  }
  useEffect(() => {
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])

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

  // Put a block (list, table, checklist) on its own lines at the cursor
  const insertBlock = (block: string) => {
    const ta = document.getElementById('blog-body') as HTMLTextAreaElement | null
    const at = ta ? ta.selectionStart : form.body.length
    setForm(f => {
      const before = f.body.slice(0, at), after = f.body.slice(at)
      return { ...f, body: `${before}${before && !before.endsWith('\n') ? '\n' : ''}${block}\n${after.startsWith('\n') ? after.slice(1) : after}` }
    })
  }
  const insertList = () => insertBlock('- Item 1\n- Item 2\n- Item 3')

  const bodyLines = form.body.split('\n')
  const autoExcerpt = (bodyLines.find(l => l.trim() && !l.startsWith('-') && !l.startsWith('#')) || form.body).replace(/[*`]/g, '').trim().slice(0, 200)

  // auto: the 30-second autosave. It never shows errors and only saves drafts
  // (saving a published or in-review post as a draft would take it down).
  const save = async (want: 'draft' | 'published', auto = false) => {
    if (saving) return
    if (form.title.trim().length < 5) { if (!auto) setError('Give your article a title (at least 5 characters)'); return }
    if (form.body.trim().length < 50) { if (!auto) setError('Write a little more: at least 50 characters'); return }
    const snapshot = JSON.stringify(form)
    if (!auto) setError('')
    setSaving(true)
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
      const editId = id || postId.current
      const post = editId
        ? await apiRequest<any>(`/blog/user/${editId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await apiRequest<any>('/blog/user', { method: 'POST', body: JSON.stringify(payload) })
      lastSaved.current = snapshot
      setSavedAt(new Date())
      setStatus(post?.status || null)
      if (!auto) setSaved(post?.status === 'PUBLISHED' ? 'Published.' : post?.status === 'PENDING' ? "Sent for review. We'll publish it once an admin has approved it." : 'Draft saved.')
      if (!editId && post?.id) {
        postId.current = post.id
        // An autosave lets you keep typing on this page; a button press moves to the edit address
        if (auto) window.history.replaceState(window.history.state, '', `/blog/edit/${post.id}`)
        else navigate(`/blog/edit/${post.id}`, { replace: true })
      }
    } catch (e: any) {
      if (!auto) setError(e?.message || 'Failed to save. Try again.')
    }
    setSaving(false)
  }

  // Every 30 seconds, save a draft if something changed since the last save
  const saveRef = useRef(save)
  saveRef.current = save
  const autoOkRef = useRef(false)
  autoOkRef.current = (status === null || status === 'DRAFT') && dirty && !saving && !uploading
  useEffect(() => {
    const t = window.setInterval(() => { if (autoOkRef.current) saveRef.current('draft', true) }, 30000)
    return () => window.clearInterval(t)
  }, [])
  const hhmm = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const autosaveText = saving ? 'Saving…' : dirty ? ((status === null || status === 'DRAFT') ? 'Unsaved changes · draft autosaves every 30 s' : 'Unsaved changes') : savedAt ? `Saved ${hhmm(savedAt)}` : ''

  // A picture inside the article: upload it, then put "![caption](link)" on its own line at the cursor
  const insertImage = async (file?: File) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { setError('Image must be under 25MB'); return }
    setUploading(true)
    try {
      const url = await uploadImage(file, 'blog-images')
      const ta = document.getElementById('blog-body') as HTMLTextAreaElement | null
      const at = ta ? ta.selectionStart : form.body.length
      const line = `![Describe the picture](${url})`
      setForm(f => {
        const before = f.body.slice(0, at), after = f.body.slice(at)
        return { ...f, body: `${before}${before && !before.endsWith('\n') ? '\n' : ''}${line}\n${after.startsWith('\n') ? after.slice(1) : after}` }
      })
      setError('')
    } catch (e: any) {
      setError(e?.message || 'Failed to upload the image')
    }
    setUploading(false)
  }

  const pickCover = async (file?: File) => {
    if (!file) return
    if (file.size > 25 * 1024 * 1024) { setError('Image must be under 25MB'); return }
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

  // The toolbar: one row of icon buttons (most used first). Pressing one keeps
  // the cursor in the text, so the phone keyboard stays open.
  const TOOLS: { icon: string; label: string; run: () => void }[] = [
    { icon: 'ti-bold', label: 'Bold', run: () => wrapSelection('**', '**') },
    { icon: 'ti-italic', label: 'Italic', run: () => wrapSelection('*', '*') },
    { icon: 'ti-heading', label: 'Heading', run: () => wrapSelection('## ', '') },
    { icon: 'ti-list', label: 'Bullet', run: () => wrapSelection('- ', '') },
    { icon: 'ti-list-numbers', label: 'List', run: insertList },
    { icon: 'ti-link', label: 'Link', run: () => wrapSelection('[', '](https://)') },
  ]
  const MORE_TOOLS: { icon: string; label: string; run: () => void }[] = [
    { icon: 'ti-strikethrough', label: 'Strike', run: () => wrapSelection('~~', '~~') },
    { icon: 'ti-checkbox', label: 'Checklist', run: () => insertBlock('- [ ] First thing to do\n- [ ] Second thing\n- [x] Already done') },
    { icon: 'ti-table', label: 'Table', run: () => insertBlock('| Column 1 | Column 2 |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |') },
    { icon: 'ti-code', label: 'Code block', run: () => wrapSelection('\n```\n', '\n```\n') },
  ]
  const toolBtn = (t: { icon: string; label: string; run: () => void }) => (
    <button key={t.label} type="button" className="be-tb-btn" aria-label={t.label} title={t.label} onMouseDown={(e) => e.preventDefault()} onClick={t.run}>
      <i className={`ti ${t.icon}`} aria-hidden="true" />
    </button>
  )

  const busy = saving || uploading
  const submitLabel = saving ? 'Saving…' : 'Submit for review'

  return (
    <Layout>
      <style>{`
        .be-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .be-head > div{flex:1 1 auto;min-width:0}
        .be-head .ui-btn-text{flex-shrink:0;margin-top:4px}
        .be-sub-link{padding:0;border:0;background:none;font:inherit;color:var(--text);text-decoration:underline;text-underline-offset:2px;cursor:pointer}
        .be-note{margin:16px 0 0;padding:10px 14px;border-radius:var(--r-ctl);font-size:13.5px;line-height:1.5}
        .be-note.err{color:var(--red);background:color-mix(in srgb,var(--red) 10%,transparent);border:1px solid color-mix(in srgb,var(--red) 30%,transparent)}
        .be-note.ok{color:var(--green);background:color-mix(in srgb,var(--green) 10%,transparent);border:1px solid color-mix(in srgb,var(--green) 30%,transparent)}
        .be-status{margin:12px 0 0;font-size:13px;color:var(--text2)}
        .be-status b{color:var(--text)}
        .be-layout{margin-top:20px}
        .be-modes{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
        .be-seg{display:flex;gap:4px;padding:4px;border:1px solid var(--border);border-radius:12px;background:var(--card)}
        .be-seg button{height:34px;padding:0 14px;border:0;border-radius:8px;background:none;font:600 13px/1 var(--font);color:var(--text2);cursor:pointer;white-space:nowrap}
        .be-seg button:hover:not(.on){color:var(--text)}
        .be-seg button.on{background:var(--text);color:var(--bg)}
        .be-autosave{margin-left:auto;font-size:12.5px;color:var(--text2)}
        .be-title-in{height:48px;font-size:17px;font-weight:600}
        .be-editor{margin-top:16px}
        .be-toolbar{position:sticky;top:var(--nav-h);z-index:5;display:flex;gap:6px;padding:8px 0;background:var(--bg);overflow-x:auto;scrollbar-width:none}
        .be-toolbar::-webkit-scrollbar{display:none}
        .be-tb-sep{flex-shrink:0;width:1px;margin:6px 2px;background:var(--border)}
        .be-tb-btn{flex-shrink:0;width:40px;height:40px;display:grid;place-items:center;padding:0;border:1px solid var(--border);border-radius:var(--r-ctl);background:var(--card);color:var(--text2);cursor:pointer;transition:border-color var(--t-fast) var(--ease),color var(--t-fast) var(--ease)}
        .be-tb-btn:hover{border-color:var(--text3);color:var(--text)}
        .be-tb-btn i{font-size:17px}
        .be-tb-btn.busy{cursor:wait;opacity:.6}
        .be-textarea{display:block;width:100%;min-height:60vh;padding:14px 16px;border:1px solid var(--border);border-radius:var(--r-ctl);background:var(--card2);color:var(--text);font:400 15px/1.7 var(--font);outline:none;resize:vertical;box-sizing:border-box}
        .be-textarea:focus{border-color:var(--text3);background:var(--card)}
        .be-split{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .be-split-preview{border:1px solid var(--border);border-radius:var(--r-ctl);background:var(--card);padding:14px 16px;overflow:auto;max-height:75vh;min-height:60vh;font-size:14px;line-height:1.7;color:var(--text2);box-sizing:border-box}
        .be-help{margin-top:12px;font-size:13px;color:var(--text2)}
        .be-help summary{display:inline-flex;align-items:center;gap:6px;min-height:44px;cursor:pointer;font-weight:600;color:var(--text)}
        .be-help p{margin:0 0 4px;line-height:1.6;max-width:68ch}
        .be-side{display:flex;flex-direction:column;gap:12px}
        .be-publish{display:none;padding:20px}
        .be-publish .ui-btn{width:100%}
        .be-publish .ui-btn + .ui-btn{margin-top:8px}
        .be-pub-status{margin:0 0 14px;font-size:13px;color:var(--text2)}
        .be-pub-status b{color:var(--text)}
        .be-pub-hint{margin:12px 0 0;font-size:12.5px;line-height:1.5;color:var(--text2)}
        .be-details{padding:0}
        .be-details summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:8px 20px;cursor:pointer;list-style:none}
        .be-details summary::-webkit-details-marker{display:none}
        .be-details summary b{font-size:15px;font-weight:600;color:var(--text)}
        .be-details summary span{margin-left:auto;font-size:12.5px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
        .be-details summary i{font-size:16px;color:var(--text2);transition:transform .2s ease}
        .be-details[open] summary i{transform:rotate(180deg)}
        .be-fields{display:grid;gap:14px;padding:4px 20px 20px}
        .be-cover{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .be-cover img{width:84px;height:48px;border-radius:8px;object-fit:cover;border:1px solid var(--border)}
        .be-cover-btn{cursor:pointer}
        .be-bar{margin-top:20px}
        .be-bar .ui-btn{flex:1 1 0;min-width:0}
        .preview-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-card);overflow:hidden}
        .preview-cover{aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;background:var(--card2)}
        .preview-body{padding:20px;max-width:700px;margin:0 auto;line-height:1.7;font-size:14px;color:var(--text2)}
        .preview-body h1{font-size:24px;font-weight:600;color:var(--text);margin:0 0 8px}
        .preview-cat{display:inline-block;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;margin-bottom:8px;background:var(--card2);color:var(--text2)}
        .preview-body p{margin:0 0 12px}
        .preview-body ul{padding-left:20px;margin:0 0 12px}
        .preview-body li{margin-bottom:4px}
        .preview-md h2{font-size:18px;font-weight:700;margin:16px 0 8px;color:var(--text)}
        .preview-md h3{font-size:16px;font-weight:700;margin:16px 0 8px;color:var(--text)}
        .preview-md strong{color:var(--text)}
        .preview-md ol{padding-left:20px;margin:0 0 12px}
        .preview-md a{color:var(--text);text-decoration:underline}
        .preview-md figure{margin:14px 0}
        .preview-md figure img{display:block;width:100%;height:auto;border-radius:10px;border:1px solid var(--border)}
        .preview-md figcaption{margin-top:6px;font-size:12px;color:var(--text3);text-align:center}
        .preview-md blockquote{border-left:3px solid var(--border);margin:12px 0;padding-left:12px}
        .preview-md pre{background:#1a1a2e;color:#e4e4e4;padding:12px 14px;border-radius:10px;overflow-x:auto;font-size:12px;line-height:1.6;margin:12px 0}
        .preview-md code{background:rgba(127,127,127,.12);padding:1px 5px;border-radius:4px;font-size:12px}
        .preview-md pre code{background:none;padding:0;color:inherit}
        .preview-md .md-table{overflow-x:auto;margin:12px 0}
        .preview-md table{border-collapse:collapse;width:100%;font-size:13px}
        .preview-md th,.preview-md td{border:1px solid var(--border);padding:6px 8px;text-align:left}
        .preview-md li.md-task{list-style:none;margin-left:-18px}
        @media (min-width:1024px){
          .be-publish{display:block}
          .be-bar{display:none}
          .be-side{max-height:calc(100vh - var(--nav-h) - 32px);overflow-y:auto}
        }
        @media (max-width:767.98px){
          .be-autosave{margin-left:0;flex-basis:100%}
          .be-textarea{min-height:50vh;font-size:16px}
          .be-toolbar{-webkit-mask-image:linear-gradient(90deg,#000 85%,transparent);mask-image:linear-gradient(90deg,#000 85%,transparent)}
          .be-details summary{padding:8px 16px}
          .be-fields{padding:4px 16px 16px}
          .be-bar{padding:8px}
          .be-bar .ui-btn{padding:0 10px}
          .be-bar .ui-btn i{display:none}
        }
        @media (prefers-reduced-motion:reduce){.be-details summary i{transition:none}}
      `}</style>

      <div className="ui-page">
        <header className="be-head">
          <div>
            <h1 className="ui-title">{id ? 'Edit article' : 'New article'}</h1>
            <p className="ui-sub">Articles are reviewed before they go live. Your drafts are in <button type="button" className="be-sub-link tap" onClick={() => leave('/blog/my')}>My articles</button>.</p>
          </div>
          <button type="button" className="ui-btn ui-btn-text" onClick={() => leave('/blog/my')}>Cancel</button>
        </header>

        {status && <p className="be-status">Status: <b>{STATUS_LABEL[status]}</b>{status === 'PUBLISHED' && ' · editing it sends it back for review'}</p>}
        {error && <div className="be-note err" role="alert">{error}</div>}
        {saved && <div className="be-note ok" role="status">{saved}</div>}

        <div className="ui-split be-layout">
          <div className="be-main">
            <div className="be-modes">
              <div className="be-seg" role="group" aria-label="View">
                <button type="button" className={view === 'write' ? 'on' : ''} onClick={() => setMode('write')} aria-pressed={view === 'write'}>Edit</button>
                <button type="button" className={view === 'preview' ? 'on' : ''} onClick={() => setMode('preview')} aria-pressed={view === 'preview'}>Preview</button>
                {wide && <button type="button" className={view === 'split' ? 'on' : ''} onClick={() => setMode('split')} aria-pressed={view === 'split'}>Side by side</button>}
              </div>
              <span className="be-autosave" aria-live="polite">{autosaveText}</span>
            </div>

            {preview ? (
              <div className="preview-card">
                <div className="preview-cover">
                  {form.coverImage
                    ? <img src={form.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <i className="ti ti-book-2" aria-hidden="true" style={{ fontSize: 44, color: 'var(--text3)' }} />}
                </div>
                <div className="preview-body">
                  <span className="preview-cat">{form.category}</span>
                  <h1>{form.title || 'Untitled article'}</h1>
                  <div className="preview-md" dangerouslySetInnerHTML={{ __html: renderBlog(form.body) }} />
                </div>
              </div>
            ) : (
              <>
                <label className="ui-label" htmlFor="be-title">Title</label>
                <input id="be-title" className="ui-input be-title-in" value={form.title} onChange={s('title')} placeholder="Give your article a clear title" />

                <div className="be-editor">
                  <label className="ui-label" htmlFor="blog-body">Body</label>
                  <div className="be-toolbar" role="toolbar" aria-label="Formatting">
                    {TOOLS.map(toolBtn)}
                    <label className={`be-tb-btn${uploading ? ' busy' : ''}`} aria-label={uploading ? 'Uploading the picture' : 'Add a picture'} title="Add a picture">
                      <i className={`ti ${uploading ? 'ti-loader-2' : 'ti-photo'}`} aria-hidden="true" />
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden disabled={uploading} onChange={(e) => { insertImage(e.target.files?.[0]); e.target.value = '' }} />
                    </label>
                    <span className="be-tb-sep" aria-hidden="true" />
                    {MORE_TOOLS.map(toolBtn)}
                  </div>
                  {view === 'split' ? (
                    <div className="be-split">
                      <textarea id="blog-body" className="be-textarea" value={form.body} onChange={s('body')} maxLength={50000} placeholder="Write your article here..." />
                      <div className="be-split-preview preview-md" aria-label="Live preview" dangerouslySetInnerHTML={{ __html: renderBlog(form.body) || '<p>The preview shows here as you type.</p>' }} />
                    </div>
                  ) : (
                    <textarea id="blog-body" className="be-textarea" value={form.body} onChange={s('body')} maxLength={50000} placeholder="Write your article here..." />
                  )}
                </div>
                <details className="be-help">
                  <summary><i className="ti ti-help-circle" aria-hidden="true" /> How to format</summary>
                  <p>Use ## for headings, - or 1. for lists, - [ ] for a checklist, **bold**, *italic*, ~~strike~~, ``` lines around code, | cells | rows for a table and [text](https://link) for links.</p>
                  <p>The picture button adds a picture (up to 25 MB) on its own line: ![caption](link). HTML isn't supported.</p>
                </details>
              </>
            )}
          </div>

          <aside className="ui-split-side be-side">
            <section className="ui-card be-publish" aria-label="Publish">
              <p className="be-pub-status">Status: <b>{status ? STATUS_LABEL[status] : 'Not saved yet'}</b>{autosaveText && <><br />{autosaveText}</>}</p>
              <button type="button" className="ui-btn ui-btn-dark" onClick={() => save('published')} disabled={busy}><i className="ti ti-send" aria-hidden="true" /> {submitLabel}</button>
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => save('draft')} disabled={busy}><i className="ti ti-file-text" aria-hidden="true" /> Save draft</button>
              <p className="be-pub-hint">An admin reviews each article before it appears on the blog.</p>
            </section>

            <details className="ui-card be-details" open={detailsOpen} onToggle={(e) => setDetailsOpen((e.currentTarget as HTMLDetailsElement).open)}>
              <summary>
                <b>Article details</b>
                <span>{form.category}{form.coverImage ? ' · cover added' : ''}</span>
                <i className="ti ti-chevron-down" aria-hidden="true" />
              </summary>
              <div className="be-fields">
                <div>
                  <label className="ui-label" htmlFor="be-cat">Category</label>
                  <select id="be-cat" className="ui-select" value={form.category} onChange={s('category')}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <span className="ui-label">Cover image (optional, 16:9, e.g. 1600 × 900)</span>
                  <div className="be-cover">
                    {form.coverImage && <img src={form.coverImage} alt="Cover" />}
                    <label className="ui-btn ui-btn-ghost be-cover-btn">
                      <i className="ti ti-photo" aria-hidden="true" />{uploading ? 'Uploading…' : form.coverImage ? 'Change' : 'Upload'}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden disabled={uploading} onChange={(e) => pickCover(e.target.files?.[0])} />
                    </label>
                    {form.coverImage && <button type="button" className="ui-btn ui-btn-text" onClick={() => setForm(f => ({ ...f, coverImage: '' }))}>Remove</button>}
                  </div>
                </div>
                <div>
                  <label className="ui-label" htmlFor="be-excerpt">Summary (optional, shown on the blog list)</label>
                  <input id="be-excerpt" className="ui-input" value={form.excerpt} onChange={s('excerpt')} maxLength={300} placeholder={autoExcerpt || 'One or two sentences about the article'} />
                </div>
                <div>
                  <label className="ui-label" htmlFor="be-tags">Tags (optional, comma-separated, up to 10)</label>
                  <input id="be-tags" className="ui-input" value={form.tags} onChange={s('tags')} placeholder="e.g. freelancing, tips, crypto" />
                </div>
              </div>
            </details>
          </aside>
        </div>

        {/* Phone and tablet: the two main actions stay on screen above the bottom menu */}
        <div className="ui-actionbar be-bar">
          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => save('draft')} disabled={busy}>Save draft</button>
          <button type="button" className="ui-btn ui-btn-dark" onClick={() => save('published')} disabled={busy}><i className="ti ti-send" aria-hidden="true" /> {submitLabel}</button>
        </div>
      </div>
    </Layout>
  )
}
