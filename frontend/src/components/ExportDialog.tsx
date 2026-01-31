/**
 * ExportDialog - Modal for exporting video with options
 */
import { useState } from 'react'
import { X, Download, FileVideo, FileText, Loader2, CheckCircle } from 'lucide-react'
import { videoApi, projectsApi } from '../api'
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
  const [exportResult, setExportResult] = useState<{ url: string; filename: string } | null>(null)

  if (!isOpen) return null

  const handleExportVideo = async () => {
    setIsExporting(true)
    setExportProgress(0)
    setExportResult(null)

    try {
      // Show indeterminate progress
      setExportProgress(10)

      // Call the stitch endpoint to render video with transitions
      const response = await projectsApi.stitchClips(projectId)

      if (response.data.success) {
        setExportProgress(100)
        setExportResult({
          url: response.data.url,
          filename: response.data.filename
        })
        console.log('Export complete:', response.data)
      } else {
        throw new Error('Export failed')
      }

    } catch (error: any) {
      console.error('Export failed:', error)
      setIsExporting(false)
      setExportProgress(0)
      const message = error.response?.data?.detail || error.message || 'Export failed. Please try again.'
      alert(message)
    }
  }

  const handleDownload = () => {
    if (exportResult) {
      // Open the video URL in a new tab or trigger download
      window.open(exportResult.url, '_blank')
    }
  }

  const handleClose = () => {
    setExportResult(null)
    setIsExporting(false)
    setExportProgress(0)
    onClose()
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
    <div className="export-dialog-overlay" onClick={handleClose}>
      <div className="export-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Export Project</h2>
          <button className="close-btn" onClick={handleClose}>
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
          {isExporting && exportType === 'video' && !exportResult && (
            <div className="export-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${exportProgress}%` }} />
              </div>
              <span>
                <Loader2 size={14} className="spinning" style={{ marginRight: 8 }} />
                Rendering video with transitions...
              </span>
            </div>
          )}

          {/* Export Complete */}
          {exportResult && (
            <div className="export-complete">
              <CheckCircle size={48} color="#10b981" />
              <h3>Export Complete!</h3>
              <p>Your video has been rendered with all transitions applied.</p>
              <button className="download-btn" onClick={handleDownload}>
                <Download size={18} />
                Download Video
              </button>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="cancel-btn" onClick={handleClose} disabled={isExporting && !exportResult}>
            {exportResult ? 'Close' : 'Cancel'}
          </button>
          {!exportResult && (
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
          )}
        </div>
      </div>
    </div>
  )
}
