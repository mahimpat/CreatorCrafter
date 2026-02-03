/**
 * Video Utilities
 * Enhanced video handling with format detection, error handling, and seek accuracy
 */

/**
 * Supported video formats and their MIME types
 */
export const VIDEO_FORMATS = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'video/ogg',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  m4v: 'video/x-m4v',
  '3gp': 'video/3gpp',
  wmv: 'video/x-ms-wmv',
} as const

/**
 * Video codec support detection
 */
export interface CodecSupport {
  h264: boolean
  h265: boolean
  vp8: boolean
  vp9: boolean
  av1: boolean
}

/**
 * Video error types for better error handling
 */
export enum VideoErrorType {
  NETWORK = 'network',
  DECODE = 'decode',
  FORMAT = 'format',
  SRC_NOT_SUPPORTED = 'src_not_supported',
  UNKNOWN = 'unknown',
}

export interface VideoError {
  type: VideoErrorType
  message: string
  originalError?: MediaError | Error
  recoverable: boolean
}

/**
 * Detect browser codec support
 */
export function detectCodecSupport(): CodecSupport {
  const video = document.createElement('video')

  return {
    h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '',
    h265: video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') !== '',
    vp8: video.canPlayType('video/webm; codecs="vp8"') !== '',
    vp9: video.canPlayType('video/webm; codecs="vp9"') !== '',
    av1: video.canPlayType('video/mp4; codecs="av01.0.00M.08"') !== '',
  }
}

/**
 * Check if a specific video format/type is supported
 */
export function canPlayType(mimeType: string): boolean {
  const video = document.createElement('video')
  const result = video.canPlayType(mimeType)
  return result === 'probably' || result === 'maybe'
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return VIDEO_FORMATS[ext as keyof typeof VIDEO_FORMATS] || 'video/mp4'
}

/**
 * Parse video error from MediaError
 */
export function parseVideoError(error: MediaError | null): VideoError {
  if (!error) {
    return {
      type: VideoErrorType.UNKNOWN,
      message: 'Unknown video error',
      recoverable: false,
    }
  }

  switch (error.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return {
        type: VideoErrorType.NETWORK,
        message: 'Video loading was aborted',
        originalError: error,
        recoverable: true,
      }
    case MediaError.MEDIA_ERR_NETWORK:
      return {
        type: VideoErrorType.NETWORK,
        message: 'Network error while loading video',
        originalError: error,
        recoverable: true,
      }
    case MediaError.MEDIA_ERR_DECODE:
      return {
        type: VideoErrorType.DECODE,
        message: 'Video decoding failed - format may be unsupported',
        originalError: error,
        recoverable: false,
      }
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return {
        type: VideoErrorType.SRC_NOT_SUPPORTED,
        message: 'Video source or format not supported',
        originalError: error,
        recoverable: false,
      }
    default:
      return {
        type: VideoErrorType.UNKNOWN,
        message: error.message || 'Unknown video error',
        originalError: error,
        recoverable: false,
      }
  }
}

/**
 * Check if requestVideoFrameCallback is supported
 * This API provides frame-accurate timing for video operations
 */
export function isRequestVideoFrameCallbackSupported(): boolean {
  return 'requestVideoFrameCallback' in HTMLVideoElement.prototype
}

/**
 * Frame-accurate seek using requestVideoFrameCallback
 * Falls back to regular seeking if not supported
 */
export function seekToFrame(
  video: HTMLVideoElement,
  targetTime: number,
  onComplete?: () => void
): void {
  // Clamp to valid range
  const clampedTime = Math.max(0, Math.min(video.duration || 0, targetTime))

  if (isRequestVideoFrameCallbackSupported()) {
    // Use requestVideoFrameCallback for frame-accurate seeking
    video.currentTime = clampedTime

    // Wait for the actual frame to be rendered
    ;(video as any).requestVideoFrameCallback(() => {
      onComplete?.()
    })
  } else {
    // Fallback: use seeked event
    const handleSeeked = () => {
      video.removeEventListener('seeked', handleSeeked)
      onComplete?.()
    }
    video.addEventListener('seeked', handleSeeked)
    video.currentTime = clampedTime
  }
}

/**
 * Preload a video source and return when ready
 */
export function preloadVideo(
  src: string,
  options: {
    timeout?: number
    onProgress?: (progress: number) => void
  } = {}
): Promise<HTMLVideoElement> {
  const { timeout = 30000, onProgress } = options

  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true // Helps with autoplay restrictions

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      video.removeEventListener('canplaythrough', handleCanPlay)
      video.removeEventListener('error', handleError)
      video.removeEventListener('progress', handleProgress)
    }

    const handleCanPlay = () => {
      cleanup()
      resolve(video)
    }

    const handleError = () => {
      cleanup()
      const error = parseVideoError(video.error)
      reject(new Error(error.message))
    }

    const handleProgress = () => {
      if (video.buffered.length > 0 && video.duration > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const progress = (bufferedEnd / video.duration) * 100
        onProgress?.(progress)
      }
    }

    video.addEventListener('canplaythrough', handleCanPlay)
    video.addEventListener('error', handleError)
    video.addEventListener('progress', handleProgress)

    // Set timeout
    timeoutId = setTimeout(() => {
      cleanup()
      // If we have some data, resolve anyway
      if (video.readyState >= 2) {
        resolve(video)
      } else {
        reject(new Error('Video preload timed out'))
      }
    }, timeout)

    // Start loading
    video.src = src
    video.load()
  })
}

/**
 * Get video metadata without fully loading the video
 */
export function getVideoMetadata(
  src: string
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    const handleMetadata = () => {
      cleanup()
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      })
    }

    const handleError = () => {
      cleanup()
      reject(new Error('Failed to load video metadata'))
    }

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', handleMetadata)
      video.removeEventListener('error', handleError)
    }

    video.addEventListener('loadedmetadata', handleMetadata)
    video.addEventListener('error', handleError)

    video.src = src
  })
}

/**
 * Create an optimized video element with best practices
 */
export function createOptimizedVideoElement(options: {
  src?: string
  preload?: 'none' | 'metadata' | 'auto'
  crossOrigin?: 'anonymous' | 'use-credentials'
  playsInline?: boolean
} = {}): HTMLVideoElement {
  const {
    src,
    preload = 'auto',
    crossOrigin,
    playsInline = true,
  } = options

  const video = document.createElement('video')

  // Best practices for web video
  video.preload = preload
  video.playsInline = playsInline
  video.disablePictureInPicture = false

  // Enable hardware acceleration hints
  ;(video as any).webkitPreservesPitch = true
  ;(video as any).mozPreservesPitch = true

  if (crossOrigin) {
    video.crossOrigin = crossOrigin
  }

  if (src) {
    video.src = src
  }

  return video
}

/**
 * Throttled time update handler to reduce re-renders
 */
export function createThrottledTimeUpdate(
  callback: (time: number) => void,
  intervalMs: number = 100
): (video: HTMLVideoElement) => void {
  let lastUpdate = 0

  return (video: HTMLVideoElement) => {
    const now = performance.now()
    if (now - lastUpdate >= intervalMs) {
      lastUpdate = now
      callback(video.currentTime)
    }
  }
}

/**
 * Video buffer health checker
 */
export function getBufferHealth(video: HTMLVideoElement): {
  bufferedAhead: number
  isHealthy: boolean
  percentage: number
} {
  const currentTime = video.currentTime
  const duration = video.duration || 0

  let bufferedAhead = 0

  for (let i = 0; i < video.buffered.length; i++) {
    const start = video.buffered.start(i)
    const end = video.buffered.end(i)

    if (currentTime >= start && currentTime <= end) {
      bufferedAhead = end - currentTime
      break
    }
  }

  const totalBuffered = Array.from({ length: video.buffered.length }, (_, i) =>
    video.buffered.end(i) - video.buffered.start(i)
  ).reduce((a, b) => a + b, 0)

  return {
    bufferedAhead,
    isHealthy: bufferedAhead > 2, // Consider healthy if 2+ seconds ahead
    percentage: duration > 0 ? (totalBuffered / duration) * 100 : 0,
  }
}
