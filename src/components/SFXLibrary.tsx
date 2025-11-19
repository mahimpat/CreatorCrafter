import { useState, useRef, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import { Play, Pause, Plus, FolderOpen, Tag, Search } from 'lucide-react'
import './SFXLibrary.css'

interface LibrarySound {
  name: string
  prompt: string
  duration: number
  tags: string[]
  category: string
  filePath: string
}

interface LibraryCategory {
  description: string
  count: number
  sounds: Array<{
    name: string
    prompt: string
    duration: number
    tags: string[]
  }>
}

interface LibraryMetadata {
  version: string
  generated_at: string
  total_sounds: number
  categories: Record<string, LibraryCategory>
}

export default function SFXLibrary() {
  const { addSFXTrack, currentTime, projectPath } = useProject()

  // Library state
  const [library, setLibrary] = useState<LibraryMetadata | null>(null)
  const [allSounds, setAllSounds] = useState<LibrarySound[]>([])
  const [filteredSounds, setFilteredSounds] = useState<LibrarySound[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Preview state
  const [previewingSound, setPreviewingSound] = useState<string | null>(null)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load library metadata on mount
  useEffect(() => {
    loadLibrary()
  }, [])

  // Apply filters when search/category/tags change
  useEffect(() => {
    applyFilters()
  }, [selectedCategory, searchQuery, selectedTags, allSounds])

  const loadLibrary = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.loadSFXLibrary()

      if (result.success) {
        setLibrary(result.metadata)

        // Flatten all sounds with category info
        const sounds: LibrarySound[] = []
        Object.entries(result.metadata.categories).forEach(([category, categoryData]) => {
          const typedCategory = categoryData as LibraryCategory
          typedCategory.sounds.forEach(sound => {
            sounds.push({
              ...sound,
              category,
              filePath: `sfx_library/${category}/${sound.name}.wav`
            })
          })
        })

        setAllSounds(sounds)
        setFilteredSounds(sounds)
      } else {
        setError(result.error || 'Failed to load SFX library')
      }
    } catch (err: any) {
      console.error('Error loading SFX library:', err)
      setError(err.message || 'Failed to load SFX library')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...allSounds]

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(sound => sound.category === selectedCategory)
    }

    // Search filter (name, prompt, tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(sound =>
        sound.name.toLowerCase().includes(query) ||
        sound.prompt.toLowerCase().includes(query) ||
        sound.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(sound =>
        selectedTags.every(tag => sound.tags.includes(tag))
      )
    }

    setFilteredSounds(filtered)
  }

  const handlePreview = async (sound: LibrarySound) => {
    if (previewingSound === sound.name && isPreviewPlaying) {
      // Pause current preview
      audioRef.current?.pause()
      setIsPreviewPlaying(false)
      return
    }

    // Stop current preview if different sound
    if (audioRef.current) {
      audioRef.current.pause()
    }

    try {
      // Get absolute path to the sound file
      const result = await window.electronAPI.getSFXLibraryPath(sound.filePath)

      if (result.success) {
        const audio = new Audio(`file://${result.path}`)
        audioRef.current = audio

        audio.onended = () => {
          setIsPreviewPlaying(false)
          setPreviewingSound(null)
        }

        audio.onerror = () => {
          alert('Failed to load sound preview')
          setIsPreviewPlaying(false)
          setPreviewingSound(null)
        }

        await audio.play()
        setPreviewingSound(sound.name)
        setIsPreviewPlaying(true)
      } else {
        alert(`Sound file not found: ${sound.name}`)
      }
    } catch (err) {
      console.error('Preview error:', err)
      alert('Failed to preview sound')
    }
  }

  const handleAddToTimeline = async (sound: LibrarySound) => {
    if (!projectPath) {
      alert('Please open a project first')
      return
    }

    try {
      // Copy sound from library to project
      const result = await window.electronAPI.copySFXToProject(sound.filePath, projectPath)

      if (result.success) {
        addSFXTrack({
          id: `sfx-${Date.now()}`,
          path: result.projectPath!,
          volume: 1.0,
          start: currentTime,
          duration: sound.duration,
          originalDuration: sound.duration,
          prompt: sound.prompt,
          trimStart: 0
        })
      } else {
        alert(`Failed to add sound: ${result.error}`)
      }
    } catch (err: any) {
      console.error('Add to timeline error:', err)
      alert(`Failed to add sound: ${err.message}`)
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Get all unique tags
  const allTags = Array.from(new Set(allSounds.flatMap(s => s.tags))).sort()

  // Get category counts
  const categoryCounts = library ? Object.entries(library.categories).reduce((acc, [key, val]) => {
    acc[key] = val.count
    return acc
  }, {} as Record<string, number>) : {}

  if (isLoading) {
    return (
      <div className="sfx-library">
        <div className="library-loading">
          <div className="loading-spinner"></div>
          <p>Loading SFX Library...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sfx-library">
        <div className="library-error">
          <FolderOpen size={48} />
          <h3>SFX Library Not Found</h3>
          <p>{error}</p>
          <p className="error-hint">
            The SFX library may still be generating. Check the generation progress or run the library generation script.
          </p>
          <button className="btn-primary" onClick={loadLibrary}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sfx-library">
      <div className="library-header">
        <h2>SFX Library</h2>
        <p className="library-subtitle">
          {library?.total_sounds} professional sound effects • {Object.keys(library?.categories || {}).length} categories
        </p>
      </div>

      {/* Search and Filters */}
      <div className="library-filters">
        {/* Search bar */}
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search sounds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category tabs */}
        <div className="category-tabs">
          <button
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            All ({allSounds.length})
          </button>
          {Object.entries(library?.categories || {}).map(([key, category]) => (
            <button
              key={key}
              className={selectedCategory === key ? 'active' : ''}
              onClick={() => setSelectedCategory(key)}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)} ({category.count})
            </button>
          ))}
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="tag-filters">
            <Tag size={16} />
            <div className="tag-list">
              {allTags.slice(0, 15).map(tag => (
                <button
                  key={tag}
                  className={`tag-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sound grid */}
      <div className="library-sounds">
        {filteredSounds.length === 0 ? (
          <div className="no-results">
            <Search size={48} />
            <p>No sounds match your filters</p>
          </div>
        ) : (
          <div className="sound-grid">
            {filteredSounds.map(sound => (
              <div
                key={`${sound.category}-${sound.name}`}
                className="sound-card"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copy'
                  e.dataTransfer.setData('sfx-library-item', JSON.stringify({
                    path: sound.filePath,
                    duration: sound.duration,
                    prompt: sound.prompt
                  }))
                }}
              >
                <div className="sound-info">
                  <h4>{sound.name.replace(/-/g, ' ')}</h4>
                  <p className="sound-description">{sound.prompt}</p>
                  <div className="sound-meta">
                    <span className="category-badge">{sound.category}</span>
                    <span className="duration">{sound.duration.toFixed(1)}s</span>
                  </div>
                  <div className="sound-tags">
                    {sound.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="sound-actions">
                  <button
                    className="btn-icon"
                    onClick={() => handlePreview(sound)}
                    title="Preview sound"
                  >
                    {previewingSound === sound.name && isPreviewPlaying ? (
                      <Pause size={18} />
                    ) : (
                      <Play size={18} />
                    )}
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => handleAddToTimeline(sound)}
                    title="Add to timeline"
                  >
                    <Plus size={18} />
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="library-footer">
        <p>
          Showing {filteredSounds.length} of {allSounds.length} sounds
        </p>
      </div>
    </div>
  )
}
