import { useState, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import { useAutoSave } from '../hooks/useAutoSave'
import { useAutoInsertSFX } from '../hooks/useAutoInsertSFX'
import VideoPlayer from './VideoPlayer'
import Timeline from './Timeline'
import SidePanel from './SidePanel'
import ProjectManager from './ProjectManager'
import MediaBin from './MediaBin'
import OverlayLibrary from './OverlayLibrary'
import MediaOverlayProperties from './MediaOverlayProperties'
import TopBar from './TopBar'
import AnalysisPanel from './AnalysisPanel'
import ExportDialog from './ExportDialog'
import KeyboardShortcutsOverlay from './KeyboardShortcutsOverlay'
import OnboardingTour from './OnboardingTour'
// DISABLED FOR THIS RELEASE - Thumbnail generation feature hidden
import ThumbnailDialog from './ThumbnailDialog'
// import BrandKitManager from './BrandKitManager'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import './VideoEditor.css'

export default function VideoEditor() {
  const {
    isAnalyzing,
    selectedClipIds,
    mediaOverlays,
    undo,
    redo,
    deleteSelectedClips,
    isPlaying,
    setIsPlaying
  } = useProject()

  // DISABLED FOR THIS RELEASE - Removed 'thumbnails' from tool options
  const [selectedTool, setSelectedTool] = useState<'subtitles' | 'sfx' | 'overlays' | 'animations' | 'aivideo'>('subtitles')
  const [isAssetsOpen, setIsAssetsOpen] = useState(true)
  const [leftPanelTab, setLeftPanelTab] = useState<'project' | 'media' | 'overlays' | 'brandkits'>('media')
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showThumbnailDialog, setShowThumbnailDialog] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showTour, setShowTour] = useState(false)

  // Enable auto-save
  useAutoSave()

  // Enable auto-insert SFX from library after analysis
  useAutoInsertSFX()

  // Check for first-time user
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour')
    if (!hasSeenTour) {
      // Small delay to let UI load
      const timer = setTimeout(() => {
        setShowTour(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleTourComplete = () => {
    setShowTour(false)
    localStorage.setItem('hasSeenTour', 'true')
  }

  // Check if a media overlay is selected
  const hasMediaOverlaySelected = selectedClipIds.some(id =>
    mediaOverlays.some(overlay => overlay.id === id)
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // ?: Show shortcuts
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShowShortcuts(prev => !prev)
      }

      // Space: Toggle Play/Pause
      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying(!isPlaying)
      }

      // Delete / Backspace: Delete selected clips
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipIds.length > 0) {
          e.preventDefault()
          deleteSelectedClips()
        }
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if (((e.ctrlKey || e.metaKey) && e.code === 'KeyY') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ')) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedClipIds, isPlaying, undo, redo, deleteSelectedClips, setIsPlaying])

  return (
    <div className="video-editor">
      <TopBar
        onExport={() => setShowExportDialog(true)}
        onThumbnail={() => setShowThumbnailDialog(true)}
        onShowShortcuts={() => setShowShortcuts(true)}
        onStartTour={() => setShowTour(true)}
      />

      <div className="editor-main">
        {/* Left Sidebar - Assets Panel */}
        <div className={`editor-left-sidebar ${isAssetsOpen ? 'open' : 'collapsed'}`}>
          <div className="left-sidebar-header">
            <div className="left-sidebar-tabs">
              <button
                className={`tab-btn ${leftPanelTab === 'media' ? 'active' : ''}`}
                onClick={() => setLeftPanelTab('media')}
              >
                Media
              </button>
              <button
                className={`tab-btn ${leftPanelTab === 'overlays' ? 'active' : ''}`}
                onClick={() => setLeftPanelTab('overlays')}
              >
                Overlays
              </button>
              <button
                className={`tab-btn ${leftPanelTab === 'project' ? 'active' : ''}`}
                onClick={() => setLeftPanelTab('project')}
              >
                Project
              </button>
              {/* DISABLED FOR THIS RELEASE - Brand Kits hidden
              <button
                className={`tab-btn ${leftPanelTab === 'brandkits' ? 'active' : ''}`}
                onClick={() => setLeftPanelTab('brandkits')}
              >
                Brand Kits
              </button>
              */}
            </div>
            <button
              className="collapse-btn"
              onClick={() => setIsAssetsOpen(!isAssetsOpen)}
              title={isAssetsOpen ? 'Collapse' : 'Expand'}
            >
              {isAssetsOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
          <div className="left-sidebar-content">
            {leftPanelTab === 'media' ? (
              <MediaBin />
            ) : leftPanelTab === 'overlays' ? (
              <OverlayLibrary />
            ) : (
              <ProjectManager />
            )}
          </div>
        </div>

        {/* Collapse/Expand Button (when collapsed) */}
        {!isAssetsOpen && (
          <button
            className="expand-assets-btn"
            onClick={() => setIsAssetsOpen(true)}
            title="Show Assets"
          >
            <ChevronRight size={20} />
          </button>
        )}

        <div className="editor-content">
          <div className="video-section video-player-container">
            <VideoPlayer />
          </div>

          <div className="timeline-section timeline-container">
            <Timeline />
          </div>
        </div>

        {/* Right Sidebar - Tools */}
        <div className="editor-sidebar side-panel">
          <div className="tool-selector">
            <div className="tool-dropdown-container">
              <select
                className="tool-dropdown"
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value as 'subtitles' | 'sfx' | 'overlays' | 'animations' | 'aivideo')}
              >
                <option value="subtitles">Subtitles</option>
                <option value="sfx">Sound FX</option>
                <option value="overlays">Overlays</option>
                <option value="animations">Animations</option>
                <option value="aivideo">AI Video Generator</option>
                {/* DISABLED FOR THIS RELEASE - Thumbnail generation feature hidden
                <option value="thumbnails">Thumbnails</option>
                */}
              </select>
              <ChevronDown size={16} className="dropdown-icon" />
            </div>
          </div>

          {/* DISABLED FOR THIS RELEASE - ThumbnailGenerator component hidden
          {selectedTool === 'thumbnails' ? (
            <ThumbnailGenerator />
          ) : */ hasMediaOverlaySelected ? (
              <MediaOverlayProperties />
            ) : (
              <SidePanel selectedTool={selectedTool} />
            )}
        </div>
      </div>

      {isAnalyzing && <AnalysisPanel />}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
      <ThumbnailDialog
        isOpen={showThumbnailDialog}
        onClose={() => setShowThumbnailDialog(false)}
      />
      <KeyboardShortcutsOverlay
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
      <OnboardingTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onComplete={handleTourComplete}
      />
    </div>
  )
}
