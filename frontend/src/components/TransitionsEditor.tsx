/**
 * TransitionsEditor - Advanced Transition Library
 * 90+ professional video transition effects for clip-to-clip editing
 */
import { useState, useMemo } from 'react'
import {
  Scissors, ArrowRight, Clock, Check, X, Sparkles,
  ChevronDown, ChevronUp, Zap, Eye, Layers, Grid3X3,
  RotateCw, Move, Palette, Tv, Maximize, Star, Circle,
  Settings, Filter, Search, Bookmark, BookmarkCheck, Info,
  Play, Square, Box, Film, Camera, Monitor, Flame, Droplet,
  Wind, Heart, Hexagon, Triangle
} from 'lucide-react'
import { Transition } from '../api'
import './TransitionsEditor.css'

// ===== TRANSITION TYPES (90+ Professional Effects) =====
export type TransitionType =
  // Basic
  | 'cut' | 'fade' | 'dissolve' | 'crossfade'
  // Wipes
  | 'wipe_left' | 'wipe_right' | 'wipe_up' | 'wipe_down'
  | 'wipe_diagonal_tl' | 'wipe_diagonal_tr' | 'wipe_diagonal_bl' | 'wipe_diagonal_br'
  // Slides
  | 'slide_left' | 'slide_right' | 'slide_up' | 'slide_down'
  | 'push_left' | 'push_right' | 'push_up' | 'push_down'
  // Zoom
  | 'zoom_in' | 'zoom_out' | 'zoom_rotate' | 'zoom_blur' | 'zoom_bounce' | 'scale_center'
  // 3D
  | 'cube_left' | 'cube_right' | 'cube_up' | 'cube_down'
  | 'flip_horizontal' | 'flip_vertical' | 'rotate_3d' | 'fold_left' | 'fold_right' | 'page_curl'
  // Stylized
  | 'glitch' | 'glitch_heavy' | 'vhs' | 'static' | 'film_burn' | 'film_scratch' | 'chromatic' | 'rgb_split'
  // Motion
  | 'swirl' | 'ripple' | 'wave' | 'shake' | 'bounce' | 'elastic' | 'whip_pan' | 'crash_zoom'
  // Flash & Light
  | 'flash' | 'flash_white' | 'flash_color' | 'strobe' | 'light_leak' | 'lens_flare' | 'glow' | 'bloom'
  // Color
  | 'color_fade' | 'color_wipe' | 'color_burn' | 'ink_drop' | 'paint_splatter' | 'color_shift' | 'desaturate' | 'negative'
  // Shapes
  | 'circle_in' | 'circle_out' | 'diamond_in' | 'diamond_out' | 'heart_in' | 'heart_out' | 'star_in' | 'star_out' | 'hexagon'
  // Blur
  | 'blur' | 'blur_directional' | 'blur_radial' | 'blur_zoom' | 'focus_pull' | 'defocus'
  // Digital
  | 'pixelate' | 'pixelate_in' | 'pixelate_out' | 'mosaic' | 'blocks' | 'digital_noise'
  // Cinematic
  | 'letterbox' | 'bars_horizontal' | 'bars_vertical' | 'blinds' | 'curtain' | 'split_screen'
  // Liquid
  | 'liquid' | 'morph' | 'melt' | 'drip' | 'smoke' | 'clouds'
  // Particles
  | 'particles' | 'sparkle' | 'confetti' | 'explosion' | 'shatter' | 'disintegrate'
  // Spin
  | 'spin' | 'spin_blur' | 'spin_zoom' | 'tornado'
  // Special
  | 'dream' | 'vintage' | 'retro' | 'cyberpunk' | 'neon' | 'hologram'

// ===== TRANSITION CATEGORIES =====
type TransitionCategory =
  | 'basic'
  | 'wipes'
  | 'slides'
  | 'zoom'
  | '3d'
  | 'stylized'
  | 'motion'
  | 'flash'
  | 'color'
  | 'shapes'
  | 'blur'
  | 'digital'
  | 'cinematic'
  | 'liquid'
  | 'particles'
  | 'spin'
  | 'special'

interface TransitionOption {
  type: TransitionType
  label: string
  description: string
  icon: React.ReactNode
  category: TransitionCategory
  tags: string[]
  color?: string
  isPremium?: boolean
  isPopular?: boolean
  isTrending?: boolean
  defaultDuration?: number
}

// ===== CATEGORY DEFINITIONS =====
const CATEGORIES: { id: TransitionCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'basic', label: 'Basic', icon: <Layers size={14} />, color: '#64748b' },
  { id: 'wipes', label: 'Wipes', icon: <Move size={14} />, color: '#3b82f6' },
  { id: 'slides', label: 'Slides', icon: <ArrowRight size={14} />, color: '#06b6d4' },
  { id: 'zoom', label: 'Zoom', icon: <Maximize size={14} />, color: '#8b5cf6' },
  { id: '3d', label: '3D', icon: <Box size={14} />, color: '#ec4899' },
  { id: 'stylized', label: 'Stylized', icon: <Tv size={14} />, color: '#10b981' },
  { id: 'motion', label: 'Motion', icon: <Wind size={14} />, color: '#f59e0b' },
  { id: 'flash', label: 'Flash', icon: <Zap size={14} />, color: '#fbbf24' },
  { id: 'color', label: 'Color', icon: <Palette size={14} />, color: '#f472b6' },
  { id: 'shapes', label: 'Shapes', icon: <Circle size={14} />, color: '#a855f7' },
  { id: 'blur', label: 'Blur', icon: <Eye size={14} />, color: '#6366f1' },
  { id: 'digital', label: 'Digital', icon: <Grid3X3 size={14} />, color: '#14b8a6' },
  { id: 'cinematic', label: 'Cinematic', icon: <Film size={14} />, color: '#ef4444' },
  { id: 'liquid', label: 'Liquid', icon: <Droplet size={14} />, color: '#0ea5e9' },
  { id: 'particles', label: 'Particles', icon: <Sparkles size={14} />, color: '#f97316' },
  { id: 'spin', label: 'Spin', icon: <RotateCw size={14} />, color: '#84cc16' },
  { id: 'special', label: 'Special', icon: <Star size={14} />, color: '#eab308' },
]

// ===== TRANSITION LIBRARY (90+ Professional Effects) =====
const TRANSITION_OPTIONS: TransitionOption[] = [
  // === BASIC (4) ===
  { type: 'cut', label: 'Cut', description: 'Instant switch between clips', icon: <Scissors size={16} />, category: 'basic', tags: ['instant', 'clean'], defaultDuration: 0 },
  { type: 'fade', label: 'Fade', description: 'Fade out to black, then in', icon: <Circle size={16} />, category: 'basic', tags: ['smooth', 'classic'], isPopular: true },
  { type: 'dissolve', label: 'Dissolve', description: 'Smooth cross-dissolve blend', icon: <Layers size={16} />, category: 'basic', tags: ['blend', 'smooth'], isPopular: true },
  { type: 'crossfade', label: 'Crossfade', description: 'Simple crossfade transition', icon: <Layers size={16} />, category: 'basic', tags: ['blend', 'simple'] },

  // === WIPES (8) ===
  { type: 'wipe_left', label: 'Wipe Left', description: 'Wipe from right to left', icon: <ArrowRight size={16} style={{ transform: 'scaleX(-1)' }} />, category: 'wipes', tags: ['directional'] },
  { type: 'wipe_right', label: 'Wipe Right', description: 'Wipe from left to right', icon: <ArrowRight size={16} />, category: 'wipes', tags: ['directional'], isPopular: true },
  { type: 'wipe_up', label: 'Wipe Up', description: 'Wipe from bottom to top', icon: <ArrowRight size={16} style={{ transform: 'rotate(-90deg)' }} />, category: 'wipes', tags: ['directional'] },
  { type: 'wipe_down', label: 'Wipe Down', description: 'Wipe from top to bottom', icon: <ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} />, category: 'wipes', tags: ['directional'] },
  { type: 'wipe_diagonal_tl', label: 'Diagonal TL', description: 'Wipe from bottom-right to top-left', icon: <ArrowRight size={16} style={{ transform: 'rotate(-135deg)' }} />, category: 'wipes', tags: ['diagonal'] },
  { type: 'wipe_diagonal_tr', label: 'Diagonal TR', description: 'Wipe from bottom-left to top-right', icon: <ArrowRight size={16} style={{ transform: 'rotate(-45deg)' }} />, category: 'wipes', tags: ['diagonal'] },
  { type: 'wipe_diagonal_bl', label: 'Diagonal BL', description: 'Wipe from top-right to bottom-left', icon: <ArrowRight size={16} style={{ transform: 'rotate(135deg)' }} />, category: 'wipes', tags: ['diagonal'] },
  { type: 'wipe_diagonal_br', label: 'Diagonal BR', description: 'Wipe from top-left to bottom-right', icon: <ArrowRight size={16} style={{ transform: 'rotate(45deg)' }} />, category: 'wipes', tags: ['diagonal'] },

  // === SLIDES (8) ===
  { type: 'slide_left', label: 'Slide Left', description: 'New clip slides in from right', icon: <Move size={16} />, category: 'slides', tags: ['slide', 'cover'], isPopular: true },
  { type: 'slide_right', label: 'Slide Right', description: 'New clip slides in from left', icon: <Move size={16} />, category: 'slides', tags: ['slide', 'cover'] },
  { type: 'slide_up', label: 'Slide Up', description: 'New clip slides in from bottom', icon: <Move size={16} />, category: 'slides', tags: ['slide', 'cover'] },
  { type: 'slide_down', label: 'Slide Down', description: 'New clip slides in from top', icon: <Move size={16} />, category: 'slides', tags: ['slide', 'cover'] },
  { type: 'push_left', label: 'Push Left', description: 'Push old clip out to the left', icon: <ArrowRight size={16} style={{ transform: 'scaleX(-1)' }} />, category: 'slides', tags: ['push', 'reveal'] },
  { type: 'push_right', label: 'Push Right', description: 'Push old clip out to the right', icon: <ArrowRight size={16} />, category: 'slides', tags: ['push', 'reveal'] },
  { type: 'push_up', label: 'Push Up', description: 'Push old clip out upward', icon: <ArrowRight size={16} style={{ transform: 'rotate(-90deg)' }} />, category: 'slides', tags: ['push', 'reveal'] },
  { type: 'push_down', label: 'Push Down', description: 'Push old clip out downward', icon: <ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} />, category: 'slides', tags: ['push', 'reveal'] },

  // === ZOOM (6) ===
  { type: 'zoom_in', label: 'Zoom In', description: 'Zoom into the new clip', icon: <Maximize size={16} />, category: 'zoom', tags: ['zoom', 'scale'], isPopular: true },
  { type: 'zoom_out', label: 'Zoom Out', description: 'Zoom out to reveal new clip', icon: <Maximize size={16} />, category: 'zoom', tags: ['zoom', 'scale'] },
  { type: 'zoom_rotate', label: 'Zoom Rotate', description: 'Zoom with rotation effect', icon: <RotateCw size={16} />, category: 'zoom', tags: ['zoom', 'rotate'], isTrending: true },
  { type: 'zoom_blur', label: 'Zoom Blur', description: 'Zoom with motion blur', icon: <Eye size={16} />, category: 'zoom', tags: ['zoom', 'blur'] },
  { type: 'zoom_bounce', label: 'Zoom Bounce', description: 'Zoom with bounce effect', icon: <Maximize size={16} />, category: 'zoom', tags: ['zoom', 'bounce'], isTrending: true },
  { type: 'scale_center', label: 'Scale Center', description: 'Scale from center point', icon: <Circle size={16} />, category: 'zoom', tags: ['scale', 'center'] },

  // === 3D (10) ===
  { type: 'cube_left', label: 'Cube Left', description: '3D cube rotation to left', icon: <Box size={16} />, category: '3d', tags: ['3d', 'cube'], isPremium: true, isTrending: true },
  { type: 'cube_right', label: 'Cube Right', description: '3D cube rotation to right', icon: <Box size={16} />, category: '3d', tags: ['3d', 'cube'], isPremium: true },
  { type: 'cube_up', label: 'Cube Up', description: '3D cube rotation upward', icon: <Box size={16} />, category: '3d', tags: ['3d', 'cube'], isPremium: true },
  { type: 'cube_down', label: 'Cube Down', description: '3D cube rotation downward', icon: <Box size={16} />, category: '3d', tags: ['3d', 'cube'], isPremium: true },
  { type: 'flip_horizontal', label: 'Flip H', description: 'Horizontal flip transition', icon: <RotateCw size={16} />, category: '3d', tags: ['3d', 'flip'] },
  { type: 'flip_vertical', label: 'Flip V', description: 'Vertical flip transition', icon: <RotateCw size={16} style={{ transform: 'rotate(90deg)' }} />, category: '3d', tags: ['3d', 'flip'] },
  { type: 'rotate_3d', label: '3D Rotate', description: 'Full 3D rotation effect', icon: <Box size={16} />, category: '3d', tags: ['3d', 'rotate'], isPremium: true },
  { type: 'fold_left', label: 'Fold Left', description: 'Paper fold to left', icon: <Square size={16} />, category: '3d', tags: ['3d', 'fold'] },
  { type: 'fold_right', label: 'Fold Right', description: 'Paper fold to right', icon: <Square size={16} />, category: '3d', tags: ['3d', 'fold'] },
  { type: 'page_curl', label: 'Page Curl', description: 'Page curl effect', icon: <Square size={16} />, category: '3d', tags: ['3d', 'page'], isPremium: true },

  // === STYLIZED (8) ===
  { type: 'glitch', label: 'Glitch', description: 'Digital glitch effect', icon: <Tv size={16} />, category: 'stylized', tags: ['glitch', 'digital'], isPopular: true, isTrending: true },
  { type: 'glitch_heavy', label: 'Heavy Glitch', description: 'Intense glitch effect', icon: <Tv size={16} />, category: 'stylized', tags: ['glitch', 'intense'] },
  { type: 'vhs', label: 'VHS', description: 'Retro VHS tape effect', icon: <Monitor size={16} />, category: 'stylized', tags: ['retro', 'vhs'], isTrending: true },
  { type: 'static', label: 'Static', description: 'TV static noise', icon: <Tv size={16} />, category: 'stylized', tags: ['noise', 'static'] },
  { type: 'film_burn', label: 'Film Burn', description: 'Cinematic film burn effect', icon: <Flame size={16} />, category: 'stylized', tags: ['film', 'organic'], isPremium: true },
  { type: 'film_scratch', label: 'Film Scratch', description: 'Old film scratch effect', icon: <Film size={16} />, category: 'stylized', tags: ['film', 'vintage'] },
  { type: 'chromatic', label: 'Chromatic', description: 'Chromatic aberration effect', icon: <Camera size={16} />, category: 'stylized', tags: ['chromatic', 'lens'], isTrending: true },
  { type: 'rgb_split', label: 'RGB Split', description: 'RGB channel split effect', icon: <Palette size={16} />, category: 'stylized', tags: ['rgb', 'split'], isPopular: true },

  // === MOTION (8) ===
  { type: 'swirl', label: 'Swirl', description: 'Swirling vortex effect', icon: <RotateCw size={16} />, category: 'motion', tags: ['swirl', 'spiral'] },
  { type: 'ripple', label: 'Ripple', description: 'Water ripple effect', icon: <Droplet size={16} />, category: 'motion', tags: ['water', 'ripple'] },
  { type: 'wave', label: 'Wave', description: 'Wave distortion effect', icon: <Wind size={16} />, category: 'motion', tags: ['wave', 'distort'] },
  { type: 'shake', label: 'Shake', description: 'Camera shake transition', icon: <Move size={16} />, category: 'motion', tags: ['shake', 'handheld'] },
  { type: 'bounce', label: 'Bounce', description: 'Bouncy transition effect', icon: <Circle size={16} />, category: 'motion', tags: ['bounce', 'elastic'] },
  { type: 'elastic', label: 'Elastic', description: 'Elastic stretch effect', icon: <Move size={16} />, category: 'motion', tags: ['elastic', 'stretch'] },
  { type: 'whip_pan', label: 'Whip Pan', description: 'Fast whip pan blur', icon: <ArrowRight size={16} />, category: 'motion', tags: ['whip', 'blur'], isPopular: true },
  { type: 'crash_zoom', label: 'Crash Zoom', description: 'Dramatic crash zoom', icon: <Maximize size={16} />, category: 'motion', tags: ['zoom', 'dramatic'], isTrending: true },

  // === FLASH & LIGHT (8) ===
  { type: 'flash', label: 'Flash', description: 'Quick flash transition', icon: <Zap size={16} />, category: 'flash', tags: ['flash', 'white'], isPopular: true },
  { type: 'flash_white', label: 'White Flash', description: 'Flash to white', icon: <Zap size={16} />, category: 'flash', tags: ['flash', 'bright'], color: '#ffffff' },
  { type: 'flash_color', label: 'Color Flash', description: 'Flash with custom color', icon: <Zap size={16} />, category: 'flash', tags: ['flash', 'color'], color: '#8b5cf6' },
  { type: 'strobe', label: 'Strobe', description: 'Rapid strobe effect', icon: <Zap size={16} />, category: 'flash', tags: ['strobe', 'rapid'] },
  { type: 'light_leak', label: 'Light Leak', description: 'Cinematic light leak', icon: <Camera size={16} />, category: 'flash', tags: ['light', 'cinematic'], isPremium: true, isTrending: true },
  { type: 'lens_flare', label: 'Lens Flare', description: 'Anamorphic lens flare', icon: <Camera size={16} />, category: 'flash', tags: ['lens', 'flare'], isPremium: true },
  { type: 'glow', label: 'Glow', description: 'Soft glow transition', icon: <Circle size={16} />, category: 'flash', tags: ['glow', 'soft'] },
  { type: 'bloom', label: 'Bloom', description: 'HDR bloom effect', icon: <Circle size={16} />, category: 'flash', tags: ['bloom', 'hdr'] },

  // === COLOR (8) ===
  { type: 'color_fade', label: 'Color Fade', description: 'Fade through custom color', icon: <Palette size={16} />, category: 'color', tags: ['color', 'fade'], color: '#8b5cf6', isPopular: true },
  { type: 'color_wipe', label: 'Color Wipe', description: 'Color wipe transition', icon: <Palette size={16} />, category: 'color', tags: ['color', 'wipe'], color: '#3b82f6' },
  { type: 'color_burn', label: 'Color Burn', description: 'Burning color effect', icon: <Flame size={16} />, category: 'color', tags: ['burn', 'intense'] },
  { type: 'ink_drop', label: 'Ink Drop', description: 'Ink spreading effect', icon: <Droplet size={16} />, category: 'color', tags: ['ink', 'organic'], isPremium: true },
  { type: 'paint_splatter', label: 'Paint Splatter', description: 'Paint splash effect', icon: <Palette size={16} />, category: 'color', tags: ['paint', 'artistic'], isPremium: true },
  { type: 'color_shift', label: 'Color Shift', description: 'Hue shift transition', icon: <Palette size={16} />, category: 'color', tags: ['hue', 'shift'] },
  { type: 'desaturate', label: 'Desaturate', description: 'Fade to grayscale', icon: <Circle size={16} />, category: 'color', tags: ['gray', 'desaturate'] },
  { type: 'negative', label: 'Negative', description: 'Invert colors transition', icon: <Circle size={16} />, category: 'color', tags: ['invert', 'negative'] },

  // === SHAPES (9) ===
  { type: 'circle_in', label: 'Circle In', description: 'Circle reveal inward', icon: <Circle size={16} />, category: 'shapes', tags: ['circle', 'reveal'], isPopular: true },
  { type: 'circle_out', label: 'Circle Out', description: 'Circle expand outward', icon: <Circle size={16} />, category: 'shapes', tags: ['circle', 'expand'] },
  { type: 'diamond_in', label: 'Diamond In', description: 'Diamond shape reveal', icon: <Square size={16} style={{ transform: 'rotate(45deg)' }} />, category: 'shapes', tags: ['diamond', 'reveal'] },
  { type: 'diamond_out', label: 'Diamond Out', description: 'Diamond shape expand', icon: <Square size={16} style={{ transform: 'rotate(45deg)' }} />, category: 'shapes', tags: ['diamond', 'expand'] },
  { type: 'heart_in', label: 'Heart In', description: 'Heart shape reveal', icon: <Heart size={16} />, category: 'shapes', tags: ['heart', 'romantic'] },
  { type: 'heart_out', label: 'Heart Out', description: 'Heart shape expand', icon: <Heart size={16} />, category: 'shapes', tags: ['heart', 'romantic'] },
  { type: 'star_in', label: 'Star In', description: 'Star shape reveal', icon: <Star size={16} />, category: 'shapes', tags: ['star', 'reveal'] },
  { type: 'star_out', label: 'Star Out', description: 'Star shape expand', icon: <Star size={16} />, category: 'shapes', tags: ['star', 'expand'] },
  { type: 'hexagon', label: 'Hexagon', description: 'Hexagon shape transition', icon: <Hexagon size={16} />, category: 'shapes', tags: ['hexagon', 'geometric'] },

  // === BLUR (6) ===
  { type: 'blur', label: 'Blur', description: 'Simple blur transition', icon: <Eye size={16} />, category: 'blur', tags: ['blur', 'soft'], isPopular: true },
  { type: 'blur_directional', label: 'Directional Blur', description: 'Motion blur in direction', icon: <ArrowRight size={16} />, category: 'blur', tags: ['blur', 'motion'] },
  { type: 'blur_radial', label: 'Radial Blur', description: 'Radial spin blur', icon: <Circle size={16} />, category: 'blur', tags: ['blur', 'radial'] },
  { type: 'blur_zoom', label: 'Zoom Blur', description: 'Zoom motion blur', icon: <Maximize size={16} />, category: 'blur', tags: ['blur', 'zoom'] },
  { type: 'focus_pull', label: 'Focus Pull', description: 'Camera focus pull', icon: <Camera size={16} />, category: 'blur', tags: ['focus', 'cinematic'], isTrending: true },
  { type: 'defocus', label: 'Defocus', description: 'Defocus blur effect', icon: <Eye size={16} />, category: 'blur', tags: ['defocus', 'bokeh'] },

  // === DIGITAL (6) ===
  { type: 'pixelate', label: 'Pixelate', description: 'Pixelation effect', icon: <Grid3X3 size={16} />, category: 'digital', tags: ['pixel', 'digital'], isPopular: true },
  { type: 'pixelate_in', label: 'Pixelate In', description: 'Pixelate then reveal', icon: <Grid3X3 size={16} />, category: 'digital', tags: ['pixel', 'reveal'] },
  { type: 'pixelate_out', label: 'Pixelate Out', description: 'Reveal then pixelate', icon: <Grid3X3 size={16} />, category: 'digital', tags: ['pixel', 'hide'] },
  { type: 'mosaic', label: 'Mosaic', description: 'Mosaic tile effect', icon: <Grid3X3 size={16} />, category: 'digital', tags: ['mosaic', 'tiles'] },
  { type: 'blocks', label: 'Blocks', description: 'Block shuffle effect', icon: <Square size={16} />, category: 'digital', tags: ['blocks', 'shuffle'] },
  { type: 'digital_noise', label: 'Digital Noise', description: 'Digital corruption noise', icon: <Tv size={16} />, category: 'digital', tags: ['noise', 'corruption'] },

  // === CINEMATIC (6) ===
  { type: 'letterbox', label: 'Letterbox', description: 'Cinematic letterbox reveal', icon: <Film size={16} />, category: 'cinematic', tags: ['letterbox', 'cinematic'] },
  { type: 'bars_horizontal', label: 'Horizontal Bars', description: 'Horizontal bar transition', icon: <Square size={16} />, category: 'cinematic', tags: ['bars', 'lines'] },
  { type: 'bars_vertical', label: 'Vertical Bars', description: 'Vertical bar transition', icon: <Square size={16} />, category: 'cinematic', tags: ['bars', 'lines'] },
  { type: 'blinds', label: 'Blinds', description: 'Window blinds effect', icon: <Layers size={16} />, category: 'cinematic', tags: ['blinds', 'reveal'] },
  { type: 'curtain', label: 'Curtain', description: 'Theater curtain effect', icon: <Square size={16} />, category: 'cinematic', tags: ['curtain', 'theater'] },
  { type: 'split_screen', label: 'Split Screen', description: 'Split screen transition', icon: <Layers size={16} />, category: 'cinematic', tags: ['split', 'dual'] },

  // === LIQUID (6) ===
  { type: 'liquid', label: 'Liquid', description: 'Liquid morph effect', icon: <Droplet size={16} />, category: 'liquid', tags: ['liquid', 'morph'], isPremium: true, isTrending: true },
  { type: 'morph', label: 'Morph', description: 'Smooth morph transition', icon: <Circle size={16} />, category: 'liquid', tags: ['morph', 'smooth'], isPremium: true },
  { type: 'melt', label: 'Melt', description: 'Melting drip effect', icon: <Droplet size={16} />, category: 'liquid', tags: ['melt', 'drip'] },
  { type: 'drip', label: 'Drip', description: 'Dripping paint effect', icon: <Droplet size={16} />, category: 'liquid', tags: ['drip', 'paint'] },
  { type: 'smoke', label: 'Smoke', description: 'Smoke disperse effect', icon: <Wind size={16} />, category: 'liquid', tags: ['smoke', 'organic'], isPremium: true },
  { type: 'clouds', label: 'Clouds', description: 'Cloud wipe effect', icon: <Wind size={16} />, category: 'liquid', tags: ['clouds', 'soft'] },

  // === PARTICLES (6) ===
  { type: 'particles', label: 'Particles', description: 'Particle dispersion', icon: <Sparkles size={16} />, category: 'particles', tags: ['particles', 'disperse'], isPremium: true },
  { type: 'sparkle', label: 'Sparkle', description: 'Sparkle shimmer effect', icon: <Sparkles size={16} />, category: 'particles', tags: ['sparkle', 'magic'] },
  { type: 'confetti', label: 'Confetti', description: 'Celebration confetti', icon: <Sparkles size={16} />, category: 'particles', tags: ['confetti', 'celebrate'] },
  { type: 'explosion', label: 'Explosion', description: 'Explosive burst effect', icon: <Zap size={16} />, category: 'particles', tags: ['explosion', 'burst'], isPremium: true },
  { type: 'shatter', label: 'Shatter', description: 'Glass shatter effect', icon: <Triangle size={16} />, category: 'particles', tags: ['shatter', 'glass'], isPremium: true, isTrending: true },
  { type: 'disintegrate', label: 'Disintegrate', description: 'Thanos-style disintegration', icon: <Wind size={16} />, category: 'particles', tags: ['disintegrate', 'dust'], isPremium: true },

  // === SPIN (4) ===
  { type: 'spin', label: 'Spin', description: 'Simple spin transition', icon: <RotateCw size={16} />, category: 'spin', tags: ['spin', 'rotate'], isPopular: true },
  { type: 'spin_blur', label: 'Spin Blur', description: 'Spinning with blur', icon: <RotateCw size={16} />, category: 'spin', tags: ['spin', 'blur'] },
  { type: 'spin_zoom', label: 'Spin Zoom', description: 'Spinning zoom effect', icon: <RotateCw size={16} />, category: 'spin', tags: ['spin', 'zoom'] },
  { type: 'tornado', label: 'Tornado', description: 'Tornado vortex effect', icon: <Wind size={16} />, category: 'spin', tags: ['tornado', 'vortex'], isPremium: true },

  // === SPECIAL (6) ===
  { type: 'dream', label: 'Dream', description: 'Dreamy soft transition', icon: <Star size={16} />, category: 'special', tags: ['dream', 'soft'], isPremium: true },
  { type: 'vintage', label: 'Vintage', description: 'Old film vintage look', icon: <Film size={16} />, category: 'special', tags: ['vintage', 'retro'] },
  { type: 'retro', label: 'Retro', description: '80s retro style', icon: <Monitor size={16} />, category: 'special', tags: ['retro', '80s'], isTrending: true },
  { type: 'cyberpunk', label: 'Cyberpunk', description: 'Neon cyberpunk effect', icon: <Zap size={16} />, category: 'special', tags: ['cyberpunk', 'neon'], isPremium: true, isTrending: true },
  { type: 'neon', label: 'Neon', description: 'Neon glow transition', icon: <Circle size={16} />, category: 'special', tags: ['neon', 'glow'], color: '#f472b6' },
  { type: 'hologram', label: 'Hologram', description: 'Holographic effect', icon: <Layers size={16} />, category: 'special', tags: ['hologram', 'futuristic'], isPremium: true },
]

const DURATION_PRESETS = [
  { value: 0.25, label: '0.25s', description: 'Very fast' },
  { value: 0.5, label: '0.5s', description: 'Fast' },
  { value: 0.75, label: '0.75s', description: 'Medium' },
  { value: 1.0, label: '1s', description: 'Standard' },
  { value: 1.5, label: '1.5s', description: 'Slow' },
  { value: 2.0, label: '2s', description: 'Very slow' },
]

const EASING_OPTIONS = [
  { value: 'linear', label: 'Linear', description: 'Constant speed' },
  { value: 'ease', label: 'Ease', description: 'Smooth start and end' },
  { value: 'ease-in', label: 'Ease In', description: 'Slow start' },
  { value: 'ease-out', label: 'Ease Out', description: 'Slow end' },
  { value: 'ease-in-out', label: 'Ease In/Out', description: 'Slow start and end' },
  { value: 'bounce', label: 'Bounce', description: 'Bouncy effect' },
  { value: 'elastic', label: 'Elastic', description: 'Elastic effect' },
]

// ===== PROPS =====
interface IntroOutroEffect {
  type: string
  duration: number
}

interface TransitionsEditorProps {
  transitions: Transition[]
  suggestedTransitions?: Array<{
    timestamp: number
    type: string
    confidence: number
    suggested_transition: string
    reason: string
  }>
  onAddTransition: (fromClipId: number, toClipId: number, type: TransitionType, duration: number) => Promise<void>
  onUpdateTransition: (id: number, type: TransitionType, duration: number) => Promise<void>
  onDeleteTransition: (id: number) => Promise<void>
  onApplySuggested?: (suggestion: any) => void
  clips: Array<{ id: number; original_name: string | null; timeline_order: number }>
  introEffect?: IntroOutroEffect | null
  outroEffect?: IntroOutroEffect | null
  onRemoveIntroEffect?: () => void
  onRemoveOutroEffect?: () => void
}

// ===== COMPONENT =====
export default function TransitionsEditor({
  transitions,
  suggestedTransitions,
  onAddTransition,
  onUpdateTransition,
  onDeleteTransition,
  onApplySuggested,
  clips,
  introEffect,
  outroEffect,
  onRemoveIntroEffect,
  onRemoveOutroEffect
}: TransitionsEditorProps) {
  // State
  const [selectedTransition, setSelectedTransition] = useState<number | null>(null)
  const [newTransitionFrom, setNewTransitionFrom] = useState<number | null>(null)
  const [newTransitionTo, setNewTransitionTo] = useState<number | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<TransitionCategory | 'all' | 'favorites'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState<TransitionType[]>(['fade', 'dissolve', 'slide_left', 'glitch', 'flash'])
  const [previewTransition, setPreviewTransition] = useState<TransitionType | null>(null)
  const [selectedDuration, setSelectedDuration] = useState(0.5)
  const [selectedEasing, setSelectedEasing] = useState('ease')
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortedClips = [...clips].sort((a, b) => a.timeline_order - b.timeline_order)

  // Filtered transitions
  const filteredTransitions = useMemo(() => {
    let filtered = TRANSITION_OPTIONS

    // Filter by category
    if (selectedCategory === 'favorites') {
      filtered = filtered.filter(t => favorites.includes(t.type))
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.label.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [selectedCategory, searchQuery, favorites])

  const handleAddTransition = async (type: TransitionType, duration: number = selectedDuration) => {
    if (!newTransitionFrom || !newTransitionTo || isAdding) return

    setIsAdding(true)
    setError(null)

    try {
      console.log('Adding transition:', { type, duration, from: newTransitionFrom, to: newTransitionTo })
      await onAddTransition(newTransitionFrom, newTransitionTo, type, duration)
      console.log('Transition added successfully!')
      // Only close picker on success
      setNewTransitionFrom(null)
      setNewTransitionTo(null)
    } catch (err) {
      console.error('Failed to add transition:', err)
      setError(`Failed to add transition: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsAdding(false)
    }
  }

  const toggleFavorite = (type: TransitionType) => {
    setFavorites(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const getTransitionBetweenClips = (fromId: number, toId: number) => {
    return transitions.find(t => t.from_clip_id === fromId && t.to_clip_id === toId)
  }

  const getOptionByType = (type: string) => {
    return TRANSITION_OPTIONS.find(t => t.type === type)
  }

  // Stats
  const popularCount = TRANSITION_OPTIONS.filter(t => t.isPopular).length
  const trendingCount = TRANSITION_OPTIONS.filter(t => t.isTrending).length
  const premiumCount = TRANSITION_OPTIONS.filter(t => t.isPremium).length

  return (
    <div className="transitions-editor advanced">
      {/* Header */}
      <div className="editor-header">
        <div className="header-title">
          <Scissors size={18} />
          <h3>Transitions</h3>
          <span className="transition-count">{transitions.length} applied</span>
        </div>
        <div className="header-stats">
          <span className="stat popular">
            <Star size={10} /> {popularCount}
          </span>
          <span className="stat trending">
            <Zap size={10} /> {trendingCount}
          </span>
          <span className="stat premium">
            <Sparkles size={10} /> {premiumCount}
          </span>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestedTransitions && suggestedTransitions.length > 0 && (
        <div className="suggestions-section">
          <button
            className="suggestions-toggle"
            onClick={() => setShowSuggestions(!showSuggestions)}
          >
            <Sparkles size={14} />
            <span>AI Suggestions ({suggestedTransitions.length})</span>
            {showSuggestions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showSuggestions && (
            <div className="suggestions-list">
              {suggestedTransitions.slice(0, 8).map((suggestion, idx) => {
                const isIntro = suggestion.type === 'start'
                const isOutro = suggestion.type === 'end'
                const typeLabel = isIntro ? 'Intro Effect' : isOutro ? 'Outro Effect' : 'Transition'

                return (
                  <div key={idx} className={`suggestion-item ${isIntro ? 'intro' : ''} ${isOutro ? 'outro' : ''}`}>
                    <div className="suggestion-info">
                      <span className="suggestion-type">
                        {isIntro && <Play size={12} style={{ marginRight: 4 }} />}
                        {isOutro && <Square size={12} style={{ marginRight: 4 }} />}
                        {suggestion.suggested_transition}
                      </span>
                      <span className="suggestion-label">{typeLabel}</span>
                    </div>
                    <div className="suggestion-reason">{suggestion.reason}</div>
                    {onApplySuggested && (
                      <button
                        className="apply-btn"
                        onClick={() => onApplySuggested(suggestion)}
                      >
                        <Check size={12} /> Apply
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Applied Intro/Outro Effects */}
      {(introEffect || outroEffect) && (
        <div className="intro-outro-section">
          <div className="list-header">Video Effects</div>

          {introEffect && (
            <div className="effect-item intro">
              <div className="effect-info">
                <span className="effect-icon"><Play size={12} /></span>
                <span className="effect-type">Intro Effect</span>
                <span className="effect-name">{introEffect.type}</span>
                <span className="effect-duration">
                  <Clock size={10} /> {introEffect.duration}s
                </span>
              </div>
              {onRemoveIntroEffect && (
                <button
                  className="remove-btn"
                  onClick={onRemoveIntroEffect}
                  title="Remove intro effect"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {outroEffect && (
            <div className="effect-item outro">
              <div className="effect-info">
                <span className="effect-icon"><Square size={12} /></span>
                <span className="effect-type">Outro Effect</span>
                <span className="effect-name">{outroEffect.type}</span>
                <span className="effect-duration">
                  <Clock size={10} /> {outroEffect.duration}s
                </span>
              </div>
              {onRemoveOutroEffect && (
                <button
                  className="remove-btn"
                  onClick={onRemoveOutroEffect}
                  title="Remove outro effect"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Clip Transitions List */}
      <div className="transitions-list">
        <div className="list-header">Between Clips</div>

        {sortedClips.length < 2 ? (
          <div className="empty-state">
            <Scissors size={24} />
            <p>Add at least 2 clips to create transitions</p>
          </div>
        ) : (
          sortedClips.slice(0, -1).map((clip, idx) => {
            const nextClip = sortedClips[idx + 1]
            const existingTransition = getTransitionBetweenClips(clip.id, nextClip.id)
            const transitionOption = existingTransition ? getOptionByType(existingTransition.type) : null

            return (
              <div key={clip.id} className="clip-transition">
                <div className="clip-pair">
                  <span className="clip-name">{clip.original_name || `Clip ${idx + 1}`}</span>
                  <ArrowRight size={14} className="arrow" />
                  <span className="clip-name">{nextClip.original_name || `Clip ${idx + 2}`}</span>
                </div>

                {existingTransition ? (
                  <div className="transition-applied">
                    <div className={`transition-badge ${transitionOption?.category}`}>
                      {transitionOption?.icon}
                      <span>{transitionOption?.label || existingTransition.type}</span>
                    </div>
                    <span className="transition-duration">
                      <Clock size={10} /> {existingTransition.duration}s
                    </span>
                    <button
                      className="edit-btn"
                      onClick={() => setSelectedTransition(
                        selectedTransition === existingTransition.id ? null : existingTransition.id
                      )}
                    >
                      <Settings size={12} />
                    </button>
                    <button
                      className="remove-btn"
                      onClick={() => onDeleteTransition(existingTransition.id)}
                    >
                      <X size={12} />
                    </button>

                    {selectedTransition === existingTransition.id && (
                      <div className="transition-editor-popup">
                        <div className="popup-section">
                          <label>Quick Select</label>
                          <div className="quick-select">
                            {['fade', 'dissolve', 'slide_left', 'zoom_in', 'glitch', 'flash'].map(type => {
                              const opt = getOptionByType(type)
                              if (!opt) return null
                              return (
                                <button
                                  key={type}
                                  className={`quick-btn ${existingTransition.type === type ? 'active' : ''}`}
                                  onClick={() => onUpdateTransition(
                                    existingTransition.id,
                                    type as TransitionType,
                                    existingTransition.duration
                                  )}
                                  title={opt.description}
                                >
                                  {opt.icon}
                                  <span>{opt.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <div className="popup-section">
                          <label>Duration</label>
                          <div className="duration-presets">
                            {DURATION_PRESETS.map(d => (
                              <button
                                key={d.value}
                                className={`duration-btn ${existingTransition.duration === d.value ? 'active' : ''}`}
                                onClick={() => onUpdateTransition(
                                  existingTransition.id,
                                  existingTransition.type as TransitionType,
                                  d.value
                                )}
                                title={d.description}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          className="more-options-btn"
                          onClick={() => {
                            setNewTransitionFrom(clip.id)
                            setNewTransitionTo(nextClip.id)
                            setSelectedTransition(null)
                          }}
                        >
                          <Filter size={12} />
                          Browse All Transitions
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    className="add-transition-btn"
                    onClick={() => {
                      setNewTransitionFrom(clip.id)
                      setNewTransitionTo(nextClip.id)
                    }}
                  >
                    <Layers size={14} />
                    Add Transition
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Full Transition Library Picker */}
      {newTransitionFrom && newTransitionTo && (
        <div className="transition-picker-overlay" onClick={() => {
          setNewTransitionFrom(null)
          setNewTransitionTo(null)
        }}>
          <div className="transition-picker advanced-picker" onClick={e => e.stopPropagation()}>
            {/* Picker Header */}
            <div className="picker-header">
              <div className="header-content">
                <Layers size={20} />
                <div>
                  <h4>Transition Library</h4>
                  <span className="subtitle">{TRANSITION_OPTIONS.length} effects available</span>
                </div>
              </div>
              <div className="header-actions">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 size={14} />
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <Layers size={14} />
                </button>
                <button className="close-btn" onClick={() => {
                  setNewTransitionFrom(null)
                  setNewTransitionTo(null)
                }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="picker-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search transitions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <div className="category-tabs">
              <button
                className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                <Layers size={12} />
                All
                <span className="count">{TRANSITION_OPTIONS.length}</span>
              </button>
              <button
                className={`category-tab favorites ${selectedCategory === 'favorites' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('favorites')}
              >
                <Star size={12} />
                Favorites
                <span className="count">{favorites.length}</span>
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{ '--cat-color': cat.color } as React.CSSProperties}
                >
                  {cat.icon}
                  {cat.label}
                  <span className="count">
                    {TRANSITION_OPTIONS.filter(t => t.category === cat.id).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Duration & Easing Bar */}
            <div className="settings-bar">
              <div className="setting-group">
                <label><Clock size={12} /> Duration</label>
                <div className="mini-presets">
                  {DURATION_PRESETS.slice(0, 4).map(d => (
                    <button
                      key={d.value}
                      className={`mini-btn ${selectedDuration === d.value ? 'active' : ''}`}
                      onClick={() => setSelectedDuration(d.value)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="advanced-toggle"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                <Settings size={12} />
                {showAdvancedOptions ? 'Less' : 'More'}
              </button>
            </div>

            {showAdvancedOptions && (
              <div className="advanced-settings">
                <div className="setting-group">
                  <label>Easing</label>
                  <div className="easing-options">
                    {EASING_OPTIONS.map(e => (
                      <button
                        key={e.value}
                        className={`easing-btn ${selectedEasing === e.value ? 'active' : ''}`}
                        onClick={() => setSelectedEasing(e.value)}
                        title={e.description}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Transitions Grid */}
            <div className={`picker-content ${viewMode}`}>
              {filteredTransitions.length === 0 ? (
                <div className="no-results">
                  <Search size={24} />
                  <p>No transitions found</p>
                  <span>Try a different search or category</span>
                </div>
              ) : (
                <div className={`transitions-${viewMode}`}>
                  {filteredTransitions.map(opt => (
                    <div
                      key={opt.type}
                      className={`transition-card ${previewTransition === opt.type ? 'previewing' : ''} ${isAdding ? 'disabled' : ''}`}
                      onMouseEnter={() => setPreviewTransition(opt.type)}
                      onMouseLeave={() => setPreviewTransition(null)}
                      onClick={() => !isAdding && handleAddTransition(opt.type)}
                    >
                      {/* Badges */}
                      <div className="card-badges">
                        {opt.isPopular && <span className="badge popular">Popular</span>}
                        {opt.isTrending && <span className="badge trending">Trending</span>}
                        {opt.isPremium && <span className="badge premium">Pro</span>}
                      </div>

                      {/* Favorite Button */}
                      <button
                        className={`favorite-btn ${favorites.includes(opt.type) ? 'active' : ''}`}
                        onClick={e => {
                          e.stopPropagation()
                          toggleFavorite(opt.type)
                        }}
                      >
                        {favorites.includes(opt.type) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      </button>

                      {/* Preview Animation */}
                      <div className={`card-preview preview-${opt.type}`}>
                        <div className="preview-box from"></div>
                        <div className="preview-box to"></div>
                      </div>

                      {/* Content */}
                      <div className="card-content">
                        <div className="card-icon" style={{ color: CATEGORIES.find(c => c.id === opt.category)?.color }}>
                          {opt.icon}
                        </div>
                        <div className="card-info">
                          <span className="card-label">{opt.label}</span>
                          <span className="card-desc">{opt.description}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="card-tags">
                        {opt.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="picker-error">
                <X size={14} />
                <span>{error}</span>
                <button onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}

            {/* Loading / Preview Info */}
            {isAdding ? (
              <div className="picker-loading">
                <div className="loading-spinner" />
                <span>Adding transition...</span>
              </div>
            ) : previewTransition ? (
              <div className="preview-info">
                <Info size={12} />
                <span>Click to apply <strong>{getOptionByType(previewTransition)?.label}</strong> transition</span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
