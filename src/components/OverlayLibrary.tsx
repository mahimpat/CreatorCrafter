import { useState } from 'react'
import { useProject, MediaOverlayAsset } from '../context/ProjectContext'
import { Image, Film, Plus, X, Clock } from 'lucide-react'
import './OverlayLibrary.css'

export default function OverlayLibrary() {
  const { mediaOverlayAssets, importMediaOverlay, removeMediaOverlayAsset } = useProject()
  const [isImporting, setIsImporting] = useState(false)

  const handleImportMedia = async () => {
    setIsImporting(true)
    try {
      const filePath = await window.electronAPI.openFileDialog()

      if (filePath) {
        // Determine type based on file extension
        const ext = filePath.toLowerCase().split('.').pop()
        const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']
        const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm']

        if (imageExts.includes(ext || '')) {
          await importMediaOverlay(filePath, 'image')
        } else if (videoExts.includes(ext || '')) {
          await importMediaOverlay(filePath, 'video')
        } else {
          alert('Unsupported file format. Please select an image or video file.')
        }
      }
    } catch (error) {
      console.error('Error importing overlay media:', error)
      alert('Failed to import media file')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, asset: MediaOverlayAsset) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('media-overlay-asset', JSON.stringify(asset))
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getIcon = (type: 'image' | 'video') => {
    return type === 'image' ? <Image size={32} /> : <Film size={32} />
  }

  return (
    <div className="overlay-library">
      <div className="overlay-library-header">
        <div className="overlay-library-title">
          <Image size={18} />
          <span>Overlay Media</span>
          <span className="media-count">({mediaOverlayAssets.length})</span>
        </div>
        <button
          className="import-btn"
          onClick={handleImportMedia}
          disabled={isImporting}
          title="Import Image or Video"
        >
          <Plus size={16} />
          <span>{isImporting ? 'Importing...' : 'Import'}</span>
        </button>
      </div>

      <div className="overlay-library-content">
        {mediaOverlayAssets.length === 0 ? (
          <div className="empty-state">
            <Image size={48} />
            <p>No overlay media imported</p>
            <p className="hint">Click Import to add images or videos as overlays</p>
          </div>
        ) : (
          <div className="overlay-grid">
            {mediaOverlayAssets.map(asset => (
              <div
                key={asset.id}
                className="overlay-item"
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
                title={asset.name}
              >
                <div className="overlay-thumbnail">
                  <div className="thumbnail-placeholder">
                    {getIcon(asset.type)}
                  </div>
                  <div className="overlay-type-badge">{asset.type.toUpperCase()}</div>
                  {asset.type === 'video' && (
                    <div className="media-duration">
                      <Clock size={12} />
                      {formatDuration(asset.duration)}
                    </div>
                  )}
                </div>
                <div className="overlay-info">
                  <div className="overlay-name">{asset.name}</div>
                  <button
                    className="remove-btn"
                    onClick={() => {
                      if (confirm(`Remove "${asset.name}" from project?`)) {
                        removeMediaOverlayAsset(asset.id)
                      }
                    }}
                    title="Remove overlay"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overlay-library-footer">
        <span className="hint-text">Drag media to timeline to add as overlay</span>
      </div>
    </div>
  )
}
