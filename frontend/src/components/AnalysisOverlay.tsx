/**
 * AnalysisOverlay - Shows progress during video analysis
 * Displays as an overlay on top of the video player
 */
import { Sparkles, Loader2 } from 'lucide-react'
import './AnalysisOverlay.css'

interface AnalysisOverlayProps {
  isVisible: boolean
  progress?: number
  message?: string
}

export default function AnalysisOverlay({ isVisible, progress, message }: AnalysisOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="analysis-overlay">
      <div className="analysis-content">
        <div className="analysis-icon">
          <Sparkles size={32} className="sparkles-icon" />
          <Loader2 size={48} className="spinner-icon" />
        </div>
        <h3>Analyzing Video</h3>
        <p className="analysis-message">{message || 'Processing your video with AI...'}</p>
        {progress !== undefined && progress > 0 && (
          <div className="analysis-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}
        <div className="analysis-steps">
          <span className="step">Extracting audio</span>
          <span className="step">Transcribing speech</span>
          <span className="step">Analyzing scenes</span>
          <span className="step">Generating suggestions</span>
        </div>
      </div>
    </div>
  )
}
