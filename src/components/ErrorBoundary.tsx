import { Component, ReactNode } from 'react'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      errorInfo: errorInfo.componentStack || null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h1>Something went wrong</h1>
            <p className="error-message">
              The application encountered an unexpected error and needs to recover.
            </p>

            {this.state.error && (
              <details className="error-details">
                <summary>Error Details</summary>
                <div className="error-stack">
                  <strong>Error:</strong> {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      <br />
                      <br />
                      <strong>Component Stack:</strong>
                      <pre>{this.state.errorInfo}</pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="error-actions">
              <button className="btn-primary" onClick={this.handleReload}>
                Reload Application
              </button>
              <button className="btn-secondary" onClick={this.handleReset}>
                Try Again
              </button>
            </div>

            <div className="error-help">
              <p>If this problem persists, please:</p>
              <ul>
                <li>Check if you have the latest version</li>
                <li>Try closing and reopening the application</li>
                <li>Check the logs for more details</li>
                <li>Report this issue on GitHub</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
