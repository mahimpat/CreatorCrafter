import React, { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import { CAPTION_TEMPLATES, applyTemplate } from '../types/captionTemplates'
import { Sparkles, Wand2, X, Play, Pause } from 'lucide-react'
import './CaptionStyling.css'

interface CaptionStylingProps {
  onClose: () => void
}

export const CaptionStyling: React.FC<CaptionStylingProps> = ({ onClose }) => {
  const { subtitles, updateSubtitle } = useProject()
  const [selectedTemplate, setSelectedTemplate] = useState<'dynamic' | 'impact' | 'minimal' | 'energetic' | 'professional'>('dynamic')
  const [previewIndex, setPreviewIndex] = useState(0)
  const [isApplying, setIsApplying] = useState(false)
  const [sentimentStats, setSentimentStats] = useState<any>(null)
  const [showCustomization, setShowCustomization] = useState(false)

  const handleApplyTemplate = () => {
    setIsApplying(true)

    // Apply template to all subtitles
    subtitles.forEach(subtitle => {
      const styledSubtitle = applyTemplate(selectedTemplate, subtitle)
      updateSubtitle(subtitle.id, styledSubtitle)
    })

    setTimeout(() => {
      setIsApplying(false)
      onClose()
    }, 500)
  }

  const handleAnalyzeAndStyle = async () => {
    if (subtitles.length === 0) {
      alert('No captions to analyze. Please generate captions first.')
      return
    }

    setIsApplying(true)

    try {
      // Prepare transcription data for Python script
      const transcriptionData = {
        transcription: subtitles.map(sub => ({
          text: sub.text,
          start: sub.start,
          end: sub.end
        }))
      }

      // Call Electron API to analyze captions
      const result = await window.electronAPI.analyzeCaptions(transcriptionData)

      if (result.success && result.captions) {
        // Save sentiment stats
        setSentimentStats(result.stats)

        // Apply analyzed word-level data + sentiment to subtitles
        result.captions.forEach((analyzedCaption: any, index: number) => {
          if (index < subtitles.length) {
            const subtitle = subtitles[index]
            const styledSubtitle = applyTemplate(selectedTemplate, {
              ...subtitle,
              words: analyzedCaption.words,
              sentiment: analyzedCaption.sentiment
            })
            updateSubtitle(subtitle.id, styledSubtitle)
          }
        })

        const sentDist = result.stats.sentiment_distribution
        alert(`✓ Analyzed ${result.stats.total_words} words!\n• ${result.stats.emphasized_words} emphasized (${result.stats.emphasis_percentage}%)\n• Sentiment: ${sentDist.positive} positive, ${sentDist.negative} negative, ${sentDist.question} questions, ${sentDist.neutral} neutral`)
      }
    } catch (error) {
      console.error('Caption analysis error:', error)
      alert('Failed to analyze captions. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }

  const previewSubtitle = subtitles[previewIndex]
  const template = CAPTION_TEMPLATES[selectedTemplate]

  return (
    <div className="caption-styling-overlay">
      <div className="caption-styling-dialog">
        <div className="caption-styling-header">
          <div className="caption-styling-title">
            <Wand2 size={24} />
            <h2>AI Caption Styling</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="caption-styling-content">
          {/* Template Selection */}
          <div className="template-section">
            <h3>Choose Style Template</h3>
            <div className="template-grid">
              {Object.values(CAPTION_TEMPLATES).map(tmpl => (
                <div
                  key={tmpl.id}
                  className={`template-card ${selectedTemplate === tmpl.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(tmpl.id as 'dynamic' | 'impact' | 'minimal' | 'energetic' | 'professional')}
                >
                  <div className="template-preview">
                    <div
                      className="template-text"
                      style={{
                        fontFamily: tmpl.style.fontFamily,
                        fontSize: '24px',
                        color: tmpl.style.color,
                        backgroundColor: tmpl.style.backgroundColor,
                        padding: '8px 16px',
                        borderRadius: '4px',
                        textShadow: `${tmpl.style.shadow?.offsetX || 0}px ${tmpl.style.shadow?.offsetY || 0}px ${tmpl.style.shadow?.blur || 0}px ${tmpl.style.shadow?.color || 'transparent'}`
                      }}
                    >
                      Sample <span style={{ color: tmpl.style.emphasisColor, fontWeight: 'bold' }}>Text</span>
                    </div>
                  </div>
                  <div className="template-info">
                    <h4>{tmpl.name}</h4>
                    <p>{tmpl.description}</p>
                  </div>
                  <div className="template-details">
                    <span className="detail-badge">{tmpl.style.animation.type}</span>
                    <span className="detail-badge">Font: {tmpl.style.fontSize}px</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          {previewSubtitle && (
            <div className="preview-section">
              <h3>Preview</h3>
              <div className="preview-controls">
                <button
                  onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                  disabled={previewIndex === 0}
                >
                  ← Previous
                </button>
                <span className="preview-counter">
                  {previewIndex + 1} / {subtitles.length}
                </span>
                <button
                  onClick={() => setPreviewIndex(Math.min(subtitles.length - 1, previewIndex + 1))}
                  disabled={previewIndex === subtitles.length - 1}
                >
                  Next →
                </button>
              </div>
              <div
                className={`preview-canvas preview-position-${template.style.position}`}
              >
                <div
                  className="preview-text"
                  style={{
                    fontFamily: template.style.fontFamily,
                    fontSize: `${template.style.fontSize}px`,
                    color: template.style.color,
                    backgroundColor: template.style.backgroundColor,
                    padding: '16px 32px',
                    borderRadius: '8px',
                    textShadow: template.style.shadow
                      ? `${template.style.shadow.offsetX}px ${template.style.shadow.offsetY}px ${template.style.shadow.blur}px ${template.style.shadow.color}`
                      : undefined,
                    WebkitTextStroke: template.style.stroke
                      ? `${template.style.stroke.width}px ${template.style.stroke.color}`
                      : undefined
                  }}
                >
                  {previewSubtitle.text.split(' ').map((word, i) => {
                    // Simple emphasis detection for preview
                    const isNumber = /\d/.test(word)
                    const isAllCaps = word.length > 1 && word === word.toUpperCase()
                    const shouldEmphasize = isNumber || isAllCaps

                    return (
                      <span
                        key={i}
                        style={{
                          color: shouldEmphasize ? template.style.emphasisColor : template.style.color,
                          fontWeight: shouldEmphasize && template.style.emphasisBold ? 'bold' : 'normal',
                          transform: shouldEmphasize && template.style.emphasisScale
                            ? `scale(${template.style.emphasisScale})`
                            : undefined,
                          display: 'inline-block',
                          margin: '0 4px'
                        }}
                      >
                        {word}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="stats-section">
            <div className="stat-item">
              <span className="stat-label">Total Captions:</span>
              <span className="stat-value">{subtitles.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Template:</span>
              <span className="stat-value">{template.name}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Animation:</span>
              <span className="stat-value">{template.style.animation.type}</span>
            </div>
            {sentimentStats && (
              <>
                <div className="stat-item">
                  <span className="stat-label">Emphasized Words:</span>
                  <span className="stat-value">{sentimentStats.emphasized_words} ({sentimentStats.emphasis_percentage}%)</span>
                </div>
                <div className="stat-item sentiment-breakdown">
                  <span className="stat-label">Sentiment:</span>
                  <div className="sentiment-badges">
                    {sentimentStats.sentiment_distribution.positive > 0 && (
                      <span className="sentiment-badge positive">
                        😊 {sentimentStats.sentiment_distribution.positive}
                      </span>
                    )}
                    {sentimentStats.sentiment_distribution.negative > 0 && (
                      <span className="sentiment-badge negative">
                        ⚠️ {sentimentStats.sentiment_distribution.negative}
                      </span>
                    )}
                    {sentimentStats.sentiment_distribution.question > 0 && (
                      <span className="sentiment-badge question">
                        ❓ {sentimentStats.sentiment_distribution.question}
                      </span>
                    )}
                    {sentimentStats.sentiment_distribution.neutral > 0 && (
                      <span className="sentiment-badge neutral">
                        ➖ {sentimentStats.sentiment_distribution.neutral}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="caption-styling-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-analyze"
            onClick={handleAnalyzeAndStyle}
            disabled={isApplying || subtitles.length === 0}
          >
            <Sparkles size={18} />
            {isApplying ? 'Analyzing...' : 'Analyze & Apply AI Styling'}
          </button>
          <button
            className="btn-primary"
            onClick={handleApplyTemplate}
            disabled={isApplying || subtitles.length === 0}
          >
            {isApplying ? 'Applying...' : 'Apply Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
