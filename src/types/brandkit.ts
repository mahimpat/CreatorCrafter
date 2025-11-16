/**
 * Brand Kit type definitions for consistent thumbnail branding
 */

export interface BrandColor {
  name: string
  hex: string
  rgb: [number, number, number]
}

export interface BrandFont {
  name: string
  family: string
  path?: string  // Path to custom font file
  weight?: 'normal' | 'bold' | 'black'
}

export interface BrandLogo {
  name: string
  path: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  size: number  // Percentage of thumbnail height (e.g., 10 = 10%)
  opacity: number  // 0-100
}

export interface BrandGradient {
  name: string
  type: 'linear' | 'radial'
  colors: string[]  // Array of hex colors
  direction?: 'vertical' | 'horizontal' | 'diagonal'
  center?: [number, number]  // For radial gradients (0-1, 0-1)
}

export interface BrandKit {
  id: string
  name: string
  description: string
  createdAt: number
  updatedAt: number

  // Core brand elements
  primaryColor: BrandColor
  secondaryColor: BrandColor
  accentColor: BrandColor
  textColor: BrandColor
  outlineColor: BrandColor

  // Additional colors
  customColors?: BrandColor[]

  // Typography
  primaryFont: BrandFont
  secondaryFont?: BrandFont

  // Logos and watermarks
  logo?: BrandLogo
  watermark?: BrandLogo

  // Background styles
  defaultGradient?: BrandGradient
  customGradients?: BrandGradient[]

  // Text style preferences
  textStyle: {
    enableGradients: boolean
    enable3D: boolean
    enableNeon: boolean
    outlineWidth: number  // 2-12 pixels
    defaultSize: number  // Percentage of height (e.g., 18 = 18%)
  }

  // Template overrides
  templatePreferences?: {
    [templateId: string]: {
      textColor?: string
      outlineColor?: string
      gradient?: BrandGradient
    }
  }
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  id: 'default',
  name: 'Default Style',
  description: 'Default thumbnail style with no branding',
  createdAt: Date.now(),
  updatedAt: Date.now(),

  primaryColor: {
    name: 'Gold',
    hex: '#FFD700',
    rgb: [255, 215, 0]
  },
  secondaryColor: {
    name: 'Orange',
    hex: '#FFA500',
    rgb: [255, 165, 0]
  },
  accentColor: {
    name: 'Red',
    hex: '#FF0000',
    rgb: [255, 0, 0]
  },
  textColor: {
    name: 'White',
    hex: '#FFFFFF',
    rgb: [255, 255, 255]
  },
  outlineColor: {
    name: 'Black',
    hex: '#000000',
    rgb: [0, 0, 0]
  },

  primaryFont: {
    name: 'Liberation Sans Bold',
    family: 'LiberationSans-Bold'
  },

  textStyle: {
    enableGradients: true,
    enable3D: true,
    enableNeon: false,
    outlineWidth: 8,
    defaultSize: 18
  }
}

export interface BrandKitApplyOptions {
  videoPath: string
  timestamp: number
  text: string
  template: string
  brandKitId: string
  background?: string
}
