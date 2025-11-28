import { useState, useEffect, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import { Search, Save, Upload, Settings, HelpCircle, Keyboard, Map } from 'lucide-react'
import toast from 'react-hot-toast'
import { getUserFriendlyError } from '../utils/errorMessages'
import SettingsDialog from './SettingsDialog'
import './TopBar.css'

interface TopBarProps {
  onExport?: () => void
  onThumbnail?: () => void
  onShowShortcuts?: () => void
  onStartTour?: () => void
}

export default function TopBar({ onExport, onThumbnail, onShowShortcuts, onStartTour }: TopBarProps) {
  const {
    videoPath,
    setIsAnalyzing,
    setAnalysis,
    setUnifiedAnalysis,
    subtitles,
    sfxTracks,
    textOverlays,
    projectName,
    projectPath,
    hasUnsavedChanges,
    lastSaved,
    isSaving,
    saveProject,
    saveProjectAs,
    closeProject,
    videoTimelineClips
  } = useProject()

  const [showFileMenu, setShowFileMenu] = useState(false)
  const [showHelpMenu, setShowHelpMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const fileMenuRef = useRef<HTMLDivElement>(null)
  const helpMenuRef = useRef<HTMLDivElement>(null)

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setShowFileMenu(false)
      }
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target as Node)) {
        setShowHelpMenu(false)
      }
    }

    if (showFileMenu || showHelpMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFileMenu, showHelpMenu])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S for Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (projectPath) {
          handleSave()
        }
      }
      // Ctrl/Cmd + Shift + S for Save As
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
        e.preventDefault()
        if (projectPath) {
          handleSaveAs()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [projectPath])

  const handleSave = async () => {
    if (!projectPath) return

    try {
      await saveProject()
      toast.success('Project saved successfully')
    } catch (error) {
      console.error('Error saving project:', error)
      toast.error(getUserFriendlyError(error))
    }
  }

  const handleSaveAs = async () => {
    const name = prompt('Enter new project name:', projectName || 'Untitled')
    if (!name) return

    try {
      const location = await window.electronAPI.openProjectFolder()
      if (!location) return

      const loadingToast = toast.loading('Saving project...')
      await saveProjectAs(name, location)
      toast.dismiss(loadingToast)
      toast.success('Project saved successfully!')
    } catch (error) {
      console.error('Error saving project as:', error)
      toast.error(getUserFriendlyError(error))
    }
  }

  const handleCloseProject = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm(
        'You have unsaved changes. Are you sure you want to close this project?'
      )
      if (!confirm) return
    }

    closeProject()
    // Trigger reload to go back to welcome screen
    window.location.reload()
  }

  const handleAnalyzeVideo = async () => {
    if (!videoPath) return

    const loadingToast = toast.loading('Analyzing video... This may take a few minutes.')

    try {
      setIsAnalyzing(true)

      // Use unified analysis (combines thumbnail, transcription, visual scenes, and SFX suggestions)
      const result = await window.electronAPI.unifiedAnalyze(videoPath)

      if (result.success) {
        setAnalysis(null)  // Clear old "Analyze Timeline" results
        setUnifiedAnalysis(result)
        toast.dismiss(loadingToast)

        // Show summary of what was analyzed
        const summary = []
        if (result.thumbnail_candidates?.length > 0) summary.push(`${result.thumbnail_candidates.length} thumbnail candidates`)
        if (result.transcription?.length > 0) summary.push(`${result.transcription.length} transcript segments`)
        if (result.sfx_suggestions?.length > 0) summary.push(`${result.sfx_suggestions.length} SFX suggestions`)

        toast.success(`Video analyzed! Found: ${summary.join(', ') || 'basic analysis'}`, {
          duration: 5000
        })
      } else {
        throw new Error(result.error || 'Analysis failed')
      }
    } catch (error) {
      console.error('Error analyzing video:', error)
      toast.dismiss(loadingToast)
      toast.error(getUserFriendlyError(error), {
        duration: 6000,
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleExport = () => {
    if (!videoPath) return
    onExport?.()
  }

  const handleExportSubtitles = async () => {
    if (subtitles.length === 0) {
      toast.error('No subtitles to export')
      return
    }

    try {
      const outputPath = await window.electronAPI.saveFileDialog('subtitles.srt')

      if (outputPath) {
        const loadingToast = toast.loading('Exporting subtitles...')

        // Convert subtitles to SRT format
        const srtContent = subtitles
          .map((sub, index) => {
            const startTime = formatSRTTime(sub.start)
            const endTime = formatSRTTime(sub.end)
            return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`
          })
          .join('\n')

        await window.electronAPI.writeFile(outputPath, srtContent)
        toast.dismiss(loadingToast)
        toast.success('Subtitles exported successfully!')
      }
    } catch (error) {
      console.error('Error exporting subtitles:', error)
      toast.error(getUserFriendlyError(error))
    }
  }

  const formatSRTTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms
        .toString()
        .padStart(3, '0')}`
  }

  const formatLastSaved = () => {
    if (!lastSaved) return ''
    const now = new Date()
    const diff = now.getTime() - lastSaved.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Saved just now'
    if (minutes === 1) return 'Saved 1 minute ago'
    if (minutes < 60) return `Saved ${minutes} minutes ago`

    return `Saved at ${lastSaved.toLocaleTimeString()}`
  }

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <div className="file-menu-container" ref={fileMenuRef}>
          <button
            className="file-menu-button"
            onClick={() => setShowFileMenu(!showFileMenu)}
          >
            File
          </button>

          {showFileMenu && (
            <div className="file-menu-dropdown">
              <button
                className="menu-item"
                onClick={() => {
                  handleSave()
                  setShowFileMenu(false)
                }}
                disabled={!projectPath}
              >
                <span>Save</span>
                <span className="shortcut">Ctrl+S</span>
              </button>
              <button
                className="menu-item"
                onClick={() => {
                  handleSaveAs()
                  setShowFileMenu(false)
                }}
                disabled={!projectPath}
              >
                <span>Save As...</span>
                <span className="shortcut">Ctrl+Shift+S</span>
              </button>
              <div className="menu-divider" />
              <button
                className="menu-item"
                onClick={() => {
                  onThumbnail?.()
                  setShowFileMenu(false)
                }}
                disabled={!videoPath}
              >
                <span>Create Thumbnail</span>
              </button>
              <div className="menu-divider" />
              <button
                className="menu-item"
                onClick={() => {
                  handleCloseProject()
                  setShowFileMenu(false)
                }}
              >
                <span>Close Project</span>
              </button>
            </div>
          )}
        </div>

        <div className="project-info">
          {projectName && (
            <>
              <h2 className="project-name">{projectName}</h2>
              <div className="save-status">
                {isSaving ? (
                  <span className="saving">Saving...</span>
                ) : hasUnsavedChanges ? (
                  <span className="unsaved">Unsaved changes</span>
                ) : lastSaved ? (
                  <span className="saved">{formatLastSaved()}</span>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="top-bar-right">
        <button
          className="btn-secondary"
          onClick={handleAnalyzeVideo}
          disabled={videoTimelineClips.length > 0}
          title={videoTimelineClips.length > 0
            ? "Timeline has clips - use 'Analyze Timeline' button in the timeline toolbar instead"
            : "Analyze the source video for captions and SFX suggestions"}
        >
          <Search size={16} />
          <span>Analyze Video</span>
        </button>
        <button className="btn-secondary" onClick={handleExportSubtitles}>
          <Save size={16} />
          <span>Export Subtitles</span>
        </button>
        <button
          className="btn-primary"
          onClick={handleExport}
          disabled={!videoPath}
        >
          <Upload size={16} />
          <span>Export Video</span>
        </button>

        <div className="help-menu-container" ref={helpMenuRef}>
          <button
            className="btn-icon"
            onClick={() => setShowHelpMenu(!showHelpMenu)}
            title="Help"
          >
            <HelpCircle size={20} />
          </button>

          {showHelpMenu && (
            <div className="file-menu-dropdown help-dropdown">
              <button
                className="menu-item"
                onClick={() => {
                  onShowShortcuts?.()
                  setShowHelpMenu(false)
                }}
              >
                <Keyboard size={14} />
                <span>Keyboard Shortcuts</span>
                <span className="shortcut">?</span>
              </button>
              <button
                className="menu-item"
                onClick={() => {
                  onStartTour?.()
                  setShowHelpMenu(false)
                }}
              >
                <Map size={14} />
                <span>Start Tour</span>
              </button>
            </div>
          )}
        </div>

        <button
          className="btn-icon"
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}
