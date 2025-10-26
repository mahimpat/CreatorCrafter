import { useState, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import type { FreesoundSound, FreesoundSearchParams } from '../types/freesound'
import { Search, Download, Play, Pause, Filter, Clock, Star } from 'lucide-react'
import './FreesoundLibrary.css'

export default function FreesoundLibrary() {
  const { addSFXTrack, currentTime, projectPath } = useProject()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [sounds, setSounds] = useState<FreesoundSound[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasSearched, setHasSearched] = useState(false)

  // Filter state
  const [sortBy, setSortBy] = useState<'score' | 'rating_desc' | 'downloads_desc' | 'duration_desc'>('score')
  const [durationFilter, setDurationFilter] = useState<'any' | 'short' | 'medium' | 'long'>('any')
  const [showFilters, setShowFilters] = useState(false)

  // Preview state
  const [previewingSound, setPreviewingSound] = useState<number | null>(null)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Download state
  const [downloadingSound, setDownloadingSound] = useState<number | null>(null)

  const handleSearch = async (page = 1) => {
    if (!searchQuery.trim() && page === 1) return

    setIsSearching(true)
    setCurrentPage(page)
    setHasSearched(true)

    try {
      const params: FreesoundSearchParams = {
        query: searchQuery || undefined,
        sort: sortBy,
        page: page,
        page_size: 20,
        fields: 'id,name,tags,description,username,created,duration,license,type,filesize,previews,images,num_downloads,avg_rating'
      }

      // Add duration filter
      if (durationFilter !== 'any') {
        switch (durationFilter) {
          case 'short':
            params.filter = 'duration:[0 TO 5]'
            break
          case 'medium':
            params.filter = 'duration:[5 TO 30]'
            break
          case 'long':
            params.filter = 'duration:[30 TO *]'
            break
        }
      }

      const result = await window.electronAPI.freesoundSearch(params)

      if (result.success) {
        setSounds(result.results.results)
        setTotalResults(result.results.count)
      } else {
        alert(`Search failed: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Search error:', error)
      alert(`Search failed: ${error.message}`)
    } finally {
      setIsSearching(false)
    }
  }

  const handlePreview = (sound: FreesoundSound) => {
    if (previewingSound === sound.id && isPreviewPlaying) {
      // Pause current preview
      audioRef.current?.pause()
      setIsPreviewPlaying(false)
    } else {
      // Play new preview
      if (audioRef.current) {
        audioRef.current.pause()
      }

      audioRef.current = new Audio(sound.previews['preview-hq-mp3'])
      audioRef.current.play()
      setPreviewingSound(sound.id)
      setIsPreviewPlaying(true)

      audioRef.current.onended = () => {
        setIsPreviewPlaying(false)
        setPreviewingSound(null)
      }

      audioRef.current.onerror = () => {
        setIsPreviewPlaying(false)
        setPreviewingSound(null)
        alert('Failed to play preview')
      }
    }
  }

  const handleDownloadAndAdd = async (sound: FreesoundSound) => {
    if (!projectPath) {
      alert('Please create or open a project first')
      return
    }

    setDownloadingSound(sound.id)

    try {
      // Create temp file path for preview MP3
      const tempPath = `/tmp/freesound-preview-${sound.id}.mp3`

      // Download preview (high-quality MP3)
      const previewUrl = sound.previews['preview-hq-mp3']
      const downloadResult = await window.electronAPI.freesoundDownloadPreview(previewUrl, tempPath)

      if (!downloadResult.success) {
        alert(`Download failed: ${downloadResult.error}`)
        return
      }

      // Copy to project
      const relativePath = await window.electronAPI.copyAssetToProject(
        downloadResult.filePath!,
        projectPath,
        'sfx'
      )

      // Resolve to absolute path
      const sfxPath = await window.electronAPI.resolveProjectPath(projectPath, relativePath)

      // Add to timeline
      addSFXTrack({
        id: `sfx-${Date.now()}`,
        path: sfxPath,
        start: currentTime,
        duration: sound.duration,
        volume: 1,
        prompt: sound.name
      })

      alert(`"${sound.name}" added to timeline!`)
    } catch (error: any) {
      console.error('Download error:', error)
      alert(`Failed to add sound: ${error.message}`)
    } finally {
      setDownloadingSound(null)
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`
    }
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const totalPages = Math.ceil(totalResults / 20)

  return (
    <div className="freesound-library">
      {/* Search Section */}
      <div className="freesound-search">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search for sounds (e.g., 'footsteps', 'explosion', 'ambient')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(1)}
          />
          <button
            className="filter-btn"
            onClick={() => setShowFilters(!showFilters)}
            title="Filters"
          >
            <Filter size={16} />
          </button>
          <button
            className="btn-primary"
            onClick={() => handleSearch(1)}
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="search-filters">
            <div className="filter-group">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="score">Relevance</option>
                <option value="rating_desc">Rating</option>
                <option value="downloads_desc">Downloads</option>
                <option value="duration_desc">Duration</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Duration:</label>
              <select value={durationFilter} onChange={(e) => setDurationFilter(e.target.value as any)}>
                <option value="any">Any</option>
                <option value="short">Short (&lt; 5s)</option>
                <option value="medium">Medium (5-30s)</option>
                <option value="long">Long (&gt; 30s)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="freesound-results">
        {!hasSearched ? (
          <div className="empty-state">
            <Search size={48} />
            <h3>Search FreeSound Library</h3>
            <p>Search over 600,000 Creative Commons sounds from the FreeSound community</p>
            <ul className="search-tips">
              <li>Try searching for: footsteps, explosion, rain, door, laugh, etc.</li>
              <li>Use filters to refine results by duration and rating</li>
              <li>Preview sounds before adding to timeline</li>
              <li>Downloads high-quality MP3 previews (perfect for video editing)</li>
            </ul>
          </div>
        ) : isSearching ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching FreeSound...</p>
          </div>
        ) : sounds.length === 0 ? (
          <div className="empty-state">
            <p>No sounds found. Try a different search term.</p>
          </div>
        ) : (
          <>
            <div className="results-header">
              <p className="results-count">
                Found {totalResults.toLocaleString()} sounds
                {searchQuery && ` for "${searchQuery}"`}
              </p>
            </div>

            <div className="sounds-grid">
              {sounds.map((sound) => (
                <div key={sound.id} className="sound-card">
                  {/* Waveform */}
                  <div className="sound-waveform">
                    <img
                      src={sound.images.waveform_m}
                      alt={`${sound.name} waveform`}
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="sound-info">
                    <h4 className="sound-name" title={sound.name}>
                      {sound.name}
                    </h4>
                    <p className="sound-user">by {sound.username}</p>

                    <div className="sound-meta">
                      <span className="meta-item">
                        <Clock size={12} />
                        {formatDuration(sound.duration)}
                      </span>
                      <span className="meta-item">
                        <Star size={12} />
                        {sound.avg_rating?.toFixed(1) || 'N/A'}
                      </span>
                      <span className="meta-item">
                        <Download size={12} />
                        {sound.num_downloads || 0}
                      </span>
                    </div>

                    {sound.tags.length > 0 && (
                      <div className="sound-tags">
                        {sound.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="tag">
                            {tag}
                          </span>
                        ))}
                        {sound.tags.length > 3 && (
                          <span className="tag">+{sound.tags.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="sound-details">
                      <span>{sound.type.toUpperCase()}</span>
                      <span>{formatFileSize(sound.filesize)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="sound-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => handlePreview(sound)}
                    >
                      {previewingSound === sound.id && isPreviewPlaying ? (
                        <>
                          <Pause size={16} />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play size={16} />
                          Preview
                        </>
                      )}
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => handleDownloadAndAdd(sound)}
                      disabled={downloadingSound === sound.id}
                    >
                      <Download size={16} />
                      {downloadingSound === sound.id ? 'Adding...' : 'Add to Timeline'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn-secondary"
                  onClick={() => handleSearch(currentPage - 1)}
                  disabled={currentPage === 1 || isSearching}
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn-secondary"
                  onClick={() => handleSearch(currentPage + 1)}
                  disabled={currentPage === totalPages || isSearching}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
