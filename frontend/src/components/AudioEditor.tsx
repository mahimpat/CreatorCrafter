/**
 * AudioEditor - Combined SFX and BGM management panel
 * Shows both types of AI suggestions together for easy comparison
 */
import { useState, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import {
  Trash2,
  Wand2,
  Play,
  Pause,
  Volume2,
  Music,
  Upload,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  Gauge,
  AudioWaveform
} from 'lucide-react'
import { BackgroundAudio, projectsApi, BGMSuggestion } from '../api'
import { useToast } from './Toast'
import './AudioEditor.css'

interface SFXSuggestion {
  timestamp: number
  prompt: string
  reason?: string
  visual_context?: string
  type?: string
  confidence?: number
  duration_hint?: number
}

interface AudioEditorProps {
  projectId: number
  bgmTracks: BackgroundAudio[]
  onBGMChange: (tracks: BackgroundAudio[]) => void
  suggestedSFX?: SFXSuggestion[]
  suggestedBGM?: BGMSuggestion[]
}

export default function AudioEditor({
  projectId,
  bgmTracks,
  onBGMChange,
  suggestedSFX = [],
  suggestedBGM = [],
}: AudioEditorProps) {
  const {
    sfxTracks,
    deleteSFXTrack,
    currentTime,
    generateSFX,
    getSFXStreamUrl
  } = useProject()

  const { showError, showSuccess, showWarning, showInfo } = useToast()

  // SFX state
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(3)
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null)

  // BGM state
  const [isUploading, setIsUploading] = useState(false)
  const [playingBgmId, setPlayingBgmId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // UI state
  const [showSFXSuggestions, setShowSFXSuggestions] = useState(true)
  const [showBGMSuggestions, setShowBGMSuggestions] = useState(true)
  const [activeSection, setActiveSection] = useState<'suggestions' | 'generate' | 'tracks'>('suggestions')

  // SFX handlers
  const handleGenerateSFX = async () => {
    if (!prompt) return

    try {
      setIsGenerating(true)
      await generateSFX(prompt, duration)
      setPrompt('')
      showSuccess('SFX generated successfully!')
    } catch (error) {
      console.error('Error generating SFX:', error)
      showError('Failed to generate SFX. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUseSFXSuggestion = async (suggestion: SFXSuggestion, index: number) => {
    try {
      setGeneratingIndex(index)
      await generateSFX(suggestion.prompt, suggestion.duration_hint || duration)
      showSuccess('SFX generated successfully!')
    } catch (error) {
      console.error('Error generating suggested SFX:', error)
      showError('Failed to generate SFX. Please try again.')
    } finally {
      setGeneratingIndex(null)
    }
  }

  const playSFXPreview = (filename: string) => {
    const url = getSFXStreamUrl(filename)
    const audio = new Audio(url)
    audio.play()
  }

  // BGM handlers
  const handleBGMUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleDeleteBGM = async (bgmId: number) => {
    if (!confirm('Remove this background audio?')) return

    try {
      await projectsApi.deleteBGM(projectId, bgmId)
      onBGMChange(bgmTracks.filter(t => t.id !== bgmId))
    } catch (error) {
      console.error('Failed to delete BGM:', error)
    }
  }

  const handleBGMVolumeChange = async (bgmId: number, volume: number) => {
    try {
      const response = await projectsApi.updateBGM(projectId, bgmId, { volume })
      onBGMChange(bgmTracks.map(t => t.id === bgmId ? response.data : t))
    } catch (error) {
      console.error('Failed to update volume:', error)
    }
  }

  const toggleBGMPlay = (track: BackgroundAudio) => {
    if (playingBgmId === track.id) {
      audioRef.current?.pause()
      setPlayingBgmId(null)
    } else {
      const token = localStorage.getItem('access_token')
      const url = `/api/files/${projectId}/stream/bgm/${track.filename}${token ? `?token=${encodeURIComponent(token)}` : ''}`

      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.play()
      } else {
        audioRef.current = new Audio(url)
        audioRef.current.play()
        audioRef.current.onended = () => setPlayingBgmId(null)
      }
      setPlayingBgmId(track.id)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const hasSuggestions = suggestedSFX.length > 0 || suggestedBGM.length > 0

  return (
    <div className="audio-editor">
      <div className="editor-header">
        <h3>
          <AudioWaveform size={18} />
          Audio
        </h3>
      </div>

      {/* Section Tabs */}
      <div className="section-tabs">
        <button
          className={activeSection === 'suggestions' ? 'active' : ''}
          onClick={() => setActiveSection('suggestions')}
        >
          <Sparkles size={14} />
          AI Suggestions
          {hasSuggestions && <span className="badge">{suggestedSFX.length + suggestedBGM.length}</span>}
        </button>
        <button
          className={activeSection === 'generate' ? 'active' : ''}
          onClick={() => setActiveSection('generate')}
        >
          <Wand2 size={14} />
          Generate
        </button>
        <button
          className={activeSection === 'tracks' ? 'active' : ''}
          onClick={() => setActiveSection('tracks')}
        >
          <Volume2 size={14} />
          Tracks
          {(sfxTracks.length + bgmTracks.length) > 0 && (
            <span className="badge">{sfxTracks.length + bgmTracks.length}</span>
          )}
        </button>
      </div>

      <div className="section-content">
        {/* ===== AI SUGGESTIONS SECTION ===== */}
        {activeSection === 'suggestions' && (
          <div className="suggestions-section">
            {!hasSuggestions ? (
              <div className="empty-state">
                <Sparkles size={32} />
                <p className="empty-title">No suggestions yet</p>
                <p className="empty-message">
                  Analyze your video to get AI-powered SFX and BGM suggestions
                </p>
              </div>
            ) : (
              <>
                {/* SFX Suggestions */}
                {suggestedSFX.length > 0 && (
                  <div className="suggestion-group">
                    <button
                      className="group-header"
                      onClick={() => setShowSFXSuggestions(!showSFXSuggestions)}
                    >
                      <div className="group-title">
                        <Volume2 size={16} />
                        <span>Sound Effects</span>
                        <span className="count">{suggestedSFX.length}</span>
                      </div>
                      {showSFXSuggestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showSFXSuggestions && (
                      <div className="suggestion-list">
                        {suggestedSFX.map((suggestion: SFXSuggestion, index: number) => (
                          <div key={index} className="suggestion-item sfx">
                            <div className="suggestion-content">
                              <div className="suggestion-meta">
                                <span className="suggestion-type">
                                  {suggestion.type || 'sfx'}
                                </span>
                                <span className="suggestion-time">
                                  {suggestion.timestamp.toFixed(1)}s
                                </span>
                                {suggestion.confidence && (
                                  <span className="suggestion-confidence">
                                    {Math.round(suggestion.confidence * 100)}%
                                  </span>
                                )}
                              </div>
                              <p className="suggestion-prompt">{suggestion.prompt}</p>
                              {suggestion.reason && (
                                <p className="suggestion-reason">{suggestion.reason}</p>
                              )}
                            </div>
                            <button
                              className="use-btn"
                              onClick={() => handleUseSFXSuggestion(suggestion, index)}
                              disabled={generatingIndex !== null}
                            >
                              {generatingIndex === index ? (
                                <span className="spinner small"></span>
                              ) : (
                                <>
                                  <Wand2 size={14} />
                                  Generate
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* BGM Suggestions */}
                {suggestedBGM.length > 0 && (
                  <div className="suggestion-group">
                    <button
                      className="group-header"
                      onClick={() => setShowBGMSuggestions(!showBGMSuggestions)}
                    >
                      <div className="group-title">
                        <Music size={16} />
                        <span>Background Music</span>
                        <span className="count">{suggestedBGM.length}</span>
                      </div>
                      {showBGMSuggestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showBGMSuggestions && (
                      <div className="suggestion-list">
                        {suggestedBGM.map((suggestion, idx) => (
                          <div key={idx} className={`suggestion-item bgm ${suggestion.type}`}>
                            <div className="suggestion-content">
                              <div className="suggestion-meta">
                                <span className="suggestion-type">
                                  {suggestion.type === 'primary' && <Zap size={12} />}
                                  {suggestion.type}
                                </span>
                                <span className="suggestion-confidence">
                                  {Math.round(suggestion.confidence * 100)}%
                                </span>
                              </div>

                              <div className="bgm-details">
                                <div className="detail-chip mood">{suggestion.mood}</div>
                                <div className="detail-chip genre">{suggestion.genre}</div>
                                <div className="detail-chip tempo">
                                  {suggestion.tempo_range[0]}-{suggestion.tempo_range[1]} BPM
                                </div>
                                <div className={`detail-chip energy ${suggestion.energy_level}`}>
                                  <Gauge size={10} />
                                  {suggestion.energy_level}
                                </div>
                              </div>

                              <p className="suggestion-reason">{suggestion.reason}</p>

                              {suggestion.generation_prompt && (
                                <div className="generation-prompt">
                                  <code>{suggestion.generation_prompt}</code>
                                </div>
                              )}
                            </div>
                            <button
                              className="use-btn"
                              onClick={() => {
                                if (suggestion.generation_prompt) {
                                  navigator.clipboard.writeText(suggestion.generation_prompt)
                                  showInfo('Prompt copied! Use with a music generation service.')
                                }
                              }}
                            >
                              Copy Prompt
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== GENERATE SECTION ===== */}
        {activeSection === 'generate' && (
          <div className="generate-section">
            {/* SFX Generation */}
            <div className="generate-card">
              <h4>
                <Volume2 size={16} />
                Generate Sound Effect
              </h4>
              <p className="card-hint">AI-powered SFX using ElevenLabs</p>

              <textarea
                placeholder="Describe the sound (e.g., 'door creaking', 'footsteps on gravel', 'thunder rumble')"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={3}
              />

              <div className="generate-options">
                <div className="input-group">
                  <label>Duration</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="30"
                    value={duration}
                    onChange={e => setDuration(Math.min(30, parseFloat(e.target.value) || 3))}
                  />
                  <span>sec</span>
                </div>

                <div className="input-group">
                  <label>Insert at</label>
                  <input
                    type="text"
                    value={`${currentTime.toFixed(2)}s`}
                    disabled
                  />
                </div>
              </div>

              <button
                className="generate-btn"
                onClick={handleGenerateSFX}
                disabled={!prompt || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <span className="spinner"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Generate SFX
                  </>
                )}
              </button>
            </div>

            {/* BGM Upload */}
            <div className="generate-card">
              <h4>
                <Music size={16} />
                Add Background Music
              </h4>
              <p className="card-hint">Upload your own music or ambient audio</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleBGMUpload}
                style={{ display: 'none' }}
              />

              <button
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload size={16} />
                {isUploading ? 'Uploading...' : 'Upload Audio File'}
              </button>
            </div>
          </div>
        )}

        {/* ===== TRACKS SECTION ===== */}
        {activeSection === 'tracks' && (
          <div className="tracks-section">
            {/* SFX Tracks */}
            <div className="tracks-group">
              <h4>
                <Volume2 size={16} />
                Sound Effects ({sfxTracks.length})
              </h4>

              {sfxTracks.length === 0 ? (
                <div className="empty-tracks">
                  <p>No sound effects added yet</p>
                </div>
              ) : (
                <div className="tracks-list">
                  {sfxTracks.map(track => (
                    <div key={track.id} className="track-item sfx">
                      <div className="track-info">
                        <p className="track-name">
                          {track.prompt || track.filename || 'SFX Track'}
                        </p>
                        <span className="track-time">
                          {track.start_time.toFixed(1)}s - {(track.start_time + track.duration).toFixed(1)}s
                        </span>
                      </div>
                      <div className="track-actions">
                        {track.filename && (
                          <button
                            onClick={() => playSFXPreview(track.filename)}
                            title="Preview"
                          >
                            <Play size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteSFXTrack(track.id)}
                          title="Delete"
                          className="delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BGM Tracks */}
            <div className="tracks-group">
              <h4>
                <Music size={16} />
                Background Music ({bgmTracks.length})
              </h4>

              {bgmTracks.length === 0 ? (
                <div className="empty-tracks">
                  <p>No background music added yet</p>
                </div>
              ) : (
                <div className="tracks-list">
                  {bgmTracks.map(track => (
                    <div key={track.id} className="track-item bgm">
                      <div className="track-main">
                        <button
                          className="play-btn"
                          onClick={() => toggleBGMPlay(track)}
                        >
                          {playingBgmId === track.id ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <div className="track-info">
                          <p className="track-name">{track.original_name || track.filename}</p>
                          <span className="track-time">
                            <Clock size={10} />
                            {formatDuration(track.duration)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteBGM(track.id)}
                          title="Delete"
                          className="delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="track-volume">
                        <Volume2 size={12} />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={track.volume}
                          onChange={(e) => handleBGMVolumeChange(track.id, parseFloat(e.target.value))}
                        />
                        <span>{Math.round(track.volume * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
