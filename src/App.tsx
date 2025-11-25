import { useState, useEffect } from 'react'
import VideoEditor from './components/VideoEditor'
import WelcomeScreen from './components/WelcomeScreen'
import SetupWizard from './components/SetupWizard'
import ToastProvider from './components/ToastProvider'
import ErrorBoundary from './components/ErrorBoundary'
import { ProjectProvider } from './context/ProjectContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useUnsavedChangesSync } from './hooks/useUnsavedChangesSync'
import './App.css'

function AppContent({ hasProject, onProjectCreated }: { hasProject: boolean; onProjectCreated: () => void }) {
  // Enable global keyboard shortcuts
  useKeyboardShortcuts()

  // Sync unsaved changes state with main process
  useUnsavedChangesSync()

  return (
    <div className="app">
      {hasProject ? (
        <VideoEditor />
      ) : (
        <WelcomeScreen onProjectCreated={onProjectCreated} />
      )}
    </div>
  )
}

function App() {
  const [hasProject, setHasProject] = useState(false)
  const [isSetupMode, setIsSetupMode] = useState(false)

  useEffect(() => {
    // Check if we're in setup mode (first run)
    const hash = window.location.hash
    if (hash === '#setup') {
      setIsSetupMode(true)
    }
  }, [])

  // If in setup mode, show setup wizard
  if (isSetupMode) {
    return (
      <ErrorBoundary>
        <SetupWizard />
      </ErrorBoundary>
    )
  }

  // Normal app flow
  return (
    <ErrorBoundary>
      <ProjectProvider>
        <AppContent hasProject={hasProject} onProjectCreated={() => setHasProject(true)} />
        <ToastProvider />
      </ProjectProvider>
    </ErrorBoundary>
  )
}

export default App
