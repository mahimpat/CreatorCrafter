import { useState, useEffect, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import type { SFXTrack } from '../context/ProjectContext'
import { Trash2, Wand2, Library, Music, Settings, ChevronDown, ChevronUp, Folder } from 'lucide-react'
import FreesoundLibrary from './FreesoundLibrary'
import SFXLibrary from './SFXLibrary'
import toast from 'react-hot-toast'
import './SFXEditor.css'

type SFXProvider = 'elevenlabs'

// Helper function to calculate string similarity (0-1 score)
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  // Exact match
  if (s1 === s2) return 1.0

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8

  // Calculate word overlap
  const words1 = new Set(s1.split(/\s+/))
  const words2 = new Set(s2.split(/\s+/))
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

// Enhanced semantic matching using keywords and context
const calculateSemanticSimilarity = (suggestionPrompt: string, librarySound: LibrarySound): number => {
  const suggestion = suggestionPrompt.toLowerCase().trim()
  const libraryPrompt = librarySound.prompt.toLowerCase().trim()
  const tags = librarySound.tags.map(t => t.toLowerCase())
  const category = librarySound.category.toLowerCase()

  // Extract key descriptive words (filter out common filler words)
  const fillerWords = new Set(['sound', 'effect', 'audio', 'sfx', 'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for'])

  const extractKeywords = (text: string) => {
    return text.split(/[\s,]+/).filter(word =>
      word.length > 2 && !fillerWords.has(word)
    )
  }

  const suggestionKeywords = extractKeywords(suggestion)
  const libraryKeywords = extractKeywords(libraryPrompt)
  const allLibraryKeywords = [...libraryKeywords, ...tags, category]

  // Check for keyword matches
  let matchScore = 0
  let matches = 0

  for (const sugKeyword of suggestionKeywords) {
    for (const libKeyword of allLibraryKeywords) {
      // Exact keyword match
      if (sugKeyword === libKeyword) {
        matchScore += 1.0
        matches++
      }
      // Partial match (one contains the other)
      else if (sugKeyword.includes(libKeyword) || libKeyword.includes(sugKeyword)) {
        matchScore += 0.5
        matches++
      }
    }
  }

  // Normalize by number of suggestion keywords
  if (suggestionKeywords.length === 0) return 0

  return Math.min(1.0, matchScore / suggestionKeywords.length)
}

interface LibrarySound {
  name: string
  prompt: string
  duration: number
  tags: string[]
  category: string
  filePath: string
}

export default function SFXEditor() {
  console.log('[SFXEditor] Component rendered')

  const { sfxTracks, addSFXTrack, deleteSFXTrack, sfxLibrary, addSFXToLibrary, removeSFXFromLibrary, currentTime, analysis, unifiedAnalysis, projectPath } = useProject()

  // Use unified analysis if available, otherwise fall back to legacy analysis
  const sfxSuggestions = unifiedAnalysis?.sfx_suggestions || analysis?.suggestedSFX || []
  const musicSuggestions = unifiedAnalysis?.music_suggestions || analysis?.suggestedMusic || []

  console.log('[SFXEditor] Render - suggestions:', sfxSuggestions?.length, 'unified:', !!unifiedAnalysis, 'legacy:', !!analysis)

  const [activeTab, setActiveTab] = useState<'generate' | 'library' | 'sfxlibrary' | 'freesound' | 'tracks'>('generate')
  const [isGenerating, setIsGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(2)

  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [sfxProvider] = useState<SFXProvider>('elevenlabs')
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState('')
  const [isValidatingKey, setIsValidatingKey] = useState(false)
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null)
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null)
  const [processedSuggestions, setProcessedSuggestions] = useState<Set<string>>(new Set())

  // SFX Library (built-in library) state
  const [builtInLibrary, setBuiltInLibrary] = useState<LibrarySound[]>([])
  const lastProcessedAnalysisRef = useRef<string>('')

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('elevenlabs-api-key')

    if (savedApiKey) {
      setElevenlabsApiKey(savedApiKey)
      // Validate on load
      validateApiKey(savedApiKey)
    }
  }, [])

  // Load built-in SFX Library on mount (for UI display purposes only)
  useEffect(() => {
    const loadBuiltInLibrary = async () => {
      try {
        const result = await window.electronAPI.loadSFXLibrary()

        if (result.success) {
          // Flatten all sounds with category info
          const sounds: LibrarySound[] = []
          Object.entries(result.metadata.categories).forEach(([category, categoryData]: [string, any]) => {
            categoryData.sounds.forEach((sound: any) => {
              sounds.push({
                ...sound,
                category,
                filePath: `sfx_library/${category}/${sound.name}.wav`
              })
            })
          })

          setBuiltInLibrary(sounds)
          console.log(`Loaded ${sounds.length} sounds from built-in SFX library for UI display`)
        }
      } catch (err) {
        console.error('Failed to load built-in SFX library:', err)
      }
    }

    loadBuiltInLibrary()
  }, [])

  // NOTE: Auto-insert logic has been moved to useAutoInsertSFX hook in VideoEditor
  // This ensures SFX are inserted immediately after analysis, not when visiting this tab

  // Save settings to localStorage
  const saveSettings = (apiKey: string) => {
    localStorage.setItem('elevenlabs-api-key', apiKey)
  }

  const validateApiKey = async (key: string) => {
    if (!key) {
      setApiKeyValid(null)
      return
    }

    setIsValidatingKey(true)
    try {
      const result = await window.electronAPI.elevenlabsValidateKey(key)
      setApiKeyValid(result.valid)

      if (result.valid) {
        // Fetch credits if valid
        const creditsResult = await window.electronAPI.elevenlabsGetCredits(key)
        setCreditsRemaining(creditsResult.credits)
        toast.success('API key validated successfully!')
      } else {
        toast.error('Invalid API key. Please check your key at elevenlabs.io')
      }
    } catch (error) {
      console.error('Error validating API key:', error)
      setApiKeyValid(false)
      toast.error('Failed to validate API key')
    } finally {
      setIsValidatingKey(false)
    }
  }

  const handleApiKeyChange = (key: string) => {
    setElevenlabsApiKey(key)
    setApiKeyValid(null)
    saveSettings(key)
  }

  const handleValidateKey = () => {
    validateApiKey(elevenlabsApiKey)
  }

  // Find matching SFX from built-in library based on prompt similarity
  const findMatchingBuiltInLibraryItem = (prompt: string): LibrarySound | null => {
    if (!builtInLibrary || builtInLibrary.length === 0) {
      console.log('[SFX Match] No built-in library loaded')
      return null
    }

    const SIMILARITY_THRESHOLD = 0.3 // Use semantic matching for better results

    let bestMatch: LibrarySound | null = null
    let bestScore = 0

    console.log(`[SFX Match] Finding match for prompt: "${prompt}"`)
    console.log(`[SFX Match] Checking against ${builtInLibrary.length} library sounds`)

    for (const item of builtInLibrary) {
      // Use semantic similarity instead of plain text similarity
      const similarity = calculateSemanticSimilarity(prompt, item)

      if (similarity > 0.1) { // Only log if there's some similarity
        console.log(`[SFX Match] "${item.name}" (${item.category}) = ${similarity.toFixed(2)} - tags: [${item.tags.join(', ')}]`)
      }

      if (similarity > bestScore) {
        bestScore = similarity
        bestMatch = item
      }
    }

    // Only return match if it meets threshold
    if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
      console.log(`[SFX Match] ✓ Found match: "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`)
      return bestMatch
    } else {
      console.log(`[SFX Match] ✗ No match found (best score: ${bestScore.toFixed(2)}, threshold: ${SIMILARITY_THRESHOLD})`)
      return null
    }
  }

  // Check if a suggestion was auto-inserted
  const wasSuggestionAutoInserted = (suggestion: { timestamp: number; prompt: string }): boolean => {
    const libraryMatch = findMatchingBuiltInLibraryItem(suggestion.prompt)
    return libraryMatch !== null
  }

  const handleGenerateSFX = async () => {
    if (!prompt) return

    // Check ElevenLabs API key
    if (!elevenlabsApiKey) {
      toast.error('Please configure your ElevenLabs API key in Settings')
      setShowSettings(true)
      return
    }

    try {
      setIsGenerating(true)
      let sfxPath: string
      let actualDuration = duration
      let creditsUsed = 0

      // Generate with ElevenLabs
      const result = await window.electronAPI.elevenlabsGenerate(prompt, duration, elevenlabsApiKey)

      console.log('ElevenLabs result:', result)

      if (!result.success) {
        throw new Error(result.error || 'ElevenLabs generation failed')
      }

      sfxPath = result.filePath!
      actualDuration = result.duration || duration
      creditsUsed = result.creditsUsed || 0

      // Update credits display
      if (creditsRemaining !== null) {
        setCreditsRemaining(creditsRemaining - creditsUsed)
      }

      toast.success(`Generated! Used ${creditsUsed} credits`)

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
        duration: actualDuration,
        createdAt: Date.now()
      }

      addSFXToLibrary(libraryItem)
      setPrompt('')

      toast.success(`SFX "${prompt}" generated! Drag from "My SFX" tab to timeline.`)
    } catch (error: any) {
      console.error('Error generating SFX:', error)
      toast.error(error?.message || 'Failed to generate SFX')
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
          originalDuration: 2, // Will be updated after loading
          volume: 1
        }

        addSFXTrack(track)
      }
    } catch (error) {
      console.error('Error importing SFX:', error)
      alert('Failed to import SFX file.')
    }
  }

  const handleUseSuggestion = async (
    suggestion: {
      timestamp: number;
      prompt: string;
      reason?: string;
      visual_context?: string;
      action_context?: string;
      confidence?: number;
    }
  ) => {
    try {
      setIsGenerating(true)

      // Use the backend prompt directly (Week 1-3: Dynamic prompts from smart analysis)
      // The backend now generates high-quality, context-aware prompts with:
      // - Direct use of BLIP visual descriptions
      // - Mood and energy context
      // - No static keyword matching
      const finalPrompt = suggestion.prompt
      setPrompt(finalPrompt)

      // Check API key requirement
      if (!elevenlabsApiKey) {
        toast.error('Please configure your ElevenLabs API key in Settings')
        setShowSettings(true)
        return
      }

      console.log('Using backend prompt:', {
        prompt: finalPrompt,
        timestamp: suggestion.timestamp,
        confidence: suggestion.confidence,
        reason: suggestion.reason
      })

      // Generate the SFX using ElevenLabs
      let sfxPath: string
      let actualDuration = duration
      let creditsUsed = 0

      // Generate with ElevenLabs
      const result = await window.electronAPI.elevenlabsGenerate(finalPrompt, duration, elevenlabsApiKey)

      if (!result.success) {
        throw new Error(result.error || 'ElevenLabs generation failed')
      }

      sfxPath = result.filePath!
      actualDuration = result.duration || duration
      creditsUsed = result.creditsUsed || 0

      // Update credits display
      if (creditsRemaining !== null) {
        setCreditsRemaining(creditsRemaining - creditsUsed)
      }

      toast.success(`Generated with ElevenLabs! Used ${creditsUsed} credits`)

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
        duration: actualDuration,
        createdAt: Date.now()
      }
      addSFXToLibrary(libraryItem)

      // Add the SFX track at the suggested timestamp
      const track: SFXTrack = {
        id: `sfx-${Date.now()}`,
        path: sfxPath,
        start: suggestion.timestamp,
        duration: actualDuration,
        originalDuration: actualDuration,  // Store original duration
        volume: 1,
        prompt: finalPrompt
      }

      addSFXTrack(track)
      setPrompt('')

      // Show success message
      toast.success(`SFX added to timeline at ${suggestion.timestamp.toFixed(2)}s and saved to library!`)
    } catch (error: any) {
      console.error('Error generating suggested SFX:', error)
      toast.error(error?.message || 'Failed to generate SFX')
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
          className={`sfx-tab ${activeTab === 'sfxlibrary' ? 'active' : ''}`}
          onClick={() => setActiveTab('sfxlibrary')}
        >
          <Folder size={16} />
          SFX Library
        </button>
        {/* <button
          className={`sfx-tab ${activeTab === 'freesound' ? 'active' : ''}`}
          onClick={() => setActiveTab('freesound')}
        >
          <Library size={16} />
          FreeSound
        </button> */}
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
            {/* Settings Section */}
            <div className="settings-section">
              <button
                className="settings-toggle"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings size={16} />
                <span>SFX Provider Settings</span>
                {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showSettings && (
                <div className="settings-content">
                  <div className="input-group">
                    <label>ElevenLabs API Key</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="password"
                        placeholder="Enter your ElevenLabs API key"
                        value={elevenlabsApiKey}
                        onChange={(e) => handleApiKeyChange(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn-small"
                        onClick={handleValidateKey}
                        disabled={!elevenlabsApiKey || isValidatingKey}
                      >
                        {isValidatingKey ? 'Validating...' : 'Validate'}
                      </button>
                    </div>
                    {apiKeyValid === true && (
                      <small className="help-text" style={{ color: '#22c55e' }}>
                        ✓ API key is valid
                        {creditsRemaining !== null && ` • ${creditsRemaining} credits remaining`}
                      </small>
                    )}
                    {apiKeyValid === false && (
                      <small className="help-text" style={{ color: '#ef4444' }}>
                        ✗ Invalid API key
                      </small>
                    )}
                    <small className="help-text">
                      Get your API key at <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>elevenlabs.io</a>
                      <br />
                      <strong style={{ color: '#22c55e' }}>✓ Free tier supported!</strong> Upgrade to paid plans for more credits.
                    </small>
                  </div>

                  <div className="cost-info" style={{
                    background: '#1e293b',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.85em'
                  }}>
                    <strong>💰 Cost:</strong>
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                      <li>With duration: {duration * 40} credits (~${(duration * 40 * 0.00015).toFixed(3)})</li>
                      <li>Without duration (AI decides): 200 credits (~$0.03)</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="generate-sfx">
        <h4>Generate with ElevenLabs AI</h4>

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
            max={30}
            value={duration}
            onChange={e => setDuration(parseFloat(e.target.value) || 2)}
          />
          <small className="help-text">
            Max 30 seconds. Costs {duration * 40} credits per generation.
          </small>
        </div>

        <button
          className="btn-primary"
          onClick={handleGenerateSFX}
          disabled={!prompt || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate SFX'}
        </button>
      </div>

            {sfxSuggestions.length > 0 && (
              <div className="sfx-suggestions">
          <h4>AI Suggestions</h4>
          {sfxSuggestions.map((suggestion, index) => {
            // Use backend prompt directly (no frontend translation needed)
            // Backend now generates high-quality dynamic prompts

            // Check if this suggestion matches an existing library item from built-in SFX Library
            const libraryMatch = findMatchingBuiltInLibraryItem(suggestion.prompt)
            const wasAutoInserted = libraryMatch !== null

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
                    {wasAutoInserted && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.85em', color: '#22c55e' }}>
                        ✓ Auto-inserted from SFX Library: "{libraryMatch.name}"
                      </div>
                    )}
                  </div>
                </div>
                <button
                  className="btn-small"
                  onClick={() => handleUseSuggestion(suggestion)}
                  disabled={isGenerating || !elevenlabsApiKey}
                  title={wasAutoInserted
                    ? "Generate a different version with ElevenLabs"
                    : (elevenlabsApiKey ? "Generate with ElevenLabs" : "Configure API key first")}
                  style={{ background: elevenlabsApiKey ? '#10b981' : '#6b7280' }}
                >
                  {isGenerating ? 'Generating...' : (wasAutoInserted ? 'Generate New' : 'Generate')}
                </button>
              </div>
            )
            })}
              </div>
            )}

            {/* Music Suggestions Section (Week 3) */}
            {musicSuggestions.length > 0 && (
              <div className="music-suggestions" style={{ marginTop: '2rem' }}>
                <h4>🎵 Background Music Suggestions</h4>
                <p style={{ fontSize: '0.9em', opacity: 0.8, marginBottom: '1rem' }}>
                  Mood and energy-matched music for each scene
                </p>
                {musicSuggestions.map((music, index) => (
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
                                originalDuration: music.duration,  // Store original duration
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

        {activeTab === 'sfxlibrary' && (
          <div className="library-tab">
            <SFXLibrary />
          </div>
        )}

        {/* {activeTab === 'freesound' && (
          <div className="library-tab">
            <FreesoundLibrary />
          </div>
        )} */}

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
