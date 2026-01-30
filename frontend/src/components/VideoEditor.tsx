/**
 * VideoEditor - Main video editing interface
 * Adapted for web from the Electron version
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useWebSocket, ProgressUpdate } from '../hooks/useWebSocket'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import {
  ArrowLeft,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Save,
  Download,
  Type,
  Music,
  Subtitles,
  SkipBack,
  SkipForward,
  Wand2,
  Film,
  Headphones,
  Keyboard,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { VideoClip, BackgroundAudio, projectsApi } from '../api'
import Timeline from './Timeline'
import SubtitleEditor from './SubtitleEditor'
import SFXEditor from './SFXEditor'
import OverlayEditor from './OverlayEditor'
import ClipsPanel from './ClipsPanel'
import BGMPanel from './BGMPanel'
import ModeSwitcher from './ModeSwitcher'
import AssetsPanel from './AssetsPanel'
import AnalysisOverlay from './AnalysisOverlay'
import ExportDialog from './ExportDialog'
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp'
import './VideoEditor.css'

type ActiveTab = 'clips' | 'subtitles' | 'sfx' | 'overlays' | 'bgm'

export default function VideoEditor() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<ActiveTab>('subtitles')
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [videoClips, setVideoClips] = useState<VideoClip[]>([])
  const [bgmTracks, setBgmTracks] = useState<BackgroundAudio[]>([])
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showAssetsPanel, setShowAssetsPanel] = useState(true)

  const {
    project,
    projectMode,
    videoUrl,
    currentTime,
    duration,
    isPlaying,
    subtitles,
    textOverlays,
    isAnalyzing,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    uploadVideo,
    analyzeVideo,
    addSFXTrack,
    setAnalysis,
    setIsAnalyzing,
    saveProject,
    hasUnsavedChanges,
    setProjectMode,
  } = useProject()

  // Load clips and BGM on mount
  useEffect(() => {
    if (project?.id) {
      // Load video clips
      projectsApi.listClips(project.id)
        .then(res => setVideoClips(res.data))
        .catch(err => console.error('Failed to load clips:', err))

      // Load BGM tracks
      projectsApi.listBGM(project.id)
        .then(res => setBgmTracks(res.data))
        .catch(err => console.error('Failed to load BGM:', err))
    }
  }, [project?.id])

  // WebSocket for progress updates
  useWebSocket({
    onProgress: (update: ProgressUpdate) => {
      if (update.type === 'video_analysis') {
        console.log('Analysis progress:', update.progress, update.message)
      }
    },
    onComplete: (update: ProgressUpdate) => {
      if (update.type === 'video_analysis_complete') {
        setIsAnalyzing(false)
        if (update.result) {
          setAnalysis(update.result as any)
        }
      } else if (update.type === 'sfx_generation_complete') {
        if (update.result) {
          const result = update.result as { filename: string; prompt: string; duration: number }
          addSFXTrack({
            filename: result.filename,
            start_time: currentTime,
            duration: result.duration,
            volume: 1,
            prompt: result.prompt,
          })
        }
      }
    },
    onError: (update: ProgressUpdate) => {
      console.error('Task error:', update.error)
      if (update.type === 'video_analysis_error') {
        setIsAnalyzing(false)
      }
    },
  })

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: () => saveProject(),
    onPlayPause: () => {
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.pause()
        } else {
          videoRef.current.play()
        }
      }
    },
    onExport: () => videoUrl && setShowExportDialog(true),
    enabled: true,
  })

  // Toggle shortcuts help with '?' key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && !showExportDialog) {
        setShowShortcutsHelp(prev => !prev)
      }
    }
    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [showExportDialog])

  // Video handlers
  const handleVideoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      try {
        await uploadVideo(file, setUploadProgress)
        setUploadProgress(null)
      } catch (error) {
        console.error('Upload failed:', error)
        setUploadProgress(null)
      }
    },
    [uploadVideo]
  )

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }, [isPlaying, setIsPlaying])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }, [setCurrentTime])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }, [setDuration])

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value)
      if (videoRef.current) {
        videoRef.current.currentTime = time
        setCurrentTime(time)
      }
    },
    [setCurrentTime]
  )

  const seekRelative = useCallback((seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds))
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }, [duration, setCurrentTime])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.volume = vol
      setVolume(vol)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSave = async () => {
    try {
      await saveProject()
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  // Get current subtitle for overlay display
  const currentSubtitle = subtitles.find(
    (s) => currentTime >= s.start_time && currentTime <= s.end_time
  )

  // Get current text overlay for display
  const currentOverlay = textOverlays.find(
    (o) => currentTime >= o.start_time && currentTime <= o.end_time
  )

  return (
    <div className="video-editor">
      {/* Header */}
      <header className="editor-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="project-info">
            <h1>{project?.name}</h1>
            <ModeSwitcher
              currentMode={projectMode}
              onModeChange={setProjectMode}
            />
            {hasUnsavedChanges && <span className="unsaved-badge">Unsaved</span>}
          </div>
        </div>
        <div className="header-actions">
          {projectMode !== 'manual' && (
            <button
              className="analyze-btn"
              onClick={analyzeVideo}
              disabled={!videoUrl || isAnalyzing}
            >
              <Sparkles size={18} />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
            </button>
          )}
          {projectMode === 'automatic' && videoUrl && (
            <button
              className="auto-generate-btn"
              onClick={analyzeVideo}
              disabled={isAnalyzing}
            >
              <Wand2 size={18} />
              {isAnalyzing ? 'Generating...' : 'Auto Generate'}
            </button>
          )}
          <button
            className="shortcuts-btn"
            onClick={() => setShowShortcutsHelp(true)}
            title="Keyboard Shortcuts"
          >
            <Keyboard size={18} />
          </button>
          <button className="save-btn" onClick={handleSave}>
            <Save size={18} />
            Save
          </button>
          <button
            className="export-btn"
            disabled={!videoUrl}
            onClick={() => setShowExportDialog(true)}
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </header>

      <div className="editor-main">
        {/* Left Sidebar - Assets Panel */}
        {project && (
          <div className={`left-sidebar ${showAssetsPanel ? 'open' : 'collapsed'}`}>
            <button
              className="sidebar-toggle"
              onClick={() => setShowAssetsPanel(!showAssetsPanel)}
              title={showAssetsPanel ? 'Hide Assets' : 'Show Assets'}
            >
              {showAssetsPanel ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>
            {showAssetsPanel && <AssetsPanel projectId={project.id} />}
          </div>
        )}

        {/* Video Player */}
        <div className="video-section">
          <div className="video-container">
            {videoUrl ? (
              <>
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                {/* Subtitle overlay */}
                {currentSubtitle && (
                  <div
                    className={`subtitle-overlay ${currentSubtitle.style.position}`}
                    style={{
                      fontSize: currentSubtitle.style.fontSize,
                      fontFamily: currentSubtitle.style.fontFamily,
                      color: currentSubtitle.style.color,
                      backgroundColor: currentSubtitle.style.backgroundColor,
                    }}
                  >
                    {currentSubtitle.text}
                  </div>
                )}

                {/* Text overlay */}
                {currentOverlay && (
                  <div
                    className="text-overlay"
                    style={{
                      left: `${currentOverlay.style.position.x}%`,
                      top: `${currentOverlay.style.position.y}%`,
                      fontSize: currentOverlay.style.fontSize,
                      fontFamily: currentOverlay.style.fontFamily,
                      color: currentOverlay.style.color,
                      backgroundColor: currentOverlay.style.backgroundColor,
                    }}
                  >
                    {currentOverlay.text}
                  </div>
                )}

                {/* Analysis overlay */}
                <AnalysisOverlay isVisible={isAnalyzing} />
              </>
            ) : (
              <div className="upload-prompt">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  style={{ display: 'none' }}
                />
                <button onClick={() => fileInputRef.current?.click()}>
                  <Upload size={32} />
                  <span>Upload Video</span>
                </button>
                {uploadProgress !== null && (
                  <div className="upload-progress">
                    <div
                      className="progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                    <span>{uploadProgress}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Video controls */}
          {videoUrl && (
            <div className="video-controls">
              <button onClick={() => seekRelative(-5)} title="Back 5s">
                <SkipBack size={18} />
              </button>
              <button onClick={togglePlayPause} className="play-btn">
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button onClick={() => seekRelative(5)} title="Forward 5s">
                <SkipForward size={18} />
              </button>

              <span className="time current">{formatTime(currentTime)}</span>

              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="seek-bar"
              />

              <span className="time total">{formatTime(duration)}</span>

              <div className="volume-controls">
                <button onClick={toggleMute}>
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="volume-bar"
                />
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="side-panel">
          <div className="tab-buttons">
            {/* Show Clips tab for multi-clip projects */}
            {(projectMode === 'manual' || projectMode === 'automatic') && (
              <button
                className={activeTab === 'clips' ? 'active' : ''}
                onClick={() => setActiveTab('clips')}
              >
                <Film size={18} />
                Clips
              </button>
            )}
            <button
              className={activeTab === 'subtitles' ? 'active' : ''}
              onClick={() => setActiveTab('subtitles')}
            >
              <Subtitles size={18} />
              Subtitles
            </button>
            <button
              className={activeTab === 'sfx' ? 'active' : ''}
              onClick={() => setActiveTab('sfx')}
            >
              <Music size={18} />
              Sound FX
            </button>
            <button
              className={activeTab === 'overlays' ? 'active' : ''}
              onClick={() => setActiveTab('overlays')}
            >
              <Type size={18} />
              Overlays
            </button>
            <button
              className={activeTab === 'bgm' ? 'active' : ''}
              onClick={() => setActiveTab('bgm')}
            >
              <Headphones size={18} />
              BGM
            </button>
                      </div>

          <div className="tab-content">
            {activeTab === 'clips' && project && (
              <ClipsPanel
                projectId={project.id}
                clips={videoClips}
                onClipsChange={setVideoClips}
              />
            )}
            {activeTab === 'subtitles' && <SubtitleEditor />}
            {activeTab === 'sfx' && <SFXEditor />}
            {activeTab === 'overlays' && <OverlayEditor />}
            {activeTab === 'bgm' && project && (
              <BGMPanel
                projectId={project.id}
                bgmTracks={bgmTracks}
                onBGMChange={setBgmTracks}
              />
            )}
          </div>
        </div>
      </div>

      {/* CapCut-Style Timeline */}
      <div className="timeline-section">
        <Timeline />
      </div>

      {/* Export Dialog */}
      {project && (
        <ExportDialog
          projectId={project.id}
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  )
}
