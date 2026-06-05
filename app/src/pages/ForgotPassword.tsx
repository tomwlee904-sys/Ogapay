// @ts-nocheck
import Layout from '../components/Layout'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  return (
    <Layout sidebar={false}>
      <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Reset Password</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
          Enter the email address linked to your account and we'll send you a password reset link.
        </p>
        <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" placeholder="you@example.com" required
              style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
          </div>
          <button type="submit" style={{ height: 44, borderRadius: 10, background: 'var(--text)', color: 'var(--bg)', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Send Reset Link
          </button>
          <Link to="/login" style={{ textAlign: 'center', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>Back to login</Link>
        </form>
      </div>
    </Layout>
  )
}
