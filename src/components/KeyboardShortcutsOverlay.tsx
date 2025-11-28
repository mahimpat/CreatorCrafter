import React from 'react'
import { X, Command, Keyboard } from 'lucide-react'
import './KeyboardShortcutsOverlay.css'

interface KeyboardShortcutsOverlayProps {
    isOpen: boolean
    onClose: () => void
}

interface ShortcutCategory {
    title: string
    shortcuts: {
        keys: string[]
        description: string
    }[]
}

const SHORTCUTS: ShortcutCategory[] = [
    {
        title: 'General',
        shortcuts: [
            { keys: ['?'], description: 'Show keyboard shortcuts' },
            { keys: ['Ctrl', 'S'], description: 'Save project' },
            { keys: ['Ctrl', 'Shift', 'S'], description: 'Save project as...' },
            { keys: ['Ctrl', 'Z'], description: 'Undo' },
            { keys: ['Ctrl', 'Y'], description: 'Redo' },
        ]
    },
    {
        title: 'Timeline',
        shortcuts: [
            { keys: ['Space'], description: 'Play / Pause' },
            { keys: ['Delete'], description: 'Delete selected clip' },
            { keys: ['Ctrl', 'C'], description: 'Copy selected clip' },
            { keys: ['Ctrl', 'V'], description: 'Paste clip' },
            { keys: ['S'], description: 'Split clip at playhead' },
            { keys: ['M'], description: 'Add marker' },
        ]
    },
    {
        title: 'Navigation',
        shortcuts: [
            { keys: ['←'], description: 'Previous frame' },
            { keys: ['→'], description: 'Next frame' },
            { keys: ['Shift', '←'], description: 'Jump back 1s' },
            { keys: ['Shift', '→'], description: 'Jump forward 1s' },
            { keys: ['Home'], description: 'Go to start' },
            { keys: ['End'], description: 'Go to end' },
        ]
    },
    {
        title: 'Tools',
        shortcuts: [
            { keys: ['V'], description: 'Select tool' },
            { keys: ['C'], description: 'Cut / Razor tool' },
            { keys: ['H'], description: 'Hand tool' },
        ]
    }
]

export default function KeyboardShortcutsOverlay({ isOpen, onClose }: KeyboardShortcutsOverlayProps) {
    if (!isOpen) return null

    return (
        <div className="shortcuts-overlay-backdrop" onClick={onClose}>
            <div className="shortcuts-overlay-content" onClick={e => e.stopPropagation()}>
                <div className="shortcuts-header">
                    <div className="shortcuts-title">
                        <Keyboard size={24} />
                        <h2>Keyboard Shortcuts</h2>
                    </div>
                    <button className="close-button" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="shortcuts-grid">
                    {SHORTCUTS.map((category, index) => (
                        <div key={index} className="shortcut-category">
                            <h3>{category.title}</h3>
                            <div className="shortcut-list">
                                {category.shortcuts.map((shortcut, sIndex) => (
                                    <div key={sIndex} className="shortcut-item">
                                        <span className="shortcut-description">{shortcut.description}</span>
                                        <div className="shortcut-keys">
                                            {shortcut.keys.map((key, kIndex) => (
                                                <React.Fragment key={kIndex}>
                                                    {kIndex > 0 && <span className="key-separator">+</span>}
                                                    <kbd className="key">{key}</kbd>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="shortcuts-footer">
                    <p>Press <kbd>Esc</kbd> to close</p>
                </div>
            </div>
        </div>
    )
}
