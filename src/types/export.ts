/**
 * Multi-platform export type definitions
 */

export interface PlatformSpec {
  id: string
  name: string
  displayName: string
  description: string
  icon: string
  dimensions: {
    width: number
    height: number
  }
  aspectRatio: string
  maxFileSize?: number  // in MB
  recommendedFormat: 'png' | 'jpeg' | 'webp'
  category: 'video' | 'social' | 'web'
}

export const PLATFORM_SPECS: PlatformSpec[] = [
  // Video Platforms
  {
    id: 'youtube-thumbnail',
    name: 'youtube',
    displayName: 'YouTube Thumbnail',
    description: 'Standard YouTube video thumbnail',
    icon: '📺',
    dimensions: { width: 1280, height: 720 },
    aspectRatio: '16:9',
    maxFileSize: 2,
    recommendedFormat: 'jpeg',
    category: 'video'
  },
  {
    id: 'youtube-banner',
    name: 'youtube-banner',
    displayName: 'YouTube Banner',
    description: 'Channel banner (desktop)',
    icon: '📺',
    dimensions: { width: 2560, height: 1440 },
    aspectRatio: '16:9',
    maxFileSize: 6,
    recommendedFormat: 'jpeg',
    category: 'video'
  },
  {
    id: 'youtube-community',
    name: 'youtube-community',
    displayName: 'YouTube Community Post',
    description: 'Community post image',
    icon: '📺',
    dimensions: { width: 1200, height: 675 },
    aspectRatio: '16:9',
    recommendedFormat: 'jpeg',
    category: 'video'
  },

  // Social Media - Instagram
  {
    id: 'instagram-post',
    name: 'instagram',
    displayName: 'Instagram Post',
    description: 'Square post (1:1)',
    icon: '📷',
    dimensions: { width: 1080, height: 1080 },
    aspectRatio: '1:1',
    maxFileSize: 8,
    recommendedFormat: 'jpeg',
    category: 'social'
  },
  {
    id: 'instagram-story',
    name: 'instagram-story',
    displayName: 'Instagram Story',
    description: 'Vertical story (9:16)',
    icon: '📷',
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: '9:16',
    maxFileSize: 8,
    recommendedFormat: 'jpeg',
    category: 'social'
  },
  {
    id: 'instagram-reel',
    name: 'instagram-reel',
    displayName: 'Instagram Reel',
    description: 'Reel cover (9:16)',
    icon: '📷',
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: '9:16',
    maxFileSize: 8,
    recommendedFormat: 'jpeg',
    category: 'social'
  },

  // Social Media - TikTok
  {
    id: 'tiktok-cover',
    name: 'tiktok',
    displayName: 'TikTok Cover',
    description: 'Video cover (9:16)',
    icon: '🎵',
    dimensions: { width: 1080, height: 1920 },
    aspectRatio: '9:16',
    recommendedFormat: 'jpeg',
    category: 'social'
  },
  {
    id: 'tiktok-profile',
    name: 'tiktok-profile',
    displayName: 'TikTok Profile',
    description: 'Profile picture (1:1)',
    icon: '🎵',
    dimensions: { width: 200, height: 200 },
    aspectRatio: '1:1',
    recommendedFormat: 'png',
    category: 'social'
  },

  // Social Media - Twitter/X
  {
    id: 'twitter-post',
    name: 'twitter',
    displayName: 'Twitter/X Post',
    description: 'Tweet image (16:9)',
    icon: '🐦',
    dimensions: { width: 1200, height: 675 },
    aspectRatio: '16:9',
    maxFileSize: 5,
    recommendedFormat: 'jpeg',
    category: 'social'
  },
  {
    id: 'twitter-header',
    name: 'twitter-header',
    displayName: 'Twitter/X Header',
    description: 'Profile header banner',
    icon: '🐦',
    dimensions: { width: 1500, height: 500 },
    aspectRatio: '3:1',
    recommendedFormat: 'jpeg',
    category: 'social'
  },

  // Social Media - Facebook
  {
    id: 'facebook-post',
    name: 'facebook',
    displayName: 'Facebook Post',
    description: 'Feed post image',
    icon: '👥',
    dimensions: { width: 1200, height: 630 },
    aspectRatio: '1.91:1',
    maxFileSize: 8,
    recommendedFormat: 'jpeg',
    category: 'social'
  },
  {
    id: 'facebook-cover',
    name: 'facebook-cover',
    displayName: 'Facebook Cover',
    description: 'Profile cover photo',
    icon: '👥',
    dimensions: { width: 820, height: 312 },
    aspectRatio: '2.63:1',
    recommendedFormat: 'jpeg',
    category: 'social'
  },

  // Social Media - LinkedIn
  {
    id: 'linkedin-post',
    name: 'linkedin',
    displayName: 'LinkedIn Post',
    description: 'Feed post image',
    icon: '💼',
    dimensions: { width: 1200, height: 627 },
    aspectRatio: '1.91:1',
    recommendedFormat: 'jpeg',
    category: 'social'
  },
  {
    id: 'linkedin-banner',
    name: 'linkedin-banner',
    displayName: 'LinkedIn Banner',
    description: 'Profile banner',
    icon: '💼',
    dimensions: { width: 1584, height: 396 },
    aspectRatio: '4:1',
    recommendedFormat: 'jpeg',
    category: 'social'
  },

  // Web
  {
    id: 'web-og',
    name: 'web-og',
    displayName: 'Open Graph (Web)',
    description: 'Social media preview',
    icon: '🌐',
    dimensions: { width: 1200, height: 630 },
    aspectRatio: '1.91:1',
    recommendedFormat: 'png',
    category: 'web'
  },
  {
    id: 'web-twitter-card',
    name: 'web-twitter-card',
    displayName: 'Twitter Card',
    description: 'Twitter card preview',
    icon: '🌐',
    dimensions: { width: 1200, height: 628 },
    aspectRatio: '1.91:1',
    recommendedFormat: 'png',
    category: 'web'
  }
]

export interface ExportFormat {
  format: 'png' | 'jpeg' | 'webp'
  quality?: number  // 1-100 for JPEG/WebP
}

export interface MultiExportOptions {
  sourceThumbnailPath: string
  platforms: string[]  // Array of platform IDs
  outputDir: string
  baseFilename?: string
  format?: ExportFormat
  smartCrop?: boolean  // Use face detection for smart cropping
  preserveAspect?: boolean  // Maintain aspect ratio or force dimensions
}

export interface ExportResult {
  platformId: string
  platformName: string
  filePath: string
  dimensions: { width: number; height: number }
  fileSize: number  // in bytes
  format: string
  success: boolean
  error?: string
}

export interface MultiExportResult {
  success: boolean
  results: ExportResult[]
  totalExported: number
  totalFailed: number
  outputDir: string
}

// Preset collections
export const PLATFORM_PRESETS = {
  'youtube-creator': ['youtube-thumbnail', 'youtube-community', 'youtube-banner'],
  'social-media-all': ['instagram-post', 'instagram-story', 'tiktok-cover', 'twitter-post', 'facebook-post'],
  'instagram-full': ['instagram-post', 'instagram-story', 'instagram-reel'],
  'professional': ['linkedin-post', 'linkedin-banner', 'twitter-post', 'facebook-post'],
  'web-seo': ['web-og', 'web-twitter-card']
}
