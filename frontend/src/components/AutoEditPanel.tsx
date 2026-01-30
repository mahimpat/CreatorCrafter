/**
 * AutoEditPanel - Simplified UI for automatic mode
 * Shows AI-generated edit suggestions and one-click video generation
 */
import { useState } from 'react'
import {
  Wand2,
  Sparkles,
  Check,
  X,
  Clock,
  Film,
  Music,
  Subtitles,
  RefreshCw,
  Play
} from 'lucide-react'
import './AutoEditPanel.css'

interface Suggestion {
  id: string
  type: 'transition' | 'sfx' | 'subtitle' | 'bgm'
  description: string
  timestamp?: number
  applied: boolean
}

interface AutoEditPanelProps {
  isAnalyzing: boolean
  hasVideo: boolean
  onAnalyze: () => void
  onGenerate: () => void
}

export default function AutoEditPanel({
  isAnalyzing,
  hasVideo,
  onAnalyze,
  onGenerate
}: AutoEditPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleAcceptAll = () => {
    setSuggestions(prev => prev.map(s => ({ ...s, applied: true })))
  }

  const handleToggleSuggestion = (id: string) => {
    setSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, applied: !s.applied } : s)
    )
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setProgress(0)

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsGenerating(false)
          return 100
        }
        return prev + 10
      })
    }, 500)

    onGenerate()
  }

  const getTypeIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'transition': return <Film size={14} />
      case 'sfx': return <Music size={14} />
      case 'subtitle': return <Subtitles size={14} />
      case 'bgm': return <Music size={14} />
    }
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="auto-edit-panel">
      {!hasVideo ? (
        <div className="auto-empty-state">
          <Wand2 size={48} />
          <h3>Upload Video to Start</h3>
          <p>Upload your video clips and let AI handle the editing</p>
        </div>
      ) : isGenerating ? (
        <div className="generating-state">
          <div className="progress-circle">
            <RefreshCw size={32} className="spin" />
          </div>
          <h3>Generating Your Video...</h3>
          <p>AI is creating your masterpiece</p>
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      ) : (
        <>
          <div className="auto-header">
            <h3>
              <Sparkles size={18} />
              AI Auto-Edit
            </h3>
            <p>Let AI analyze and edit your video automatically</p>
          </div>

          <div className="auto-actions">
            <button
              className="analyze-btn"
              onClick={onAnalyze}
              disabled={isAnalyzing}
            >
              <Sparkles size={18} />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
            </button>

            {suggestions.length > 0 && (
              <button className="accept-all-btn" onClick={handleAcceptAll}>
                <Check size={18} />
                Accept All Suggestions
              </button>
            )}
          </div>

          {suggestions.length > 0 ? (
            <div className="suggestions-list">
              <h4>AI Suggestions</h4>
              {suggestions.map(suggestion => (
                <div
                  key={suggestion.id}
                  className={`suggestion-item ${suggestion.applied ? 'applied' : ''}`}
                  onClick={() => handleToggleSuggestion(suggestion.id)}
                >
                  <div className="suggestion-icon">
                    {getTypeIcon(suggestion.type)}
                  </div>
                  <div className="suggestion-content">
                    <span className="suggestion-desc">{suggestion.description}</span>
                    {suggestion.timestamp && (
                      <span className="suggestion-time">
                        <Clock size={12} />
                        {formatTime(suggestion.timestamp)}
                      </span>
                    )}
                  </div>
                  <div className="suggestion-toggle">
                    {suggestion.applied ? (
                      <Check size={16} className="check" />
                    ) : (
                      <X size={16} className="cross" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-suggestions">
              <p>Click "Analyze Video" to get AI suggestions</p>
            </div>
          )}

          <div className="generate-section">
            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={isAnalyzing}
            >
              <Play size={20} />
              Generate Final Video
            </button>
            <span className="generate-hint">
              AI will automatically add transitions, SFX, subtitles, and background music
            </span>
          </div>
        </>
      )}
    </div>
  )
}
