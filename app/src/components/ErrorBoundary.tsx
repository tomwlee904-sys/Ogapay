import { Component, ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            padding: 40,
            textAlign: 'center',
          }}
        >
          <i className="ti ti-alert-triangle" style={{ fontSize: 48, color: '#DC2626', marginBottom: 16, display: 'block' }} />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            Something went wrong
          </h3>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text2)', maxWidth: 400 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: 20,
              height: 42,
              padding: '0 24px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
