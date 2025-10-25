import './AnalysisPanel.css'

export default function AnalysisPanel() {
  return (
    <div className="analysis-overlay">
      <div className="analysis-panel">
        <div className="spinner"></div>
        <h3>Analyzing Video...</h3>
        <p>AI is processing your video to identify key moments and suggest enhancements</p>
        <ul className="analysis-steps">
          <li>Extracting audio from video</li>
          <li>Transcribing speech to text</li>
          <li>Analyzing scene changes and moments</li>
          <li>Suggesting sound effects</li>
        </ul>
      </div>
    </div>
  )
}
