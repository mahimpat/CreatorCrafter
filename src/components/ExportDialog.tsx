import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useProject } from '../context/ProjectContext'
import { getUserFriendlyError, getSuggestedAction } from '../utils/errorMessages'
import './ExportDialog.css'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface ExportSettings {
  format: 'mp4' | 'mov' | 'webm'
  quality: 'high' | 'medium' | 'low' | '4k'
  includeSubtitles: boolean
  includeSFX: boolean
  includeOverlays: boolean
}

const QUALITY_PRESETS = {
  '4k': { width: 3840, height: 2160, bitrate: '20M', crf: '18', label: '4K (3840x2160)' },
  'high': { width: 1920, height: 1080, bitrate: '8M', crf: '23', label: '1080p (High Quality)' },
  'medium': { width: 1280, height: 720, bitrate: '4M', crf: '25', label: '720p (Medium Quality)' },
  'low': { width: 854, height: 480, bitrate: '2M', crf: '28', label: '480p (Low Quality)' }
}

export default function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { videoPath, subtitles, sfxTracks, mediaOverlays, mediaOverlayAssets, projectPath } = useProject()

  const [settings, setSettings] = useState<ExportSettings>({
    format: 'mp4',
    quality: 'high',
    includeSubtitles: true,
    includeSFX: true,
    includeOverlays: true
  })

  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportSpeed, setExportSpeed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Listen for render progress events
  useEffect(() => {
    const handleProgress = (_event: any, data: { progress: string }) => {
      setExportProgress(parseFloat(data.progress))
    }

    const handleSpeed = (_event: any, data: { speed: number }) => {
      setExportSpeed(data.speed)
    }

    // @ts-ignore - electron IPC
    window.electron?.ipcRenderer?.on('render-progress', handleProgress)
    // @ts-ignore
    window.electron?.ipcRenderer?.on('render-speed', handleSpeed)

    return () => {
      // @ts-ignore
      window.electron?.ipcRenderer?.removeListener('render-progress', handleProgress)
      // @ts-ignore
      window.electron?.ipcRenderer?.removeListener('render-speed', handleSpeed)
    }
  }, [])

  const handleExport = async () => {
    if (!videoPath || !projectPath) {
      toast.error('No video or project loaded')
      return
    }

    setIsExporting(true)
    setExportProgress(0)
    setError(null)

    const loadingToast = toast.loading('Preparing export...')

    try {
      // Get default output path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const defaultPath = `${projectPath}/exports/export-${timestamp}.${settings.format}`

      // Ask user for save location
      const outputPath = await window.electronAPI.saveFileDialog(defaultPath)
      if (!outputPath) {
        toast.dismiss(loadingToast)
        setIsExporting(false)
        return
      }

      toast.dismiss(loadingToast)
      toast.loading('Exporting video... This may take a few minutes.')

      // Prepare render options
      const renderOptions: any = {
        videoPath,
        outputPath,
        subtitles: settings.includeSubtitles ? subtitles.map(sub => ({
          text: sub.text,
          start: sub.start,
          end: sub.end,
          style: sub.style
        })) : undefined,
        sfxTracks: settings.includeSFX ? sfxTracks.map(track => ({
          path: track.path,
          start: track.start
        })) : undefined,
        overlays: settings.includeOverlays ? mediaOverlays.map(overlay => {
          // Find the asset for this overlay
          const asset = mediaOverlayAssets.find(a => a.id === overlay.assetId)
          if (!asset) return null

          return {
            mediaPath: asset.path,
            x: overlay.transform.x,
            y: overlay.transform.y,
            width: overlay.transform.width,
            height: overlay.transform.height,
            opacity: overlay.opacity,
            rotation: overlay.transform.rotation,
            start: overlay.start,
            end: overlay.start + overlay.duration
          }
        }).filter(Boolean) : undefined
      }

      console.log('Starting export with options:', renderOptions)

      // Start rendering
      const result = await window.electronAPI.renderVideo(renderOptions)

      console.log('Export completed:', result)

      // Show success message
      toast.dismiss()
      toast.success('Video exported successfully!', { duration: 5000 })

      onClose()
    } catch (err: any) {
      console.error('Export failed:', err)
      toast.dismiss()

      const friendlyError = getUserFriendlyError(err)
      const suggestion = getSuggestedAction(err)

      setError(suggestion ? `${friendlyError}\n\n${suggestion}` : friendlyError)
      toast.error(friendlyError, { duration: 6000 })
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  const estimateFileSize = () => {
    // Rough estimation based on bitrate and video duration
    // This would need actual video duration from metadata
    const preset = QUALITY_PRESETS[settings.quality]
    const bitrateKbps = parseInt(preset.bitrate)
    const estimatedDuration = 60 // seconds (placeholder)
    const estimatedSizeMB = (bitrateKbps * estimatedDuration) / 8 / 1024
    return `~${estimatedSizeMB.toFixed(0)} MB (estimated)`
  }

  if (!isOpen) return null

  return (
    <div className="export-dialog-overlay" onClick={onClose}>
      <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="export-dialog-header">
          <h2>Export Video</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {isExporting ? (
          <div className="export-progress">
            <h3>Exporting Video...</h3>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <div className="progress-info">
              <span>{exportProgress.toFixed(1)}% complete</span>
              {exportSpeed > 0 && (
                <span className="speed">{exportSpeed.toFixed(2)}x speed</span>
              )}
            </div>
            <p className="progress-note">
              This may take a few minutes depending on video length and quality settings.
            </p>
          </div>
        ) : (
          <>
            <div className="export-dialog-body">
              {error && (
                <div className="export-error">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div className="export-section">
                <label>Format</label>
                <select
                  value={settings.format}
                  onChange={(e) => setSettings({ ...settings, format: e.target.value as any })}
                >
                  <option value="mp4">MP4 (H.264) - Best Compatibility</option>
                  <option value="mov">MOV (QuickTime)</option>
                  <option value="webm">WebM (VP9) - Web Optimized</option>
                </select>
              </div>

              <div className="export-section">
                <label>Quality Preset</label>
                <select
                  value={settings.quality}
                  onChange={(e) => setSettings({ ...settings, quality: e.target.value as any })}
                >
                  {Object.entries(QUALITY_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <span className="export-hint">
                  Estimated file size: {estimateFileSize()}
                </span>
              </div>

              <div className="export-section">
                <label>Include in Export</label>
                <div className="export-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.includeSubtitles}
                      onChange={(e) => setSettings({ ...settings, includeSubtitles: e.target.checked })}
                      disabled={subtitles.length === 0}
                    />
                    <span>Subtitles ({subtitles.length})</span>
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.includeSFX}
                      onChange={(e) => setSettings({ ...settings, includeSFX: e.target.checked })}
                      disabled={sfxTracks.length === 0}
                    />
                    <span>Sound Effects ({sfxTracks.length})</span>
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.includeOverlays}
                      onChange={(e) => setSettings({ ...settings, includeOverlays: e.target.checked })}
                      disabled={mediaOverlays.length === 0}
                    />
                    <span>Media Overlays ({mediaOverlays.length})</span>
                  </label>
                </div>
              </div>

              <div className="export-info">
                <h4>Export Settings Summary:</h4>
                <ul>
                  <li><strong>Format:</strong> {settings.format.toUpperCase()}</li>
                  <li><strong>Quality:</strong> {QUALITY_PRESETS[settings.quality].label}</li>
                  <li><strong>Video Codec:</strong> H.264</li>
                  <li><strong>Audio Codec:</strong> AAC</li>
                  {settings.includeSubtitles && <li>✓ Subtitles will be burned into video</li>}
                  {settings.includeSFX && <li>✓ Sound effects will be mixed with audio</li>}
                  {settings.includeOverlays && <li>✓ Media overlays will be composited</li>}
                </ul>
              </div>
            </div>

            <div className="export-dialog-footer">
              <button className="cancel-button" onClick={onClose}>
                Cancel
              </button>
              <button
                className="export-button"
                onClick={handleExport}
                disabled={!videoPath}
              >
                Export Video
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
