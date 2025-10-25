import { useState } from 'react'
import VideoEditor from './components/VideoEditor'
import WelcomeScreen from './components/WelcomeScreen'
import { ProjectProvider } from './context/ProjectContext'
import './App.css'

function App() {
  const [hasProject, setHasProject] = useState(false)

  return (
    <ProjectProvider>
      <div className="app">
        {hasProject ? (
          <VideoEditor />
        ) : (
          <WelcomeScreen onProjectCreated={() => setHasProject(true)} />
        )}
      </div>
    </ProjectProvider>
  )
}

export default App
