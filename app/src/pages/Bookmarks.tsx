import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiRequest } from '../lib/api'
import Layout from '../components/Layout'

export default function Bookmarks() {
  const navigate = useNavigate()
  const { isAuthed } = useAuth()
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthed) return
    apiRequest('/users/bookmarks')
      .then(data => {
        const list = data?.bookmarks || []
        setBookmarks(list)
      })
      .catch(() => {
        try {
          const local = JSON.parse(localStorage.getItem('ogapay_bookmarks') || '[]')
          setBookmarks(local)
        } catch {}
      })
      .finally(() => setLoading(false))
  }, [isAuthed])

  const removeBookmark = async (taskId: string) => {
    try {
      await apiRequest(`/users/bookmarks/${taskId}`, { method: 'DELETE' })
      setBookmarks(prev => prev.filter(b => b.taskId !== taskId && b.id !== taskId))
    } catch {}
  }

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 20px 60px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Bookmarks</h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
          Your saved tasks and jobs.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
            <span className="spinner" /> Loading...
          </div>
        ) : bookmarks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <i className="ti ti-bookmark-off" style={{ fontSize: 40, marginBottom: 12, display: 'block', opacity: 0.4 }} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>No bookmarks yet</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>
              Save tasks you're interested in and they'll appear here.
            </p>
            <button
              onClick={() => navigate('/tasks')}
              style={{ marginTop: 16, padding: '10px 20px', borderRadius: 9, background: '#191C6B', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              Browse Tasks
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {bookmarks.map((b: any) => {
              const task = b.task || b
              return (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', background: 'var(--card)',
                  border: '1px solid var(--border)', borderRadius: 12
                }}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      {task.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                      {task.description?.slice(0, 80)}...
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#191C6B' }}>
                        {task.reward} {task.currency}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 20 }}>
                        {task.category}
                      </span>
                      {task.status === 'CLOSED' && (
                        <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>Closed</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      style={{ padding: '6px 12px', borderRadius: 8, background: '#191C6B', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => removeBookmark(b.taskId || task.id)}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer' }}
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
