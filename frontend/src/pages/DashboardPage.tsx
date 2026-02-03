/**
 * Dashboard Page - Project list and creation
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { projectsApi, ProjectSummary, ProjectMode } from '../api'
import {
  Plus,
  Video,
  Clock,
  Trash2,
  FolderOpen,
  LogOut,
  User,
  Wand2,
  Sliders,
  MousePointer,
} from 'lucide-react'
import './DashboardPage.css'

export default function DashboardPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectMode, setNewProjectMode] = useState<ProjectMode>('semi_manual')
  const [isCreating, setIsCreating] = useState(false)

  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const res = await projectsApi.list()
      setProjects(res.data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    setIsCreating(true)
    try {
      const res = await projectsApi.create(newProjectName, newProjectMode)
      navigate(`/project/${res.data.id}`)
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const getModeLabel = (mode: ProjectMode) => {
    switch (mode) {
      case 'manual': return 'Manual'
      case 'semi_manual': return 'Semi-Auto'
      case 'automatic': return 'Full Auto'
    }
  }

  const handleDeleteProject = async (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      await projectsApi.delete(projectId)
      setProjects(projects.filter((p) => p.id !== projectId))
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <img
            src="/logo-dark.png"
            alt="Nirvaa"
            className="app-logo logo-dark"
          />
          <img
            src="/logo-light.png"
            alt="Nirvaa"
            className="app-logo logo-light"
          />
        </div>
        <div className="header-right">
          <div className="user-info">
            <User size={18} />
            <span>{user?.username}</span>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-title">
          <h2>Your Projects</h2>
          <button className="new-project-btn" onClick={() => setShowNewProject(true)}>
            <Plus size={18} />
            New Project
          </button>
        </div>

        {showNewProject && (
          <div className="new-project-modal">
            <div className="modal-content">
              <h3>Create New Project</h3>
              <form onSubmit={handleCreateProject}>
                <input
                  type="text"
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                />

                <div className="mode-selector">
                  <label>Editing Mode</label>
                  <div className="mode-options">
                    <div
                      className={`mode-option ${newProjectMode === 'manual' ? 'selected' : ''}`}
                      onClick={() => setNewProjectMode('manual')}
                    >
                      <MousePointer size={24} />
                      <span className="mode-name">Manual</span>
                      <span className="mode-desc">Full creative control</span>
                    </div>
                    <div
                      className={`mode-option ${newProjectMode === 'semi_manual' ? 'selected' : ''}`}
                      onClick={() => setNewProjectMode('semi_manual')}
                    >
                      <Sliders size={24} />
                      <span className="mode-name">Semi-Auto</span>
                      <span className="mode-desc">AI assists, you control</span>
                    </div>
                    <div
                      className={`mode-option ${newProjectMode === 'automatic' ? 'selected' : ''}`}
                      onClick={() => setNewProjectMode('automatic')}
                    >
                      <Wand2 size={24} />
                      <span className="mode-name">Full Auto</span>
                      <span className="mode-desc">AI handles everything</span>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowNewProject(false)
                      setNewProjectName('')
                      setNewProjectMode('semi_manual')
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="create-btn" disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="loading">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={48} />
            <h3>No projects yet</h3>
            <p>Create your first project to get started</p>
            <button className="new-project-btn" onClick={() => setShowNewProject(true)}>
              <Plus size={18} />
              Create Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <div
                key={project.id}
                className="project-card"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="project-thumbnail">
                  <Video size={32} />
                </div>
                <div className="project-info">
                  <h3>{project.name}</h3>
                  <div className="project-meta">
                    <span className={`mode-badge mode-${project.mode}`}>
                      {getModeLabel(project.mode)}
                    </span>
                    <span>
                      <Clock size={14} />
                      {formatDate(project.last_opened)}
                    </span>
                  </div>
                </div>
                <button
                  className="delete-btn"
                  onClick={(e) => handleDeleteProject(project.id, e)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
