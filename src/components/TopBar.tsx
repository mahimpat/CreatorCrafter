import { useState, useEffect, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import { Search, Save, Upload } from 'lucide-react'
import './TopBar.css'

export default function TopBar() {
  const {
    videoPath,
    setIsAnalyzing,
    setAnalysis,
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
    closeProject
  } = useProject()

  const [isExporting, setIsExporting] = useState(false)
  const [showFileMenu, setShowFileMenu] = useState(false)
  const fileMenuRef = useRef<HTMLDivElement>(null)

  // Close file menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setShowFileMenu(false)
      }
    }

    if (showFileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFileMenu])

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
    } catch (error) {
      console.error('Error saving project:', error)
      alert('Failed to save project. Please try again.')
    }
  }

  const handleSaveAs = async () => {
    const name = prompt('Enter new project name:', projectName || 'Untitled')
    if (!name) return

    try {
      const location = await window.electronAPI.openProjectFolder()
      if (!location) return

      await saveProjectAs(name, location)
      alert('Project saved successfully!')
    } catch (error) {
      console.error('Error saving project as:', error)
      alert('Failed to save project. Please try again.')
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

    try {
      setIsAnalyzing(true)

      // Extract audio
      const audioPath = await window.electronAPI.extractAudio(videoPath)

      // Analyze video
      const analysis = await window.electronAPI.analyzeVideo(videoPath, audioPath)

      setAnalysis(analysis)
    } catch (error) {
      console.error('Error analyzing video:', error)
      alert('Failed to analyze video. Please make sure Python and required dependencies are installed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleExport = async () => {
    if (!videoPath) return

    try {
      setIsExporting(true)

      const outputPath = await window.electronAPI.saveFileDialog('output.mp4')

      if (outputPath) {
        await window.electronAPI.renderVideo({
          videoPath,
          outputPath,
          subtitles: subtitles.map(s => ({
            text: s.text,
            start: s.start,
            end: s.end
          })),
          sfxTracks: sfxTracks.map(sfx => ({
            path: sfx.path,
            start: sfx.start
          })),
          overlays: textOverlays.map(o => ({
            text: o.text,
            start: o.start,
            end: o.end,
            style: o.style
          }))
        })

        // Copy exported video to project exports folder if project exists
        if (projectPath) {
          try {
            await window.electronAPI.copyAssetToProject(outputPath, projectPath, 'exports')
          } catch (err) {
            console.error('Failed to copy export to project:', err)
          }
        }

        alert('Video exported successfully!')
      }
    } catch (error) {
      console.error('Error exporting video:', error)
      alert('Failed to export video. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSubtitles = async () => {
    if (subtitles.length === 0) {
      alert('No subtitles to export')
      return
    }

    try {
      const outputPath = await window.electronAPI.saveFileDialog('subtitles.srt')

      if (outputPath) {
        // Convert subtitles to SRT format
        const srtContent = subtitles
          .map((sub, index) => {
            const startTime = formatSRTTime(sub.start)
            const endTime = formatSRTTime(sub.end)
            return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`
          })
          .join('\n')

        await window.electronAPI.writeFile(outputPath, srtContent)
        alert('Subtitles exported successfully!')
      }
    } catch (error) {
      console.error('Error exporting subtitles:', error)
      alert('Failed to export subtitles. Please try again.')
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
        <button className="btn-secondary" onClick={handleAnalyzeVideo}>
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
          disabled={isExporting}
        >
          <Upload size={16} />
          <span>{isExporting ? 'Exporting...' : 'Export Video'}</span>
        </button>
      </div>
    </div>
  )
}
