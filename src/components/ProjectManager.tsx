import { useState, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import { Volume2, Film, Folder, Trash2, RefreshCw } from 'lucide-react'
import './ProjectManager.css'

export default function ProjectManager() {
  const { projectPath, projectName } = useProject()
  const [sfxFiles, setSfxFiles] = useState<string[]>([])
  const [exportFiles, setExportFiles] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'sfx' | 'exports'>('sfx')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadAssets()
  }, [projectPath])

  const loadAssets = async () => {
    if (!projectPath) return

    setIsLoading(true)
    try {
      const [sfx, exports] = await Promise.all([
        window.electronAPI.getProjectSFXFiles(projectPath),
        window.electronAPI.getProjectExports(projectPath)
      ])

      setSfxFiles(sfx)
      setExportFiles(exports)
    } catch (error) {
      console.error('Failed to load project assets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleShowInFolder = async (fileName: string) => {
    if (!projectPath) return

    const folder = activeTab === 'sfx' ? 'assets/sfx' : 'assets/exports'
    const fullPath = await window.electronAPI.resolveProjectPath(
      projectPath,
      `${folder}/${fileName}`
    )
    await window.electronAPI.showInFolder(fullPath)
  }

  const handleDeleteFile = async (fileName: string) => {
    if (!projectPath) return

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${fileName}"? This cannot be undone.`
    )

    if (!confirmDelete) return

    try {
      const folder = activeTab === 'sfx' ? 'assets/sfx' : 'assets/exports'
      const fullPath = await window.electronAPI.resolveProjectPath(
        projectPath,
        `${folder}/${fileName}`
      )

      await window.electronAPI.deleteFile(fullPath)
      await loadAssets() // Refresh list
    } catch (error) {
      console.error('Failed to delete file:', error)
      alert('Failed to delete file. Please try again.')
    }
  }

  const formatFileSize = (fileName: string) => {
    // This is a placeholder - would need backend support for actual file sizes
    return 'Unknown size'
  }

  if (!projectPath) {
    return (
      <div className="project-manager">
        <p className="empty-message">
          No project open. Create or open a project to manage assets.
        </p>
      </div>
    )
  }

  const currentFiles = activeTab === 'sfx' ? sfxFiles : exportFiles

  return (
    <div className="project-manager">
      <div className="manager-header">
        <h3>Project Assets</h3>
        <p className="project-name-label">{projectName}</p>
      </div>

      <div className="manager-tabs">
        <button
          className={`tab-btn ${activeTab === 'sfx' ? 'active' : ''}`}
          onClick={() => setActiveTab('sfx')}
        >
          Sound Effects ({sfxFiles.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'exports' ? 'active' : ''}`}
          onClick={() => setActiveTab('exports')}
        >
          Exported Videos ({exportFiles.length})
        </button>
      </div>

      <div className="assets-list">
        {isLoading ? (
          <p className="loading-message">Loading assets...</p>
        ) : currentFiles.length === 0 ? (
          <p className="empty-message">
            {activeTab === 'sfx'
              ? 'No sound effects in this project yet. Generate some SFX to see them here!'
              : 'No exported videos yet. Export a video to see it here!'}
          </p>
        ) : (
          currentFiles.map((file, index) => (
            <div key={index} className="asset-item">
              <div className="asset-info">
                <div className="asset-icon">
                  {activeTab === 'sfx' ? <Volume2 size={24} /> : <Film size={24} />}
                </div>
                <div className="asset-details">
                  <p className="asset-name">{file}</p>
                  <span className="asset-meta">{formatFileSize(file)}</span>
                </div>
              </div>
              <div className="asset-actions">
                <button
                  className="btn-icon"
                  onClick={() => handleShowInFolder(file)}
                  title="Show in folder"
                >
                  <Folder size={16} />
                </button>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => handleDeleteFile(file)}
                  title="Delete file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button className="btn-secondary refresh-btn" onClick={loadAssets}>
        <RefreshCw size={16} />
        <span>Refresh</span>
      </button>
    </div>
  )
}
