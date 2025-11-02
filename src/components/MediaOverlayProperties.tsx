import { useProject } from '../context/ProjectContext'
import { Sliders, Eye, Layers, RotateCw, Move, Maximize2 } from 'lucide-react'
import './MediaOverlayProperties.css'

export default function MediaOverlayProperties() {
  const {
    mediaOverlays,
    mediaOverlayAssets,
    updateMediaOverlay,
    selectedClipIds
  } = useProject()

  // Get the selected overlay (only show properties if exactly one overlay is selected)
  const selectedOverlay = mediaOverlays.find(o => selectedClipIds.includes(o.id))
  const selectedAsset = selectedOverlay
    ? mediaOverlayAssets.find(a => a.id === selectedOverlay.assetId)
    : null

  if (!selectedOverlay || !selectedAsset) {
    return (
      <div className="media-overlay-properties">
        <div className="properties-header">
          <Sliders size={16} />
          <span>Overlay Properties</span>
        </div>
        <div className="properties-empty">
          <p>Select an overlay to edit its properties</p>
        </div>
      </div>
    )
  }

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = parseFloat(e.target.value)
    updateMediaOverlay(selectedOverlay.id, { opacity })
  }

  const handleBlendModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const blendMode = e.target.value as any
    updateMediaOverlay(selectedOverlay.id, { blendMode })
  }

  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rotation = parseFloat(e.target.value)
    updateMediaOverlay(selectedOverlay.id, {
      transform: { ...selectedOverlay.transform, rotation }
    })
  }

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const scale = parseFloat(e.target.value)
    updateMediaOverlay(selectedOverlay.id, {
      transform: {
        ...selectedOverlay.transform,
        scaleX: scale,
        scaleY: scale
      }
    })
  }

  const handleVisibilityToggle = () => {
    updateMediaOverlay(selectedOverlay.id, {
      visible: !selectedOverlay.visible
    })
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedAsset.type === 'video') {
      const volume = parseFloat(e.target.value)
      updateMediaOverlay(selectedOverlay.id, { volume })
    }
  }

  return (
    <div className="media-overlay-properties">
      <div className="properties-header">
        <Sliders size={16} />
        <span>Overlay Properties</span>
      </div>

      <div className="properties-content">
        {/* Asset Info */}
        <div className="property-section">
          <div className="property-section-title">Asset</div>
          <div className="asset-info">
            <div className="asset-name">{selectedAsset.name}</div>
            <div className="asset-type">{selectedAsset.type.toUpperCase()}</div>
          </div>
        </div>

        {/* Visibility */}
        <div className="property-section">
          <div className="property-row">
            <label className="property-label">
              <Eye size={14} />
              <span>Visible</span>
            </label>
            <button
              className={`toggle-btn ${selectedOverlay.visible ? 'active' : ''}`}
              onClick={handleVisibilityToggle}
            >
              {selectedOverlay.visible ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Opacity */}
        <div className="property-section">
          <div className="property-row">
            <label className="property-label">
              <Layers size={14} />
              <span>Opacity</span>
            </label>
            <span className="property-value">{Math.round(selectedOverlay.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={selectedOverlay.opacity}
            onChange={handleOpacityChange}
            className="property-slider"
          />
        </div>

        {/* Blend Mode */}
        <div className="property-section">
          <div className="property-row">
            <label className="property-label">
              <Layers size={14} />
              <span>Blend Mode</span>
            </label>
          </div>
          <select
            value={selectedOverlay.blendMode}
            onChange={handleBlendModeChange}
            className="property-select"
          >
            <option value="normal">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="darken">Darken</option>
            <option value="lighten">Lighten</option>
          </select>
        </div>

        {/* Rotation */}
        <div className="property-section">
          <div className="property-row">
            <label className="property-label">
              <RotateCw size={14} />
              <span>Rotation</span>
            </label>
            <span className="property-value">{Math.round(selectedOverlay.transform.rotation)}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={selectedOverlay.transform.rotation}
            onChange={handleRotationChange}
            className="property-slider"
          />
        </div>

        {/* Scale */}
        <div className="property-section">
          <div className="property-row">
            <label className="property-label">
              <Maximize2 size={14} />
              <span>Scale</span>
            </label>
            <span className="property-value">{Math.round(selectedOverlay.transform.scaleX * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.01"
            value={selectedOverlay.transform.scaleX}
            onChange={handleScaleChange}
            className="property-slider"
          />
        </div>

        {/* Position */}
        <div className="property-section">
          <div className="property-section-title">
            <Move size={14} />
            <span>Position</span>
          </div>
          <div className="property-grid">
            <div className="property-input-group">
              <label>X</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={selectedOverlay.transform.x.toFixed(2)}
                onChange={(e) => updateMediaOverlay(selectedOverlay.id, {
                  transform: { ...selectedOverlay.transform, x: parseFloat(e.target.value) }
                })}
                className="property-number-input"
              />
            </div>
            <div className="property-input-group">
              <label>Y</label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={selectedOverlay.transform.y.toFixed(2)}
                onChange={(e) => updateMediaOverlay(selectedOverlay.id, {
                  transform: { ...selectedOverlay.transform, y: parseFloat(e.target.value) }
                })}
                className="property-number-input"
              />
            </div>
          </div>
        </div>

        {/* Video-specific controls */}
        {selectedAsset.type === 'video' && (
          <div className="property-section">
            <div className="property-row">
              <label className="property-label">
                <span>Volume</span>
              </label>
              <span className="property-value">{Math.round((selectedOverlay.volume || 0) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedOverlay.volume || 0}
              onChange={handleVolumeChange}
              className="property-slider"
            />
          </div>
        )}

        {/* Timing Info */}
        <div className="property-section">
          <div className="property-section-title">Timing</div>
          <div className="timing-info">
            <div className="timing-row">
              <span className="timing-label">Start:</span>
              <span className="timing-value">{selectedOverlay.start.toFixed(2)}s</span>
            </div>
            <div className="timing-row">
              <span className="timing-label">Duration:</span>
              <span className="timing-value">{selectedOverlay.duration.toFixed(2)}s</span>
            </div>
            <div className="timing-row">
              <span className="timing-label">End:</span>
              <span className="timing-value">{(selectedOverlay.start + selectedOverlay.duration).toFixed(2)}s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
