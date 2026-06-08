import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { uploadImage } from '../lib/upload'

const CATEGORIES = ['News', 'Businesses', 'Freelancers', 'Case Studies']

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim() || 'post'
}

export default function AdminBlog() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState({ title: '', excerpt: '', content: '', category: 'News', tags: '', coverImage: '', coverColor: '#191C6B', status: 'DRAFT' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)

  const loadPosts = async () => {
    setLoading(true)
    try {
      const res = await apiRequest<any>('/blog/admin/all')
      setPosts(res.posts || [])
    } catch { setPosts([]) }
    setLoading(false)
  }

  useEffect(() => { loadPosts() }, [])

  const s = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  const openCreate = () => {
    setEditing({ id: null })
    setForm({ title: '', excerpt: '', content: '', category: 'News', tags: '', coverImage: '', coverColor: '#191C6B', status: 'DRAFT' })
    setError('')
  }

  const openEdit = (post: any) => {
    setEditing(post)
    setForm({
      title: post.title, excerpt: post.excerpt || '', content: post.content,
      category: post.category, tags: post.tags || '', coverImage: post.coverImage || '',
      coverColor: post.coverColor || '#191C6B', status: post.status,
    })
    setError('')
  }

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) { setError('Title and content are required'); return }
    setError(''); setSaving(true)
    try {
      if (editing?.id) {
        await apiRequest(`/blog/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) })
      } else {
        await apiRequest('/blog', { method: 'POST', body: JSON.stringify(form) })
      }
      setEditing(null); loadPosts()
    } catch (e: any) { setError(e.message || 'Save failed') }
    setSaving(false)
  }

  const deletePost = async (id: string) => {
    if (!window.confirm('Delete this post?')) return
    try { await apiRequest(`/blog/${id}`, { method: 'DELETE' }); loadPosts() }
    catch {}
  }

  const toggleStatus = async (post: any) => {
    const newStatus = post.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    try {
      await apiRequest(`/blog/${post.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) })
      loadPosts()
    } catch {}
  }

  if (editing !== null) {
    const isEdit = !!editing?.id
    return (
      <Layout sidebar>
        <style>{`
          .ab-wrap{max-width:900px;margin:0 auto;padding:28px 24px 60px}
          .ab-wrap h1{font-size:22px;font-weight:800;margin:0 0 4px}
          .ab-sub{font-size:13px;color:var(--text2);margin-bottom:20px}
          .ab-label{font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px;display:block}
          .ab-input{width:100%;height:40px;padding:0 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:13px;font-family:inherit;outline:none;box-sizing:border-box}
          .ab-input:focus{border-color:var(--accent)}
          .ab-textarea{width:100%;min-height:150px;padding:12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:13px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6}
          .ab-textarea:focus{border-color:var(--accent)}
          .ab-select{width:100%;height:40px;padding:0 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:13px;font-family:inherit;outline:none;cursor:pointer}
          .ab-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
          @media(max-width:600px){.ab-grid{grid-template-columns:1fr}}
          .ab-editor{min-height:350px;width:100%;padding:12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:13px;font-family:monospace;outline:none;resize:vertical;box-sizing:border-box;line-height:1.6;tab-size:2}
          .ab-editor:focus{border-color:var(--accent)}
        `}</style>
        <div className="ab-wrap">
          <h1>{isEdit ? 'Edit Post' : 'New Post'}</h1>
          <p className="ab-sub">{isEdit ? 'Update your blog post below.' : 'Write a new blog post for OgaPay.'}</p>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

          <div className="ab-grid">
            <div>
              <label className="ab-label">Title</label>
              <input className="ab-input" value={form.title} onChange={s('title')} placeholder="Article title" />
            </div>
            <div>
              <label className="ab-label">Category</label>
              <select className="ab-select" value={form.category} onChange={s('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <label className="ab-label">Excerpt <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(optional, shown in cards)</span></label>
          <textarea className="ab-textarea" value={form.excerpt} onChange={s('excerpt')} placeholder="Brief summary..." rows={3} />

          <div className="ab-grid" style={{ marginTop: 16 }}>
            <div>
              <label className="ab-label">Cover Image URL <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(or upload)</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input className="ab-input" value={form.coverImage} onChange={s('coverImage')} placeholder="https://..." style={{ flex: 1 }} />
                <label style={{ height: 40, padding: '0 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg2)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', flexShrink: 0 }}>
                  Upload
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                    const file = e.target.files?.[0]; if (!file) return
                    setUploadingCover(true)
                    try { const url = await uploadImage(file, 'blog-covers'); setForm(f => ({ ...f, coverImage: url })) } catch {}
                    setUploadingCover(false)
                  }} />
                </label>
              </div>
              {uploadingCover && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Uploading...</span>}
            </div>
            <div>
              <label className="ab-label">Tags <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(comma-separated)</span></label>
              <input className="ab-input" value={form.tags} onChange={s('tags')} placeholder="freelancing, tips" />
            </div>
          </div>

          <label className="ab-label" style={{ marginTop: 16 }}>Content (HTML)</label>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 6px' }}>Write your article using HTML. Supports h1-h3, p, ul, ol, blockquote, pre, img, a, etc.</p>
          <textarea className="ab-editor" value={form.content} onChange={s('content')} placeholder="<h2>Your heading here</h2><p>Your content here...</p>" />

          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => { setForm(f => ({ ...f, status: 'PUBLISHED' })); setTimeout(save, 0) }}
              style={{ height: 42, padding: '0 24px', borderRadius: 99, border: 'none', background: '#121566', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Saving...' : 'Publish'}
            </button>
            <button onClick={() => { setForm(f => ({ ...f, status: 'DRAFT' })); setTimeout(save, 0) }}
              style={{ height: 42, padding: '0 24px', borderRadius: 99, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button onClick={() => setEditing(null)}
              style={{ height: 42, padding: '0 24px', borderRadius: 99, border: '1.5px solid #fca5a5', background: 'transparent', color: '#dc2626', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebar>
      <style>{`
        .ab-wrap{max-width:1100px;margin:0 auto;padding:28px 24px 60px}
        .ab-wrap h1{font-size:22px;font-weight:800;margin:0 0 4px}
        .ab-sub{font-size:13px;color:var(--text2);margin-bottom:20px}
        .ab-table{width:100%;border-collapse:collapse;font-size:13px}
        .ab-table th{text-align:left;padding:10px 12px;border-bottom:1px solid var(--border);color:var(--text2);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
        .ab-table td{padding:10px 12px;border-bottom:0.5px solid var(--border);vertical-align:middle}
        .ab-table tr:hover td{background:var(--bg2)}
        .ab-badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;display:inline-block}
        .ab-btn{height:30px;padding:0 10px;border-radius:6px;border:none;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit}
        .ab-empty{padding:40px;text-align:center;color:var(--text3);font-size:14px}
      `}</style>
      <div className="ab-wrap">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1>Blog Manager</h1>
          <button onClick={openCreate} style={{ height: 38, padding: '0 18px', borderRadius: 99, border: 'none', background: '#121566', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Post
          </button>
        </div>
        <p className="ab-sub">Create, edit, and manage blog posts.</p>

        {loading ? (
          <div className="ab-empty">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="ab-empty">No posts yet. Create your first blog post!</div>
        ) : (
          <table className="ab-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Category</th>
                <th>Views</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post: any) => (
                <tr key={post.id}>
                  <td style={{ fontWeight: 600, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</td>
                  <td>
                    <span className="ab-badge" style={{ background: post.status === 'PUBLISHED' ? '#d1fae5' : '#fef3c7', color: post.status === 'PUBLISHED' ? '#065f46' : '#92400e' }}>
                      {post.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text2)' }}>{post.category}</td>
                  <td>{post.viewCount || 0}</td>
                  <td style={{ color: 'var(--text3)', fontSize: 12 }}>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : new Date(post.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="ab-btn" style={{ background: '#eef2ff', color: '#4338ca' }} onClick={() => openEdit(post)}>Edit</button>
                      <button className="ab-btn" style={{ background: post.status === 'PUBLISHED' ? '#fef3c7' : '#d1fae5', color: post.status === 'PUBLISHED' ? '#92400e' : '#065f46' }} onClick={() => toggleStatus(post)}>
                        {post.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button className="ab-btn" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={() => deletePost(post.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}