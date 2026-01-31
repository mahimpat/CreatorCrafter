import { useState, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import { Trash2, Upload, Wand2, Play, Volume2 } from 'lucide-react'
import './SFXEditor.css'

interface SFXSuggestion {
  timestamp: number
  prompt: string
  reason?: string
  visual_context?: string
  action_context?: string
}

export default function SFXEditor() {
  const {
    sfxTracks,
    deleteSFXTrack,
    currentTime,
    analysis,
    generateSFX,
    getSFXStreamUrl
  } = useProject()

  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(3)
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleGenerateSFX = async () => {
    if (!prompt) return

    try {
      setIsGenerating(true)
      await generateSFX(prompt, duration)
      setPrompt('')
    } catch (error) {
      console.error('Error generating SFX:', error)
      alert('Failed to generate SFX. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImportSFX = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // TODO: Implement file upload for SFX
    // For now, show a message
    alert('SFX file upload coming soon. Use AI generation for now.')
    e.target.value = ''
  }

  const handleUseSuggestion = async (suggestion: SFXSuggestion, index: number) => {
    try {
      setGeneratingIndex(index)

      // Use the suggestion prompt for generation
      const finalPrompt = suggestion.prompt
      await generateSFX(finalPrompt, duration)
    } catch (error) {
      console.error('Error generating suggested SFX:', error)
      alert('Failed to generate SFX. Please try again.')
    } finally {
      setGeneratingIndex(null)
    }
  }

  const playPreview = (filename: string) => {
    const url = getSFXStreamUrl(filename)
    const audio = new Audio(url)
    audio.play()
  }

  return (
    <div className="sfx-editor">
      <div className="editor-header">
        <h3>Sound Effects</h3>
        <button
          className="btn-small"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={14} />
          Import Audio
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleImportSFX}
          style={{ display: 'none' }}
        />
      </div>

      <div className="generate-sfx">
        <h4>
          <Wand2 size={16} />
          Generate with AI (ElevenLabs)
        </h4>

        <textarea
          placeholder="Describe the sound effect (e.g., 'door creaking open slowly', 'footsteps on gravel', 'thunder rumble')"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
        />

        <div className="sfx-options">
          <div className="input-group">
            <label>Duration (seconds)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="22"
              value={duration}
              onChange={e => setDuration(Math.min(22, parseFloat(e.target.value) || 3))}
            />
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
          className="btn-primary"
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

      {analysis?.suggestedSFX && analysis.suggestedSFX.length > 0 && (
        <div className="sfx-suggestions">
          <h4>AI Suggestions</h4>
          <p className="suggestions-hint">Based on video analysis</p>
          {analysis.suggestedSFX.map((suggestion: SFXSuggestion, index: number) => (
            <div key={index} className="suggestion-item">
              <div className="suggestion-content">
                <div className="suggestion-header">
                  <strong className="suggestion-scene">{suggestion.reason || 'Sound effect'}</strong>
                  <span className="suggestion-time">
                    at {suggestion.timestamp.toFixed(2)}s
                  </span>
                </div>

                <div className="prompt-preview">
                  <div className="translated-prompt">
                    <span className="prompt-label">Audio:</span>
                    <span className="prompt-text">{suggestion.prompt}</span>
                  </div>
                </div>
              </div>
              <button
                className="btn-small use-btn"
                onClick={() => handleUseSuggestion(suggestion, index)}
                disabled={generatingIndex !== null}
                title={`Generate: ${suggestion.prompt}`}
              >
                {generatingIndex === index ? (
                  <span className="spinner small"></span>
                ) : (
                  'Use'
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="sfx-list">
        <h4>SFX Tracks ({sfxTracks.length})</h4>
        {sfxTracks.length === 0 ? (
          <p className="empty-message">
            No SFX tracks added yet. Use AI suggestions or generate custom SFX above.
          </p>
        ) : (
          sfxTracks.map(track => (
            <div key={track.id} className="sfx-item">
              <div className="sfx-content">
                <div className="sfx-info">
                  <p className="sfx-name">
                    <Volume2 size={14} />
                    {track.prompt || track.filename || 'SFX Track'}
                  </p>
                  <span className="sfx-time">
                    Start: {track.start_time.toFixed(2)}s | Duration: {track.duration.toFixed(2)}s
                  </span>
                </div>
                <small className="sfx-tip">Drag on timeline to adjust position</small>
              </div>
              <div className="sfx-actions">
                {track.filename && (
                  <button
                    onClick={() => playPreview(track.filename)}
                    title="Preview SFX"
                    className="preview-btn"
                  >
                    <Play size={16} />
                  </button>
                )}
                <button
                  onClick={() => deleteSFXTrack(track.id)}
                  title="Delete SFX"
                  className="delete-btn"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
