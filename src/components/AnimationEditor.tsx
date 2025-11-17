import { useState, useEffect, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import type { AnimationTrack, AnimationLibraryItem } from '../types/animation'
import { ANIMATION_CATEGORIES } from '../types/animation'
import { Trash2, Upload, Plus, Sparkles, FolderOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import './AnimationEditor.css'

export default function AnimationEditor() {
  const {
    animationTracks,
    addAnimationTrack,
    updateAnimationTrack,
    deleteAnimationTrack,
    currentTime,
    projectPath
  } = useProject()

  const [activeTab, setActiveTab] = useState<'add' | 'library' | 'tracks'>('add')
  const [animationLibrary, setAnimationLibrary] = useState<AnimationLibraryItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // New animation state
  const [newAnimation, setNewAnimation] = useState({
    name: '',
    start: 0,
    duration: 3,
    scale: 1,
    positionX: 0.5,
    positionY: 0.5
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportAnimation = async (file: File) => {
    try {
      const text = await file.text()
      const lottieData = JSON.parse(text)

      // Validate it's a Lottie file
      if (!lottieData.v || !lottieData.layers) {
        throw new Error('Invalid Lottie JSON file')
      }

      // Copy to project folder if project exists
      let savedPath: string | undefined
      if (projectPath) {
        try {
          // TODO: Implement copyAnimationToProject in electron API
          // For now, we'll store the data inline
          savedPath = undefined
        } catch (err) {
          console.warn('Could not copy animation to project:', err)
        }
      }

      // Add to library
      const libraryItem: AnimationLibraryItem = {
        id: `anim-lib-${Date.now()}`,
        name: file.name.replace('.json', ''),
        lottieData,
        duration: 3, // Default duration
        category: 'custom',
        createdAt: Date.now()
      }

      setAnimationLibrary(prev => [...prev, libraryItem])
      toast.success(`Animation "${file.name}" imported successfully`)

      // Save library to localStorage
      saveLibraryToStorage([...animationLibrary, libraryItem])
    } catch (error: any) {
      console.error('Error importing animation:', error)
      toast.error(error?.message || 'Failed to import animation')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a valid Lottie JSON file')
      return
    }

    handleImportAnimation(file)
  }

  const handleAddFromLibrary = (item: AnimationLibraryItem) => {
    const track: AnimationTrack = {
      id: `anim-${Date.now()}`,
      name: item.name,
      source: 'library',
      lottieData: item.lottieData,
      path: item.path,
      url: item.url,
      start: currentTime,
      duration: newAnimation.duration,
      position: {
        x: newAnimation.positionX,
        y: newAnimation.positionY
      },
      scale: newAnimation.scale,
      rotation: 0,
      opacity: 1,
      loop: true,
      autoplay: true,
      speed: 1,
      zIndex: 100,
      category: item.category,
      tags: item.tags,
      createdAt: Date.now()
    }

    addAnimationTrack(track)
    toast.success(`Added "${item.name}" to timeline at ${currentTime.toFixed(2)}s`)
  }

  const handleAddFromURL = async () => {
    const url = prompt('Enter Lottie animation URL (from LottieFiles or similar):')
    if (!url) return

    try {
      const response = await fetch(url)
      const lottieData = await response.json()

      if (!lottieData.v || !lottieData.layers) {
        throw new Error('Invalid Lottie data from URL')
      }

      const track: AnimationTrack = {
        id: `anim-${Date.now()}`,
        name: newAnimation.name || 'Animation',
        source: 'url',
        url,
        lottieData,
        start: newAnimation.start || currentTime,
        duration: newAnimation.duration,
        position: {
          x: newAnimation.positionX,
          y: newAnimation.positionY
        },
        scale: newAnimation.scale,
        rotation: 0,
        opacity: 1,
        loop: true,
        autoplay: true,
        speed: 1,
        zIndex: 100,
        createdAt: Date.now()
      }

      addAnimationTrack(track)
      toast.success('Animation added from URL')
    } catch (error: any) {
      console.error('Error loading animation from URL:', error)
      toast.error('Failed to load animation from URL')
    }
  }

  // Load library from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('animation-library')
    if (saved) {
      try {
        const library = JSON.parse(saved)
        setAnimationLibrary(library)
      } catch (err) {
        console.error('Failed to load animation library:', err)
      }
    }
  }, [])

  const saveLibraryToStorage = (library: AnimationLibraryItem[]) => {
    localStorage.setItem('animation-library', JSON.stringify(library))
  }

  const filteredLibrary = selectedCategory === 'all'
    ? animationLibrary
    : animationLibrary.filter(item => item.category === selectedCategory)

  return (
    <div className="animation-editor">
      <div className="editor-header">
        <h3>Animations</h3>
        <button
          className="btn-small"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={16} />
          Import Lottie
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      {/* Tabs */}
      <div className="animation-tabs">
        <button
          className={`animation-tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <Plus size={16} />
          Add Animation
        </button>
        <button
          className={`animation-tab ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          <FolderOpen size={16} />
          Library ({animationLibrary.length})
        </button>
        <button
          className={`animation-tab ${activeTab === 'tracks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracks')}
        >
          <Sparkles size={16} />
          Timeline ({animationTracks.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="animation-tab-content">
        {activeTab === 'add' && (
          <div className="add-animation">
            <div className="input-group">
              <label>Animation Name</label>
              <input
                type="text"
                placeholder="My Animation"
                value={newAnimation.name}
                onChange={e => setNewAnimation({ ...newAnimation, name: e.target.value })}
              />
            </div>

            <div className="animation-timing">
              <div className="input-group">
                <label>Start Time (s)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newAnimation.start}
                  onChange={e =>
                    setNewAnimation({ ...newAnimation, start: parseFloat(e.target.value) || 0 })
                  }
                  placeholder={currentTime.toFixed(2)}
                />
              </div>

              <div className="input-group">
                <label>Duration (s)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={newAnimation.duration}
                  onChange={e =>
                    setNewAnimation({ ...newAnimation, duration: parseFloat(e.target.value) || 3 })
                  }
                />
              </div>
            </div>

            <div className="animation-position">
              <div className="input-group">
                <label>Position X (0-1)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={newAnimation.positionX}
                  onChange={e =>
                    setNewAnimation({
                      ...newAnimation,
                      positionX: parseFloat(e.target.value) || 0.5
                    })
                  }
                />
              </div>

              <div className="input-group">
                <label>Position Y (0-1)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={newAnimation.positionY}
                  onChange={e =>
                    setNewAnimation({
                      ...newAnimation,
                      positionY: parseFloat(e.target.value) || 0.5
                    })
                  }
                />
              </div>

              <div className="input-group">
                <label>Scale</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  value={newAnimation.scale}
                  onChange={e =>
                    setNewAnimation({ ...newAnimation, scale: parseFloat(e.target.value) || 1 })
                  }
                />
              </div>
            </div>

            <div className="animation-actions">
              <button className="btn-secondary" onClick={handleAddFromURL}>
                Add from URL
              </button>
              <button
                className="btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                Import File
              </button>
            </div>

            <div className="help-text">
              <p>
                💡 Get free Lottie animations from{' '}
                <a
                  href="https://lottiefiles.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6' }}
                >
                  LottieFiles.com
                </a>
              </p>
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="library-view">
            <div className="category-filter">
              <button
                className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                All
              </button>
              {ANIMATION_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            {filteredLibrary.length === 0 ? (
              <div className="empty-message">
                <p>No animations in library yet.</p>
                <p>Import Lottie JSON files to get started!</p>
              </div>
            ) : (
              <div className="animation-grid">
                {filteredLibrary.map(item => (
                  <div key={item.id} className="animation-item">
                    <div className="animation-preview">
                      {/* Lottie preview will be rendered here */}
                      <div className="animation-placeholder">
                        <Sparkles size={32} />
                      </div>
                    </div>
                    <div className="animation-info">
                      <strong>{item.name}</strong>
                      <span className="animation-duration">{item.duration}s</span>
                    </div>
                    <button
                      className="btn-small"
                      onClick={() => handleAddFromLibrary(item)}
                      title="Add to timeline"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tracks' && (
          <div className="tracks-view">
            {animationTracks.length === 0 ? (
              <p className="empty-message">
                No animation tracks added yet. Import animations and add them to the timeline!
              </p>
            ) : (
              <div className="animation-tracks-list">
                {animationTracks.map(track => (
                  <div key={track.id} className="track-item">
                    <div className="track-content">
                      <p>
                        <strong>{track.name}</strong>
                      </p>
                      <span className="track-time">
                        Start: {track.start.toFixed(2)}s | Duration: {track.duration.toFixed(2)}s
                      </span>
                      <span className="track-props">
                        Position: ({(track.position.x * 100).toFixed(0)}%,{' '}
                        {(track.position.y * 100).toFixed(0)}%) | Scale: {track.scale}x
                      </span>
                    </div>
                    <button
                      onClick={() => deleteAnimationTrack(track.id)}
                      title="Delete animation"
                      className="delete-btn"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
