import React from 'react'
import { Link } from 'react-router-dom'

interface Props { children: React.ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('[ErrorBoundary]', error, info.componentStack) }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 40, textAlign: 'center', background: 'var(--bg)', color: 'var(--text)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(220,38,38,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: '#dc2626',
          }}>
            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
            </svg>
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>Something went wrong</h2>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <pre style={{ fontSize: 11, color: '#dc2626', maxWidth: '80%', overflow: 'auto', padding: 12, background: 'rgba(220,38,38,0.06)', borderRadius: 8, margin: '0 0 24px' }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => window.location.reload()} style={{
              padding: '12px 24px', borderRadius: 10, border: 'none', background: 'var(--accent)',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Refresh Page
            </button>
            <Link to="/" style={{
              padding: '12px 24px', borderRadius: 10, border: '1.5px solid var(--border)',
              background: 'var(--card)', color: 'var(--text)', fontSize: 13, fontWeight: 700,
              textDecoration: 'none', fontFamily: 'inherit',
            }}>
              Go Home
            </Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
