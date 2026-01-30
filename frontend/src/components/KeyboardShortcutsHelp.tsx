/**
 * KeyboardShortcutsHelp - Modal showing available keyboard shortcuts
 */
import { X, Keyboard } from 'lucide-react'
import './KeyboardShortcutsHelp.css'

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  { keys: ['Ctrl/Cmd', 'S'], description: 'Save project' },
  { keys: ['Ctrl/Cmd', 'Z'], description: 'Undo' },
  { keys: ['Ctrl/Cmd', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Space'], description: 'Play/Pause video' },
  { keys: ['Delete'], description: 'Delete selected item' },
  { keys: ['Ctrl/Cmd', 'E'], description: 'Export project' },
  { keys: ['Left Arrow'], description: 'Seek backward 5s' },
  { keys: ['Right Arrow'], description: 'Seek forward 5s' },
]

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <div className="header-title">
            <Keyboard size={20} />
            <h2>Keyboard Shortcuts</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="shortcuts-list">
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} className="shortcut-item">
              <div className="shortcut-keys">
                {shortcut.keys.map((key, keyIdx) => (
                  <span key={keyIdx}>
                    <kbd>{key}</kbd>
                    {keyIdx < shortcut.keys.length - 1 && <span className="plus">+</span>}
                  </span>
                ))}
              </div>
              <span className="shortcut-desc">{shortcut.description}</span>
            </div>
          ))}
        </div>

        <div className="dialog-footer">
          <p>Press <kbd>?</kbd> to toggle this help</p>
        </div>
      </div>
    </div>
  )
}
