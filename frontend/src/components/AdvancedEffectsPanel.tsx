/**
 * AdvancedEffectsPanel - Professional video effects suite
 * Includes motion graphics, AI effects, compositing, and cinematic tools
 */
import { useState, useCallback } from 'react'
import {
  Sliders,
  Wand2,
  Layers,
  Move,
  ZoomIn,
  RotateCw,
  Clock,
  Sparkles,
  Camera,
  Film,
  Eye,
  Palette,
  Sun,
  Moon,
  Cloud,
  Zap,
  Target,
  Grid,
  Scissors,
  Copy,
  Play,
  Square,
  Triangle,
  Circle,
  Box,
  Maximize,
  Minimize,
  FlipHorizontal,
  FlipVertical,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Settings,
  Volume2,
  Music,
  Aperture,
  Focus,
  Droplets,
  Wind,
  Flame,
  Snowflake,
  Waves,
  Heart,
  Star,
  Check,
  RefreshCw
} from 'lucide-react'
import './AdvancedEffectsPanel.css'

// ============= TYPE DEFINITIONS =============

// Keyframe for animatable properties
export interface Keyframe {
  time: number  // seconds from start
  value: number | string | number[]
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic'
}

// Base effect interface
export interface BaseEffect {
  id: string
  type: string
  enabled: boolean
  startTime: number  // when effect starts (seconds)
  endTime: number    // when effect ends (seconds)
  intensity: number  // 0-100
}

// ============= MOTION EFFECTS =============
export interface MotionEffect extends BaseEffect {
  type: 'zoom' | 'pan' | 'rotate' | 'shake' | 'dolly' | 'track' | 'orbit'
  // Zoom
  zoomStart?: number      // 1.0 = 100%
  zoomEnd?: number
  zoomCenterX?: number    // 0-100%
  zoomCenterY?: number
  // Pan (Ken Burns)
  panStartX?: number      // -100 to 100
  panStartY?: number
  panEndX?: number
  panEndY?: number
  // Rotate
  rotateStart?: number    // degrees
  rotateEnd?: number
  rotateAnchorX?: number
  rotateAnchorY?: number
  // Shake
  shakeIntensity?: number
  shakeSpeed?: number
  shakeDecay?: boolean
  // Track/Follow
  trackTarget?: 'face' | 'object' | 'point'
  trackSmoothing?: number
  keyframes?: Keyframe[]
}

// ============= SPEED/TIME EFFECTS =============
export interface SpeedEffect extends BaseEffect {
  type: 'speed_ramp' | 'slow_motion' | 'fast_forward' | 'reverse' | 'freeze_frame' | 'time_remap'
  speedMultiplier?: number       // 0.1 to 10
  speedCurve?: Keyframe[]        // For smooth speed changes
  freezeTime?: number            // For freeze frame
  freezeDuration?: number
  motionBlur?: boolean
  motionBlurSamples?: number     // 4-32
  opticalFlow?: boolean          // AI frame interpolation
}

// ============= COMPOSITING EFFECTS =============
export interface CompositingEffect extends BaseEffect {
  type: 'chroma_key' | 'luma_key' | 'mask' | 'blend' | 'overlay' | 'split_screen' | 'pip'
  // Chroma Key (Green Screen)
  keyColor?: string              // hex color
  keyTolerance?: number          // 0-100
  keySoftness?: number           // edge feather
  spillSuppression?: number
  // Luma Key
  lumaThreshold?: number
  lumaFeather?: number
  // Mask
  maskType?: 'rectangle' | 'ellipse' | 'polygon' | 'bezier' | 'ai_subject'
  maskPoints?: number[][]
  maskFeather?: number
  maskInvert?: boolean
  maskExpand?: number
  // Blend Mode
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft_light' | 'hard_light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity'
  // Split Screen
  splitLayout?: '2x1' | '1x2' | '2x2' | '3x1' | 'custom'
  splitPosition?: number         // 0-100
  splitAngle?: number
  splitBorder?: number
  splitBorderColor?: string
  // Picture in Picture
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom'
  pipSize?: number               // 10-50%
  pipX?: number
  pipY?: number
  pipBorder?: number
  pipShadow?: boolean
  pipRounded?: number
}

// ============= AI-POWERED EFFECTS =============
export interface AIEffect extends BaseEffect {
  type: 'auto_color' | 'auto_stabilize' | 'background_blur' | 'background_replace' | 'face_track' | 'object_track' | 'auto_crop' | 'auto_frame' | 'style_transfer' | 'super_resolution'
  // Auto Color
  autoColorStrength?: number
  autoColorPreserveSkintones?: boolean
  // Background
  backgroundBlurAmount?: number
  backgroundImage?: string       // URL or file path
  backgroundVideo?: string
  backgroundEdgeBlend?: number
  // Face Tracking
  faceTrackSmoothing?: number
  faceTrackZoom?: number
  faceTrackCenter?: boolean
  // Style Transfer
  stylePreset?: 'anime' | 'comic' | 'oil_painting' | 'watercolor' | 'sketch' | 'neon' | 'vintage_photo' | 'cyberpunk' | 'studio_ghibli'
  styleStrength?: number
  stylePreserveColor?: boolean
  // Super Resolution
  upscaleFactor?: 2 | 4
  upscaleDenoising?: number
}

// ============= CINEMATIC EFFECTS =============
export interface CinematicEffect extends BaseEffect {
  type: 'letterbox' | 'film_grain' | 'light_leak' | 'lens_flare' | 'anamorphic' | 'depth_of_field' | 'camera_shake' | 'film_damage' | 'color_grade'
  // Letterbox
  letterboxRatio?: '2.35:1' | '2.39:1' | '1.85:1' | '16:9' | '4:3' | 'custom'
  letterboxCustomRatio?: number
  letterboxColor?: string
  letterboxAnimated?: boolean
  // Film Grain
  grainAmount?: number
  grainSize?: number
  grainSpeed?: number
  grainColor?: boolean           // color vs B&W grain
  // Light Leak
  leakType?: 'warm' | 'cool' | 'rainbow' | 'flicker' | 'custom'
  leakPosition?: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'random'
  leakOpacity?: number
  leakAnimated?: boolean
  // Lens Flare
  flareType?: 'anamorphic' | 'spherical' | 'vintage' | 'sci-fi'
  flarePosition?: number[]       // [x, y] normalized
  flareIntensity?: number
  flareColor?: string
  // Anamorphic
  anamorphicStretch?: number     // horizontal stretch
  anamorphicFlare?: boolean
  anamorphicBokeh?: 'oval' | 'round'
  // Depth of Field
  dofAmount?: number
  dofFocalPoint?: number[]       // [x, y] normalized
  dofFocalRange?: number
  dofBokehShape?: 'circle' | 'hexagon' | 'octagon' | 'heart' | 'star'
  // Camera Shake
  cameraShakeType?: 'handheld' | 'earthquake' | 'impact' | 'subtle'
  cameraShakeIntensity?: number
  cameraShakeFrequency?: number
  // Film Damage
  damageScratches?: number
  damageDust?: number
  damageFlicker?: number
  damageVignette?: number
  damageBurn?: number
  // Color Grade (LUT-like)
  colorGradeLUT?: string         // LUT name or custom
  colorGradeIntensity?: number
}

// ============= STYLIZED EFFECTS =============
export interface StylizedEffect extends BaseEffect {
  type: 'glitch' | 'vhs' | 'rgb_split' | 'pixelate' | 'halftone' | 'posterize' | 'cartoon' | 'neon' | 'mirror' | 'kaleidoscope' | 'thermal' | 'night_vision' | 'x_ray' | 'emboss' | 'edge_detect'
  // Glitch
  glitchType?: 'digital' | 'analog' | 'data_mosh' | 'block' | 'wave'
  glitchIntensity?: number
  glitchFrequency?: number
  glitchColorSeparation?: boolean
  // VHS
  vhsTracking?: number
  vhsNoise?: number
  vhsWobble?: number
  vhsBleed?: number
  vhsTimecode?: boolean
  vhsDate?: boolean
  // RGB Split
  rgbSplitAmount?: number
  rgbSplitAngle?: number
  rgbSplitAnimated?: boolean
  // Pixelate
  pixelSize?: number
  pixelShape?: 'square' | 'circle' | 'hexagon' | 'diamond'
  // Halftone
  halftoneSize?: number
  halftoneAngle?: number
  halftoneColor?: boolean
  // Posterize
  posterizeLevels?: number       // 2-16
  // Cartoon
  cartoonEdgeThickness?: number
  cartoonColorLevels?: number
  cartoonOutlineColor?: string
  // Neon
  neonColor?: string
  neonGlow?: number
  neonPulse?: boolean
  // Mirror
  mirrorAxis?: 'horizontal' | 'vertical' | 'both' | 'quad'
  mirrorPosition?: number
  // Kaleidoscope
  kaleidoscopeSegments?: number  // 3-12
  kaleidoscopeRotation?: number
  kaleidoscopeZoom?: number
  // Thermal/Night Vision
  thermalPalette?: 'iron' | 'rainbow' | 'grayscale'
  nightVisionGreen?: boolean
  nightVisionNoise?: number
}

// ============= PARTICLE/OVERLAY EFFECTS =============
export interface ParticleEffect extends BaseEffect {
  type: 'particles' | 'rain' | 'snow' | 'fire' | 'smoke' | 'dust' | 'sparkles' | 'confetti' | 'bubbles' | 'leaves' | 'fog' | 'clouds'
  particleCount?: number
  particleSize?: number
  particleSpeed?: number
  particleDirection?: number     // angle
  particleColor?: string | string[]
  particleOpacity?: number
  particleWind?: number
  particleTurbulence?: number
  particleGravity?: number
  particleLifespan?: number
  particleEmitArea?: 'full' | 'top' | 'bottom' | 'left' | 'right' | 'point'
  particleEmitPoint?: number[]
  // Specific to type
  rainIntensity?: number
  rainAngle?: number
  snowDrift?: number
  fireIntensity?: number
  smokeRising?: boolean
  fogDensity?: number
  fogMovement?: boolean
}

// ============= TEXT/GRAPHICS EFFECTS =============
export interface GraphicsEffect extends BaseEffect {
  type: 'lower_third' | 'title_card' | 'countdown' | 'progress_bar' | 'watermark' | 'logo_animation' | 'call_to_action' | 'subscribe_button'
  // Text
  text?: string
  textFont?: string
  textSize?: number
  textColor?: string
  textStroke?: boolean
  textStrokeColor?: string
  textShadow?: boolean
  textAnimation?: 'fade' | 'slide' | 'typewriter' | 'bounce' | 'zoom' | 'flip'
  textPosition?: 'top' | 'bottom' | 'center' | 'custom'
  textX?: number
  textY?: number
  // Lower Third
  lowerThirdStyle?: 'modern' | 'news' | 'minimal' | 'bold' | 'gradient'
  lowerThirdName?: string
  lowerThirdTitle?: string
  lowerThirdLogo?: string
  // Countdown
  countdownFrom?: number
  countdownStyle?: 'numeric' | 'clock' | 'progress'
  // Progress Bar
  progressValue?: number
  progressStyle?: 'line' | 'circle' | 'custom'
  // Watermark
  watermarkImage?: string
  watermarkOpacity?: number
  watermarkPosition?: string
  watermarkSize?: number
}

// ============= AUDIO-REACTIVE EFFECTS =============
export interface AudioReactiveEffect extends BaseEffect {
  type: 'audio_visualizer' | 'beat_zoom' | 'beat_flash' | 'audio_waveform' | 'spectrum_bars' | 'audio_particles'
  audioSource?: 'video' | 'bgm' | 'combined'
  audioSensitivity?: number
  audioSmoothing?: number
  // Visualizer
  visualizerStyle?: 'bars' | 'wave' | 'circle' | 'particles' | 'line'
  visualizerColor?: string | string[]
  visualizerPosition?: 'bottom' | 'center' | 'full'
  visualizerMirror?: boolean
  // Beat effects
  beatZoomAmount?: number
  beatFlashColor?: string
  beatFlashDuration?: number
}

// Union type for all effects
export type VideoEffect =
  | MotionEffect
  | SpeedEffect
  | CompositingEffect
  | AIEffect
  | CinematicEffect
  | StylizedEffect
  | ParticleEffect
  | GraphicsEffect
  | AudioReactiveEffect

// Effect category for UI organization
export type EffectCategory =
  | 'motion'
  | 'speed'
  | 'compositing'
  | 'ai'
  | 'cinematic'
  | 'stylized'
  | 'particles'
  | 'graphics'
  | 'audio'

// ============= EFFECT TEMPLATES =============
interface EffectTemplate {
  id: string
  name: string
  description: string
  category: EffectCategory
  icon: React.ReactNode
  effect: Partial<VideoEffect>
  premium?: boolean
  popular?: boolean
  new?: boolean
}

const EFFECT_TEMPLATES: EffectTemplate[] = [
  // Motion Effects
  { id: 'zoom_in', name: 'Zoom In', description: 'Gradual zoom into the frame', category: 'motion', icon: <ZoomIn size={16} />, effect: { type: 'zoom', zoomStart: 1.0, zoomEnd: 1.3 }, popular: true },
  { id: 'zoom_out', name: 'Zoom Out', description: 'Gradual zoom out', category: 'motion', icon: <Minimize size={16} />, effect: { type: 'zoom', zoomStart: 1.3, zoomEnd: 1.0 } },
  { id: 'ken_burns', name: 'Ken Burns', description: 'Slow pan and zoom', category: 'motion', icon: <Move size={16} />, effect: { type: 'pan', panStartX: -20, panStartY: -10, panEndX: 20, panEndY: 10, zoomStart: 1.0, zoomEnd: 1.15 }, popular: true },
  { id: 'shake', name: 'Camera Shake', description: 'Handheld camera effect', category: 'motion', icon: <Camera size={16} />, effect: { type: 'shake', shakeIntensity: 5, shakeSpeed: 15 } },
  { id: 'rotate_slow', name: 'Slow Rotate', description: 'Gentle rotation effect', category: 'motion', icon: <RotateCw size={16} />, effect: { type: 'rotate', rotateStart: 0, rotateEnd: 5 } },
  { id: 'dolly_in', name: 'Dolly In', description: 'Push in with parallax', category: 'motion', icon: <Move size={16} />, effect: { type: 'dolly', zoomStart: 1.0, zoomEnd: 1.2 }, premium: true },

  // Speed Effects
  { id: 'slow_mo', name: 'Slow Motion', description: '50% speed with motion blur', category: 'speed', icon: <Clock size={16} />, effect: { type: 'slow_motion', speedMultiplier: 0.5, motionBlur: true }, popular: true },
  { id: 'super_slow', name: 'Super Slow Mo', description: '25% speed with AI interpolation', category: 'speed', icon: <Clock size={16} />, effect: { type: 'slow_motion', speedMultiplier: 0.25, opticalFlow: true }, premium: true },
  { id: 'speed_up', name: 'Speed Up 2x', description: 'Double speed', category: 'speed', icon: <Zap size={16} />, effect: { type: 'fast_forward', speedMultiplier: 2.0 } },
  { id: 'speed_ramp', name: 'Speed Ramp', description: 'Dynamic speed change', category: 'speed', icon: <Zap size={16} />, effect: { type: 'speed_ramp' }, popular: true },
  { id: 'reverse', name: 'Reverse', description: 'Play backwards', category: 'speed', icon: <RefreshCw size={16} />, effect: { type: 'reverse', speedMultiplier: -1 } },
  { id: 'freeze', name: 'Freeze Frame', description: 'Pause on a frame', category: 'speed', icon: <Square size={16} />, effect: { type: 'freeze_frame', freezeDuration: 2 } },

  // Compositing Effects
  { id: 'green_screen', name: 'Green Screen', description: 'Remove green background', category: 'compositing', icon: <Layers size={16} />, effect: { type: 'chroma_key', keyColor: '#00FF00', keyTolerance: 40 }, popular: true },
  { id: 'blue_screen', name: 'Blue Screen', description: 'Remove blue background', category: 'compositing', icon: <Layers size={16} />, effect: { type: 'chroma_key', keyColor: '#0000FF', keyTolerance: 40 } },
  { id: 'pip', name: 'Picture in Picture', description: 'Small overlay video', category: 'compositing', icon: <Copy size={16} />, effect: { type: 'pip', pipPosition: 'bottom-right', pipSize: 25 }, popular: true },
  { id: 'split_2', name: 'Split Screen 2', description: 'Side by side', category: 'compositing', icon: <Grid size={16} />, effect: { type: 'split_screen', splitLayout: '2x1' } },
  { id: 'split_4', name: 'Split Screen 4', description: '2x2 grid', category: 'compositing', icon: <Grid size={16} />, effect: { type: 'split_screen', splitLayout: '2x2' } },
  { id: 'blend_overlay', name: 'Overlay Blend', description: 'Overlay blend mode', category: 'compositing', icon: <Layers size={16} />, effect: { type: 'blend', blendMode: 'overlay' } },

  // AI Effects
  { id: 'ai_color', name: 'AI Auto Color', description: 'Automatic color correction', category: 'ai', icon: <Wand2 size={16} />, effect: { type: 'auto_color', autoColorStrength: 75 }, popular: true, new: true },
  { id: 'ai_stabilize', name: 'AI Stabilize', description: 'Remove camera shake', category: 'ai', icon: <Target size={16} />, effect: { type: 'auto_stabilize' }, premium: true },
  { id: 'bg_blur', name: 'Background Blur', description: 'AI bokeh effect', category: 'ai', icon: <Focus size={16} />, effect: { type: 'background_blur', backgroundBlurAmount: 15 }, popular: true, new: true },
  { id: 'bg_replace', name: 'Background Replace', description: 'AI background removal', category: 'ai', icon: <Layers size={16} />, effect: { type: 'background_replace' }, premium: true, new: true },
  { id: 'face_track', name: 'Face Tracking', description: 'Auto-frame on faces', category: 'ai', icon: <Target size={16} />, effect: { type: 'face_track', faceTrackCenter: true }, premium: true },
  { id: 'style_anime', name: 'Anime Style', description: 'AI anime conversion', category: 'ai', icon: <Sparkles size={16} />, effect: { type: 'style_transfer', stylePreset: 'anime' }, premium: true, new: true },
  { id: 'style_comic', name: 'Comic Style', description: 'AI comic book effect', category: 'ai', icon: <Sparkles size={16} />, effect: { type: 'style_transfer', stylePreset: 'comic' }, premium: true },
  { id: 'upscale', name: 'AI Upscale 4K', description: 'Super resolution', category: 'ai', icon: <Maximize size={16} />, effect: { type: 'super_resolution', upscaleFactor: 4 }, premium: true },

  // Cinematic Effects
  { id: 'letterbox', name: 'Cinematic Bars', description: '2.35:1 letterbox', category: 'cinematic', icon: <Film size={16} />, effect: { type: 'letterbox', letterboxRatio: '2.35:1' }, popular: true },
  { id: 'film_grain', name: 'Film Grain', description: 'Organic film texture', category: 'cinematic', icon: <Film size={16} />, effect: { type: 'film_grain', grainAmount: 25, grainColor: true } },
  { id: 'light_leak', name: 'Light Leak', description: 'Warm light overlay', category: 'cinematic', icon: <Sun size={16} />, effect: { type: 'light_leak', leakType: 'warm', leakOpacity: 40 }, popular: true },
  { id: 'lens_flare', name: 'Lens Flare', description: 'Anamorphic flare', category: 'cinematic', icon: <Aperture size={16} />, effect: { type: 'lens_flare', flareType: 'anamorphic' } },
  { id: 'dof', name: 'Depth of Field', description: 'Cinematic focus', category: 'cinematic', icon: <Focus size={16} />, effect: { type: 'depth_of_field', dofAmount: 50 }, premium: true },
  { id: 'film_damage', name: 'Old Film', description: 'Vintage film damage', category: 'cinematic', icon: <Film size={16} />, effect: { type: 'film_damage', damageScratches: 30, damageDust: 40, damageFlicker: 10 } },
  { id: 'anamorphic', name: 'Anamorphic', description: 'Wide lens simulation', category: 'cinematic', icon: <Aperture size={16} />, effect: { type: 'anamorphic', anamorphicStretch: 1.33, anamorphicFlare: true }, premium: true },

  // Stylized Effects
  { id: 'glitch', name: 'Glitch', description: 'Digital glitch effect', category: 'stylized', icon: <Zap size={16} />, effect: { type: 'glitch', glitchType: 'digital', glitchIntensity: 50 }, popular: true },
  { id: 'vhs', name: 'VHS', description: 'Retro VHS tape look', category: 'stylized', icon: <Film size={16} />, effect: { type: 'vhs', vhsTracking: 20, vhsNoise: 30, vhsTimecode: true }, popular: true },
  { id: 'rgb_split', name: 'RGB Split', description: 'Chromatic aberration', category: 'stylized', icon: <Palette size={16} />, effect: { type: 'rgb_split', rgbSplitAmount: 5, rgbSplitAnimated: true } },
  { id: 'pixelate', name: 'Pixelate', description: 'Retro pixel effect', category: 'stylized', icon: <Grid size={16} />, effect: { type: 'pixelate', pixelSize: 8 } },
  { id: 'halftone', name: 'Halftone', description: 'Comic print effect', category: 'stylized', icon: <Circle size={16} />, effect: { type: 'halftone', halftoneSize: 4, halftoneColor: true } },
  { id: 'cartoon', name: 'Cartoon', description: 'Cartoon cel shading', category: 'stylized', icon: <Sparkles size={16} />, effect: { type: 'cartoon', cartoonEdgeThickness: 2, cartoonColorLevels: 6 } },
  { id: 'neon', name: 'Neon Glow', description: 'Neon light effect', category: 'stylized', icon: <Zap size={16} />, effect: { type: 'neon', neonColor: '#ff00ff', neonGlow: 50, neonPulse: true } },
  { id: 'mirror', name: 'Mirror', description: 'Symmetrical reflection', category: 'stylized', icon: <FlipHorizontal size={16} />, effect: { type: 'mirror', mirrorAxis: 'vertical' } },
  { id: 'kaleidoscope', name: 'Kaleidoscope', description: 'Kaleidoscope pattern', category: 'stylized', icon: <Star size={16} />, effect: { type: 'kaleidoscope', kaleidoscopeSegments: 6 } },
  { id: 'thermal', name: 'Thermal Vision', description: 'Heat map effect', category: 'stylized', icon: <Flame size={16} />, effect: { type: 'thermal', thermalPalette: 'iron' } },
  { id: 'night_vision', name: 'Night Vision', description: 'Military NV look', category: 'stylized', icon: <Moon size={16} />, effect: { type: 'night_vision', nightVisionGreen: true, nightVisionNoise: 20 } },

  // Particle Effects
  { id: 'rain', name: 'Rain', description: 'Rainfall overlay', category: 'particles', icon: <Droplets size={16} />, effect: { type: 'rain', rainIntensity: 50 }, popular: true },
  { id: 'snow', name: 'Snow', description: 'Snowfall overlay', category: 'particles', icon: <Snowflake size={16} />, effect: { type: 'snow', particleCount: 200, snowDrift: 30 } },
  { id: 'fire', name: 'Fire', description: 'Fire particles', category: 'particles', icon: <Flame size={16} />, effect: { type: 'fire', fireIntensity: 70 } },
  { id: 'smoke', name: 'Smoke', description: 'Rising smoke', category: 'particles', icon: <Cloud size={16} />, effect: { type: 'smoke', smokeRising: true } },
  { id: 'sparkles', name: 'Sparkles', description: 'Magical sparkles', category: 'particles', icon: <Sparkles size={16} />, effect: { type: 'sparkles', particleCount: 100 }, popular: true },
  { id: 'confetti', name: 'Confetti', description: 'Celebration confetti', category: 'particles', icon: <Star size={16} />, effect: { type: 'confetti', particleCount: 150 } },
  { id: 'dust', name: 'Dust Motes', description: 'Floating dust', category: 'particles', icon: <Wind size={16} />, effect: { type: 'dust', particleCount: 50, particleSpeed: 2 } },
  { id: 'fog', name: 'Fog', description: 'Atmospheric fog', category: 'particles', icon: <Cloud size={16} />, effect: { type: 'fog', fogDensity: 40, fogMovement: true } },
  { id: 'bubbles', name: 'Bubbles', description: 'Floating bubbles', category: 'particles', icon: <Circle size={16} />, effect: { type: 'bubbles', particleCount: 30 } },

  // Audio-Reactive
  { id: 'audio_bars', name: 'Audio Bars', description: 'Spectrum visualizer', category: 'audio', icon: <Volume2 size={16} />, effect: { type: 'audio_visualizer', visualizerStyle: 'bars' }, popular: true },
  { id: 'audio_wave', name: 'Audio Wave', description: 'Waveform visualizer', category: 'audio', icon: <Waves size={16} />, effect: { type: 'audio_waveform' } },
  { id: 'beat_zoom', name: 'Beat Zoom', description: 'Zoom on beats', category: 'audio', icon: <Music size={16} />, effect: { type: 'beat_zoom', beatZoomAmount: 5 }, popular: true },
  { id: 'beat_flash', name: 'Beat Flash', description: 'Flash on beats', category: 'audio', icon: <Zap size={16} />, effect: { type: 'beat_flash', beatFlashColor: '#ffffff' } },
  { id: 'audio_particles', name: 'Audio Particles', description: 'Reactive particles', category: 'audio', icon: <Sparkles size={16} />, effect: { type: 'audio_particles' }, premium: true },
]

// Category configuration
const CATEGORIES: { id: EffectCategory; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'motion', name: 'Motion', icon: <Move size={14} />, color: '#3b82f6' },
  { id: 'speed', name: 'Speed & Time', icon: <Clock size={14} />, color: '#8b5cf6' },
  { id: 'compositing', name: 'Compositing', icon: <Layers size={14} />, color: '#ec4899' },
  { id: 'ai', name: 'AI Effects', icon: <Wand2 size={14} />, color: '#f59e0b' },
  { id: 'cinematic', name: 'Cinematic', icon: <Film size={14} />, color: '#ef4444' },
  { id: 'stylized', name: 'Stylized', icon: <Sparkles size={14} />, color: '#10b981' },
  { id: 'particles', name: 'Particles', icon: <Cloud size={14} />, color: '#06b6d4' },
  { id: 'audio', name: 'Audio-Reactive', icon: <Music size={14} />, color: '#f472b6' },
]

// ============= COMPONENT =============

interface AdvancedEffectsPanelProps {
  appliedEffects: VideoEffect[]
  onAddEffect: (effect: VideoEffect) => void
  onUpdateEffect: (id: string, updates: Partial<VideoEffect>) => void
  onRemoveEffect: (id: string) => void
  onReorderEffects: (effects: VideoEffect[]) => void
  videoDuration: number
  currentTime: number
}

export default function AdvancedEffectsPanel({
  appliedEffects,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  videoDuration,
  currentTime,
}: AdvancedEffectsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<EffectCategory | 'all' | 'popular'>('popular')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedEffect, setExpandedEffect] = useState<string | null>(null)
  const [showApplied, setShowApplied] = useState(true)

  // Filter effects based on category and search
  const filteredEffects = EFFECT_TEMPLATES.filter(effect => {
    const matchesCategory =
      selectedCategory === 'all' ||
      selectedCategory === 'popular' && effect.popular ||
      effect.category === selectedCategory

    const matchesSearch = !searchQuery ||
      effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      effect.description.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesSearch
  })

  const handleAddEffect = useCallback((template: EffectTemplate) => {
    const newEffect: VideoEffect = {
      id: `${template.id}_${Date.now()}`,
      enabled: true,
      startTime: 0,
      endTime: videoDuration,
      intensity: 100,
      ...template.effect,
    } as VideoEffect

    onAddEffect(newEffect)
  }, [onAddEffect, videoDuration])

  const getCategoryColor = (category: EffectCategory) => {
    return CATEGORIES.find(c => c.id === category)?.color || '#888'
  }

  return (
    <div className="advanced-effects-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-title">
          <Sparkles size={18} />
          <h3>Advanced Effects</h3>
          <span className="effect-count">{appliedEffects.length} applied</span>
        </div>
      </div>

      {/* Search */}
      <div className="effects-search">
        <input
          type="text"
          placeholder="Search effects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search" onClick={() => setSearchQuery('')}>×</button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        <button
          className={`category-tab ${selectedCategory === 'popular' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('popular')}
        >
          <Star size={12} />
          Popular
        </button>
        <button
          className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <Grid size={12} />
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
            style={{ '--cat-color': cat.color } as React.CSSProperties}
          >
            {cat.icon}
            {cat.name}
          </button>
        ))}
      </div>

      {/* Applied Effects */}
      {appliedEffects.length > 0 && (
        <div className="applied-effects-section">
          <button
            className="section-toggle"
            onClick={() => setShowApplied(!showApplied)}
          >
            <Layers size={14} />
            <span>Applied Effects ({appliedEffects.length})</span>
            {showApplied ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showApplied && (
            <div className="applied-effects-list">
              {appliedEffects.map((effect, index) => (
                <div
                  key={effect.id}
                  className={`applied-effect-item ${effect.enabled ? '' : 'disabled'}`}
                >
                  <div className="effect-drag-handle">⋮⋮</div>
                  <div
                    className="effect-indicator"
                    style={{ backgroundColor: getCategoryColor(getEffectCategory(effect.type)) }}
                  />
                  <span className="effect-name">{getEffectDisplayName(effect.type)}</span>
                  <div className="effect-time">
                    {formatTime(effect.startTime)} - {formatTime(effect.endTime)}
                  </div>
                  <div className="effect-actions">
                    <button
                      className="toggle-btn"
                      onClick={() => onUpdateEffect(effect.id, { enabled: !effect.enabled })}
                    >
                      {effect.enabled ? <Eye size={12} /> : <Eye size={12} className="off" />}
                    </button>
                    <button
                      className="settings-btn"
                      onClick={() => setExpandedEffect(expandedEffect === effect.id ? null : effect.id)}
                    >
                      <Settings size={12} />
                    </button>
                    <button
                      className="remove-btn"
                      onClick={() => onRemoveEffect(effect.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Expanded Settings */}
                  {expandedEffect === effect.id && (
                    <div className="effect-settings">
                      <div className="setting-row">
                        <label>Intensity</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={effect.intensity}
                          onChange={(e) => onUpdateEffect(effect.id, { intensity: parseInt(e.target.value) })}
                        />
                        <span>{effect.intensity}%</span>
                      </div>
                      <div className="setting-row">
                        <label>Start</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={videoDuration}
                          value={effect.startTime}
                          onChange={(e) => onUpdateEffect(effect.id, { startTime: parseFloat(e.target.value) })}
                        />
                        <span>s</span>
                      </div>
                      <div className="setting-row">
                        <label>End</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={videoDuration}
                          value={effect.endTime}
                          onChange={(e) => onUpdateEffect(effect.id, { endTime: parseFloat(e.target.value) })}
                        />
                        <span>s</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Effects Library */}
      <div className="effects-library">
        <div className="effects-grid">
          {filteredEffects.map(template => (
            <button
              key={template.id}
              className="effect-card"
              onClick={() => handleAddEffect(template)}
              title={template.description}
            >
              {/* Badges */}
              <div className="card-badges">
                {template.premium && <span className="badge premium">Pro</span>}
                {template.new && <span className="badge new">New</span>}
              </div>

              {/* Icon */}
              <div
                className="effect-icon"
                style={{ color: getCategoryColor(template.category) }}
              >
                {template.icon}
              </div>

              {/* Name */}
              <span className="effect-name">{template.name}</span>

              {/* Category indicator */}
              <div
                className="category-indicator"
                style={{ backgroundColor: getCategoryColor(template.category) }}
              />

              {/* Add button */}
              <div className="add-overlay">
                <Plus size={20} />
              </div>
            </button>
          ))}
        </div>

        {filteredEffects.length === 0 && (
          <div className="no-results">
            <Sparkles size={24} />
            <p>No effects found</p>
            <span>Try a different search or category</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============= HELPER FUNCTIONS =============

function getEffectCategory(type: string): EffectCategory {
  const categoryMap: Record<string, EffectCategory> = {
    zoom: 'motion', pan: 'motion', rotate: 'motion', shake: 'motion', dolly: 'motion', track: 'motion', orbit: 'motion',
    speed_ramp: 'speed', slow_motion: 'speed', fast_forward: 'speed', reverse: 'speed', freeze_frame: 'speed', time_remap: 'speed',
    chroma_key: 'compositing', luma_key: 'compositing', mask: 'compositing', blend: 'compositing', overlay: 'compositing', split_screen: 'compositing', pip: 'compositing',
    auto_color: 'ai', auto_stabilize: 'ai', background_blur: 'ai', background_replace: 'ai', face_track: 'ai', object_track: 'ai', auto_crop: 'ai', auto_frame: 'ai', style_transfer: 'ai', super_resolution: 'ai',
    letterbox: 'cinematic', film_grain: 'cinematic', light_leak: 'cinematic', lens_flare: 'cinematic', anamorphic: 'cinematic', depth_of_field: 'cinematic', camera_shake: 'cinematic', film_damage: 'cinematic', color_grade: 'cinematic',
    glitch: 'stylized', vhs: 'stylized', rgb_split: 'stylized', pixelate: 'stylized', halftone: 'stylized', posterize: 'stylized', cartoon: 'stylized', neon: 'stylized', mirror: 'stylized', kaleidoscope: 'stylized', thermal: 'stylized', night_vision: 'stylized', x_ray: 'stylized', emboss: 'stylized', edge_detect: 'stylized',
    particles: 'particles', rain: 'particles', snow: 'particles', fire: 'particles', smoke: 'particles', dust: 'particles', sparkles: 'particles', confetti: 'particles', bubbles: 'particles', leaves: 'particles', fog: 'particles', clouds: 'particles',
    audio_visualizer: 'audio', beat_zoom: 'audio', beat_flash: 'audio', audio_waveform: 'audio', spectrum_bars: 'audio', audio_particles: 'audio',
  }
  return categoryMap[type] || 'stylized'
}

function getEffectDisplayName(type: string): string {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Export types and templates
export { EFFECT_TEMPLATES, CATEGORIES }
