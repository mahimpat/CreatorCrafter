import { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import './TopBar.css'

export default function TopBar() {
  const {
    videoPath,
    setIsAnalyzing,
    setAnalysis,
    subtitles,
    sfxTracks,
    textOverlays
  } = useProject()

  const [isExporting, setIsExporting] = useState(false)

  const handleAnalyzeVideo = async () => {
    if (!videoPath) return

    try {
      setIsAnalyzing(true)

      // Extract audio
      const audioPath = await window.electronAPI.extractAudio(videoPath)

      // Analyze video
      const analysis = await window.electronAPI.analyzeVideo(videoPath, audioPath)

      setAnalysis(analysis)
    } catch (error) {
      console.error('Error analyzing video:', error)
      alert('Failed to analyze video. Please make sure Python and required dependencies are installed.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleExport = async () => {
    if (!videoPath) return

    try {
      setIsExporting(true)

      const outputPath = await window.electronAPI.saveFileDialog('output.mp4')

      if (outputPath) {
        await window.electronAPI.renderVideo({
          videoPath,
          outputPath,
          subtitles: subtitles.map(s => ({
            text: s.text,
            start: s.start,
            end: s.end
          })),
          sfxTracks: sfxTracks.map(sfx => ({
            path: sfx.path,
            start: sfx.start
          })),
          overlays: textOverlays.map(o => ({
            text: o.text,
            start: o.start,
            end: o.end,
            style: o.style
          }))
        })

        alert('Video exported successfully!')
      }
    } catch (error) {
      console.error('Error exporting video:', error)
      alert('Failed to export video. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSubtitles = async () => {
    if (subtitles.length === 0) {
      alert('No subtitles to export')
      return
    }

    try {
      const outputPath = await window.electronAPI.saveFileDialog('subtitles.srt')

      if (outputPath) {
        // Convert subtitles to SRT format
        const srtContent = subtitles
          .map((sub, index) => {
            const startTime = formatSRTTime(sub.start)
            const endTime = formatSRTTime(sub.end)
            return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`
          })
          .join('\n')

        await window.electronAPI.writeFile(outputPath, srtContent)
        alert('Subtitles exported successfully!')
      }
    } catch (error) {
      console.error('Error exporting subtitles:', error)
      alert('Failed to export subtitles. Please try again.')
    }
  }

  const formatSRTTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms
      .toString()
      .padStart(3, '0')}`
  }

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <h2 className="app-title">AI Content Creator</h2>
      </div>

      <div className="top-bar-right">
        <button className="btn-secondary" onClick={handleAnalyzeVideo}>
          🔍 Analyze Video
        </button>
        <button className="btn-secondary" onClick={handleExportSubtitles}>
          💾 Export Subtitles
        </button>
        <button
          className="btn-primary"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : '📤 Export Video'}
        </button>
      </div>
    </div>
  )
}
