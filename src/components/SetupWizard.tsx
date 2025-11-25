// SetupWizard - First-run setup UI component
// Displays progress during automatic dependency installation

import React, { useState, useEffect } from 'react'
import './SetupWizard.css'

interface SetupProgress {
  stage: string
  progress: number
  message: string
  error?: string
}

const SetupWizard: React.FC = () => {
  const [progress, setProgress] = useState<SetupProgress>({
    stage: 'start',
    progress: 0,
    message: 'Initializing setup...'
  })
  const [isComplete, setIsComplete] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // Listen for setup progress updates from main process
    const removeListener = window.electronAPI.onSetupProgress((progressData: SetupProgress) => {
      setProgress(progressData)

      if (progressData.stage === 'complete') {
        setIsComplete(true)
      }

      if (progressData.error) {
        setHasError(true)
      }
    })

    // Start the setup process
    window.electronAPI.startSetup()

    return () => {
      if (removeListener) {
        removeListener()
      }
    }
  }, [])

  const handleContinue = () => {
    // Reload the app to main interface
    window.electronAPI.setupComplete()
  }

  const handleRetry = () => {
    setHasError(false)
    setProgress({ stage: 'start', progress: 0, message: 'Retrying setup...' })
    window.electronAPI.startSetup()
  }

  const getStageTitle = (stage: string): string => {
    const titles: Record<string, string> = {
      start: 'Starting Setup',
      python: 'Finding Python',
      pip: 'Setting up Package Manager',
      venv: 'Creating Virtual Environment',
      dependencies: 'Installing Dependencies',
      spacy: 'Downloading Language Model',
      verify: 'Verifying Installation',
      config: 'Configuring Application',
      complete: 'Setup Complete',
      error: 'Setup Failed'
    }
    return titles[stage] || 'Processing'
  }

  return (
    <div className="setup-wizard">
      <div className="setup-container">
        <div className="setup-header">
          <div className="setup-logo">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="28" fill="#4f46e5" />
              <path
                d="M24 28l8 8 16-16"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1>CreatorCrafter Setup</h1>
          <p className="setup-subtitle">
            {isComplete
              ? 'All set! Ready to create amazing content.'
              : 'Setting up AI dependencies for the first time...'}
          </p>
        </div>

        <div className="setup-body">
          {!hasError && (
            <>
              <div className="setup-stage">
                <h2>{getStageTitle(progress.stage)}</h2>
                <p className="setup-message">{progress.message}</p>
              </div>

              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.progress}%` }}
                  >
                    <span className="progress-text">{progress.progress}%</span>
                  </div>
                </div>
              </div>

              <div className="setup-info">
                {progress.stage === 'dependencies' && progress.progress < 95 && (
                  <>
                    <p className="info-item">⏱️ This may take 10-15 minutes</p>
                    <p className="info-item">📦 Downloading ~1.5GB of AI packages</p>
                    <p className="info-item">☕ Perfect time for a coffee break!</p>
                  </>
                )}
                {progress.stage === 'complete' && (
                  <>
                    <p className="info-item success">✅ Python environment ready</p>
                    <p className="info-item success">✅ All dependencies installed</p>
                    <p className="info-item success">✅ Configuration complete</p>
                  </>
                )}
              </div>

              {isComplete && (
                <div className="setup-actions">
                  <button onClick={handleContinue} className="btn-primary">
                    Continue to CreatorCrafter
                  </button>
                </div>
              )}

              {!isComplete && (
                <div className="setup-note">
                  <p>ℹ️ Please keep this window open until setup completes</p>
                  <p>💡 AI models (~2GB) will download on first use</p>
                </div>
              )}
            </>
          )}

          {hasError && (
            <div className="setup-error">
              <div className="error-icon">⚠️</div>
              <h2>Setup Failed</h2>
              <p className="error-message">{progress.error}</p>
              <div className="error-details">
                <p>Stage: {progress.stage}</p>
                <p>Progress: {progress.progress}%</p>
              </div>
              <div className="setup-actions">
                <button onClick={handleRetry} className="btn-primary">
                  Retry Setup
                </button>
                <button
                  onClick={() => window.electronAPI.openExternal('https://github.com/yourrepo/issues')}
                  className="btn-secondary"
                >
                  Report Issue
                </button>
              </div>
              <div className="error-help">
                <p>Common solutions:</p>
                <ul>
                  <li>Check your internet connection</li>
                  <li>Disable VPN/proxy temporarily</li>
                  <li>Run as Administrator</li>
                  <li>Check firewall settings</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="setup-footer">
          <p>CreatorCrafter v1.0.0 | Powered by AI</p>
        </div>
      </div>
    </div>
  )
}

export default SetupWizard
