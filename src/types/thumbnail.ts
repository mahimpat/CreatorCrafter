/**
 * Thumbnail generation type definitions
 */

export interface ThumbnailCandidate {
  id: string
  timestamp: number
  framePath?: string
  score: number
  hasFaces: boolean
  faceCount: number
  sharpness: number
  contrast: number
  vibrancy: number
}

export interface ThumbnailTemplate {
  id: string
  name: string
  description: string
  category: 'viral' | 'tech' | 'gaming' | 'lifestyle'
  style: string
  preview?: string
  colorScheme?: string[]  // Gradient colors for preview
  features?: string[]     // Key features of this template
}

export interface ThumbnailGenerationOptions {
  videoPath: string
  timestamp: number
  text: string
  template: string
  background?: string
  outputPath?: string
}

export interface BackgroundOption {
  id: string
  name: string
  description: string
  type: 'original' | 'gradient_blue' | 'gradient_fire' | 'gradient_ocean' | 'gradient_sunset' | 'gradient_dark' | 'gradient_neon' | 'gradient_vibrant' | 'blur' | 'blur_dark'
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'original',
    name: 'Original',
    description: 'Keep the original background as-is',
    type: 'original'
  },
  {
    id: 'gradient_blue',
    name: 'YouTube Blue',
    description: 'Modern blue-purple gradient with depth',
    type: 'gradient_blue'
  },
  {
    id: 'gradient_fire',
    name: 'Fire Energy',
    description: 'Intense red-to-gold gradient (MrBeast style)',
    type: 'gradient_fire'
  },
  {
    id: 'gradient_ocean',
    name: 'Ocean Cool',
    description: 'Deep ocean gradient with radial glow',
    type: 'gradient_ocean'
  },
  {
    id: 'gradient_sunset',
    name: 'Sunset Vibrant',
    description: 'Multi-color sunset gradient (Instagram style)',
    type: 'gradient_sunset'
  },
  {
    id: 'gradient_dark',
    name: 'Dark Professional',
    description: 'Sleek dark gradient (tech/gaming style)',
    type: 'gradient_dark'
  },
  {
    id: 'gradient_neon',
    name: 'Neon Cyberpunk',
    description: 'Neon purple-pink-cyan gradient',
    type: 'gradient_neon'
  },
  {
    id: 'gradient_vibrant',
    name: 'Ultra Vibrant',
    description: 'Multi-color explosion (clickbait style)',
    type: 'gradient_vibrant'
  },
  {
    id: 'blur',
    name: 'Artistic Blur',
    description: 'Enhanced blurred background',
    type: 'blur'
  },
  {
    id: 'blur_dark',
    name: 'Dark Blur',
    description: 'Dramatic darkened blur with vignette',
    type: 'blur_dark'
  }
]

export interface GeneratedThumbnail {
  id: string
  path: string
  text: string
  template: string
  timestamp: number
  createdAt: number
}

export const THUMBNAIL_TEMPLATES: ThumbnailTemplate[] = [
  // RECOMMENDED: Professional Industry Standard
  {
    id: 'professional_standard',
    name: '⭐ Professional (RECOMMENDED)',
    description: 'Industry-standard white container style used by top YouTubers. Clean, simple, and highly clickable.',
    category: 'viral',
    style: 'professional',
    colorScheme: ['#FFFFFF', '#F8F8F8', '#E0E0E0'],
    features: ['White rounded containers', 'Black text for readability', 'Drop shadows', 'Best for: ALL content types']
  },

  // Viral/Clickbait Category (4 templates)
  {
    id: 'mrbeast_classic',
    name: 'MrBeast Classic',
    description: 'Explosive gold gradient text with red accent bars. Maximum clickbait energy.',
    category: 'viral',
    style: 'mrbeast',
    colorScheme: ['#FFD700', '#FFA500', '#FF4500'],
    features: ['18-20px multi-stroke outlines', '3D depth shadows', 'Accent bars', 'Best for: Challenges, stunts']
  },
  {
    id: 'shocked_face',
    name: 'Shocked Reaction',
    description: 'Bright text with emoji support. Perfect for reaction content.',
    category: 'viral',
    style: 'dramatic',
    colorScheme: ['#FF1493', '#FF69B4', '#FFD700'],
    features: ['Emoji support', 'Face-detecting positioning', 'High contrast', 'Best for: Reactions, pranks']
  },
  {
    id: 'before_after',
    name: 'Before/After Split',
    description: 'Dual-tone gradient for transformation content.',
    category: 'viral',
    style: 'dramatic',
    colorScheme: ['#FF0000', '#FFFF00', '#00FF00'],
    features: ['Split composition', 'Transformation graphics', 'Best for: Makeovers, comparisons']
  },
  {
    id: 'mystery_reveal',
    name: 'Mystery Reveal',
    description: 'Dark mysterious gradient with neon accents.',
    category: 'viral',
    style: 'dramatic',
    colorScheme: ['#8B00FF', '#FF00FF', '#00FFFF'],
    features: ['Neon glow effects', 'Dark atmosphere', 'Best for: Mystery, reveals']
  },

  // Tech/Professional Category (4 templates)
  {
    id: 'mkbhd_clean',
    name: 'MKBHD Clean',
    description: 'Minimalist professional design with subtle gradients.',
    category: 'tech',
    style: 'tech',
    colorScheme: ['#64B5F6', '#42A5F5', '#1E88E5'],
    features: ['Clean typography', 'Bottom third bar', 'Professional', 'Best for: Reviews, tech']
  },
  {
    id: 'tech_review',
    name: 'Tech Review Pro',
    description: 'Modern blue-cyan gradient with sharp edges.',
    category: 'tech',
    style: 'tech',
    colorScheme: ['#00BCD4', '#0097A7', '#006064'],
    features: ['Modern design', 'Product focus', 'Best for: Unboxings, specs']
  },
  {
    id: 'minimalist',
    name: 'Minimalist White',
    description: 'Ultra-clean white background with bold text.',
    category: 'tech',
    style: 'tech',
    colorScheme: ['#FFFFFF', '#F5F5F5', '#E0E0E0'],
    features: ['Minimal aesthetic', 'Apple-like', 'Best for: Product showcases']
  },
  {
    id: 'comparison',
    name: 'Comparison Layout',
    description: 'Side-by-side comparison design.',
    category: 'tech',
    style: 'tech',
    colorScheme: ['#2196F3', '#FFC107', '#4CAF50'],
    features: ['Split screen', 'VS graphics', 'Best for: Comparisons, rankings']
  },

  // Gaming Category (3 templates)
  {
    id: 'gaming_hype',
    name: 'Gaming Hype',
    description: 'Energetic neon colors with sharp angles.',
    category: 'gaming',
    style: 'dramatic',
    colorScheme: ['#FF00FF', '#00FFFF', '#FFFF00'],
    features: ['Neon aesthetics', 'Sharp edges', 'Best for: Gaming highlights']
  },
  {
    id: 'livestream',
    name: 'Livestream Alert',
    description: 'Bold red LIVE indicator with urgency.',
    category: 'gaming',
    style: 'dramatic',
    colorScheme: ['#FF0000', '#DC143C', '#B22222'],
    features: ['LIVE badge', 'Urgency design', 'Best for: Streams, live events']
  },
  {
    id: 'reaction',
    name: 'Gaming Reaction',
    description: 'Face-focused with explosive graphics.',
    category: 'gaming',
    style: 'dramatic',
    colorScheme: ['#FF4500', '#FFD700', '#32CD32'],
    features: ['Face priority', 'Reaction arrows', 'Best for: Gameplay reactions']
  },

  // Vlog/Lifestyle Category (4 templates)
  {
    id: 'vlog_daily',
    name: 'Daily Vlog',
    description: 'Casual colorful design for daily content.',
    category: 'lifestyle',
    style: 'vlog',
    colorScheme: ['#FF1493', '#DA70D6', '#FFD700'],
    features: ['Casual aesthetic', 'Warm colors', 'Best for: Daily vlogs']
  },
  {
    id: 'storytime',
    name: 'Storytime',
    description: 'Warm inviting gradient for narrative content.',
    category: 'lifestyle',
    style: 'vlog',
    colorScheme: ['#FF6B6B', '#FFA500', '#FFD700'],
    features: ['Story focus', 'Inviting design', 'Best for: Storytelling']
  },
  {
    id: 'challenge',
    name: 'Challenge Video',
    description: 'Bold playful text with challenge elements.',
    category: 'lifestyle',
    style: 'vlog',
    colorScheme: ['#FF1493', '#00CED1', '#FFD700'],
    features: ['Playful design', 'Challenge badges', 'Best for: Challenges']
  },
  {
    id: 'tutorial',
    name: 'Tutorial Guide',
    description: 'Clear instructional design with step indicators.',
    category: 'lifestyle',
    style: 'tutorial',
    colorScheme: ['#0066FF', '#FFFFFF', '#4CAF50'],
    features: ['Step indicators', 'Clear instructions', 'Best for: How-to guides']
  }
]
