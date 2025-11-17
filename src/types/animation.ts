/**
 * Animation Track Types for Lottie-based motion graphics
 */

export type LottieSource = 'file' | 'url' | 'library'

export interface AnimationTrack {
  id: string
  name: string

  // Source information
  source: LottieSource
  path?: string // For file-based animations
  url?: string // For URL-based animations
  lottieData?: any // Inline Lottie JSON data

  // Timeline positioning
  start: number // Start time in seconds
  duration: number // Duration in seconds

  // Visual properties
  position: {
    x: number // X position (0-1, percentage of video width)
    y: number // Y position (0-1, percentage of video height)
  }
  scale: number // Scale factor (1.0 = 100%)
  rotation: number // Rotation in degrees
  opacity: number // Opacity (0-1)

  // Animation playback
  loop: boolean
  autoplay: boolean
  speed: number // Playback speed multiplier (1.0 = normal)

  // Layering
  zIndex: number // Layer order (higher = on top)

  // Metadata
  thumbnail?: string // Preview thumbnail
  category?: string // Category for organization
  tags?: string[] // Tags for search
  createdAt: number
}

export interface AnimationLibraryItem {
  id: string
  name: string
  path?: string
  url?: string
  lottieData?: any
  thumbnail?: string
  category?: string
  tags?: string[]
  duration: number // Default duration
  createdAt: number
}

export interface AnimationCategory {
  id: string
  name: string
  description?: string
  icon?: string
}

// Predefined categories for animations
export const ANIMATION_CATEGORIES: AnimationCategory[] = [
  { id: 'shapes', name: 'Shapes & Patterns', icon: '◼️' },
  { id: 'icons', name: 'Icons & Symbols', icon: '⭐' },
  { id: 'effects', name: 'Visual Effects', icon: '✨' },
  { id: 'transitions', name: 'Transitions', icon: '↔️' },
  { id: 'text', name: 'Text Animations', icon: '📝' },
  { id: 'emoji', name: 'Emoji & Stickers', icon: '😊' },
  { id: 'arrows', name: 'Arrows & Pointers', icon: '➡️' },
  { id: 'loading', name: 'Loading & Progress', icon: '⏳' },
  { id: 'celebration', name: 'Celebration', icon: '🎉' },
  { id: 'custom', name: 'Custom', icon: '🎨' }
]
