import { useState, useCallback } from 'react'
import { RotateCcw } from 'lucide-react'
import './ColorGradingPanel.css'

export interface ColorGradingSettings {
  brightness: number  // -0.5 to 0.5 (offset from 0)
  contrast: number    // 0.5 to 2.0
  saturation: number  // 0 to 2.0
  gamma: number       // 0.5 to 2.0
  preset: string
}

const PRESETS: Record<string, Omit<ColorGradingSettings, 'preset'>> = {
  normal: { brightness: 0, contrast: 1, saturation: 1, gamma: 1 },
  warm: { brightness: 0.05, contrast: 1.05, saturation: 1.2, gamma: 0.95 },
  cool: { brightness: 0, contrast: 1.1, saturation: 0.9, gamma: 1.05 },
  vintage: { brightness: -0.05, contrast: 0.9, saturation: 0.7, gamma: 1.1 },
  'high-contrast': { brightness: 0, contrast: 1.4, saturation: 1.1, gamma: 0.9 },
  'b&w': { brightness: 0, contrast: 1.1, saturation: 0, gamma: 1 },
}

interface ColorGradingPanelProps {
  settings: ColorGradingSettings
  onSettingsChange: (settings: ColorGradingSettings) => void
}

export default function ColorGradingPanel({ settings, onSettingsChange }: ColorGradingPanelProps) {
  const [, setLastPreset] = useState(settings.preset)

  const applyPreset = useCallback((presetName: string) => {
    const preset = PRESETS[presetName]
    if (!preset) return
    setLastPreset(presetName)
    onSettingsChange({ ...preset, preset: presetName })
  }, [onSettingsChange])

  const updateSlider = useCallback((key: keyof Omit<ColorGradingSettings, 'preset'>, value: number) => {
    onSettingsChange({ ...settings, [key]: value, preset: 'custom' })
  }, [settings, onSettingsChange])

  const reset = useCallback(() => {
    applyPreset('normal')
  }, [applyPreset])

  return (
    <div className="color-grading-panel">
      <h3>Color Grading</h3>

      <div className="preset-chips">
        {Object.keys(PRESETS).map(name => (
          <button
            key={name}
            className={`preset-chip ${settings.preset === name ? 'active' : ''}`}
            onClick={() => applyPreset(name)}
          >
            {name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      <div className="color-sliders">
        <div className="color-slider-group">
          <label className="color-slider-label">
            <span>Brightness</span>
            <span>{settings.brightness > 0 ? '+' : ''}{settings.brightness.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="-0.5"
            max="0.5"
            step="0.01"
            value={settings.brightness}
            onChange={(e) => updateSlider('brightness', parseFloat(e.target.value))}
          />
        </div>

        <div className="color-slider-group">
          <label className="color-slider-label">
            <span>Contrast</span>
            <span>{settings.contrast.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.01"
            value={settings.contrast}
            onChange={(e) => updateSlider('contrast', parseFloat(e.target.value))}
          />
        </div>

        <div className="color-slider-group">
          <label className="color-slider-label">
            <span>Saturation</span>
            <span>{settings.saturation.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2.0"
            step="0.01"
            value={settings.saturation}
            onChange={(e) => updateSlider('saturation', parseFloat(e.target.value))}
          />
        </div>

        <div className="color-slider-group">
          <label className="color-slider-label">
            <span>Gamma</span>
            <span>{settings.gamma.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.01"
            value={settings.gamma}
            onChange={(e) => updateSlider('gamma', parseFloat(e.target.value))}
          />
        </div>
      </div>

      <button className="reset-color-btn" onClick={reset}>
        <RotateCcw size={12} /> Reset to Normal
      </button>
    </div>
  )
}
