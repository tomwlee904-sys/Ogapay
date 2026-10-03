import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { isStaleBuildError, reloadForUpdate } from '../lib/staleBuild'

interface Props { children: React.ReactNode; resetKey?: string }
interface State { hasError: boolean; error: Error | null }

// Catches a page that crashed. It clears when you go to another page (it used to
// stay up until a full reload, so one error showed on every page after it), and
// when the error is just an old version of the site after a deploy, it reloads.
class Boundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (isStaleBuildError(error) && reloadForUpdate()) return
    console.error('[ErrorBoundary]', error, info.componentStack)
  }
  componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const stale = isStaleBuildError(this.state.error)
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 40, textAlign: 'center', background: 'var(--bg)', color: 'var(--text)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: stale ? 'var(--card2)' : 'rgba(220,38,38,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: stale ? 'var(--text)' : '#dc2626',
          }}>
            {stale
              ? <i className="ti ti-refresh" style={{ fontSize: 28 }} />
              : <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>}
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>{stale ? 'OgaPay was just updated' : 'Something went wrong'}</h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text2)', lineHeight: 1.5, maxWidth: 420 }}>
            {stale ? 'Reload to get the latest version. Nothing you did was lost.' : 'This page hit an error. Reloading usually fixes it.'}
          </p>
          {!stale && this.state.error?.message && (
            <pre style={{ fontSize: 11, color: '#dc2626', maxWidth: '80%', overflow: 'auto', padding: 12, background: 'rgba(220,38,38,0.06)', borderRadius: 8, margin: '-12px 0 24px' }}>
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => window.location.reload()} style={{
              padding: '12px 24px', borderRadius: 10, border: 'none', background: 'var(--accent)',
              color: 'var(--on-accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Reload
            </button>
            <Link to="/" style={{
              padding: '12px 24px', borderRadius: 10, border: '1.5px solid var(--border)',
              background: 'var(--card)', color: 'var(--text)', fontSize: 13, fontWeight: 700,
              textDecoration: 'none', fontFamily: 'inherit',
            }}>
              Go home
            </Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return <Boundary resetKey={pathname}>{children}</Boundary>
}
