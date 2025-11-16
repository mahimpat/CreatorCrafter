import { useState } from 'react'
import { Monitor, Smartphone, Tablet, Eye } from 'lucide-react'
import './ThumbnailMobilePreview.css'

interface ThumbnailMobilePreviewProps {
  thumbnailPath: string | null
  onClose: () => void
}

type PreviewSize = 'desktop' | 'tablet' | 'mobile'

interface PreviewConfig {
  name: string
  icon: React.ReactNode
  width: number
  height: number
  description: string
  wcagMinimum: number  // Minimum recommended font size in pixels
}

export default function ThumbnailMobilePreview({ thumbnailPath, onClose }: ThumbnailMobilePreviewProps) {
  const [activeSize, setActiveSize] = useState<PreviewSize>('mobile')

  const previewConfigs: Record<PreviewSize, PreviewConfig> = {
    desktop: {
      name: 'Desktop (1920x1080)',
      icon: <Monitor size={18} />,
      width: 1920,
      height: 1080,
      description: 'Full quality - YouTube desktop, TV apps',
      wcagMinimum: 140  // Recommended minimum font size for desktop
    },
    tablet: {
      name: 'Tablet (640x360)',
      icon: <Tablet size={18} />,
      width: 640,
      height: 360,
      description: 'Medium size - iPad, Android tablets',
      wcagMinimum: 48
    },
    mobile: {
      name: 'Mobile (320x180)',
      icon: <Smartphone size={18} />,
      width: 320,
      height: 180,
      description: 'Critical test - iPhone, Android phones, search results',
      wcagMinimum: 24
    }
  }

  const activeConfig = previewConfigs[activeSize]

  // Calculate scale to fit preview container
  const containerWidth = 600
  const scale = containerWidth / activeConfig.width
  const scaledHeight = activeConfig.height * scale

  return (
    <div className="mobile-preview-overlay" onClick={onClose}>
      <div className="mobile-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <div className="header-title">
            <Eye size={20} />
            <h3>Mobile Preview Validator</h3>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <p className="help-text" style={{ margin: '0 0 20px 0' }}>
          Test how your thumbnail looks at different sizes. Text should be readable even on mobile!
        </p>

        {/* Size Selector */}
        <div className="size-selector">
          {(Object.entries(previewConfigs) as [PreviewSize, PreviewConfig][]).map(([size, config]) => (
            <button
              key={size}
              className={`size-btn ${activeSize === size ? 'active' : ''}`}
              onClick={() => setActiveSize(size)}
            >
              {config.icon}
              <div className="size-info">
                <span className="size-name">{config.name}</span>
                <span className="size-desc">{config.description}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Preview Container */}
        <div className="preview-container">
          <div className="preview-label">
            <span>Preview at {activeConfig.width}×{activeConfig.height}px</span>
            <span className="scale-indicator">Scale: {(scale * 100).toFixed(0)}%</span>
          </div>

          <div
            className="preview-frame"
            style={{
              width: `${containerWidth}px`,
              height: `${scaledHeight}px`,
              background: '#000'
            }}
          >
            {thumbnailPath ? (
              <img
                src={`file://${thumbnailPath}`}
                alt="Thumbnail preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div className="no-thumbnail">
                <Smartphone size={48} />
                <p>Generate a thumbnail to preview</p>
              </div>
            )}
          </div>

          {/* Actual Size Preview (for mobile/tablet) */}
          {activeSize !== 'desktop' && thumbnailPath && (
            <div className="actual-size-preview">
              <div className="actual-size-label">
                <span>Actual Size ({activeConfig.width}×{activeConfig.height}px)</span>
                <span className="warning-text">
                  ⚠️ This is how it really looks on {activeConfig.name.split('(')[0].trim()}
                </span>
              </div>
              <div
                className="actual-size-frame"
                style={{
                  width: `${activeConfig.width}px`,
                  height: `${activeConfig.height}px`,
                  maxWidth: '100%'
                }}
              >
                <img
                  src={`file://${thumbnailPath}`}
                  alt="Actual size preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    imageRendering: 'pixelated'  // Show actual pixels
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quality Checklist */}
        {thumbnailPath && (
          <div className="quality-checklist">
            <h4>✓ Quality Checklist for {activeConfig.name.split('(')[0].trim()}</h4>
            <div className="checklist-items">
              <div className="checklist-item">
                <span className="check-icon">📏</span>
                <div className="check-content">
                  <strong>Text Size</strong>
                  <p>Minimum {activeConfig.wcagMinimum}px font recommended for readability</p>
                </div>
              </div>
              <div className="checklist-item">
                <span className="check-icon">🎨</span>
                <div className="check-content">
                  <strong>Contrast</strong>
                  <p>Text should have thick outlines (12-20px) for maximum visibility</p>
                </div>
              </div>
              <div className="checklist-item">
                <span className="check-icon">👁️</span>
                <div className="check-content">
                  <strong>Clarity Test</strong>
                  <p>Can you read the text from 6 feet away? If not, make it bigger!</p>
                </div>
              </div>
              {activeSize === 'mobile' && (
                <div className="checklist-item warning">
                  <span className="check-icon">⚡</span>
                  <div className="check-content">
                    <strong>Mobile Critical</strong>
                    <p>Most viewers see this size first! Thumbnail must be impactful even at 320×180px</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pro Tips */}
        <div className="pro-tips">
          <h4>💡 Pro Tips</h4>
          <ul>
            <li><strong>Use 18-20px multi-stroke outlines</strong> - Our templates use professional 3-layer outlines for maximum readability</li>
            <li><strong>Test on mobile first</strong> - If it works at 320×180, it works everywhere</li>
            <li><strong>Bold, simple text</strong> - Keep text under 50 characters, use 2-3 words max</li>
            <li><strong>High contrast</strong> - Dark text on bright background or vice versa</li>
            <li><strong>Face close-ups</strong> - Faces should be large and clear, especially on mobile</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
