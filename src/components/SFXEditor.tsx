import { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import type { SFXTrack } from '../context/ProjectContext'
import { Trash2, Wand2, Library, Music } from 'lucide-react'
import FreesoundLibrary from './FreesoundLibrary'
import './SFXEditor.css'

export default function SFXEditor() {
  const { sfxTracks, addSFXTrack, deleteSFXTrack, sfxLibrary, addSFXToLibrary, removeSFXFromLibrary, currentTime, analysis, projectPath } = useProject()

  const [activeTab, setActiveTab] = useState<'generate' | 'library' | 'freesound' | 'tracks'>('generate')
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(2)
  const [modelType, setModelType] = useState<'audiogen' | 'musicgen'>('audiogen')

  const handleGenerateSFX = async () => {
    if (!prompt) return

    try {
      setIsGenerating(true)

      let sfxPath = await window.electronAPI.generateSFX(prompt, duration, modelType)

      // Copy to project folder if project exists
      if (projectPath) {
        try {
          const relativePath = await window.electronAPI.copyAssetToProject(
            sfxPath,
            projectPath,
            'sfx'
          )
          // Resolve to absolute path for playback
          sfxPath = await window.electronAPI.resolveProjectPath(projectPath, relativePath)
        } catch (err) {
          console.error('Failed to copy SFX to project folder:', err)
          // Continue with temp path if copy fails
        }
      }

      // Add to library for drag-and-drop reuse
      const libraryItem: import('../context/ProjectContext').SFXLibraryItem = {
        id: `sfx-${Date.now()}`,
        path: sfxPath,
        prompt,
        duration,
        createdAt: Date.now()
      }

      addSFXToLibrary(libraryItem)
      setPrompt('')

      alert(`SFX "${prompt}" generated! Drag from "Library" tab to timeline to use it.`)
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
      let filePath = await window.electronAPI.openFileDialog()

      if (filePath) {
        // Copy to project folder if project exists
        if (projectPath) {
          try {
            const relativePath = await window.electronAPI.copyAssetToProject(
              filePath,
              projectPath,
              'sfx'
            )
            // Resolve to absolute path for playback
            filePath = await window.electronAPI.resolveProjectPath(projectPath, relativePath)
          } catch (err) {
            console.error('Failed to copy imported SFX to project folder:', err)
            // Continue with original path if copy fails
          }
        }

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

  const handleUseSuggestion = async (suggestion: {
    timestamp: number;
    prompt: string;
    reason?: string;
    visual_context?: string;
    action_context?: string;
  }) => {
    try {
      setIsGenerating(true)

      // Use the backend prompt directly (Week 1-3: Dynamic prompts from smart analysis)
      // The backend now generates high-quality, context-aware prompts with:
      // - Direct use of BLIP visual descriptions
      // - Mood and energy context
      // - No static keyword matching
      const finalPrompt = suggestion.prompt
      setPrompt(finalPrompt)

      console.log('Using backend prompt:', {
        prompt: finalPrompt,
        timestamp: suggestion.timestamp,
        confidence: suggestion.confidence,
        reason: suggestion.reason
      })

      // Generate the SFX using AudioCraft with the optimized prompt
      let sfxPath = await window.electronAPI.generateSFX(finalPrompt, duration, modelType)

      // Copy to project folder if project exists
      if (projectPath) {
        try {
          const relativePath = await window.electronAPI.copyAssetToProject(
            sfxPath,
            projectPath,
            'sfx'
          )
          // Resolve to absolute path for playback
          sfxPath = await window.electronAPI.resolveProjectPath(projectPath, relativePath)
        } catch (err) {
          console.error('Failed to copy suggested SFX to project folder:', err)
          // Continue with temp path if copy fails
        }
      }

      // Add to library for reuse
      const libraryItem: import('../context/ProjectContext').SFXLibraryItem = {
        id: `sfx-lib-${Date.now()}`,
        path: sfxPath,
        prompt: finalPrompt,
        duration,
        createdAt: Date.now()
      }
      addSFXToLibrary(libraryItem)

      // Add the SFX track at the suggested timestamp
      const track: SFXTrack = {
        id: `sfx-${Date.now()}`,
        path: sfxPath,
        start: suggestion.timestamp,
        duration,
        volume: 1,
        prompt: finalPrompt
      }

      addSFXTrack(track)
      setPrompt('')

      // Show success message
      alert(`SFX "${finalPrompt}" generated and added to timeline at ${suggestion.timestamp.toFixed(2)}s. Also saved to "My SFX" library for reuse!`)
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

      {/* Tabs */}
      <div className="sfx-tabs">
        <button
          className={`sfx-tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          <Wand2 size={16} />
          Generate AI
        </button>
        <button
          className={`sfx-tab ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          <Library size={16} />
          My SFX ({sfxLibrary?.length || 0})
        </button>
        <button
          className={`sfx-tab ${activeTab === 'freesound' ? 'active' : ''}`}
          onClick={() => setActiveTab('freesound')}
        >
          <Library size={16} />
          FreeSound
        </button>
        <button
          className={`sfx-tab ${activeTab === 'tracks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracks')}
        >
          <Music size={16} />
          Timeline ({sfxTracks.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="sfx-tab-content">
        {activeTab === 'generate' && (
          <div className="generate-tab">

            <div className="generate-sfx">
        <h4>Generate with AI (AudioCraft)</h4>

        <textarea
          placeholder="Describe the sound effect (e.g., 'door creaking open slowly')"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
        />

        <div className="input-group">
          <label>Model Type</label>
          <select
            value={modelType}
            onChange={e => setModelType(e.target.value as 'audiogen' | 'musicgen')}
          >
            <option value="audiogen">AudioGen (Sound Effects & Foley)</option>
            <option value="musicgen">MusicGen (Background Music)</option>
          </select>
          <small className="help-text">
            {modelType === 'audiogen'
              ? 'Best for realistic sound effects, foley, impacts, and environmental sounds'
              : 'Best for background music, melodies, and musical transitions'}
          </small>
        </div>

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
          {analysis.suggestedSFX.map((suggestion, index) => {
            // Use backend prompt directly (no frontend translation needed)
            // Backend now generates high-quality dynamic prompts
            return (
              <div key={index} className="suggestion-item">
                <div className="suggestion-content">
                  <div className="suggestion-header">
                    <strong className="suggestion-scene">{suggestion.reason}</strong>
                    <span className="suggestion-time">
                      at {suggestion.timestamp.toFixed(2)}s
                    </span>
                  </div>

                  <div className="prompt-preview">
                    <div className="translated-prompt">
                      <span className="prompt-label">Audio Prompt:</span>
                      <span className="prompt-text">{suggestion.prompt}</span>
                      <span className={`confidence ${suggestion.confidence > 0.7 ? 'high' : suggestion.confidence > 0.5 ? 'medium' : 'low'}`}>
                        {Math.round((suggestion.confidence || 0.7) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className="btn-small"
                  onClick={() => handleUseSuggestion(suggestion)}
                  disabled={isGenerating}
                  title={`Generate: ${suggestion.prompt}`}
                >
                  {isGenerating ? 'Generating...' : 'Use'}
                </button>
              </div>
            )
            })}
              </div>
            )}

            {/* Music Suggestions Section (Week 3) */}
            {analysis?.suggestedMusic && analysis.suggestedMusic.length > 0 && (
              <div className="music-suggestions" style={{ marginTop: '2rem' }}>
                <h4>🎵 Background Music Suggestions</h4>
                <p style={{ fontSize: '0.9em', opacity: 0.8, marginBottom: '1rem' }}>
                  Mood and energy-matched music for each scene
                </p>
                {analysis.suggestedMusic.map((music, index) => (
                  <div key={index} className="suggestion-item" style={{ borderLeft: '3px solid #9333ea' }}>
                    <div className="suggestion-content">
                      <div className="suggestion-header">
                        <strong className="suggestion-scene">
                          Scene {music.scene_id} ({music.duration.toFixed(1)}s)
                        </strong>
                        <span className="suggestion-time">
                          at {music.timestamp.toFixed(2)}s
                        </span>
                      </div>

                      <div className="prompt-preview">
                        <div className="translated-prompt">
                          <span className="prompt-label">Music Prompt:</span>
                          <span className="prompt-text">{music.prompt}</span>
                          <span className={`confidence ${music.confidence > 0.7 ? 'high' : music.confidence > 0.5 ? 'medium' : 'low'}`}>
                            {Math.round(music.confidence * 100)}%
                          </span>
                        </div>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.85em', opacity: 0.7 }}>
                          <span style={{ marginRight: '1rem' }}>🎭 Mood: {music.mood}</span>
                          <span style={{ marginRight: '1rem' }}>⚡ Energy: {music.energy_level}/10</span>
                          <span style={{ marginRight: '1rem' }}>🎸 Genre: {music.genre}</span>
                          <span>🥁 Tempo: {music.tempo}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-small"
                      onClick={async () => {
                        try {
                          setIsGenerating(true)
                          setPrompt(music.prompt)

                          // Use MusicGen for background music (not AudioGen)
                          const musicPath = await window.electronAPI.generateSFX(
                            music.prompt,
                            music.duration,
                            'musicgen' // Week 3: Always use MusicGen for background music
                          )

                          // Copy to project folder
                          if (projectPath) {
                            try {
                              const relativePath = await window.electronAPI.copyAssetToProject(musicPath, projectPath, 'audio')
                              console.log('Music copied to project:', relativePath)

                              // Resolve to absolute path for playback
                              const absolutePath = await window.electronAPI.resolveProjectPath(projectPath, relativePath)

                              addSFXTrack({
                                id: `sfx-${Date.now()}`,
                                path: absolutePath,  // Use 'path' not 'audioPath'
                                start: music.timestamp,  // Use 'start' not 'timestamp'
                                duration: music.duration,
                                volume: 0.5,  // Lower volume for background music
                                prompt: `Music: ${music.description}`
                              })
                            } catch (err) {
                              console.error('Failed to copy music to project:', err)
                              alert(`Failed to copy music to project: ${err}`)
                              throw err
                            }
                          } else {
                            // No project - warn user
                            console.warn('No project open - music track will use temp file path:', musicPath)
                            alert('Warning: No project is open. Please create or open a project to properly save generated music.')
                            // Don't add the track if no project is open
                            return
                          }
                        } catch (error: any) {
                          console.error('Music generation failed:', error)
                          alert(`Failed to generate music: ${error?.message || 'Unknown error'}`)
                        } finally {
                          setIsGenerating(false)
                        }
                      }}
                      disabled={isGenerating}
                      title={`Generate with MusicGen: ${music.prompt}`}
                      style={{ background: '#9333ea' }}
                    >
                      {isGenerating ? 'Generating...' : 'Use MusicGen'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'library' && (
          <div className="library-tab">
            <h4>My Generated SFX Library</h4>
            <p style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '1rem' }}>
              Drag any SFX to the timeline to use it
            </p>
            {!sfxLibrary || sfxLibrary.length === 0 ? (
              <p className="empty-message">No SFX generated yet. Generate custom SFX in the "Generate AI" tab.</p>
            ) : (
              <div className="sfx-library-grid">
                {sfxLibrary.map(item => (
                  <div
                    key={item.id}
                    className="library-item"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('sfx-library-item', JSON.stringify(item))
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                  >
                    <div className="library-item-content">
                      <Music size={24} />
                      <p><strong>{item.prompt}</strong></p>
                      <span className="library-item-info">
                        {item.duration.toFixed(1)}s
                      </span>
                    </div>
                    <button
                      onClick={() => removeSFXFromLibrary(item.id)}
                      title="Remove from library"
                      className="delete-btn-small"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'freesound' && (
          <div className="library-tab">
            <FreesoundLibrary />
          </div>
        )}

        {activeTab === 'tracks' && (
          <div className="tracks-tab">
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
              <button onClick={() => deleteSFXTrack(track.id)} title="Delete SFX" className="delete-btn">
                <Trash2 size={16} />
              </button>
            </div>
              ))
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
