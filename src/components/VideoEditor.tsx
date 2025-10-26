import { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import { useAutoSave } from '../hooks/useAutoSave'
import VideoPlayer from './VideoPlayer'
import Timeline from './Timeline'
import SidePanel from './SidePanel'
import ProjectManager from './ProjectManager'
import TopBar from './TopBar'
import AnalysisPanel from './AnalysisPanel'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './VideoEditor.css'

export default function VideoEditor() {
  const { isAnalyzing } = useProject()
  const [selectedTool, setSelectedTool] = useState<'subtitles' | 'sfx' | 'overlays'>('subtitles')
  const [isAssetsOpen, setIsAssetsOpen] = useState(true)

  // Enable auto-save
  useAutoSave()

  return (
    <div className="video-editor">
      <TopBar />

      <div className="editor-main">
        {/* Left Sidebar - Assets Panel */}
        <div className={`editor-left-sidebar ${isAssetsOpen ? 'open' : 'collapsed'}`}>
          <div className="left-sidebar-header">
            <h3>Project Assets</h3>
            <button
              className="collapse-btn"
              onClick={() => setIsAssetsOpen(!isAssetsOpen)}
              title={isAssetsOpen ? 'Collapse' : 'Expand'}
            >
              {isAssetsOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
          </div>
          <div className="left-sidebar-content">
            <ProjectManager />
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
          </div>

          <SidePanel selectedTool={selectedTool} />
        </div>
      </div>

      {isAnalyzing && <AnalysisPanel />}
    </div>
  )
}
