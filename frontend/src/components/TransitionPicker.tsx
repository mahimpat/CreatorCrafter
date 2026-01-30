/**
 * TransitionPicker - Select and configure transitions between clips
 */
import { useState } from 'react'
import {
  Scissors,
  Blend,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  ZoomOut,
  Clock
} from 'lucide-react'
import { Transition, projectsApi } from '../api'
import './TransitionPicker.css'

type TransitionType =
  | 'cut'
  | 'fade'
  | 'dissolve'
  | 'wipe_left'
  | 'wipe_right'
  | 'wipe_up'
  | 'wipe_down'
  | 'slide_left'
  | 'slide_right'
  | 'zoom_in'
  | 'zoom_out'

interface TransitionOption {
  type: TransitionType
  label: string
  icon: React.ReactNode
  description: string
}

const transitionOptions: TransitionOption[] = [
  { type: 'cut', label: 'Cut', icon: <Scissors size={18} />, description: 'Direct cut, no effect' },
  { type: 'fade', label: 'Fade', icon: <Blend size={18} />, description: 'Fade through black' },
  { type: 'dissolve', label: 'Dissolve', icon: <Blend size={18} />, description: 'Cross-dissolve blend' },
  { type: 'wipe_left', label: 'Wipe Left', icon: <ArrowLeft size={18} />, description: 'Wipe from right to left' },
  { type: 'wipe_right', label: 'Wipe Right', icon: <ArrowRight size={18} />, description: 'Wipe from left to right' },
  { type: 'wipe_up', label: 'Wipe Up', icon: <ArrowUp size={18} />, description: 'Wipe from bottom to top' },
  { type: 'wipe_down', label: 'Wipe Down', icon: <ArrowDown size={18} />, description: 'Wipe from top to bottom' },
  { type: 'slide_left', label: 'Slide Left', icon: <ArrowLeft size={18} />, description: 'Slide from right' },
  { type: 'slide_right', label: 'Slide Right', icon: <ArrowRight size={18} />, description: 'Slide from left' },
  { type: 'zoom_in', label: 'Zoom In', icon: <ZoomIn size={18} />, description: 'Zoom transition in' },
  { type: 'zoom_out', label: 'Zoom Out', icon: <ZoomOut size={18} />, description: 'Zoom transition out' },
]

interface TransitionPickerProps {
  projectId: number
  fromClipId: number
  toClipId: number
  existingTransition?: Transition
  onTransitionChange: (transition: Transition | null) => void
}

export default function TransitionPicker({
  projectId,
  fromClipId,
  toClipId,
  existingTransition,
  onTransitionChange
}: TransitionPickerProps) {
  const [selectedType, setSelectedType] = useState<TransitionType>(
    (existingTransition?.type as TransitionType) || 'cut'
  )
  const [duration, setDuration] = useState(existingTransition?.duration || 0.5)
  const [isSaving, setIsSaving] = useState(false)

  const handleTypeSelect = async (type: TransitionType) => {
    setSelectedType(type)

    setIsSaving(true)
    try {
      if (existingTransition) {
        // Update existing
        const response = await projectsApi.updateTransition(
          projectId,
          existingTransition.id,
          { type, duration: type === 'cut' ? 0 : duration }
        )
        onTransitionChange(response.data)
      } else {
        // Create new
        const response = await projectsApi.createTransition(projectId, {
          type,
          from_clip_id: fromClipId,
          to_clip_id: toClipId,
          duration: type === 'cut' ? 0 : duration,
          parameters: null
        })
        onTransitionChange(response.data)
      }
    } catch (error) {
      console.error('Failed to save transition:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDurationChange = async (newDuration: number) => {
    setDuration(newDuration)

    if (existingTransition && selectedType !== 'cut') {
      try {
        const response = await projectsApi.updateTransition(
          projectId,
          existingTransition.id,
          { duration: newDuration }
        )
        onTransitionChange(response.data)
      } catch (error) {
        console.error('Failed to update duration:', error)
      }
    }
  }

  const handleRemove = async () => {
    if (!existingTransition) return

    try {
      await projectsApi.deleteTransition(projectId, existingTransition.id)
      onTransitionChange(null)
      setSelectedType('cut')
    } catch (error) {
      console.error('Failed to remove transition:', error)
    }
  }

  return (
    <div className="transition-picker">
      <div className="picker-header">
        <h4>Transition</h4>
        {existingTransition && existingTransition.ai_suggested === 1 && (
          <span className="ai-badge">AI Suggested</span>
        )}
      </div>

      <div className="transition-grid">
        {transitionOptions.map(option => (
          <button
            key={option.type}
            className={`transition-option ${selectedType === option.type ? 'selected' : ''}`}
            onClick={() => handleTypeSelect(option.type)}
            disabled={isSaving}
            title={option.description}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {selectedType !== 'cut' && (
        <div className="duration-control">
          <label>
            <Clock size={14} />
            Duration
          </label>
          <div className="duration-input">
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={duration}
              onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
            />
            <span>{duration.toFixed(1)}s</span>
          </div>
        </div>
      )}

      {existingTransition && (
        <button className="remove-btn" onClick={handleRemove}>
          Remove Transition
        </button>
      )}
    </div>
  )
}
