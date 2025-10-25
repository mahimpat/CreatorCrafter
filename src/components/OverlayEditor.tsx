import { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import type { TextOverlay } from '../context/ProjectContext'
import { Pencil, Trash2 } from 'lucide-react'
import './OverlayEditor.css'

export default function OverlayEditor() {
  const { textOverlays, addTextOverlay, updateTextOverlay, deleteTextOverlay, currentTime } =
    useProject()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [newOverlay, setNewOverlay] = useState({
    text: '',
    start: 0,
    end: 0
  })

  const handleAddOverlay = () => {
    const overlay: TextOverlay = {
      id: `overlay-${Date.now()}`,
      text: newOverlay.text,
      start: newOverlay.start || currentTime,
      end: newOverlay.end || currentTime + 3,
      style: {
        fontSize: 32,
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: 'transparent',
        position: { x: 50, y: 50 },
        animation: 'fade'
      }
    }

    addTextOverlay(overlay)
    setNewOverlay({ text: '', start: 0, end: 0 })
  }

  return (
    <div className="overlay-editor">
      <div className="editor-header">
        <h3>Text Overlays</h3>
      </div>

      <div className="add-overlay">
        <textarea
          placeholder="Enter overlay text..."
          value={newOverlay.text}
          onChange={e => setNewOverlay({ ...newOverlay, text: e.target.value })}
          rows={3}
        />

        <div className="overlay-timing">
          <div className="input-group">
            <label>Start (s)</label>
            <input
              type="number"
              step="0.1"
              value={newOverlay.start}
              onChange={e =>
                setNewOverlay({ ...newOverlay, start: parseFloat(e.target.value) || 0 })
              }
              placeholder={currentTime.toFixed(2)}
            />
          </div>

          <div className="input-group">
            <label>End (s)</label>
            <input
              type="number"
              step="0.1"
              value={newOverlay.end}
              onChange={e =>
                setNewOverlay({ ...newOverlay, end: parseFloat(e.target.value) || 0 })
              }
              placeholder={(currentTime + 3).toFixed(2)}
            />
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleAddOverlay}
          disabled={!newOverlay.text}
        >
          Add Overlay
        </button>
      </div>

      <div className="overlay-list">
        {textOverlays.map(overlay => (
          <div key={overlay.id} className="overlay-item">
            {editingId === overlay.id ? (
              <div className="overlay-edit">
                <textarea
                  value={overlay.text}
                  onChange={e => updateTextOverlay(overlay.id, { text: e.target.value })}
                  rows={2}
                />

                <div className="overlay-style-controls">
                  <div className="input-group">
                    <label>Font Size</label>
                    <input
                      type="number"
                      value={overlay.style.fontSize}
                      onChange={e =>
                        updateTextOverlay(overlay.id, {
                          style: { ...overlay.style, fontSize: parseInt(e.target.value) }
                        })
                      }
                    />
                  </div>

                  <div className="input-group">
                    <label>Animation</label>
                    <select
                      value={overlay.style.animation}
                      onChange={e =>
                        updateTextOverlay(overlay.id, {
                          style: {
                            ...overlay.style,
                            animation: e.target.value as 'none' | 'fade' | 'slide' | 'zoom'
                          }
                        })
                      }
                    >
                      <option value="none">None</option>
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="zoom">Zoom</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Color</label>
                    <input
                      type="color"
                      value={overlay.style.color}
                      onChange={e =>
                        updateTextOverlay(overlay.id, {
                          style: { ...overlay.style, color: e.target.value }
                        })
                      }
                    />
                  </div>

                  <div className="input-group">
                    <label>Position X (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={overlay.style.position.x}
                      onChange={e =>
                        updateTextOverlay(overlay.id, {
                          style: {
                            ...overlay.style,
                            position: {
                              ...overlay.style.position,
                              x: parseInt(e.target.value)
                            }
                          }
                        })
                      }
                    />
                  </div>

                  <div className="input-group">
                    <label>Position Y (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={overlay.style.position.y}
                      onChange={e =>
                        updateTextOverlay(overlay.id, {
                          style: {
                            ...overlay.style,
                            position: {
                              ...overlay.style.position,
                              y: parseInt(e.target.value)
                            }
                          }
                        })
                      }
                    />
                  </div>
                </div>

                <button className="btn-small" onClick={() => setEditingId(null)}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="overlay-content">
                  <p>{overlay.text}</p>
                  <span className="overlay-time">
                    {overlay.start.toFixed(2)}s - {overlay.end.toFixed(2)}s
                  </span>
                </div>
                <div className="overlay-actions">
                  <button onClick={() => setEditingId(overlay.id)} title="Edit overlay">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => deleteTextOverlay(overlay.id)} title="Delete overlay">
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
