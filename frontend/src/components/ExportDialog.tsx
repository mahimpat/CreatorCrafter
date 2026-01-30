/**
 * ExportDialog - Modal for exporting video with options
 */
import { useState } from 'react'
import { X, Download, FileVideo, FileText, Loader2 } from 'lucide-react'
import { videoApi } from '../api'
import './ExportDialog.css'

interface ExportDialogProps {
  projectId: number
  isOpen: boolean
  onClose: () => void
}

type ExportFormat = '1080p' | '720p' | '480p'
type ExportType = 'video' | 'subtitles'

export default function ExportDialog({ projectId, isOpen, onClose }: ExportDialogProps) {
  const [exportType, setExportType] = useState<ExportType>('video')
  const [format, setFormat] = useState<ExportFormat>('1080p')
  const [includeSubtitles, setIncludeSubtitles] = useState(true)
  const [includeSfx, setIncludeSfx] = useState(true)
  const [includeBgm, setIncludeBgm] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  if (!isOpen) return null

  const handleExportVideo = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      const response = await videoApi.render(projectId, {
        format,
        include_subtitles: includeSubtitles,
        include_sfx: includeSfx,
        include_bgm: includeBgm,
      })

      // Poll for progress or use WebSocket
      console.log('Export started:', response.data)

      // Simulate progress for now
      const interval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            setIsExporting(false)
            return 100
          }
          return prev + 10
        })
      }, 500)

    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
      alert('Export failed. Please try again.')
    }
  }

  const handleExportSubtitles = async () => {
    setIsExporting(true)

    try {
      const response = await videoApi.exportSubtitles(projectId)

      // Create download link
      const blob = new Blob([response.data], { type: 'text/srt' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `subtitles_${projectId}.srt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setIsExporting(false)
      onClose()
    } catch (error) {
      console.error('Subtitle export failed:', error)
      setIsExporting(false)
      alert('Failed to export subtitles.')
    }
  }

  const handleExport = () => {
    if (exportType === 'video') {
      handleExportVideo()
    } else {
      handleExportSubtitles()
    }
  }

  return (
    <div className="export-dialog-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Export Project</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="dialog-content">
          {/* Export Type Selection */}
          <div className="export-type-selector">
            <button
              className={`type-btn ${exportType === 'video' ? 'active' : ''}`}
              onClick={() => setExportType('video')}
            >
              <FileVideo size={24} />
              <span>Export Video</span>
            </button>
            <button
              className={`type-btn ${exportType === 'subtitles' ? 'active' : ''}`}
              onClick={() => setExportType('subtitles')}
            >
              <FileText size={24} />
              <span>Export Subtitles</span>
            </button>
          </div>

          {exportType === 'video' && (
            <>
              {/* Video Quality */}
              <div className="option-group">
                <label>Video Quality</label>
                <div className="quality-options">
                  {(['1080p', '720p', '480p'] as ExportFormat[]).map(q => (
                    <button
                      key={q}
                      className={`quality-btn ${format === q ? 'active' : ''}`}
                      onClick={() => setFormat(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Include Options */}
              <div className="option-group">
                <label>Include in Export</label>
                <div className="checkbox-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeSubtitles}
                      onChange={e => setIncludeSubtitles(e.target.checked)}
                    />
                    <span>Subtitles (burned in)</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeSfx}
                      onChange={e => setIncludeSfx(e.target.checked)}
                    />
                    <span>Sound Effects</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeBgm}
                      onChange={e => setIncludeBgm(e.target.checked)}
                    />
                    <span>Background Music</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {exportType === 'subtitles' && (
            <div className="subtitle-export-info">
              <p>Export subtitles as SRT file format.</p>
              <p className="info-note">SRT files can be imported into most video players and editing software.</p>
            </div>
          )}

          {/* Progress */}
          {isExporting && exportType === 'video' && (
            <div className="export-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${exportProgress}%` }} />
              </div>
              <span>{exportProgress}% - Rendering video...</span>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="cancel-btn" onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          <button className="export-btn" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 size={18} className="spinning" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={18} />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
