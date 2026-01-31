/**
 * TemplateSelector - Clean, visual template selection for Full Auto mode
 * Redesigned with larger visual cards and minimal clutter
 */
import { useState, useMemo } from 'react'
import {
  Zap, Film, Briefcase, Gamepad2, Video, Music, Flame,
  GraduationCap, Lightbulb, BookOpen, Youtube, Instagram,
  Sparkles, Clock, Wand2, Check, Star, TrendingUp,
  Volume2, Type, Layers, Play, Clapperboard, Camera, Rocket
} from 'lucide-react'
import './TemplateSelector.css'

// Template category type
type TemplateCategory = 'all' | 'social' | 'professional' | 'creative' | 'educational'

// Pacing style for display
type PacingStyle = 'very_fast' | 'fast' | 'moderate' | 'slow' | 'cinematic'

// Caption style
type CaptionStyle = 'none' | 'minimal' | 'word_by_word' | 'karaoke' | 'bold_impact' | 'subtitle' | 'dynamic'

// Full template interface matching backend
export interface EditingTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: Exclude<TemplateCategory, 'all'>
  previewTags: string[]
  exampleUseCases: string[]
  pacingStyle: PacingStyle
  transitionTypes: string[]
  musicMood: string
  captionStyle: CaptionStyle
  sfxIntensity: number
  energyLevel: number
  settings: {
    minClipDuration: number
    maxClipDuration: number
    trimSilence: boolean
    beatSync: boolean
    transitionFrequency: number
    transitionDurationMin: number
    transitionDurationMax: number
    introEffect: string
    introDuration: number
    outroEffect: string
    outroDuration: number
    zoomOnHighlights: boolean
    musicVolume: number
    autoDuck: boolean
    whooshOnTransitions: boolean
    impactOnCuts: boolean
    captionsEnabled: boolean
    captionFontFamily: string
    captionFontSize: string
    captionColor: string
    captionPosition: string
    aiEnhancementLevel: number
    prioritizeFaces: boolean
    hookFirst: boolean
  }
}

// Predefined templates
const TEMPLATES: EditingTemplate[] = [
  // SOCIAL MEDIA
  {
    id: 'tiktok_viral',
    name: 'TikTok Viral',
    description: 'Ultra-fast cuts, trendy effects, hook-first editing',
    icon: 'zap',
    category: 'social',
    previewTags: ['Popular', 'Trending'],
    exampleUseCases: ['Dance videos', 'Quick tutorials', 'Reactions'],
    pacingStyle: 'very_fast',
    transitionTypes: ['cut', 'flash', 'glitch', 'zoom_in'],
    musicMood: 'Trending',
    captionStyle: 'word_by_word',
    sfxIntensity: 0.8,
    energyLevel: 0.95,
    settings: {
      minClipDuration: 0.5, maxClipDuration: 3.0, trimSilence: true, beatSync: true,
      transitionFrequency: 0.7, transitionDurationMin: 0.1, transitionDurationMax: 0.3,
      introEffect: 'flash', introDuration: 0.3, outroEffect: 'fade', outroDuration: 0.5,
      zoomOnHighlights: true, musicVolume: 0.5, autoDuck: true,
      whooshOnTransitions: true, impactOnCuts: true, captionsEnabled: true,
      captionFontFamily: 'Montserrat', captionFontSize: '32px', captionColor: '#FFFFFF',
      captionPosition: 'middle', aiEnhancementLevel: 0.9, prioritizeFaces: true, hookFirst: true
    }
  },
  {
    id: 'youtube_shorts',
    name: 'YouTube Shorts',
    description: 'Optimized for YouTube with clear branding',
    icon: 'youtube',
    category: 'social',
    previewTags: ['Popular'],
    exampleUseCases: ['Channel highlights', 'Quick tips', 'Teasers'],
    pacingStyle: 'fast',
    transitionTypes: ['cut', 'zoom_in', 'slide_left', 'fade'],
    musicMood: 'Upbeat',
    captionStyle: 'bold_impact',
    sfxIntensity: 0.6,
    energyLevel: 0.8,
    settings: {
      minClipDuration: 1.0, maxClipDuration: 5.0, trimSilence: true, beatSync: true,
      transitionFrequency: 0.6, transitionDurationMin: 0.2, transitionDurationMax: 0.5,
      introEffect: 'zoom_in', introDuration: 0.5, outroEffect: 'fade', outroDuration: 1.0,
      zoomOnHighlights: true, musicVolume: 0.35, autoDuck: true,
      whooshOnTransitions: true, impactOnCuts: false, captionsEnabled: true,
      captionFontFamily: 'Inter', captionFontSize: '28px', captionColor: '#FFFFFF',
      captionPosition: 'bottom', aiEnhancementLevel: 0.8, prioritizeFaces: true, hookFirst: true
    }
  },
  {
    id: 'instagram_reels',
    name: 'Instagram Reels',
    description: 'Aesthetic, polished edits with smooth transitions',
    icon: 'instagram',
    category: 'social',
    previewTags: ['Aesthetic'],
    exampleUseCases: ['Lifestyle', 'Fashion', 'Travel'],
    pacingStyle: 'fast',
    transitionTypes: ['dissolve', 'fade', 'slide_left', 'zoom_out'],
    musicMood: 'Trending',
    captionStyle: 'minimal',
    sfxIntensity: 0.5,
    energyLevel: 0.7,
    settings: {
      minClipDuration: 1.5, maxClipDuration: 4.0, trimSilence: true, beatSync: true,
      transitionFrequency: 0.8, transitionDurationMin: 0.3, transitionDurationMax: 0.6,
      introEffect: 'fade', introDuration: 0.8, outroEffect: 'fade', outroDuration: 1.0,
      zoomOnHighlights: false, musicVolume: 0.45, autoDuck: true,
      whooshOnTransitions: true, impactOnCuts: false, captionsEnabled: true,
      captionFontFamily: 'Playfair Display', captionFontSize: '24px', captionColor: '#FFFFFF',
      captionPosition: 'bottom', aiEnhancementLevel: 0.75, prioritizeFaces: true, hookFirst: true
    }
  },
  // PROFESSIONAL
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Film-quality with dramatic pacing',
    icon: 'film',
    category: 'professional',
    previewTags: ['Pro', 'Premium'],
    exampleUseCases: ['Short films', 'Weddings', 'Brand stories'],
    pacingStyle: 'cinematic',
    transitionTypes: ['dissolve', 'fade', 'wipe_left'],
    musicMood: 'Epic',
    captionStyle: 'none',
    sfxIntensity: 0.3,
    energyLevel: 0.5,
    settings: {
      minClipDuration: 4.0, maxClipDuration: 20.0, trimSilence: false, beatSync: false,
      transitionFrequency: 1.0, transitionDurationMin: 0.8, transitionDurationMax: 2.0,
      introEffect: 'fade', introDuration: 2.0, outroEffect: 'fade', outroDuration: 3.0,
      zoomOnHighlights: false, musicVolume: 0.4, autoDuck: true,
      whooshOnTransitions: false, impactOnCuts: false, captionsEnabled: false,
      captionFontFamily: 'Georgia', captionFontSize: '20px', captionColor: '#FFFFFF',
      captionPosition: 'bottom', aiEnhancementLevel: 0.5, prioritizeFaces: true, hookFirst: false
    }
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Clean, professional for business use',
    icon: 'briefcase',
    category: 'professional',
    previewTags: ['Business'],
    exampleUseCases: ['Company updates', 'Product demos', 'Training'],
    pacingStyle: 'moderate',
    transitionTypes: ['fade', 'dissolve', 'cut'],
    musicMood: 'Ambient',
    captionStyle: 'subtitle',
    sfxIntensity: 0.0,
    energyLevel: 0.4,
    settings: {
      minClipDuration: 3.0, maxClipDuration: 15.0, trimSilence: true, beatSync: false,
      transitionFrequency: 0.9, transitionDurationMin: 0.5, transitionDurationMax: 1.0,
      introEffect: 'fade', introDuration: 1.5, outroEffect: 'fade', outroDuration: 2.0,
      zoomOnHighlights: false, musicVolume: 0.2, autoDuck: true,
      whooshOnTransitions: false, impactOnCuts: false, captionsEnabled: true,
      captionFontFamily: 'Arial', captionFontSize: '22px', captionColor: '#FFFFFF',
      captionPosition: 'bottom', aiEnhancementLevel: 0.4, prioritizeFaces: true, hookFirst: false
    }
  },
  {
    id: 'documentary',
    name: 'Documentary',
    description: 'Thoughtful editing that lets content breathe',
    icon: 'book-open',
    category: 'professional',
    previewTags: ['Storytelling'],
    exampleUseCases: ['Mini docs', 'Interviews', 'Historical'],
    pacingStyle: 'slow',
    transitionTypes: ['dissolve', 'fade', 'cut'],
    musicMood: 'Emotional',
    captionStyle: 'subtitle',
    sfxIntensity: 0.2,
    energyLevel: 0.35,
    settings: {
      minClipDuration: 5.0, maxClipDuration: 30.0, trimSilence: false, beatSync: false,
      transitionFrequency: 0.85, transitionDurationMin: 0.6, transitionDurationMax: 1.5,
      introEffect: 'fade', introDuration: 2.5, outroEffect: 'fade', outroDuration: 3.0,
      zoomOnHighlights: false, musicVolume: 0.25, autoDuck: true,
      whooshOnTransitions: false, impactOnCuts: false, captionsEnabled: true,
      captionFontFamily: 'Source Sans Pro', captionFontSize: '20px', captionColor: '#FFFFFF',
      captionPosition: 'bottom', aiEnhancementLevel: 0.3, prioritizeFaces: true, hookFirst: false
    }
  },
  // CREATIVE
  {
    id: 'gaming',
    name: 'Gaming Montage',
    description: 'High-energy with glitch effects and RGB vibes',
    icon: 'gamepad-2',
    category: 'creative',
    previewTags: ['Gaming', 'Popular'],
    exampleUseCases: ['Gaming highlights', 'Montages', 'Stream clips'],
    pacingStyle: 'very_fast',
    transitionTypes: ['glitch', 'flash', 'zoom_in', 'spin'],
    musicMood: 'Electronic',
    captionStyle: 'bold_impact',
    sfxIntensity: 1.0,
    energyLevel: 0.95,
    settings: {
      minClipDuration: 0.5, maxClipDuration: 4.0, trimSilence: true, beatSync: true,
      transitionFrequency: 0.9, transitionDurationMin: 0.1, transitionDurationMax: 0.4,
      introEffect: 'glitch', introDuration: 0.5, outroEffect: 'glitch', outroDuration: 0.8,
      zoomOnHighlights: true, musicVolume: 0.55, autoDuck: true,
      whooshOnTransitions: true, impactOnCuts: true, captionsEnabled: true,
      captionFontFamily: 'Bebas Neue', captionFontSize: '36px', captionColor: '#00FF00',
      captionPosition: 'middle', aiEnhancementLevel: 0.95, prioritizeFaces: false, hookFirst: true
    }
  },
  {
    id: 'vlog',
    name: 'Vlog Style',
    description: 'Casual, authentic with jump cuts',
    icon: 'video',
    category: 'creative',
    previewTags: ['Casual', 'Popular'],
    exampleUseCases: ['Daily vlogs', 'Travel', 'Day in my life'],
    pacingStyle: 'moderate',
    transitionTypes: ['cut', 'zoom_in', 'slide_left'],
    musicMood: 'Chill',
    captionStyle: 'minimal',
    sfxIntensity: 0.4,
    energyLevel: 0.6,
    settings: {
      minClipDuration: 2.0, maxClipDuration: 8.0, trimSilence: true, beatSync: false,
      transitionFrequency: 0.4, transitionDurationMin: 0.15, transitionDurationMax: 0.3,
      introEffect: 'zoom_in', introDuration: 0.5, outroEffect: 'fade', outroDuration: 1.0,
      zoomOnHighlights: false, musicVolume: 0.25, autoDuck: true,
      whooshOnTransitions: true, impactOnCuts: false, captionsEnabled: true,
      captionFontFamily: 'Poppins', captionFontSize: '22px', captionColor: '#FFFFFF',
      captionPosition: 'bottom', aiEnhancementLevel: 0.6, prioritizeFaces: true, hookFirst: false
    }
  },
  {
    id: 'music_video',
    name: 'Music Video',
    description: 'Beat-synced with creative effects',
    icon: 'music',
    category: 'creative',
    previewTags: ['Creative', 'Beat-Sync'],
    exampleUseCases: ['Music videos', 'Dance', 'Covers'],
    pacingStyle: 'fast',
    transitionTypes: ['flash', 'zoom_in', 'spin', 'color_fade'],
    musicMood: 'Upbeat',
    captionStyle: 'none',
    sfxIntensity: 0.6,
    energyLevel: 0.85,
    settings: {
      minClipDuration: 0.5, maxClipDuration: 4.0, trimSilence: false, beatSync: true,
      transitionFrequency: 0.95, transitionDurationMin: 0.1, transitionDurationMax: 0.5,
      introEffect: 'flash', introDuration: 0.3, outroEffect: 'color_fade', outroDuration: 1.5,
      zoomOnHighlights: true, musicVolume: 0.8, autoDuck: false,
      whooshOnTransitions: true, impactOnCuts: true, captionsEnabled: false,
      captionFontFamily: 'Inter', captionFontSize: '24px', captionColor: '#FFFFFF',
      captionPosition: 'middle', aiEnhancementLevel: 0.85, prioritizeFaces: true, hookFirst: true
    }
  },
  {
    id: 'hype_promo',
    name: 'Hype Promo',
    description: 'Maximum energy, maximum impact',
    icon: 'flame',
    category: 'creative',
    previewTags: ['High Energy'],
    exampleUseCases: ['Product launches', 'Event promos', 'Trailers'],
    pacingStyle: 'very_fast',
    transitionTypes: ['flash', 'glitch', 'zoom_in', 'spin'],
    musicMood: 'Intense',
    captionStyle: 'bold_impact',
    sfxIntensity: 1.0,
    energyLevel: 1.0,
    settings: {
      minClipDuration: 0.3, maxClipDuration: 2.0, trimSilence: true, beatSync: true,
      transitionFrequency: 1.0, transitionDurationMin: 0.1, transitionDurationMax: 0.25,
      introEffect: 'glitch', introDuration: 0.4, outroEffect: 'flash', outroDuration: 0.5,
      zoomOnHighlights: true, musicVolume: 0.6, autoDuck: true,
      whooshOnTransitions: true, impactOnCuts: true, captionsEnabled: true,
      captionFontFamily: 'Impact', captionFontSize: '40px', captionColor: '#FFFF00',
      captionPosition: 'middle', aiEnhancementLevel: 1.0, prioritizeFaces: true, hookFirst: true
    }
  },
  // EDUCATIONAL
  {
    id: 'tutorial',
    name: 'Tutorial',
    description: 'Clear, methodical for instruction',
    icon: 'graduation-cap',
    category: 'educational',
    previewTags: ['Educational'],
    exampleUseCases: ['How-to videos', 'Software tutorials', 'DIY'],
    pacingStyle: 'moderate',
    transitionTypes: ['fade', 'dissolve', 'cut'],
    musicMood: 'Ambient',
    captionStyle: 'subtitle',
    sfxIntensity: 0.2,
    energyLevel: 0.4,
    settings: {
      minClipDuration: 3.0, maxClipDuration: 20.0, trimSilence: true, beatSync: false,
      transitionFrequency: 0.7, transitionDurationMin: 0.4, transitionDurationMax: 0.8,
      introEffect: 'fade', introDuration: 1.0, outroEffect: 'fade', outroDuration: 1.5,
      zoomOnHighlights: false, musicVolume: 0.15, autoDuck: true,
      whooshOnTransitions: false, impactOnCuts: false, captionsEnabled: true,
      captionFontFamily: 'Roboto', captionFontSize: '22px', captionColor: '#FFFFFF',
      captionPosition: 'bottom', aiEnhancementLevel: 0.4, prioritizeFaces: true, hookFirst: false
    }
  },
  {
    id: 'explainer',
    name: 'Explainer',
    description: 'Engaging educational with visual aids',
    icon: 'lightbulb',
    category: 'educational',
    previewTags: ['Engaging'],
    exampleUseCases: ['Concept explanations', 'Tech reviews', 'Science'],
    pacingStyle: 'moderate',
    transitionTypes: ['dissolve', 'zoom_in', 'slide_left', 'fade'],
    musicMood: 'Upbeat',
    captionStyle: 'dynamic',
    sfxIntensity: 0.4,
    energyLevel: 0.6,
    settings: {
      minClipDuration: 2.0, maxClipDuration: 12.0, trimSilence: true, beatSync: false,
      transitionFrequency: 0.8, transitionDurationMin: 0.4, transitionDurationMax: 0.8,
      introEffect: 'zoom_in', introDuration: 0.8, outroEffect: 'fade', outroDuration: 1.5,
      zoomOnHighlights: true, musicVolume: 0.2, autoDuck: true,
      whooshOnTransitions: true, impactOnCuts: false, captionsEnabled: true,
      captionFontFamily: 'Inter', captionFontSize: '24px', captionColor: '#FFFFFF',
      captionPosition: 'bottom', aiEnhancementLevel: 0.6, prioritizeFaces: true, hookFirst: true
    }
  }
]

const CATEGORY_INFO: Record<TemplateCategory, { label: string; icon: React.ReactNode; color: string; gradient: string }> = {
  all: { label: 'All', icon: <Sparkles size={16} />, color: '#a78bfa', gradient: 'linear-gradient(135deg, #a78bfa, #818cf8)' },
  social: { label: 'Social', icon: <Zap size={16} />, color: '#f472b6', gradient: 'linear-gradient(135deg, #f472b6, #ec4899)' },
  professional: { label: 'Pro', icon: <Briefcase size={16} />, color: '#60a5fa', gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)' },
  creative: { label: 'Creative', icon: <Flame size={16} />, color: '#fb923c', gradient: 'linear-gradient(135deg, #fb923c, #f97316)' },
  educational: { label: 'Edu', icon: <GraduationCap size={16} />, color: '#4ade80', gradient: 'linear-gradient(135deg, #4ade80, #22c55e)' }
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'zap': <Zap size={32} />,
  'youtube': <Youtube size={32} />,
  'instagram': <Instagram size={32} />,
  'film': <Film size={32} />,
  'briefcase': <Briefcase size={32} />,
  'book-open': <BookOpen size={32} />,
  'gamepad-2': <Gamepad2 size={32} />,
  'video': <Video size={32} />,
  'music': <Music size={32} />,
  'flame': <Flame size={32} />,
  'graduation-cap': <GraduationCap size={32} />,
  'lightbulb': <Lightbulb size={32} />
}

const PACING_INFO: Record<PacingStyle, { label: string; icon: React.ReactNode }> = {
  very_fast: { label: 'Very Fast', icon: <Zap size={14} /> },
  fast: { label: 'Fast', icon: <Rocket size={14} /> },
  moderate: { label: 'Moderate', icon: <Play size={14} /> },
  slow: { label: 'Slow', icon: <Clapperboard size={14} /> },
  cinematic: { label: 'Cinematic', icon: <Camera size={14} /> }
}

interface TemplateSelectorProps {
  selectedTemplate: EditingTemplate | null
  onSelectTemplate: (template: EditingTemplate) => void
  compact?: boolean
}

export default function TemplateSelector({
  selectedTemplate,
  onSelectTemplate,
  compact = false
}: TemplateSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('all')

  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') return TEMPLATES
    return TEMPLATES.filter(t => t.category === activeCategory)
  }, [activeCategory])

  // Compact mode for embedded use
  if (compact) {
    return (
      <div className="template-selector-v2 compact">
        <div className="compact-scroll">
          {TEMPLATES.map(template => (
            <button
              key={template.id}
              className={`compact-chip ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => onSelectTemplate(template)}
              style={{ '--accent': CATEGORY_INFO[template.category].color } as React.CSSProperties}
            >
              <span className="chip-icon">{ICON_MAP[template.icon]}</span>
              <span className="chip-name">{template.name}</span>
              {selectedTemplate?.id === template.id && <Check size={14} className="chip-check" />}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="template-selector-v2">
      {/* Header */}
      <div className="ts-header">
        <div className="ts-header-icon">
          <Wand2 size={24} />
        </div>
        <div className="ts-header-text">
          <h2>Choose Your Style</h2>
          <p>AI will edit your video to match this template</p>
        </div>
      </div>

      {/* Category Pills */}
      <div className="ts-categories">
        {(Object.keys(CATEGORY_INFO) as TemplateCategory[]).map(cat => (
          <button
            key={cat}
            className={`ts-category-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
            style={{ '--cat-color': CATEGORY_INFO[cat].color } as React.CSSProperties}
          >
            {CATEGORY_INFO[cat].icon}
            <span>{CATEGORY_INFO[cat].label}</span>
          </button>
        ))}
      </div>

      {/* Template Cards - Horizontal Scroll */}
      <div className="ts-cards-container">
        <div className="ts-cards">
          {filteredTemplates.map(template => {
            const isSelected = selectedTemplate?.id === template.id
            const catInfo = CATEGORY_INFO[template.category]

            return (
              <div
                key={template.id}
                className={`ts-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectTemplate(template)}
                style={{ '--card-accent': catInfo.color, '--card-gradient': catInfo.gradient } as React.CSSProperties}
              >
                {/* Badge */}
                {template.previewTags.length > 0 && (
                  <div className="ts-card-badge">
                    {template.previewTags[0] === 'Popular' && <Star size={10} />}
                    {template.previewTags[0] === 'Trending' && <TrendingUp size={10} />}
                    {template.previewTags[0]}
                  </div>
                )}

                {/* Selected Check */}
                {isSelected && (
                  <div className="ts-card-check">
                    <Check size={16} />
                  </div>
                )}

                {/* Icon Area */}
                <div className="ts-card-icon">
                  {ICON_MAP[template.icon]}
                </div>

                {/* Content */}
                <div className="ts-card-content">
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                </div>

                {/* Quick Info */}
                <div className="ts-card-info">
                  <span className="ts-info-item">
                    {PACING_INFO[template.pacingStyle].icon} {PACING_INFO[template.pacingStyle].label}
                  </span>
                  <span className="ts-info-item">
                    <Music size={12} /> {template.musicMood}
                  </span>
                </div>

                {/* Energy Bar */}
                <div className="ts-card-energy">
                  <div
                    className="ts-energy-fill"
                    style={{ width: `${template.energyLevel * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Preview */}
      {selectedTemplate && (
        <div className="ts-selected-preview">
          <div className="ts-preview-header">
            <div
              className="ts-preview-icon"
              style={{ background: CATEGORY_INFO[selectedTemplate.category].gradient }}
            >
              {ICON_MAP[selectedTemplate.icon]}
            </div>
            <div className="ts-preview-title">
              <span className="ts-preview-label">Selected Template</span>
              <h3>{selectedTemplate.name}</h3>
            </div>
          </div>

          <div className="ts-preview-details">
            <div className="ts-detail">
              <Clock size={14} />
              <span>{PACING_INFO[selectedTemplate.pacingStyle].label} Pacing</span>
            </div>
            <div className="ts-detail">
              <Music size={14} />
              <span>{selectedTemplate.musicMood} Music</span>
            </div>
            {selectedTemplate.settings.captionsEnabled && (
              <div className="ts-detail">
                <Type size={14} />
                <span>Captions On</span>
              </div>
            )}
            {selectedTemplate.settings.beatSync && (
              <div className="ts-detail">
                <Layers size={14} />
                <span>Beat Sync</span>
              </div>
            )}
            {selectedTemplate.sfxIntensity > 0.5 && (
              <div className="ts-detail">
                <Volume2 size={14} />
                <span>SFX Effects</span>
              </div>
            )}
          </div>

          <div className="ts-preview-uses">
            <span className="ts-uses-label">Best for:</span>
            {selectedTemplate.exampleUseCases.slice(0, 3).map(use => (
              <span key={use} className="ts-use-tag">{use}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Export templates for external use
export { TEMPLATES }
export type { TemplateCategory, PacingStyle, CaptionStyle }
