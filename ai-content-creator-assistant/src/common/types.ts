/**
 * Common type definitions shared across main, preload, and renderer processes
 */

/**
 * Project represents a saved content creation project
 */
export interface Project {
  id: string;
  name: string;
  videoPath: string;
  videoMetadata: VideoMetadata;
  captions: Caption[];
  textOverlays: TextOverlay[];
  soundEffects: SoundEffect[];
  timeline: TimelineState;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Video metadata extracted from uploaded files
 */
export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  size: number; // file size in bytes
  format: string;
  hasAudio: boolean;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
}

/**
 * Caption/subtitle with timing and styling
 */
export interface Caption {
  id: string;
  startTime: number; // in seconds
  endTime: number;
  text: string;
  style: CaptionStyle;
  confidence?: number; // from speech-to-text (0-1)
}

/**
 * Styling options for captions
 */
export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'lighter' | 'bolder';
  color: string;
  backgroundColor: string;
  opacity: number;
  position: 'top' | 'middle' | 'bottom';
  alignment: 'left' | 'center' | 'right';
  animation?: 'fade' | 'slide' | 'bounce' | 'none';
  outline?: {
    color: string;
    width: number;
  };
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

/**
 * Text overlay with rich styling and positioning
 */
export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  position: {
    x: number; // percentage (0-100)
    y: number; // percentage (0-100)
  };
  style: TextOverlayStyle;
  layer: number; // z-index
  animation?: AnimationConfig;
}

/**
 * Text overlay styling configuration
 */
export interface TextOverlayStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  rotation?: number; // degrees
  opacity: number;
}

/**
 * Animation configuration for text overlays
 */
export interface AnimationConfig {
  type: 'fadeIn' | 'fadeOut' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'zoom' | 'bounce';
  duration: number; // in milliseconds
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;
}

/**
 * Sound effect with AI generation metadata
 */
export interface SoundEffect {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  volume: number; // 0-1
  audioPath?: string; // path to generated audio file
  prompt?: string; // text prompt used for generation
  category?: SFXCategory;
  isGenerated: boolean;
  metadata?: SFXMetadata;
}

/**
 * Sound effect categories
 */
export type SFXCategory =
  | 'impact'
  | 'whoosh'
  | 'ambient'
  | 'foley'
  | 'transition'
  | 'ui'
  | 'nature'
  | 'mechanical'
  | 'electronic'
  | 'custom';

/**
 * Metadata for AI-generated sound effects
 */
export interface SFXMetadata {
  model: string;
  generationTime: number; // milliseconds
  parameters?: Record<string, any>;
  confidence?: number;
}

/**
 * Timeline state for video editing
 */
export interface TimelineState {
  currentTime: number;
  zoom: number; // 0.1 to 10
  selectedItems: string[]; // IDs of selected captions/overlays/sfx
  playbackRate: number;
  isPlaying: boolean;
}

/**
 * AI analysis results for video content
 */
export interface VideoAnalysis {
  sceneChanges: SceneChange[];
  keyMoments: KeyMoment[];
  suggestedSFX: SuggestedSFX[];
  emotionalBeats: EmotionalBeat[];
  transcription?: Transcription;
}

/**
 * Scene change detection result
 */
export interface SceneChange {
  timestamp: number;
  confidence: number;
  thumbnailPath?: string;
}

/**
 * Key moment identified in video
 */
export interface KeyMoment {
  timestamp: number;
  type: 'action' | 'emotion' | 'highlight' | 'transition';
  description: string;
  confidence: number;
}

/**
 * AI-suggested sound effect
 */
export interface SuggestedSFX {
  timestamp: number;
  prompt: string;
  category: SFXCategory;
  confidence: number;
  reason: string;
}

/**
 * Emotional beat analysis
 */
export interface EmotionalBeat {
  startTime: number;
  endTime: number;
  emotion: 'happy' | 'sad' | 'excited' | 'calm' | 'tense' | 'neutral';
  intensity: number; // 0-1
  confidence: number;
}

/**
 * Audio transcription result
 */
export interface Transcription {
  segments: TranscriptionSegment[];
  language: string;
  confidence: number;
}

/**
 * Transcription segment with timing
 */
export interface TranscriptionSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
  words?: WordTimestamp[];
}

/**
 * Word-level timestamp for precise caption timing
 */
export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

/**
 * Export configuration
 */
export interface ExportConfig {
  format: 'mp4' | 'mov' | 'avi' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'source';
  includeAudio: boolean;
  includeCaptions: boolean;
  includeOverlays: boolean;
  includeSFX: boolean;
  outputPath: string;
  captionFormat?: 'srt' | 'vtt' | 'ass' | 'embedded';
}

/**
 * Progress information for long-running operations
 */
export interface ProgressInfo {
  operationId: string;
  type: 'upload' | 'analysis' | 'generation' | 'export' | 'processing';
  progress: number; // 0-100
  message: string;
  eta?: number; // seconds
}

/**
 * Application settings
 */
export interface AppSettings {
  general: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    autoSave: boolean;
    autoSaveInterval: number; // minutes
  };
  video: {
    defaultQuality: string;
    hardwareAcceleration: boolean;
    maxCacheSize: number; // MB
  };
  ai: {
    speechToTextProvider: 'whisper' | 'google' | 'azure';
    speechToTextLanguage: string;
    audioCraftModel: string;
    apiKeys: Record<string, string>;
  };
  export: {
    defaultFormat: string;
    defaultQuality: string;
    defaultOutputDir: string;
  };
}

/**
 * Error types for better error handling
 */
export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INSUFFICIENT_RESOURCES = 'INSUFFICIENT_RESOURCES',
  EXPORT_FAILED = 'EXPORT_FAILED',
}

/**
 * Structured error response
 */
export interface AppError {
  code: ErrorCode;
  message: string;
  details?: string;
  stack?: string;
}

/**
 * IPC channel names for type-safe communication
 */
export const IPC_CHANNELS = {
  // Project management
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_SAVE: 'project:save',
  PROJECT_CLOSE: 'project:close',
  PROJECT_LIST: 'project:list',
  PROJECT_DELETE: 'project:delete',

  // Video operations
  VIDEO_UPLOAD: 'video:upload',
  VIDEO_ANALYZE: 'video:analyze',
  VIDEO_EXTRACT_AUDIO: 'video:extract-audio',
  VIDEO_GET_METADATA: 'video:get-metadata',
  VIDEO_GET_FRAME: 'video:get-frame',
  VIDEO_GET_THUMBNAIL: 'video:get-thumbnail',

  // Caption operations
  CAPTION_GENERATE: 'caption:generate',
  CAPTION_ADD: 'caption:add',
  CAPTION_UPDATE: 'caption:update',
  CAPTION_DELETE: 'caption:delete',
  CAPTION_EXPORT: 'caption:export',

  // Text overlay operations
  OVERLAY_ADD: 'overlay:add',
  OVERLAY_UPDATE: 'overlay:update',
  OVERLAY_DELETE: 'overlay:delete',

  // Sound effect operations
  SFX_GENERATE: 'sfx:generate',
  SFX_ADD: 'sfx:add',
  SFX_UPDATE: 'sfx:update',
  SFX_DELETE: 'sfx:delete',
  SFX_PREVIEW: 'sfx:preview',

  // Export operations
  EXPORT_VIDEO: 'export:video',
  EXPORT_CAPTIONS: 'export:captions',
  EXPORT_PROJECT: 'export:project',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // File operations
  FILE_SELECT: 'file:select',
  FILE_SAVE_DIALOG: 'file:save-dialog',

  // Progress updates (main -> renderer)
  PROGRESS_UPDATE: 'progress:update',

  // Error notifications
  ERROR_OCCURRED: 'error:occurred',

  // Window operations
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
} as const;

/**
 * Type-safe IPC message payloads
 */
export type IPCMessage<T = any> = {
  id: string;
  channel: string;
  payload?: T;
  error?: AppError;
};
