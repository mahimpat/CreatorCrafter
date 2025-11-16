// Caption styling templates for AI-powered captions

export interface CaptionTemplate {
  id: 'dynamic' | 'impact' | 'minimal' | 'energetic' | 'professional' | 'custom'
  name: string
  description: string
  style: {
    // Base text styling
    fontSize: number
    fontFamily: string
    color: string
    backgroundColor: string
    position: 'top' | 'center' | 'bottom'

    // Emphasis styling
    emphasisColor: string
    emphasisBold?: boolean
    emphasisScale?: number  // Scale factor for emphasized words (1.0 = normal)
    emphasisBackground?: string

    // Animation settings
    animation: {
      type: 'none' | 'karaoke' | 'pop' | 'slide'
      duration: number  // ms per word
      stagger?: number  // delay between words in ms
    }

    // Sentiment-based styling (Phase 2)
    sentimentColors?: {
      positive: string    // Excited, happy, thrilled
      negative: string    // Warning, danger, scared
      neutral: string     // Default
      question: string    // Questions, curiosity
    }

    // Advanced styling
    stroke?: {
      color: string
      width: number
    }
    shadow?: {
      color: string
      blur: number
      offsetX: number
      offsetY: number
    }
  }
}

export const CAPTION_TEMPLATES: Record<string, CaptionTemplate> = {
  dynamic: {
    id: 'dynamic',
    name: 'Dynamic',
    description: 'Energetic style with bold colors and smooth animations. Great for engaging, fast-paced content.',
    style: {
      fontSize: 64,
      fontFamily: 'Impact, Arial Black, sans-serif',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      position: 'center',

      emphasisColor: '#FFD700',  // Gold/yellow for emphasis
      emphasisBold: true,
      emphasisScale: 1.15,

      animation: {
        type: 'karaoke',
        duration: 100,
        stagger: 80
      },

      sentimentColors: {
        positive: '#00FF88',    // Bright green
        negative: '#FF4444',    // Bright red
        neutral: '#FFFFFF',     // White
        question: '#66B3FF'     // Light blue
      },

      stroke: {
        color: '#000000',
        width: 3
      },
      shadow: {
        color: 'rgba(0, 0, 0, 0.8)',
        blur: 8,
        offsetX: 2,
        offsetY: 2
      }
    }
  },

  impact: {
    id: 'impact',
    name: 'Impact',
    description: 'Bold and punchy with strong emphasis. Perfect for motivational and business content.',
    style: {
      fontSize: 72,
      fontFamily: 'Arial Black, Impact, sans-serif',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      position: 'bottom',

      emphasisColor: '#FF3333',  // Bright red for emphasis
      emphasisBold: true,
      emphasisScale: 1.2,
      emphasisBackground: 'rgba(255, 51, 51, 0.2)',

      animation: {
        type: 'pop',
        duration: 150,
        stagger: 100
      },

      sentimentColors: {
        positive: '#FFD700',    // Gold
        negative: '#FF3333',    // Bright red
        neutral: '#FFFFFF',     // White
        question: '#FFA500'     // Orange
      },

      stroke: {
        color: '#000000',
        width: 4
      },
      shadow: {
        color: 'rgba(0, 0, 0, 0.9)',
        blur: 6,
        offsetX: 3,
        offsetY: 3
      }
    }
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean and professional with subtle styling. Ideal for educational and corporate content.',
    style: {
      fontSize: 48,
      fontFamily: 'Helvetica, Arial, sans-serif',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      position: 'bottom',

      emphasisColor: '#4A9EFF',  // Soft blue for emphasis
      emphasisBold: true,
      emphasisScale: 1.08,

      animation: {
        type: 'karaoke',
        duration: 120,
        stagger: 90
      },

      sentimentColors: {
        positive: '#4AFF9E',    // Soft green
        negative: '#FF6B6B',    // Soft red
        neutral: '#FFFFFF',     // White
        question: '#4A9EFF'     // Soft blue
      },

      stroke: {
        color: '#000000',
        width: 2
      },
      shadow: {
        color: 'rgba(0, 0, 0, 0.5)',
        blur: 4,
        offsetX: 1,
        offsetY: 1
      }
    }
  },

  energetic: {
    id: 'energetic',
    name: 'Energetic',
    description: 'High-energy slide-in animations with vibrant colors. Perfect for vlogs and entertainment.',
    style: {
      fontSize: 56,
      fontFamily: 'Impact, Arial Black, sans-serif',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      position: 'bottom',

      emphasisColor: '#FF00FF',  // Magenta for emphasis
      emphasisBold: true,
      emphasisScale: 1.25,

      animation: {
        type: 'slide',
        duration: 180,
        stagger: 60
      },

      sentimentColors: {
        positive: '#00FFFF',    // Cyan
        negative: '#FF1493',    // Deep pink
        neutral: '#FFFFFF',     // White
        question: '#FFD700'     // Gold
      },

      stroke: {
        color: '#000000',
        width: 3
      },
      shadow: {
        color: 'rgba(0, 0, 0, 0.7)',
        blur: 10,
        offsetX: 3,
        offsetY: 3
      }
    }
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Corporate-friendly with subtle pop animations. Best for business and tutorials.',
    style: {
      fontSize: 42,
      fontFamily: 'Helvetica, Arial, sans-serif',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      position: 'bottom',

      emphasisColor: '#00A8FF',  // Corporate blue
      emphasisBold: true,
      emphasisScale: 1.12,

      animation: {
        type: 'pop',
        duration: 140,
        stagger: 110
      },

      sentimentColors: {
        positive: '#00D98A',    // Success green
        negative: '#FF6B6B',    // Warning red
        neutral: '#FFFFFF',     // White
        question: '#00A8FF'     // Info blue
      },

      stroke: {
        color: '#000000',
        width: 2
      },
      shadow: {
        color: 'rgba(0, 0, 0, 0.6)',
        blur: 5,
        offsetX: 2,
        offsetY: 2
      }
    }
  }
}

// Helper function to apply template to subtitle
export function applyTemplate(
  templateId: 'dynamic' | 'impact' | 'minimal' | 'energetic' | 'professional',
  subtitle: any
): any {
  const template = CAPTION_TEMPLATES[templateId]

  return {
    ...subtitle,
    style: {
      fontSize: template.style.fontSize,
      fontFamily: template.style.fontFamily,
      color: template.style.color,
      backgroundColor: template.style.backgroundColor,
      position: template.style.position
    },
    animation: template.style.animation,
    template: templateId,
    emphasisColor: template.style.emphasisColor,
    sentimentColors: template.style.sentimentColors
  }
}
