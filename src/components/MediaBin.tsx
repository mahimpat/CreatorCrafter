import { useState } from 'react'
import { useProject, VideoClip } from '../context/ProjectContext'
import { Film, Plus, X, Clock } from 'lucide-react'
import './MediaBin.css'

export default function MediaBin() {
  const { videoClips, importVideoClip, removeVideoClip } = useProject()
  const [isImporting, setIsImporting] = useState(false)

  const handleImportVideo = async () => {
    setIsImporting(true)
    try {
      const filePath = await window.electronAPI.openFileDialog()

      if (filePath) {
        await importVideoClip(filePath)
      }
    } catch (error) {
      console.error('Error importing video:', error)
      alert('Failed to import video clip')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, clip: VideoClip) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('video-clip', JSON.stringify(clip))
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="media-bin">
      <div className="media-bin-header">
        <div className="media-bin-title">
          <Film size={18} />
          <span>Media Bin</span>
          <span className="media-count">({videoClips.length})</span>
        </div>
        <button
          className="import-btn"
          onClick={handleImportVideo}
          disabled={isImporting}
          title="Import Video Clip"
        >
          <Plus size={16} />
          <span>{isImporting ? 'Importing...' : 'Import'}</span>
        </button>
      </div>

      <div className="media-bin-content">
        {videoClips.length === 0 ? (
          <div className="empty-state">
            <Film size={48} />
            <p>No video clips imported</p>
            <p className="hint">Click Import to add video clips</p>
          </div>
        ) : (
          <div className="media-grid">
            {videoClips.map(clip => (
              <div
                key={clip.id}
                className="media-item"
                draggable
                onDragStart={(e) => handleDragStart(e, clip)}
                title={clip.name}
              >
                <div className="media-thumbnail">
                  <div className="thumbnail-placeholder">
                    <Film size={32} />
                  </div>
                  <div className="media-duration">
                    <Clock size={12} />
                    {formatDuration(clip.duration)}
                  </div>
                </div>
                <div className="media-info">
                  <div className="media-name">{clip.name}</div>
                  <button
                    className="remove-btn"
                    onClick={() => {
                      if (confirm(`Remove "${clip.name}" from project?`)) {
                        removeVideoClip(clip.id)
                      }
                    }}
                    title="Remove clip"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="media-bin-footer">
        <span className="hint-text">Drag clips to timeline to use them</span>
      </div>
    </div>
  )
}
