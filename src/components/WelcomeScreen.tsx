import { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import './WelcomeScreen.css'

interface WelcomeScreenProps {
  onProjectCreated: () => void
}

export default function WelcomeScreen({ onProjectCreated }: WelcomeScreenProps) {
  const { setVideoPath, setVideoMetadata, setDuration } = useProject()
  const [isLoading, setIsLoading] = useState(false)

  const handleFileSelect = async () => {
    try {
      setIsLoading(true)
      const filePath = await window.electronAPI.openFileDialog()

      if (filePath) {
        // Get video metadata
        const metadata = await window.electronAPI.getVideoMetadata(filePath)
        const duration = parseFloat(metadata.format.duration)

        setVideoPath(filePath)
        setVideoMetadata(metadata)
        setDuration(duration)
        onProjectCreated()
      }
    } catch (error) {
      console.error('Error loading video:', error)
      alert('Failed to load video. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">AI Content Creator Assistant</h1>
        <p className="welcome-subtitle">
          Enhance your videos with AI-powered captions, sound effects, and overlays
        </p>

        <div className="welcome-features">
          <div className="feature">
            <div className="feature-icon">🎬</div>
            <h3>Smart Video Analysis</h3>
            <p>AI automatically identifies key moments and suggests enhancements</p>
          </div>
          <div className="feature">
            <div className="feature-icon">🔊</div>
            <h3>AI-Generated SFX</h3>
            <p>Create custom sound effects with Meta AudioCraft</p>
          </div>
          <div className="feature">
            <div className="feature-icon">💬</div>
            <h3>Smart Captions</h3>
            <p>Auto-generate and customize captions with style</p>
          </div>
          <div className="feature">
            <div className="feature-icon">✨</div>
            <h3>Text Overlays</h3>
            <p>Add animated text overlays at the perfect moments</p>
          </div>
        </div>

        <button
          className="btn-primary btn-large"
          onClick={handleFileSelect}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Select Video to Get Started'}
        </button>

        <p className="welcome-hint">
          Supported formats: MP4, MOV, AVI, MKV, WebM
        </p>
      </div>
    </div>
  )
}
