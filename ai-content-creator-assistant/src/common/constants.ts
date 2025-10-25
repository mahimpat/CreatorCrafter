/**
 * Application-wide constants
 */

export const APP_NAME = 'AI Content Creator Assistant';
export const APP_VERSION = '1.0.0';

/**
 * Supported video file formats
 */
export const SUPPORTED_VIDEO_FORMATS = [
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
  '.flv',
  '.wmv',
  '.m4v',
] as const;

/**
 * Supported audio formats for SFX
 */
export const SUPPORTED_AUDIO_FORMATS = [
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  '.flac',
] as const;

/**
 * Maximum file sizes
 */
export const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
export const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Default caption style
 */
export const DEFAULT_CAPTION_STYLE = {
  fontFamily: 'Arial',
  fontSize: 24,
  fontWeight: 'bold' as const,
  color: '#FFFFFF',
  backgroundColor: '#000000',
  opacity: 0.8,
  position: 'bottom' as const,
  alignment: 'center' as const,
  animation: 'fade' as const,
  outline: {
    color: '#000000',
    width: 2,
  },
};

/**
 * Default text overlay style
 */
export const DEFAULT_OVERLAY_STYLE = {
  fontFamily: 'Arial',
  fontSize: 32,
  fontWeight: 'bold',
  color: '#FFFFFF',
  opacity: 1,
};

/**
 * FFmpeg encoding presets
 */
export const ENCODING_PRESETS = {
  low: {
    videoBitrate: '1M',
    audioBitrate: '128k',
    scale: '-1:480',
  },
  medium: {
    videoBitrate: '2.5M',
    audioBitrate: '192k',
    scale: '-1:720',
  },
  high: {
    videoBitrate: '5M',
    audioBitrate: '256k',
    scale: '-1:1080',
  },
  source: {
    videoBitrate: 'copy',
    audioBitrate: 'copy',
    scale: null,
  },
} as const;

/**
 * Timeline configuration
 */
export const TIMELINE_CONFIG = {
  minZoom: 0.1,
  maxZoom: 10,
  defaultZoom: 1,
  tickInterval: 1, // seconds
  minDuration: 0.1, // minimum duration for overlays/captions
};

/**
 * AI service endpoints (configure in .env)
 */
export const AI_SERVICES = {
  WHISPER_API: process.env.WHISPER_API_URL || 'http://localhost:8001',
  AUDIOCRAFT_API: process.env.AUDIOCRAFT_API_URL || 'http://localhost:8002',
  SCENE_DETECTION_API: process.env.SCENE_DETECTION_API_URL || 'http://localhost:8003',
} as const;

/**
 * Database schema version
 */
export const DB_VERSION = 1;

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  maxThumbnails: 100,
  maxFrames: 50,
  thumbnailQuality: 0.8,
  frameQuality: 0.9,
};

/**
 * Auto-save interval (milliseconds)
 */
export const AUTO_SAVE_INTERVAL = 60000; // 1 minute

/**
 * Python service timeouts (milliseconds)
 */
export const PYTHON_TIMEOUTS = {
  startup: 30000, // 30 seconds
  transcription: 300000, // 5 minutes
  audioGeneration: 120000, // 2 minutes
  videoAnalysis: 180000, // 3 minutes
};

/**
 * Supported speech-to-text languages
 */
export const STT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
] as const;
