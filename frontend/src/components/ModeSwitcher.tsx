/**
 * ModeSwitcher - Dropdown to switch between editing modes
 */
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, MousePointer, Sliders, Wand2, Check } from 'lucide-react'
import { ProjectMode } from '../api'
import './ModeSwitcher.css'

interface ModeSwitcherProps {
  currentMode: ProjectMode
  onModeChange: (mode: ProjectMode) => void
}

const modeOptions: Array<{
  mode: ProjectMode
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    mode: 'manual',
    label: 'Manual',
    description: 'Full creative control, no AI assistance',
    icon: <MousePointer size={16} />
  },
  {
    mode: 'semi_manual',
    label: 'Semi-Auto',
    description: 'AI suggests, you decide what to use',
    icon: <Sliders size={16} />
  },
  {
    mode: 'automatic',
    label: 'Full Auto',
    description: 'AI handles everything automatically',
    icon: <Wand2 size={16} />
  }
]

export default function ModeSwitcher({ currentMode, onModeChange }: ModeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentOption = modeOptions.find(o => o.mode === currentMode) || modeOptions[1]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (mode: ProjectMode) => {
    if (mode !== currentMode) {
      onModeChange(mode)
    }
    setIsOpen(false)
  }

  return (
    <div className="mode-switcher" ref={dropdownRef}>
      <button
        className={`mode-trigger mode-${currentMode}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {currentOption.icon}
        <span>{currentOption.label}</span>
        <ChevronDown size={14} className={isOpen ? 'rotated' : ''} />
      </button>

      {isOpen && (
        <div className="mode-dropdown">
          <div className="dropdown-header">Switch Mode</div>
          {modeOptions.map(option => (
            <button
              key={option.mode}
              className={`mode-option ${option.mode === currentMode ? 'selected' : ''}`}
              onClick={() => handleSelect(option.mode)}
            >
              <div className="option-icon">{option.icon}</div>
              <div className="option-content">
                <span className="option-label">{option.label}</span>
                <span className="option-desc">{option.description}</span>
              </div>
              {option.mode === currentMode && (
                <Check size={16} className="check-icon" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
