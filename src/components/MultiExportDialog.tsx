import { useState } from 'react'
import { X, Download, Check, Loader } from 'lucide-react'
import { PLATFORM_SPECS, PLATFORM_PRESETS, PlatformSpec, MultiExportResult } from '../types/export'
import toast from 'react-hot-toast'
import './MultiExportDialog.css'

interface MultiExportDialogProps {
  sourceThumbnailPath: string
  onClose: () => void
}

export default function MultiExportDialog({ sourceThumbnailPath, onClose }: MultiExportDialogProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(['youtube-thumbnail']))
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [smartCrop, setSmartCrop] = useState(true)
  const [preserveAspect, setPreserveAspect] = useState(false)
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg')
  const [quality, setQuality] = useState(90)
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<MultiExportResult | null>(null)
  const [filterCategory, setFilterCategory] = useState<'all' | 'video' | 'social' | 'web'>('all')

  const togglePlatform = (platformId: string) => {
    const newSelected = new Set(selectedPlatforms)
    if (newSelected.has(platformId)) {
      newSelected.delete(platformId)
    } else {
      newSelected.add(platformId)
    }
    setSelectedPlatforms(newSelected)
    setSelectedPreset('')  // Clear preset when manually selecting
  }

  const applyPreset = (presetKey: string) => {
    const platformIds = PLATFORM_PRESETS[presetKey as keyof typeof PLATFORM_PRESETS]
    if (platformIds) {
      setSelectedPlatforms(new Set(platformIds))
      setSelectedPreset(presetKey)
    }
  }

  const handleExport = async () => {
    if (selectedPlatforms.size === 0) {
      toast.error('Please select at least one platform')
      return
    }

    setIsExporting(true)
    setExportResult(null)

    try {
      // Get selected platform specs
      const platformSpecs = PLATFORM_SPECS.filter(spec =>
        selectedPlatforms.has(spec.id)
      ).map(spec => ({
        id: spec.id,
        displayName: spec.displayName,
        dimensions: spec.dimensions,
        recommendedFormat: spec.recommendedFormat
      }))

      // Get output directory (same as source)
      const sourceDir = sourceThumbnailPath.substring(0, sourceThumbnailPath.lastIndexOf('/'))
      const baseFilename = sourceThumbnailPath.substring(
        sourceThumbnailPath.lastIndexOf('/') + 1,
        sourceThumbnailPath.lastIndexOf('.')
      )

      toast.loading('Exporting to multiple platforms...')

      const result = await window.electronAPI.thumbnailMultiExport({
        sourcePath: sourceThumbnailPath,
        platforms: platformSpecs,
        outputDir: sourceDir + '/exports',
        baseFilename: baseFilename,
        format: {
          format: outputFormat,
          quality: outputFormat === 'png' ? undefined : quality
        },
        smartCrop: smartCrop,
        preserveAspect: preserveAspect
      })

      setExportResult(result)

      if (result.success) {
        toast.success(`Successfully exported ${result.totalExported} thumbnails!`)
      } else {
        toast.error(`Export completed with ${result.totalFailed} errors`)
      }
    } catch (error: any) {
      console.error('Multi-export error:', error)
      toast.error(error.message || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const filteredPlatforms = PLATFORM_SPECS.filter(spec =>
    filterCategory === 'all' || spec.category === filterCategory
  )

  if (exportResult) {
    return (
      <div className="multi-export-overlay">
        <div className="multi-export-dialog">
          <div className="dialog-header">
            <h3>Export Complete</h3>
            <button className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="export-results">
            <div className="result-summary">
              <div className="summary-stat success">
                <Check size={32} />
                <div>
                  <div className="stat-value">{exportResult.totalExported}</div>
                  <div className="stat-label">Successful</div>
                </div>
              </div>
              {exportResult.totalFailed > 0 && (
                <div className="summary-stat error">
                  <X size={32} />
                  <div>
                    <div className="stat-value">{exportResult.totalFailed}</div>
                    <div className="stat-label">Failed</div>
                  </div>
                </div>
              )}
            </div>

            <div className="result-list">
              {exportResult.results.map((result, index) => (
                <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                  <div className="result-icon">
                    {result.success ? <Check size={16} /> : <X size={16} />}
                  </div>
                  <div className="result-info">
                    <div className="result-platform">{result.platformName}</div>
                    <div className="result-details">
                      {result.success ? (
                        <>
                          {result.dimensions.width}x{result.dimensions.height} •
                          {(result.fileSize / 1024).toFixed(1)} KB •
                          {result.format.toUpperCase()}
                        </>
                      ) : (
                        <span className="error-text">{result.error}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="result-actions">
              <button
                className="btn-secondary"
                onClick={() => window.electronAPI.showInFolder(exportResult.outputDir)}
              >
                Open Export Folder
              </button>
              <button className="btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="multi-export-overlay">
      <div className="multi-export-dialog">
        <div className="dialog-header">
          <h3>Export to Multiple Platforms</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="dialog-content">
          {/* Quick Presets */}
          <div className="section">
            <h4>Quick Presets</h4>
            <div className="preset-buttons">
              {Object.entries(PLATFORM_PRESETS).map(([key, platforms]) => (
                <button
                  key={key}
                  className={`preset-btn ${selectedPreset === key ? 'active' : ''}`}
                  onClick={() => applyPreset(key)}
                >
                  {key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  <span className="preset-count">({platforms.length})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platform Selection */}
          <div className="section">
            <div className="section-header">
              <h4>Select Platforms ({selectedPlatforms.size})</h4>
              <div className="category-filter">
                {(['all', 'video', 'social', 'web'] as const).map(category => (
                  <button
                    key={category}
                    className={`filter-btn ${filterCategory === category ? 'active' : ''}`}
                    onClick={() => setFilterCategory(category)}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="platform-grid">
              {filteredPlatforms.map((platform) => (
                <div
                  key={platform.id}
                  className={`platform-card ${selectedPlatforms.has(platform.id) ? 'selected' : ''}`}
                  onClick={() => togglePlatform(platform.id)}
                >
                  <div className="platform-icon">{platform.icon}</div>
                  <div className="platform-info">
                    <div className="platform-name">{platform.displayName}</div>
                    <div className="platform-specs">
                      {platform.dimensions.width}x{platform.dimensions.height}
                    </div>
                    <div className="platform-aspect">{platform.aspectRatio}</div>
                  </div>
                  {selectedPlatforms.has(platform.id) && (
                    <div className="selected-indicator">
                      <Check size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="section">
            <h4>Export Options</h4>
            <div className="options-grid">
              <div className="option-group">
                <label>Format</label>
                <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as any)}>
                  <option value="jpeg">JPEG</option>
                  <option value="png">PNG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>

              {outputFormat !== 'png' && (
                <div className="option-group">
                  <label>Quality: {quality}%</label>
                  <input
                    type="range"
                    min="60"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                  />
                </div>
              )}

              <div className="option-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={smartCrop}
                    onChange={(e) => setSmartCrop(e.target.checked)}
                  />
                  <span>Smart Crop (Face Detection)</span>
                </label>
                <small>Automatically centers on faces when cropping</small>
              </div>

              <div className="option-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={preserveAspect}
                    onChange={(e) => setPreserveAspect(e.target.checked)}
                  />
                  <span>Preserve Aspect Ratio</span>
                </label>
                <small>Add letterboxing instead of cropping</small>
              </div>
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn-secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={isExporting || selectedPlatforms.size === 0}
          >
            {isExporting ? (
              <>
                <Loader size={16} className="spinning" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export {selectedPlatforms.size} Platform{selectedPlatforms.size !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
