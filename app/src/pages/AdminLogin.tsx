import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const ADMIN_CREDENTIALS = {
  username: 'ogapay',
  password: 'ogapay2024',
}

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simple hardcoded check — can be swapped for API call later
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      localStorage.setItem('ogapay_admin_session', 'true')
      navigate('/admin')
    } else {
      setError('Invalid admin credentials')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 24,
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%',
        maxWidth: 380,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '32px 28px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <i className="ti ti-shield" style={{ fontSize: 36, color: 'var(--accent)', marginBottom: 8, display: 'block' }} />
          <h1 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text)' }}>Admin Login</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, margin: '4px 0 0' }}>OgaPay Administration Panel</p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: '#dc2626',
            marginBottom: 16,
          }}>
            <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter admin username"
            style={{
              width: '100%',
              height: 42,
              padding: '0 14px',
              border: '1.5px solid var(--border)',
              borderRadius: 8,
              background: 'var(--bg2)',
              color: 'var(--text)',
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter admin password"
            style={{
              width: '100%',
              height: 42,
              padding: '0 14px',
              border: '1.5px solid var(--border)',
              borderRadius: 8,
              background: 'var(--bg2)',
              color: 'var(--text)',
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            height: 44,
            border: 'none',
            borderRadius: 10,
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading ? 'Signing in...' : 'Sign in to Admin'}
        </button>
      </form>
    </div>
  )
}
