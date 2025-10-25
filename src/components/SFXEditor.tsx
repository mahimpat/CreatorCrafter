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

  const handleUseSuggestion = async (suggestion: { timestamp: number; prompt: string }) => {
    try {
      setIsGenerating(true)
      setPrompt(suggestion.prompt)

      // Generate the SFX using AudioCraft
      const sfxPath = await window.electronAPI.generateSFX(suggestion.prompt, duration)

      // Add the SFX track at the suggested timestamp
      const track: SFXTrack = {
        id: `sfx-${Date.now()}`,
        path: sfxPath,
        start: suggestion.timestamp,
        duration,
        volume: 1,
        prompt: suggestion.prompt
      }

      addSFXTrack(track)
      setPrompt('')

      alert(`SFX "${suggestion.prompt}" added to timeline at ${suggestion.timestamp.toFixed(2)}s`)
    } catch (error) {
      console.error('Error generating suggested SFX:', error)
      alert(
        'Failed to generate SFX. Make sure Python and AudioCraft are properly installed.'
      )
    } finally {
      setIsGenerating(false)
    }
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
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Use'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="sfx-list">
        <h4>SFX Tracks</h4>
        {sfxTracks.length === 0 ? (
          <p className="empty-message">No SFX tracks added yet. Use AI suggestions or generate custom SFX above.</p>
        ) : (
          sfxTracks.map(track => (
            <div key={track.id} className="sfx-item">
              <div className="sfx-content">
                <p><strong>{track.prompt || 'Imported SFX'}</strong></p>
                <span className="sfx-time">
                  Start: {track.start.toFixed(2)}s | Duration: {track.duration.toFixed(2)}s
                </span>
                <small className="sfx-tip">Drag on timeline to adjust position</small>
              </div>
              <button onClick={() => deleteSFXTrack(track.id)} title="Delete SFX">🗑️</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
