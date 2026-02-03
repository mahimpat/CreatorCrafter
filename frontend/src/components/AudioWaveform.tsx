/**
 * AudioWaveform - Renders audio waveform visualization from an audio file
 * Uses Web Audio API to analyze audio and Canvas for efficient rendering
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import './AudioWaveform.css'

interface AudioWaveformProps {
  /** URL to the audio file */
  audioUrl: string
  /** Width of the waveform in pixels */
  width: number
  /** Height of the waveform in pixels */
  height?: number
  /** Color of the waveform */
  color?: string
  /** Background color */
  backgroundColor?: string
  /** Start time for display (seconds) - for trimmed clips */
  startTime?: number
  /** End time for display (seconds) - for trimmed clips */
  endTime?: number
  /** Current playback position (0-1 normalized) */
  progress?: number
  /** Color for the played portion */
  progressColor?: string
  /** Whether the clip audio is muted */
  isMuted?: boolean
  /** Called when waveform data is loaded */
  onLoad?: () => void
  /** Called on error */
  onError?: (error: Error) => void
}

// Cache for waveform data to avoid re-processing
const waveformCache = new Map<string, number[]>()

export default function AudioWaveform({
  audioUrl,
  width,
  height = 40,
  color = 'rgba(139, 92, 246, 0.6)',
  backgroundColor = 'transparent',
  startTime = 0,
  endTime,
  progress = 0,
  progressColor = 'rgba(139, 92, 246, 1)',
  isMuted = false,
  onLoad,
  onError,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [waveformData, setWaveformData] = useState<number[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [audioDuration, setAudioDuration] = useState(0)

  // Extract waveform data from audio
  const extractWaveform = useCallback(async (url: string) => {
    // Check cache first
    const cacheKey = url
    if (waveformCache.has(cacheKey)) {
      const cached = waveformCache.get(cacheKey)!
      setWaveformData(cached)
      setIsLoading(false)
      onLoad?.()
      return
    }

    try {
      setIsLoading(true)

      // Fetch audio file
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()

      // Create audio context and decode
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      setAudioDuration(audioBuffer.duration)

      // Get channel data (use first channel, or mix if stereo)
      const channelData = audioBuffer.getChannelData(0)

      // Sample the waveform data to a reasonable number of points
      const samples = Math.min(width * 2, 1000) // 2 samples per pixel max
      const blockSize = Math.floor(channelData.length / samples)
      const peaks: number[] = []

      for (let i = 0; i < samples; i++) {
        const start = i * blockSize
        let max = 0

        for (let j = 0; j < blockSize; j++) {
          const val = Math.abs(channelData[start + j] || 0)
          if (val > max) max = val
        }

        peaks.push(max)
      }

      // Normalize peaks to 0-1 range
      const maxPeak = Math.max(...peaks, 0.01)
      const normalizedPeaks = peaks.map(p => p / maxPeak)

      // Cache the result
      waveformCache.set(cacheKey, normalizedPeaks)

      setWaveformData(normalizedPeaks)
      setIsLoading(false)
      onLoad?.()

      // Clean up audio context
      audioContext.close()
    } catch (err) {
      console.error('Failed to extract waveform:', err)
      setIsLoading(false)
      onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  }, [width, onLoad, onError])

  // Load waveform when URL changes
  useEffect(() => {
    if (audioUrl) {
      extractWaveform(audioUrl)
    }
  }, [audioUrl, extractWaveform])

  // Render waveform to canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !waveformData) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size (handle high DPI displays)
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)

    // Calculate visible portion based on trim times
    let startRatio = 0
    let endRatio = 1
    if (audioDuration > 0) {
      startRatio = startTime / audioDuration
      endRatio = endTime ? endTime / audioDuration : 1
    }

    // Calculate which samples to render
    const startSample = Math.floor(startRatio * waveformData.length)
    const endSample = Math.ceil(endRatio * waveformData.length)
    const visibleSamples = waveformData.slice(startSample, endSample)

    if (visibleSamples.length === 0) return

    // Calculate bar width
    const barCount = visibleSamples.length
    const barWidth = Math.max(1, width / barCount)
    const gap = barWidth > 3 ? 1 : 0

    // Calculate progress position
    const progressX = progress * width

    // Draw waveform bars
    visibleSamples.forEach((peak, i) => {
      const x = i * barWidth
      const barHeight = Math.max(2, peak * (height - 4))
      const y = (height - barHeight) / 2

      // Use progress color for played portion
      if (isMuted) {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.4)'
      } else if (x < progressX) {
        ctx.fillStyle = progressColor
      } else {
        ctx.fillStyle = color
      }

      ctx.fillRect(x, y, barWidth - gap, barHeight)
    })

    // Draw muted indicator
    if (isMuted) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('MUTED', width / 2, height / 2 + 3)
    }
  }, [waveformData, width, height, color, backgroundColor, startTime, endTime, audioDuration, progress, progressColor, isMuted])

  if (isLoading) {
    return (
      <div className="audio-waveform loading" style={{ width, height }}>
        <div className="waveform-loading-placeholder" />
      </div>
    )
  }

  if (!waveformData) {
    return (
      <div className="audio-waveform error" style={{ width, height }}>
        <span className="waveform-error-text">No audio</span>
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className="audio-waveform"
      style={{ width, height }}
    />
  )
}
