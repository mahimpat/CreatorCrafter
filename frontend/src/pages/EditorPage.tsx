/**
 * Editor Page - Main video editing interface
 * Wrapper that loads the project and provides context
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ProjectProvider } from '../context/ProjectContext'
import VideoEditor from '../components/VideoEditor'
import { projectsApi, Project } from '../api'
import { ArrowLeft } from 'lucide-react'
import './EditorPage.css'

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (projectId) {
      loadProject(parseInt(projectId))
    }
  }, [projectId])

  const loadProject = async (id: number) => {
    try {
      const res = await projectsApi.get(id)
      setProject(res.data)
    } catch (err) {
      console.error('Failed to load project:', err)
      setError('Failed to load project')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="editor-loading">
        <div className="spinner"></div>
        <p>Loading project...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="editor-error">
        <p>{error || 'Project not found'}</p>
        <button onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <ProjectProvider initialProject={project}>
      <VideoEditor />
    </ProjectProvider>
  )
}
