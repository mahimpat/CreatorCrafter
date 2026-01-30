/**
 * ClipList - Displays video clips with drag-drop reordering
 */
import { useState, useCallback } from 'react'
import { Film, GripVertical, Trash2, Scissors, Clock, Play } from 'lucide-react'
import { VideoClip, projectsApi } from '../api'
import './ClipList.css'

interface ClipListProps {
  projectId: number
  clips: VideoClip[]
  onClipsChange: (clips: VideoClip[]) => void
  onClipSelect?: (clip: VideoClip) => void
  selectedClipId?: number
}

export default function ClipList({
  projectId,
  clips,
  onClipsChange,
  onClipSelect,
  selectedClipId
}: ClipListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = useCallback(async (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    // Reorder clips locally
    const newClips = [...clips]
    const [movedClip] = newClips.splice(draggedIndex, 1)
    newClips.splice(targetIndex, 0, movedClip)

    // Update timeline_order
    const reorderedClips = newClips.map((clip, index) => ({
      ...clip,
      timeline_order: index
    }))

    onClipsChange(reorderedClips)

    // Save to backend
    try {
      await projectsApi.reorderClips(
        projectId,
        reorderedClips.map(c => ({ id: c.id, timeline_order: c.timeline_order }))
      )
    } catch (error) {
      console.error('Failed to reorder clips:', error)
    }

    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, clips, projectId, onClipsChange])

  const handleDelete = async (clipId: number) => {
    if (!confirm('Delete this clip?')) return

    try {
      await projectsApi.deleteClip(projectId, clipId)
      onClipsChange(clips.filter(c => c.id !== clipId))
    } catch (error) {
      console.error('Failed to delete clip:', error)
    }
  }

  const getTotalDuration = () => {
    return clips.reduce((total, clip) => {
      const effectiveDuration = (clip.duration || 0) - clip.start_trim - clip.end_trim
      return total + Math.max(0, effectiveDuration)
    }, 0)
  }

  if (clips.length === 0) {
    return (
      <div className="clip-list empty">
        <Film size={32} />
        <p>No clips uploaded yet</p>
        <span>Upload video clips to get started</span>
      </div>
    )
  }

  return (
    <div className="clip-list">
      <div className="clip-list-header">
        <span>{clips.length} clips</span>
        <span className="total-duration">
          <Clock size={14} />
          {formatDuration(getTotalDuration())} total
        </span>
      </div>

      <div className="clips">
        {clips.map((clip, index) => (
          <div
            key={clip.id}
            className={`clip-item ${selectedClipId === clip.id ? 'selected' : ''} ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(index)}
            onClick={() => onClipSelect?.(clip)}
          >
            <div className="drag-handle">
              <GripVertical size={16} />
            </div>

            <div className="clip-thumbnail">
              <Film size={20} />
              <span className="clip-number">{index + 1}</span>
            </div>

            <div className="clip-info">
              <span className="clip-name">{clip.original_name || clip.filename}</span>
              <div className="clip-meta">
                <span className="duration">
                  <Clock size={12} />
                  {formatDuration(clip.duration)}
                </span>
                {(clip.start_trim > 0 || clip.end_trim > 0) && (
                  <span className="trimmed">
                    <Scissors size={12} />
                    Trimmed
                  </span>
                )}
                {clip.width && clip.height && (
                  <span className="resolution">{clip.width}x{clip.height}</span>
                )}
              </div>
            </div>

            <div className="clip-actions">
              <button
                className="action-btn preview"
                onClick={(e) => { e.stopPropagation(); onClipSelect?.(clip) }}
                title="Preview"
              >
                <Play size={14} />
              </button>
              <button
                className="action-btn delete"
                onClick={(e) => { e.stopPropagation(); handleDelete(clip.id) }}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
