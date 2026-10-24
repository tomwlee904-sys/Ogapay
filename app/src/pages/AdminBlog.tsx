import { useState, useEffect, useRef } from 'react'
import AdminShell, { AdminEmpty, AdminSkeleton } from '../components/AdminShell'
import LoadError from '../components/LoadError'
import { apiRequest } from '../lib/api'
import { uploadImage } from '../lib/upload'

const CATEGORIES = ['News', 'Businesses', 'Freelancers', 'Case Studies']
// The API marks writers' articles sent for review as PENDING
const TABS: [string, string][] = [['PENDING', 'Waiting for review'], ['DRAFT', 'Drafts'], ['PUBLISHED', 'Published']]
const STATUS_LABEL: Record<string, string> = { PENDING: 'Waiting for review', DRAFT: 'Draft', PUBLISHED: 'Published' }

export default function AdminBlog() {
  const [posts, setPosts] = useState<any[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState('PENDING')
  const tabPicked = useRef(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState({ title: '', excerpt: '', content: '', category: 'News', tags: '', coverImage: '', coverColor: 'var(--accent)', status: 'DRAFT' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)

  const loadPosts = async () => {
    setFailed(false)
    try {
      const res = await apiRequest<any>('/blog/admin/all')
      const list = res.posts || []
      setPosts(list)
      // Open on what needs review; with nothing waiting, on the published posts
      if (!tabPicked.current) { tabPicked.current = true; if (!list.some((p: any) => p.status === 'PENDING')) setTab('PUBLISHED') }
    } catch { setPosts(null); setFailed(true) }
  }

  useEffect(() => { loadPosts() }, [])

  const s = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  const openCreate = () => {
    setEditing({ id: null })
    setForm({ title: '', excerpt: '', content: '', category: 'News', tags: '', coverImage: '', coverColor: 'var(--accent)', status: 'DRAFT' })
    setError('')
  }

  const openEdit = (post: any) => {
    setEditing(post)
    setForm({
      title: post.title, excerpt: post.excerpt || '', content: post.content,
      category: post.category, tags: post.tags || '', coverImage: post.coverImage || '',
      coverColor: post.coverColor || 'var(--accent)', status: post.status,
    })
    setError('')
  }

  const save = async (status: 'PUBLISHED' | 'DRAFT') => {
    if (!form.title.trim() || !form.content.trim()) { setError('Title and content are required'); return }
    setError(''); setSaving(true)
    const body = JSON.stringify({ ...form, status })
    try {
      if (editing?.id) {
        await apiRequest(`/blog/${editing.id}`, { method: 'PUT', body })
      } else {
        await apiRequest('/blog', { method: 'POST', body })
      }
      setEditing(null); loadPosts()
    } catch (e: any) { setError(e.message || 'Save failed') }
    setSaving(false)
  }

  const deletePost = async (id: string) => {
    if (!window.confirm('Delete this post?')) return
    try { await apiRequest(`/blog/${id}`, { method: 'DELETE' }); loadPosts() }
    catch (e) { console.error('Delete failed', e) }
  }

  const toggleStatus = async (post: any) => {
    const newStatus = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    try {
      await apiRequest(`/blog/${post.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) })
      loadPosts()
    } catch (e) { console.error('Toggle status failed', e) }
  }

  if (editing !== null) {
    const isEdit = !!editing?.id
    const buttons = (
      <>
        <button type="button" className="ui-btn ui-btn-text" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
        <button type="button" className="ui-btn ui-btn-ghost" onClick={() => save('DRAFT')} disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button>
        <button type="button" className="ui-btn ui-btn-dark" onClick={() => save('PUBLISHED')} disabled={saving}>{saving ? 'Saving…' : 'Publish'}</button>
      </>
    )
    return (
      <AdminShell section="blog" title={isEdit ? 'Edit post' : 'New post'} sub={isEdit ? 'Update the post, then save it as a draft or publish it.' : 'Write a new post for the OgaPay blog.'}>
        <style>{`
          .ab-ed{display:grid;gap:16px}
          .ab-editor.ui-input{min-height:360px;font-family:var(--font-mono);font-size:13px;line-height:1.6;tab-size:2}
          .ab-upload{position:relative;overflow:hidden;flex-shrink:0}
          .ab-upload input{position:absolute;inset:0;opacity:0;cursor:pointer}
          .ab-cover{display:flex;gap:8px;align-items:center}
          .ab-cover .ui-input{flex:1;min-width:0}
          .ab-prev{aspect-ratio:16/9;border-radius:var(--r-md);background:var(--card2) center/cover no-repeat;border:1px solid var(--border)}
          .ab-side-btns{display:flex;flex-direction:column-reverse;gap:8px}
          .ab-side-btns .ui-btn{width:100%}
          .ab-bar{justify-content:flex-end}
          @media (min-width:1024px){.ab-bar{display:none}}
          @media (max-width:1023.98px){.ab-side-btns{display:none}}
          @media (max-width:767.98px){.ab-bar .ui-btn-ghost,.ab-bar .ui-btn-dark{flex:1}}
        `}</style>
        <div className="ab-ed">
          {error && <div className="adm-msg bad" role="alert"><span>{error}</span></div>}
          <div className="ui-split">
            <section className="ui-card adm-card">
              <div className="adm-fields">
                <div className="adm-field">
                  <label className="ui-label" htmlFor="ab-title">Title</label>
                  <input id="ab-title" className="ui-input" value={form.title} onChange={s('title')} placeholder="Article title" />
                </div>
                <div className="adm-field">
                  <label className="ui-label" htmlFor="ab-excerpt">Excerpt <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(optional, shown in cards)</span></label>
                  <textarea id="ab-excerpt" className="ui-input" value={form.excerpt} onChange={s('excerpt')} placeholder="Brief summary..." rows={3} />
                </div>
                <div className="adm-field">
                  <label className="ui-label" htmlFor="ab-content">Content (HTML)</label>
                  <p className="ui-hint" style={{ margin: 0 }}>Write the article in HTML: h1-h3, p, ul, ol, blockquote, pre, img, a and more.</p>
                  <textarea id="ab-content" className="ui-input ab-editor" value={form.content} onChange={s('content')} placeholder="<h2>Your heading here</h2><p>Your content here...</p>" />
                </div>
              </div>
            </section>
            <aside className="ui-split-side">
              <section className="ui-card adm-card">
                <div className="adm-fields">
                  <div className="adm-field">
                    <label className="ui-label" htmlFor="ab-cat">Category</label>
                    <select id="ab-cat" className="ui-select" value={form.category} onChange={s('category')}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="adm-field">
                    <label className="ui-label" htmlFor="ab-tags">Tags <span style={{ fontWeight: 400, color: 'var(--text2)' }}>(comma-separated)</span></label>
                    <input id="ab-tags" className="ui-input" value={form.tags} onChange={s('tags')} placeholder="freelancing, tips" />
                  </div>
                  <div className="adm-field">
                    <label className="ui-label" htmlFor="ab-cover">Cover image</label>
                    <div className="ab-cover">
                      <input id="ab-cover" className="ui-input" value={form.coverImage} onChange={s('coverImage')} placeholder="https://..." />
                      <label className={`ui-btn ui-btn-ghost ab-upload${uploadingCover ? ' is-loading' : ''}`}>
                        Upload
                        <input type="file" accept="image/*" aria-label="Upload a cover image" onChange={async e => {
                          const file = e.target.files?.[0]; if (!file) return
                          setUploadingCover(true)
                          try { const url = await uploadImage(file, 'blog-covers'); setForm(f => ({ ...f, coverImage: url })) } catch (e) { console.error('Upload failed', e) }
                          setUploadingCover(false)
                        }} />
                      </label>
                    </div>
                    {form.coverImage && <div className="ab-prev" style={{ backgroundImage: `url("${form.coverImage.replace(/"/g, '%22')}")` }} aria-hidden="true" />}
                  </div>
                  <div className="ab-side-btns">{buttons}</div>
                </div>
              </section>
            </aside>
          </div>
          <div className="ui-actionbar ui-actionbar-mobile-only ab-bar">{buttons}</div>
        </div>
      </AdminShell>
    )
  }

  const counts = { PENDING: 0, DRAFT: 0, PUBLISHED: 0 } as Record<string, number>
  for (const p of posts || []) counts[p.status] = (counts[p.status] || 0) + 1
  const shown = (posts || []).filter((p: any) => p.status === tab)
  const pill = (st: string) => <span className={`adm-pill ${st === 'PUBLISHED' ? 'ok' : st === 'PENDING' ? 'warn' : ''}`}>{STATUS_LABEL[st] || st}</span>
  const date = (post: any) => (post.publishedAt ? new Date(post.publishedAt) : new Date(post.createdAt)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const rowActions = (post: any) => (
    <div className="ab-acts">
      <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => openEdit(post)}><i className="ti ti-pencil" aria-hidden="true" /> Edit</button>
      <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => toggleStatus(post)}>{post.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</button>
      <button type="button" className="ui-btn ui-btn-text ui-btn-sm ab-del" onClick={() => deletePost(post.id)} aria-label={`Delete ${post.title}`}><i className="ti ti-trash" aria-hidden="true" /> Delete</button>
    </div>
  )

  return (
    <AdminShell
      section="blog"
      title="Blog"
      sub="Articles waiting for review, drafts and published posts."
      actions={<button type="button" className="ui-btn ui-btn-dark" onClick={openCreate}><i className="ti ti-plus" aria-hidden="true" /> New post</button>}
    >
      <style>{`
        .ab-list{container-type:inline-size;container-name:ab-list}
        .ab-table{width:100%;border-collapse:collapse;font-size:13.5px}
        .ab-table th{text-align:left;padding:10px 12px;border-bottom:1px solid var(--border);color:var(--text2);font-size:12px;font-weight:500}
        .ab-table td{padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:middle}
        .ab-table tr:last-child td{border-bottom:0}
        .ab-t{font-weight:600;overflow-wrap:anywhere}
        .ab-t small{display:block;font-weight:400;font-size:12.5px;color:var(--text2);margin-top:2px}
        .ab-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
        .ab-del{color:var(--red)}
        .ab-cards{display:none;list-style:none;margin:0;padding:0;flex-direction:column;gap:12px}
        .ab-card{padding:16px;display:grid;gap:10px}
        .ab-card h3{margin:0;font-size:15px;font-weight:600;line-height:1.35;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
        .ab-meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:12.5px;color:var(--text2)}
        .ab-card .ab-del{margin-left:auto}
        @container ab-list (max-width: 860px){.ab-c-views,.ab-c-cat{display:none}}
        @container ab-list (max-width: 600px){.ab-table-wrap{display:none}.ab-cards{display:flex}}
      `}</style>
      <div className="adm-tabs" role="tablist" aria-label="Post status">
        {TABS.map(([st, label]) => (
          <button key={st} type="button" role="tab" aria-selected={tab === st} onClick={() => { tabPicked.current = true; setTab(st) }}>
            {label}{posts && <em>{counts[st] || 0}</em>}
          </button>
        ))}
      </div>

      {failed ? (
        <LoadError what="blog posts" onRetry={loadPosts} />
      ) : posts === null ? (
        <AdminSkeleton rows={3} height={72} />
      ) : shown.length === 0 ? (
        tab === 'PENDING' ? <AdminEmpty done title="No articles waiting for review">All caught up.</AdminEmpty>
          : tab === 'DRAFT' ? <AdminEmpty title="No drafts" />
          : <AdminEmpty title="No published posts yet"><div style={{ marginTop: 14 }}><button type="button" className="ui-btn ui-btn-dark" onClick={openCreate}><i className="ti ti-plus" aria-hidden="true" /> New post</button></div></AdminEmpty>
      ) : (
        <div className="ab-list">
          <div className="ui-card ab-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="ab-table">
              <thead>
                <tr><th>Title</th><th>Status</th><th className="ab-c-cat">Category</th><th className="ab-c-views">Views</th><th>Date</th><th><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Actions</span></th></tr>
              </thead>
              <tbody>
                {shown.map((post: any) => (
                  <tr key={post.id}>
                    <td className="ab-t">{post.title}{post.author?.username && <small>by @{post.author.username}</small>}</td>
                    <td>{pill(post.status)}</td>
                    <td className="ab-c-cat" style={{ color: 'var(--text2)' }}>{post.category}</td>
                    <td className="ab-c-views">{post.viewCount || 0}</td>
                    <td style={{ color: 'var(--text2)', whiteSpace: 'nowrap' }}>{date(post)}</td>
                    <td>{rowActions(post)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="ab-cards">
            {shown.map((post: any) => (
              <li key={post.id} className="ui-card ab-card">
                <h3>{post.title}</h3>
                <div className="ab-meta">{pill(post.status)}<span>{post.category}</span><span>{date(post)}</span><span>{post.viewCount || 0} views</span>{post.author?.username && <span>by @{post.author.username}</span>}</div>
                {rowActions(post)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminShell>
  )
}
