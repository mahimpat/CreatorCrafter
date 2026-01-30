/**
 * ClipsPanel - Combined clip upload and list management
 */
import { useState, useEffect } from 'react'
import { Film, Layers } from 'lucide-react'
import { VideoClip } from '../api'
import ClipUploader from './ClipUploader'
import ClipList from './ClipList'
import './ClipsPanel.css'

interface ClipsPanelProps {
  projectId: number
  clips: VideoClip[]
  onClipsChange: (clips: VideoClip[]) => void
  onClipSelect?: (clip: VideoClip) => void
}

export default function ClipsPanel({
  projectId,
  clips,
  onClipsChange,
  onClipSelect
}: ClipsPanelProps) {
  const [selectedClipId, setSelectedClipId] = useState<number | undefined>()
  const [showUploader, setShowUploader] = useState(clips.length === 0)

  useEffect(() => {
    // Show uploader if no clips
    if (clips.length === 0) {
      setShowUploader(true)
    }
  }, [clips.length])

  const handleClipsUploaded = (newClips: VideoClip[]) => {
    onClipsChange([...clips, ...newClips])
    setShowUploader(false)
  }

  const handleClipSelect = (clip: VideoClip) => {
    setSelectedClipId(clip.id)
    onClipSelect?.(clip)
  }

  return (
    <div className="clips-panel">
      <div className="panel-header">
        <h3>
          <Film size={18} />
          Video Clips
        </h3>
        {clips.length > 0 && (
          <button
            className="toggle-uploader-btn"
            onClick={() => setShowUploader(!showUploader)}
          >
            {showUploader ? 'Hide Uploader' : 'Add More Clips'}
          </button>
        )}
      </div>

      {showUploader && (
        <ClipUploader
          projectId={projectId}
          onClipsUploaded={handleClipsUploaded}
        />
      )}

      <ClipList
        projectId={projectId}
        clips={clips}
        onClipsChange={onClipsChange}
        onClipSelect={handleClipSelect}
        selectedClipId={selectedClipId}
      />

      {clips.length > 1 && (
        <div className="clips-hint">
          <Layers size={14} />
          <span>Drag clips to reorder. Clips will be stitched in this order.</span>
        </div>
      )}
    </div>
  )
}
