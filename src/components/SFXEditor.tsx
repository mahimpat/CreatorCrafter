import { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import type { SFXTrack } from '../context/ProjectContext'
import './SFXEditor.css'

export default function SFXEditor() {
  const { sfxTracks, addSFXTrack, deleteSFXTrack, currentTime, analysis } = useProject()

  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(2)

  const handleGenerateSFX = async () => {
    if (!prompt) return

    try {
      setIsGenerating(true)

      const sfxPath = await window.electronAPI.generateSFX(prompt, duration)

      const track: SFXTrack = {
        id: `sfx-${Date.now()}`,
        path: sfxPath,
        start: currentTime,
        duration,
        volume: 1,
        prompt
      }

      addSFXTrack(track)
      setPrompt('')
    } catch (error) {
      console.error('Error generating SFX:', error)
      alert(
        'Failed to generate SFX. Make sure Python and AudioCraft are properly installed.'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImportSFX = async () => {
    try {
      const filePath = await window.electronAPI.openFileDialog()

      if (filePath) {
        const track: SFXTrack = {
          id: `sfx-${Date.now()}`,
          path: filePath,
          start: currentTime,
          duration: 2, // Will be updated after loading
          volume: 1
        }

        addSFXTrack(track)
      }
    } catch (error) {
      console.error('Error importing SFX:', error)
      alert('Failed to import SFX file.')
    }
  }

  const handleUseSuggestion = (suggestion: { timestamp: number; prompt: string }) => {
    setPrompt(suggestion.prompt)
    // You could also auto-set the current time to the suggestion timestamp
  }

  return (
    <div className="sfx-editor">
      <div className="editor-header">
        <h3>Sound Effects</h3>
        <button className="btn-small" onClick={handleImportSFX}>
          Import Audio
        </button>
      </div>

      <div className="generate-sfx">
        <h4>Generate with AI (AudioCraft)</h4>

        <textarea
          placeholder="Describe the sound effect (e.g., 'door creaking open slowly')"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
        />

        <div className="input-group">
          <label>Duration (seconds)</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            max="10"
            value={duration}
            onChange={e => setDuration(parseFloat(e.target.value) || 2)}
          />
        </div>

        <button
          className="btn-primary"
          onClick={handleGenerateSFX}
          disabled={!prompt || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate SFX'}
        </button>
      </div>

      {analysis?.suggestedSFX && analysis.suggestedSFX.length > 0 && (
        <div className="sfx-suggestions">
          <h4>AI Suggestions</h4>
          {analysis.suggestedSFX.map((suggestion, index) => (
            <div key={index} className="suggestion-item">
              <div className="suggestion-content">
                <strong>{suggestion.prompt}</strong>
                <span className="suggestion-time">
                  at {suggestion.timestamp.toFixed(2)}s
                </span>
                <p className="suggestion-reason">{suggestion.reason}</p>
              </div>
              <button
                className="btn-small"
                onClick={() => handleUseSuggestion(suggestion)}
              >
                Use
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="sfx-list">
        <h4>SFX Tracks</h4>
        {sfxTracks.map(track => (
          <div key={track.id} className="sfx-item">
            <div className="sfx-content">
              <p>{track.prompt || 'Imported SFX'}</p>
              <span className="sfx-time">
                {track.start.toFixed(2)}s ({track.duration.toFixed(2)}s)
              </span>
            </div>
            <button onClick={() => deleteSFXTrack(track.id)}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  )
}
