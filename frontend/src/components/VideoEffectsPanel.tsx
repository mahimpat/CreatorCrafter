/**
 * VideoEffectsPanel - Advanced video effects and color grading
 * Provides real-time preview with CSS/SVG filters and export via FFmpeg
 */
import { useState } from 'react'
import {
  Sliders,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  Palette,
  Sparkles,
  Film,
  Aperture,
  Zap,
  Eye,
  CircleDot,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronUp,
  Check,
  Copy
} from 'lucide-react'
import './VideoEffectsPanel.css'

// Effect values interface
export interface VideoEffects {
  // Color Grading
  brightness: number      // -100 to 100
  contrast: number        // -100 to 100
  saturation: number      // -100 to 100
  temperature: number     // -100 (cool) to 100 (warm)
  tint: number           // -100 (green) to 100 (magenta)
  exposure: number       // -100 to 100
  highlights: number     // -100 to 100
  shadows: number        // -100 to 100
  vibrance: number       // -100 to 100

  // Visual Effects
  blur: number           // 0 to 20 px
  sharpen: number        // 0 to 100
  vignette: number       // 0 to 100
  vignetteColor: string  // hex color
  grain: number          // 0 to 100
  grainSize: number      // 1 to 5

  // Stylized Effects
  glitch: number         // 0 to 100
  chromatic: number      // 0 to 20 px offset
  scanlines: number      // 0 to 100
  noise: number          // 0 to 100
  sepia: number          // 0 to 100
  hueRotate: number      // 0 to 360 degrees
  invert: number         // 0 to 100

  // Lens Effects
  bloom: number          // 0 to 100
  lensDistortion: number // -100 to 100
}

// Default effect values
export const DEFAULT_EFFECTS: VideoEffects = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  vibrance: 0,
  blur: 0,
  sharpen: 0,
  vignette: 0,
  vignetteColor: '#000000',
  grain: 0,
  grainSize: 2,
  glitch: 0,
  chromatic: 0,
  scanlines: 0,
  noise: 0,
  sepia: 0,
  hueRotate: 0,
  invert: 0,
  bloom: 0,
  lensDistortion: 0,
}

// Effect presets
interface EffectPreset {
  id: string
  name: string
  description: string
  category: 'cinematic' | 'vintage' | 'modern' | 'stylized' | 'correction'
  effects: Partial<VideoEffects>
  thumbnail?: string
}

const EFFECT_PRESETS: EffectPreset[] = [
  // Cinematic
  {
    id: 'cinematic_warm',
    name: 'Cinematic Warm',
    description: 'Warm, filmic look with slight contrast boost',
    category: 'cinematic',
    effects: { temperature: 15, contrast: 10, saturation: -10, shadows: -15, highlights: -10, vignette: 25 }
  },
  {
    id: 'cinematic_cool',
    name: 'Cinematic Cool',
    description: 'Cool, moody cinematic tone',
    category: 'cinematic',
    effects: { temperature: -20, contrast: 15, saturation: -15, shadows: -20, vignette: 30 }
  },
  {
    id: 'blockbuster',
    name: 'Blockbuster',
    description: 'High contrast action movie look',
    category: 'cinematic',
    effects: { contrast: 25, saturation: 10, shadows: -25, highlights: 10, vignette: 20, sharpen: 15 }
  },
  {
    id: 'noir',
    name: 'Film Noir',
    description: 'Classic black and white noir style',
    category: 'cinematic',
    effects: { saturation: -100, contrast: 30, brightness: -10, vignette: 40, grain: 15 }
  },

  // Vintage
  {
    id: 'vintage_70s',
    name: '70s Vintage',
    description: 'Faded warm tones with grain',
    category: 'vintage',
    effects: { temperature: 25, saturation: -20, contrast: -10, grain: 25, vignette: 20, sepia: 15 }
  },
  {
    id: 'vintage_80s',
    name: '80s Retro',
    description: 'Vibrant neon-inspired look',
    category: 'vintage',
    effects: { saturation: 30, contrast: 20, vibrance: 25, chromatic: 3, scanlines: 10 }
  },
  {
    id: 'vhs',
    name: 'VHS Tape',
    description: 'Lo-fi VHS camcorder effect',
    category: 'vintage',
    effects: { saturation: -15, contrast: -10, chromatic: 5, noise: 20, scanlines: 30, sharpen: -20 }
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    description: 'Instant camera aesthetic',
    category: 'vintage',
    effects: { temperature: 10, saturation: -25, contrast: -15, vignette: 35, grain: 10 }
  },

  // Modern
  {
    id: 'vibrant',
    name: 'Vibrant Pop',
    description: 'Bold, saturated colors',
    category: 'modern',
    effects: { saturation: 35, vibrance: 40, contrast: 15, sharpen: 10 }
  },
  {
    id: 'clean',
    name: 'Clean & Bright',
    description: 'Crisp, professional look',
    category: 'modern',
    effects: { brightness: 10, contrast: 5, saturation: 5, sharpen: 15, shadows: 10 }
  },
  {
    id: 'muted',
    name: 'Muted Tones',
    description: 'Desaturated, editorial style',
    category: 'modern',
    effects: { saturation: -30, contrast: 10, temperature: -5, highlights: -15 }
  },
  {
    id: 'dreamy',
    name: 'Dreamy Soft',
    description: 'Soft, ethereal glow',
    category: 'modern',
    effects: { brightness: 15, contrast: -10, saturation: -10, blur: 1, bloom: 30, vignette: 15 }
  },

  // Stylized
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon-soaked futuristic style',
    category: 'stylized',
    effects: { saturation: 40, contrast: 30, temperature: -30, tint: 20, chromatic: 4, bloom: 25, vignette: 25 }
  },
  {
    id: 'horror',
    name: 'Horror',
    description: 'Dark, desaturated terror',
    category: 'stylized',
    effects: { saturation: -40, contrast: 25, brightness: -20, tint: -15, vignette: 50, grain: 20 }
  },
  {
    id: 'glitch_art',
    name: 'Glitch Art',
    description: 'Digital corruption aesthetic',
    category: 'stylized',
    effects: { glitch: 40, chromatic: 8, noise: 15, scanlines: 20 }
  },
  {
    id: 'sunset',
    name: 'Golden Hour',
    description: 'Warm sunset glow',
    category: 'stylized',
    effects: { temperature: 40, tint: 10, saturation: 15, highlights: 20, vignette: 20, bloom: 15 }
  },

  // Correction
  {
    id: 'fix_dark',
    name: 'Fix Underexposed',
    description: 'Brighten dark footage',
    category: 'correction',
    effects: { exposure: 30, shadows: 40, brightness: 15, contrast: 10 }
  },
  {
    id: 'fix_bright',
    name: 'Fix Overexposed',
    description: 'Recover blown highlights',
    category: 'correction',
    effects: { exposure: -25, highlights: -40, contrast: 10 }
  },
  {
    id: 'fix_flat',
    name: 'Add Punch',
    description: 'Boost contrast and color',
    category: 'correction',
    effects: { contrast: 20, saturation: 15, vibrance: 20, sharpen: 10 }
  },
  {
    id: 'neutral',
    name: 'Neutral',
    description: 'Reset to natural look',
    category: 'correction',
    effects: {}
  },
]

interface VideoEffectsPanelProps {
  effects: VideoEffects
  onEffectsChange: (effects: VideoEffects) => void
  onApplyPreset?: (preset: EffectPreset) => void
}

export default function VideoEffectsPanel({
  effects,
  onEffectsChange,
  onApplyPreset,
}: VideoEffectsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    presets: true,
    colorGrading: true,
    visualEffects: false,
    stylizedEffects: false,
    lensEffects: false,
  })
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [presetCategory, setPresetCategory] = useState<string>('all')

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleEffectChange = (key: keyof VideoEffects, value: number | string) => {
    onEffectsChange({ ...effects, [key]: value })
    setSelectedPreset(null) // Clear preset when manually adjusting
  }

  const handlePresetSelect = (preset: EffectPreset) => {
    const newEffects = { ...DEFAULT_EFFECTS, ...preset.effects }
    onEffectsChange(newEffects)
    setSelectedPreset(preset.id)
    onApplyPreset?.(preset)
  }

  const handleReset = () => {
    onEffectsChange(DEFAULT_EFFECTS)
    setSelectedPreset(null)
  }

  const copyEffectsAsCSS = () => {
    const css = generateCSSFilter(effects)
    navigator.clipboard.writeText(css)
  }

  const filteredPresets = presetCategory === 'all'
    ? EFFECT_PRESETS
    : EFFECT_PRESETS.filter(p => p.category === presetCategory)

  // Slider component for reuse
  const EffectSlider = ({
    label,
    icon: Icon,
    value,
    onChange,
    min = -100,
    max = 100,
    step = 1,
    unit = ''
  }: {
    label: string
    icon: React.ElementType
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number
    unit?: string
  }) => (
    <div className="effect-slider">
      <div className="slider-header">
        <Icon size={14} />
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={value !== 0 ? 'active' : ''}
      />
    </div>
  )

  return (
    <div className="video-effects-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-title">
          <Sliders size={18} />
          <h3>Video Effects</h3>
        </div>
        <div className="header-actions">
          <button className="action-btn" onClick={copyEffectsAsCSS} title="Copy as CSS">
            <Copy size={14} />
          </button>
          <button className="action-btn reset" onClick={handleReset} title="Reset all">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Presets Section */}
      <div className="effects-section">
        <button className="section-header" onClick={() => toggleSection('presets')}>
          <Sparkles size={16} />
          <span>Presets</span>
          {expandedSections.presets ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSections.presets && (
          <div className="section-content">
            <div className="preset-categories">
              {['all', 'cinematic', 'vintage', 'modern', 'stylized', 'correction'].map(cat => (
                <button
                  key={cat}
                  className={`category-btn ${presetCategory === cat ? 'active' : ''}`}
                  onClick={() => setPresetCategory(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            <div className="presets-grid">
              {filteredPresets.map(preset => (
                <button
                  key={preset.id}
                  className={`preset-card ${selectedPreset === preset.id ? 'selected' : ''}`}
                  onClick={() => handlePresetSelect(preset)}
                  title={preset.description}
                >
                  <div className="preset-preview" style={getPresetPreviewStyle(preset.effects)}>
                    <Film size={20} />
                  </div>
                  <span className="preset-name">{preset.name}</span>
                  {selectedPreset === preset.id && (
                    <div className="selected-indicator">
                      <Check size={12} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Color Grading Section */}
      <div className="effects-section">
        <button className="section-header" onClick={() => toggleSection('colorGrading')}>
          <Palette size={16} />
          <span>Color Grading</span>
          {expandedSections.colorGrading ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSections.colorGrading && (
          <div className="section-content">
            <EffectSlider
              label="Brightness"
              icon={Sun}
              value={effects.brightness}
              onChange={(v) => handleEffectChange('brightness', v)}
            />
            <EffectSlider
              label="Contrast"
              icon={Contrast}
              value={effects.contrast}
              onChange={(v) => handleEffectChange('contrast', v)}
            />
            <EffectSlider
              label="Saturation"
              icon={Droplets}
              value={effects.saturation}
              onChange={(v) => handleEffectChange('saturation', v)}
            />
            <EffectSlider
              label="Temperature"
              icon={Thermometer}
              value={effects.temperature}
              onChange={(v) => handleEffectChange('temperature', v)}
            />
            <EffectSlider
              label="Tint"
              icon={Palette}
              value={effects.tint}
              onChange={(v) => handleEffectChange('tint', v)}
            />
            <EffectSlider
              label="Exposure"
              icon={Aperture}
              value={effects.exposure}
              onChange={(v) => handleEffectChange('exposure', v)}
            />
            <EffectSlider
              label="Highlights"
              icon={Sun}
              value={effects.highlights}
              onChange={(v) => handleEffectChange('highlights', v)}
            />
            <EffectSlider
              label="Shadows"
              icon={CircleDot}
              value={effects.shadows}
              onChange={(v) => handleEffectChange('shadows', v)}
            />
            <EffectSlider
              label="Vibrance"
              icon={Sparkles}
              value={effects.vibrance}
              onChange={(v) => handleEffectChange('vibrance', v)}
            />
          </div>
        )}
      </div>

      {/* Visual Effects Section */}
      <div className="effects-section">
        <button className="section-header" onClick={() => toggleSection('visualEffects')}>
          <Eye size={16} />
          <span>Visual Effects</span>
          {expandedSections.visualEffects ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSections.visualEffects && (
          <div className="section-content">
            <EffectSlider
              label="Blur"
              icon={Eye}
              value={effects.blur}
              onChange={(v) => handleEffectChange('blur', v)}
              min={0}
              max={20}
              unit="px"
            />
            <EffectSlider
              label="Sharpen"
              icon={Zap}
              value={effects.sharpen}
              onChange={(v) => handleEffectChange('sharpen', v)}
              min={0}
              max={100}
              unit="%"
            />
            <EffectSlider
              label="Vignette"
              icon={CircleDot}
              value={effects.vignette}
              onChange={(v) => handleEffectChange('vignette', v)}
              min={0}
              max={100}
              unit="%"
            />
            <EffectSlider
              label="Film Grain"
              icon={Film}
              value={effects.grain}
              onChange={(v) => handleEffectChange('grain', v)}
              min={0}
              max={100}
              unit="%"
            />
            <EffectSlider
              label="Grain Size"
              icon={CircleDot}
              value={effects.grainSize}
              onChange={(v) => handleEffectChange('grainSize', v)}
              min={1}
              max={5}
              step={0.5}
            />
          </div>
        )}
      </div>

      {/* Stylized Effects Section */}
      <div className="effects-section">
        <button className="section-header" onClick={() => toggleSection('stylizedEffects')}>
          <Zap size={16} />
          <span>Stylized Effects</span>
          {expandedSections.stylizedEffects ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSections.stylizedEffects && (
          <div className="section-content">
            <EffectSlider
              label="Glitch"
              icon={Zap}
              value={effects.glitch}
              onChange={(v) => handleEffectChange('glitch', v)}
              min={0}
              max={100}
              unit="%"
            />
            <EffectSlider
              label="Chromatic Aberration"
              icon={Palette}
              value={effects.chromatic}
              onChange={(v) => handleEffectChange('chromatic', v)}
              min={0}
              max={20}
              unit="px"
            />
            <EffectSlider
              label="Scanlines"
              icon={Film}
              value={effects.scanlines}
              onChange={(v) => handleEffectChange('scanlines', v)}
              min={0}
              max={100}
              unit="%"
            />
            <EffectSlider
              label="Noise"
              icon={Sparkles}
              value={effects.noise}
              onChange={(v) => handleEffectChange('noise', v)}
              min={0}
              max={100}
              unit="%"
            />
            <EffectSlider
              label="Sepia"
              icon={Film}
              value={effects.sepia}
              onChange={(v) => handleEffectChange('sepia', v)}
              min={0}
              max={100}
              unit="%"
            />
            <EffectSlider
              label="Hue Rotate"
              icon={Palette}
              value={effects.hueRotate}
              onChange={(v) => handleEffectChange('hueRotate', v)}
              min={0}
              max={360}
              unit="°"
            />
            <EffectSlider
              label="Invert"
              icon={Contrast}
              value={effects.invert}
              onChange={(v) => handleEffectChange('invert', v)}
              min={0}
              max={100}
              unit="%"
            />
          </div>
        )}
      </div>

      {/* Lens Effects Section */}
      <div className="effects-section">
        <button className="section-header" onClick={() => toggleSection('lensEffects')}>
          <Aperture size={16} />
          <span>Lens Effects</span>
          {expandedSections.lensEffects ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {expandedSections.lensEffects && (
          <div className="section-content">
            <EffectSlider
              label="Bloom/Glow"
              icon={Sun}
              value={effects.bloom}
              onChange={(v) => handleEffectChange('bloom', v)}
              min={0}
              max={100}
              unit="%"
            />
            <EffectSlider
              label="Lens Distortion"
              icon={Aperture}
              value={effects.lensDistortion}
              onChange={(v) => handleEffectChange('lensDistortion', v)}
              min={-100}
              max={100}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Generate CSS filter string from effects
export function generateCSSFilter(effects: VideoEffects): string {
  const filters: string[] = []

  if (effects.brightness !== 0) {
    filters.push(`brightness(${1 + effects.brightness / 100})`)
  }
  if (effects.contrast !== 0) {
    filters.push(`contrast(${1 + effects.contrast / 100})`)
  }
  if (effects.saturation !== 0) {
    filters.push(`saturate(${1 + effects.saturation / 100})`)
  }
  if (effects.blur > 0) {
    filters.push(`blur(${effects.blur}px)`)
  }
  if (effects.sepia > 0) {
    filters.push(`sepia(${effects.sepia / 100})`)
  }
  if (effects.hueRotate !== 0) {
    filters.push(`hue-rotate(${effects.hueRotate}deg)`)
  }
  if (effects.invert > 0) {
    filters.push(`invert(${effects.invert / 100})`)
  }

  return filters.length > 0 ? filters.join(' ') : 'none'
}

// Generate style object for video element
export function generateVideoStyle(effects: VideoEffects): React.CSSProperties {
  return {
    filter: generateCSSFilter(effects),
    // Temperature uses CSS color-mix or overlay (simplified here)
    ...(effects.temperature !== 0 && {
      backgroundColor: effects.temperature > 0
        ? `rgba(255, 200, 150, ${Math.abs(effects.temperature) / 500})`
        : `rgba(150, 200, 255, ${Math.abs(effects.temperature) / 500})`,
      backgroundBlendMode: 'overlay',
    }),
  }
}

// Generate preview style for preset cards
function getPresetPreviewStyle(presetEffects: Partial<VideoEffects>): React.CSSProperties {
  const effects = { ...DEFAULT_EFFECTS, ...presetEffects }
  const filters: string[] = []

  if (effects.brightness !== 0) filters.push(`brightness(${1 + effects.brightness / 100})`)
  if (effects.contrast !== 0) filters.push(`contrast(${1 + effects.contrast / 100})`)
  if (effects.saturation !== 0) filters.push(`saturate(${1 + effects.saturation / 100})`)
  if (effects.sepia > 0) filters.push(`sepia(${effects.sepia / 100})`)
  if (effects.hueRotate !== 0) filters.push(`hue-rotate(${effects.hueRotate}deg)`)

  // Background color based on temperature
  let bgColor = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  if (effects.temperature > 20) {
    bgColor = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  } else if (effects.temperature < -20) {
    bgColor = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  }

  return {
    filter: filters.join(' ') || 'none',
    background: bgColor,
  }
}

// Export effect names for other components
export { EFFECT_PRESETS }
export type { EffectPreset }
