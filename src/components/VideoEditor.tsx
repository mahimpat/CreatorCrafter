import { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import { useAutoSave } from '../hooks/useAutoSave'
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
// DISABLED FOR THIS RELEASE - Thumbnail generation feature hidden
// import ThumbnailGenerator from './ThumbnailGenerator'
import BrandKitManager from './BrandKitManager'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './VideoEditor.css'

export default function VideoEditor() {
  const { isAnalyzing, selectedClipIds, mediaOverlays } = useProject()
  // DISABLED FOR THIS RELEASE - Removed 'thumbnails' from tool options
  const [selectedTool, setSelectedTool] = useState<'subtitles' | 'sfx' | 'overlays' | 'animations'>('subtitles')
  const [isAssetsOpen, setIsAssetsOpen] = useState(true)
  const [leftPanelTab, setLeftPanelTab] = useState<'project' | 'media' | 'overlays' | 'brandkits'>('media')
  const [showExportDialog, setShowExportDialog] = useState(false)

  // Enable auto-save
  useAutoSave()

  // Check if a media overlay is selected
  const hasMediaOverlaySelected = selectedClipIds.some(id =>
    mediaOverlays.some(overlay => overlay.id === id)
  )

  return (
    <div className="video-editor">
      <TopBar onExport={() => setShowExportDialog(true)} />

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
              <button
                className={`tab-btn ${leftPanelTab === 'brandkits' ? 'active' : ''}`}
                onClick={() => setLeftPanelTab('brandkits')}
              >
                Brand Kits
              </button>
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
            ) : leftPanelTab === 'brandkits' ? (
              <BrandKitManager />
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
          <div className="video-section">
            <VideoPlayer />
          </div>

          <div className="timeline-section">
            <Timeline />
          </div>
        </div>

        {/* Right Sidebar - Tools */}
        <div className="editor-sidebar">
          <div className="tool-selector">
            <button
              className={`tool-btn ${selectedTool === 'subtitles' ? 'active' : ''}`}
              onClick={() => setSelectedTool('subtitles')}
            >
              Subtitles
            </button>
            <button
              className={`tool-btn ${selectedTool === 'sfx' ? 'active' : ''}`}
              onClick={() => setSelectedTool('sfx')}
            >
              Sound FX
            </button>
            <button
              className={`tool-btn ${selectedTool === 'overlays' ? 'active' : ''}`}
              onClick={() => setSelectedTool('overlays')}
            >
              Overlays
            </button>
            <button
              className={`tool-btn ${selectedTool === 'animations' ? 'active' : ''}`}
              onClick={() => setSelectedTool('animations')}
            >
              Animations
            </button>
            {/* DISABLED FOR THIS RELEASE - Thumbnail generation feature hidden
            <button
              className={`tool-btn ${selectedTool === 'thumbnails' ? 'active' : ''}`}
              onClick={() => setSelectedTool('thumbnails')}
            >
              Thumbnails
            </button>
            */}
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
    </div>
  )
}
