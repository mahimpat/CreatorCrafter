import { useState } from 'react'
import VideoEditor from './components/VideoEditor'
import WelcomeScreen from './components/WelcomeScreen'
import { ProjectProvider } from './context/ProjectContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

function AppContent({ hasProject, onProjectCreated }: { hasProject: boolean; onProjectCreated: () => void }) {
  // Enable global keyboard shortcuts
  useKeyboardShortcuts()

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

  return (
    <ProjectProvider>
      <AppContent hasProject={hasProject} onProjectCreated={() => setHasProject(true)} />
    </ProjectProvider>
  )
}

export default App
