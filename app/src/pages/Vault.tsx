import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { apiRequest } from '../lib/api'
import { SkeletonPage, injectSkeletonStyles } from '../components/SkeletonLoader'

const API_BASE = 'https://ogapay-production.up.railway.app/api/v1'

const S: Record<string, React.CSSProperties> = {
  hero: { marginBottom: 20 },
  greeting: { color: 'var(--text2)', fontSize: 13, fontWeight: 600, marginBottom: 2 },
  title: { fontFamily: 'Outfit', fontSize: 28, fontWeight: 900, margin: '0 0 4px' },
  sub: { color: 'var(--text2)', fontSize: 14, margin: 0 },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 },
  stat: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, textAlign: 'center' as const },
  statIcon: { fontSize: 24, marginBottom: 6, display: 'block' },
  statNum: { fontFamily: 'Outfit', fontSize: 24, fontWeight: 900 },
  statLabel: { fontSize: 12, color: 'var(--text2)', marginTop: 2 },
  controls: { display: 'flex', gap: 8, marginBottom: 16 },
  search: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--card)' },
  searchInput: { flex: 1, border: 0, background: 'transparent', outline: 'none', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' },
  uploadBtn: { height: 38, padding: '0 14px', borderRadius: 10, border: 0, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit' },
  list: { display: 'grid', gap: 6 },
  item: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12 },
  icon: { width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 16 },
  info: { flex: 1, minWidth: 0 },
  name: { fontWeight: 700, fontSize: 13, marginBottom: 2 },
  meta: { fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 10 },
  status: { padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700 },
  empty: { textAlign: 'center' as const, padding: '48px 20px', color: 'var(--text2)' },
}

export default function Vault() {
  const { user: authUser } = useAuth()
  const [docs, setDocs] = useState<any[]>([])
  const [stats, setStats] = useState({ count: '0', totalSize: '0 B', verified: '0' })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocs = async () => {
    setLoading(true)
    try {
      const [docsData, statsData] = await Promise.all([
        apiRequest<any>('/vault'),
        apiRequest<any>('/vault/stats'),
      ])
      setDocs(Array.isArray(docsData) ? docsData : [])
      if (statsData) setStats(statsData)
    } catch {
      setDocs([])
      const el = document.getElementById('appToast')
      if (el) { el.textContent = 'Failed to load vault'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000) }
    } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchDocs();
    injectSkeletonStyles();
    const onFocus = () => fetchDocs();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [authUser])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const token = localStorage.getItem('ogapay_access_token')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`${API_BASE}/uploads/proof`, {
        method: 'POST',
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        body: fd,
      })
      const data = await res.json()
      const url = data?.data?.url || data?.url || ''
      if (url) {
        await apiRequest('/vault/upload', {
          method: 'POST',
          body: JSON.stringify({ name: file.name, type: file.type?.split('/')[1]?.toUpperCase() || 'Unknown', size: file.size, url }),
        })
      }
      fetchDocs()
    } catch {
      const el = document.getElementById('appToast')
      if (el) { el.textContent = 'Upload failed. Try again.'; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3000) }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const filtered = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))

  const statCards = [
    { icon: 'ti ti-vault', color: '#191C6B', count: stats.count, label: 'Documents' },
    { icon: 'ti ti-lock', color: '#16a34a', count: stats.totalSize, label: 'Storage Used' },
    { icon: 'ti ti-shield-check', color: '#191C6B', count: stats.verified, label: 'Verified' },
  ]

  return (
    <Layout>
      <div style={S.hero}>
        <div style={S.greeting}>Secure Storage</div>
        <h1 style={S.title}>Vault</h1>
        <p style={S.sub}>Store and manage your important documents securely</p>
      </div>

      <div style={S.stats}>
        {statCards.map((s, i) => (
          <div style={S.stat} key={i}>
            <i className={s.icon} style={{ ...S.statIcon, color: s.color }} />
            <div style={{ ...S.statNum, color: s.color }}>{s.count}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={S.controls}>
        <div style={S.search}>
          <i className="ti ti-search" style={{ color: 'var(--text3)', fontSize: 16 }} />
          <input style={S.searchInput} type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button style={S.uploadBtn} onClick={() => fileInputRef.current?.click()}>
          <i className="ti ti-upload" /> Upload
        </button>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
      </div>

      {loading && <SkeletonPage />}

      {!loading && filtered.length === 0 && (
        <div style={S.empty}>
          <i className="ti ti-vault" style={{ fontSize: 36, color: 'var(--text3)', marginBottom: 12, display: 'block' }} />
          <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, margin: '0 0 4px', color: 'var(--text)' }}>No documents found</h3>
          <p style={{ fontSize: 13, margin: 0 }}>Upload your first document to get started</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={S.list}>
          {(filtered || []).map(d => (
            <div style={S.item} key={d.id}>
              <div style={{ ...S.icon, background: `${d.color}15`, color: d.color }}>
                <i className="ti ti-file-text" />
              </div>
              <div style={S.info}>
                <div style={S.name}>{d.name}</div>
                <div style={S.meta}>
                  <span>{d.type}</span>
                  <span>{d.size}</span>
                  <span>{d.date}</span>
                </div>
              </div>
              <span style={{ ...S.status, background: `${d.color}15`, color: d.color }}>{d.status}</span>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
