import { useState, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import VideoPlayer from './VideoPlayer'
import Timeline from './Timeline'
import SidePanel from './SidePanel'
import TopBar from './TopBar'
import AnalysisPanel from './AnalysisPanel'
import './VideoEditor.css'

export default function VideoEditor() {
  const { videoPath, isAnalyzing } = useProject()
  const [selectedTool, setSelectedTool] = useState<'subtitles' | 'sfx' | 'overlays'>('subtitles')

  return (
    <div className="video-editor">
      <TopBar />

      <div className="editor-main">
        <div className="editor-content">
          <div className="video-section">
            <VideoPlayer />
          </div>

          <div className="timeline-section">
            <Timeline />
          </div>
        </div>

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
