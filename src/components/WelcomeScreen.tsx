import { useState, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import { formatDate } from '../utils/projectSerializer'
import { FolderPlus, FolderOpen, Video, Sparkles, Mic, MessageSquare, Wand2, X } from 'lucide-react'
import './WelcomeScreen.css'

interface WelcomeScreenProps {
  onProjectCreated: () => void
}

interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

export default function WelcomeScreen({ onProjectCreated }: WelcomeScreenProps) {
  const { createNewProject, loadProject } = useProject()
  const [isLoading, setIsLoading] = useState(false)
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRecentProjects()
  }, [])

  const loadRecentProjects = async () => {
    try {
      // Check if electronAPI is available
      if (!window.electronAPI) {
        console.warn('Electron API not available - running in web mode')
        return
      }
      const projects = await window.electronAPI.getRecentProjects()
      setRecentProjects(projects)
    } catch (err) {
      console.error('Failed to load recent projects:', err)
    }
  }

  const handleNewProject = async () => {
    if (!projectName.trim()) {
      setError('Please enter a project name')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Select video file
      const videoPath = await window.electronAPI.openFileDialog()
      if (!videoPath) {
        setIsLoading(false)
        return
      }

      // Select project location
      const location = await window.electronAPI.openProjectFolder()
      if (!location) {
        setIsLoading(false)
        return
      }

      // Create project
      await createNewProject(projectName.trim(), location, videoPath)
      setShowNewProjectDialog(false)
      setProjectName('')
      onProjectCreated()
    } catch (error: any) {
      console.error('Error creating project:', error)
      setError(error.message || 'Failed to create project')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenProject = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const projectPath = await window.electronAPI.openProjectFile()
      if (!projectPath) {
        setIsLoading(false)
        return
      }

      await loadProject(projectPath)
      onProjectCreated()
    } catch (error: any) {
      console.error('Error opening project:', error)
      setError(error.message || 'Failed to open project')
      setIsLoading(false)
    }
  }

  const handleOpenRecentProject = async (projectPath: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // Check if project still exists
      const isValid = await window.electronAPI.isValidProject(projectPath)
      if (!isValid) {
        setError('Project not found. It may have been moved or deleted.')
        await window.electronAPI.removeRecentProject(projectPath)
        await loadRecentProjects()
        setIsLoading(false)
        return
      }

      await loadProject(projectPath)
      onProjectCreated()
    } catch (error: any) {
      console.error('Error opening recent project:', error)
      setError(error.message || 'Failed to open project')
      setIsLoading(false)
    }
  }

  const handleImportVideo = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const videoPath = await window.electronAPI.openFileDialog()
      if (!videoPath) {
        setIsLoading(false)
        return
      }

      // Quick import without project structure
      const fileName = videoPath.split(/[/\\]/).pop() || 'Untitled'
      const projectName = fileName.replace(/\.[^/.]+$/, '') // Remove extension

      // Use temp directory for quick import
      const tempLocation = await window.electronAPI.openProjectFolder()
      if (!tempLocation) {
        setIsLoading(false)
        return
      }

      await createNewProject(projectName, tempLocation, videoPath)
      onProjectCreated()
    } catch (error: any) {
      console.error('Error importing video:', error)
      setError(error.message || 'Failed to import video')
      setIsLoading(false)
    }
  }

  const handleRemoveRecent = async (e: React.MouseEvent, projectPath: string) => {
    e.stopPropagation()
    await window.electronAPI.removeRecentProject(projectPath)
    await loadRecentProjects()
  }

  if (showNewProjectDialog) {
    return (
      <div className="welcome-screen">
        <div className="new-project-dialog">
          <h2>Create New Project</h2>
          <p className="dialog-subtitle">Enter a name for your project</p>

          {error && <div className="error-message">{error}</div>}

          <input
            type="text"
            className="project-name-input"
            placeholder="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNewProject()}
            autoFocus
            disabled={isLoading}
          />

          <div className="dialog-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setShowNewProjectDialog(false)
                setProjectName('')
                setError(null)
              }}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleNewProject}
              disabled={isLoading || !projectName.trim()}
            >
              {isLoading ? 'Creating...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">AI Content Creator Assistant</h1>
        <p className="welcome-subtitle">
          Enhance your videos with AI-powered captions, sound effects, and overlays
        </p>

        {error && <div className="error-message">{error}</div>}

        <div className="welcome-actions">
          <button
            className="action-card action-card-primary"
            onClick={() => setShowNewProjectDialog(true)}
            disabled={isLoading}
          >
            <div className="action-icon">
              <FolderPlus size={48} strokeWidth={1.5} />
            </div>
            <h3>New Project</h3>
            <p>Create a new project with organized assets</p>
          </button>

          <button
            className="action-card"
            onClick={handleOpenProject}
            disabled={isLoading}
          >
            <div className="action-icon">
              <FolderOpen size={48} strokeWidth={1.5} />
            </div>
            <h3>Open Project</h3>
            <p>Open an existing project file</p>
          </button>

          <button
            className="action-card"
            onClick={handleImportVideo}
            disabled={isLoading}
          >
            <div className="action-icon">
              <Video size={48} strokeWidth={1.5} />
            </div>
            <h3>Import Video</h3>
            <p>Quick start without project structure</p>
          </button>
        </div>

        {recentProjects.length > 0 && (
          <div className="recent-projects-section">
            <h2>Recent Projects</h2>
            <div className="recent-projects-grid">
              {recentProjects.map((project) => (
                <div
                  key={project.path}
                  className="recent-project-card"
                  onClick={() => handleOpenRecentProject(project.path)}
                >
                  <div className="recent-project-info">
                    <h4>{project.name}</h4>
                    <p className="recent-project-date">
                      {formatDate(project.lastOpened)}
                    </p>
                  </div>
                  <button
                    className="remove-recent-btn"
                    onClick={(e) => handleRemoveRecent(e, project.path)}
                    title="Remove from recent"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="welcome-features">
          <div className="feature">
            <div className="feature-icon">
              <Video size={36} strokeWidth={1.5} />
            </div>
            <h3>Smart Video Analysis</h3>
            <p>AI identifies key moments and suggests enhancements</p>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <Mic size={36} strokeWidth={1.5} />
            </div>
            <h3>AI-Generated SFX</h3>
            <p>Create custom sound effects with Meta AudioCraft</p>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <MessageSquare size={36} strokeWidth={1.5} />
            </div>
            <h3>Smart Captions</h3>
            <p>Auto-generate and customize captions with style</p>
          </div>
          <div className="feature">
            <div className="feature-icon">
              <Wand2 size={36} strokeWidth={1.5} />
            </div>
            <h3>Text Overlays</h3>
            <p>Add animated text overlays at perfect moments</p>
          </div>
        </div>

        <p className="welcome-hint">
          Supported formats: MP4, MOV, AVI, MKV, WebM
        </p>
      </div>
    </div>
  )
}
