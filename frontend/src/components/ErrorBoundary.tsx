/**
 * ErrorBoundary - Catches React rendering errors and shows a fallback UI
 */
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0f0f14',
          color: '#e0e0e6',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          padding: '24px',
          textAlign: 'center',
        }}>
          <div style={{
            background: '#1a1a24',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '480px',
            border: '1px solid #2a2a3a',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>!</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 600 }}>
              Something went wrong
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#8888a0', lineHeight: 1.5 }}>
              An unexpected error occurred. You can try again or reload the page.
            </p>
            {this.state.error && (
              <pre style={{
                textAlign: 'left',
                padding: '12px',
                background: '#12121a',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#ef4444',
                overflow: 'auto',
                maxHeight: '100px',
                marginBottom: '24px',
                border: '1px solid #2a2a3a',
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '10px 20px',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  background: '#2a2a3a',
                  color: '#e0e0e6',
                  border: '1px solid #3a3a4a',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
