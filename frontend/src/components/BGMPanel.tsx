/**
 * BGMPanel - Background music management panel
 */
import { useState, useRef } from 'react'
import {
  Music,
  Upload,
  Play,
  Pause,
  Trash2,
  Volume2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
  Gauge
} from 'lucide-react'
import { BackgroundAudio, projectsApi, BGMSuggestion } from '../api'
import { useToast } from './Toast'
import './BGMPanel.css'

interface BGMPanelProps {
  projectId: number
  bgmTracks: BackgroundAudio[]
  onBGMChange: (tracks: BackgroundAudio[]) => void
  videoDuration?: number
  suggestedBGM?: BGMSuggestion[]
}

export default function BGMPanel({
  projectId,
  bgmTracks,
  onBGMChange,
  suggestedBGM = [],
}: BGMPanelProps) {
  const { showError, showWarning, showSuccess, showInfo } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      showWarning('Please select an audio file')
      return
    }

    setIsUploading(true)
    try {
      const response = await projectsApi.uploadBGM(projectId, file)
      onBGMChange([...bgmTracks, response.data])
      showSuccess('Audio uploaded successfully!')
    } catch (error) {
      console.error('Failed to upload BGM:', error)
      showError('Failed to upload audio file')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (bgmId: number) => {
    if (!confirm('Remove this background audio?')) return

    try {
      await projectsApi.deleteBGM(projectId, bgmId)
      onBGMChange(bgmTracks.filter(t => t.id !== bgmId))
    } catch (error) {
      console.error('Failed to delete BGM:', error)
    }
  }

  const handleVolumeChange = async (bgmId: number, volume: number) => {
    try {
      const response = await projectsApi.updateBGM(projectId, bgmId, { volume })
      onBGMChange(bgmTracks.map(t => t.id === bgmId ? response.data : t))
    } catch (error) {
      console.error('Failed to update volume:', error)
    }
  }

  const handleFadeChange = async (bgmId: number, fadeIn: number, fadeOut: number) => {
    try {
      const response = await projectsApi.updateBGM(projectId, bgmId, { fade_in: fadeIn, fade_out: fadeOut })
      onBGMChange(bgmTracks.map(t => t.id === bgmId ? response.data : t))
    } catch (error) {
      console.error('Failed to update fade:', error)
    }
  }

  const togglePlay = (track: BackgroundAudio) => {
    if (playingId === track.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      // Build URL with auth token
      const token = localStorage.getItem('access_token')
      const url = `/api/files/${projectId}/stream/bgm/${track.filename}${token ? `?token=${encodeURIComponent(token)}` : ''}`

      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.play()
      } else {
        audioRef.current = new Audio(url)
        audioRef.current.play()
        audioRef.current.onended = () => setPlayingId(null)
      }
      setPlayingId(track.id)
    }
  }

  return (
    <div className="bgm-panel">
      <div className="panel-header">
        <h4>
          <Music size={16} />
          Background Audio
        </h4>
        <button
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload size={14} />
          {isUploading ? 'Uploading...' : 'Add Audio'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* AI BGM Suggestions */}
      {suggestedBGM && suggestedBGM.length > 0 && (
        <div className="bgm-suggestions-section">
          <button
            className="suggestions-toggle"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            <Sparkles size={14} />
            <span>AI Music Suggestions ({suggestedBGM.length})</span>
            {showSuggestions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showSuggestions && (
            <div className="suggestions-list">
              {suggestedBGM.map((suggestion, idx) => (
                <div
                  key={idx}
                  className={`suggestion-item ${suggestion.type}`}
                >
                  <div className="suggestion-header">
                    <span className="suggestion-type-badge">
                      {suggestion.type === 'primary' && <Zap size={12} />}
                      {suggestion.type}
                    </span>
                    <span className="suggestion-confidence">
                      {Math.round(suggestion.confidence * 100)}% match
                    </span>
                  </div>

                  <div className="suggestion-details">
                    <div className="detail-row">
                      <span className="detail-label">Mood</span>
                      <span className="detail-value mood">{suggestion.mood}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Genre</span>
                      <span className="detail-value genre">{suggestion.genre}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Tempo</span>
                      <span className="detail-value tempo">
                        {suggestion.tempo_range[0]}-{suggestion.tempo_range[1]} BPM
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Energy</span>
                      <span className={`detail-value energy ${suggestion.energy_level}`}>
                        <Gauge size={12} />
                        {suggestion.energy_level}
                      </span>
                    </div>
                  </div>

                  <p className="suggestion-reason">{suggestion.reason}</p>

                  {suggestion.generation_prompt && (
                    <div className="generation-prompt">
                      <span className="prompt-label">AI Generation Prompt:</span>
                      <code>{suggestion.generation_prompt}</code>
                    </div>
                  )}

                  <button
                    className="apply-suggestion-btn"
                    onClick={() => {
                      // Copy the generation prompt to clipboard
                      if (suggestion.generation_prompt) {
                        navigator.clipboard.writeText(suggestion.generation_prompt)
                        showInfo('Music prompt copied to clipboard!')
                      }
                    }}
                  >
                    <Check size={14} />
                    Copy Prompt
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {bgmTracks.length === 0 ? (
        <div className="empty-state">
          <Music size={32} />
          <p>No background audio added</p>
          <span>Upload music or ambient sounds to enhance your video</span>
        </div>
      ) : (
        <div className="bgm-list">
          {bgmTracks.map(track => (
            <div key={track.id} className="bgm-item">
              <div className="bgm-header">
                <button
                  className="play-btn"
                  onClick={() => togglePlay(track)}
                >
                  {playingId === track.id ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <div className="bgm-info">
                  <span className="bgm-name">{track.original_name || track.filename}</span>
                  <span className="bgm-meta">
                    <Clock size={12} />
                    {formatDuration(track.duration)}
                    {track.source === 'ai_generated' && (
                      <span className="ai-badge">AI Generated</span>
                    )}
                  </span>
                </div>

                <button
                  className="delete-btn"
                  onClick={() => handleDelete(track.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="bgm-controls">
                <div className="control-row">
                  <label>
                    <Volume2 size={12} />
                    Volume
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={track.volume}
                    onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                  />
                  <span>{Math.round(track.volume * 100)}%</span>
                </div>

                <div className="control-row">
                  <label>Fade In</label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={track.fade_in}
                    onChange={(e) => handleFadeChange(track.id, parseFloat(e.target.value), track.fade_out)}
                  />
                  <span>{track.fade_in}s</span>
                </div>

                <div className="control-row">
                  <label>Fade Out</label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={track.fade_out}
                    onChange={(e) => handleFadeChange(track.id, track.fade_in, parseFloat(e.target.value))}
                  />
                  <span>{track.fade_out}s</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
