import { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import { Pencil, Trash2, Type } from 'lucide-react'
import './OverlayEditor.css'

export default function OverlayEditor() {
  const {
    textOverlays,
    addTextOverlay,
    updateTextOverlay,
    deleteTextOverlay,
    currentTime
  } = useProject()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [newOverlay, setNewOverlay] = useState({
    text: '',
    start: 0,
    end: 0
  })

  const handleAddOverlay = () => {
    addTextOverlay({
      text: newOverlay.text,
      start_time: newOverlay.start || currentTime,
      end_time: newOverlay.end || currentTime + 3,
      style: {
        fontSize: 32,
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: 'transparent',
        position: { x: 50, y: 50 },
        animation: 'fade'
      }
    })
    setNewOverlay({ text: '', start: 0, end: 0 })
  }

  return (
    <div className="overlay-editor">
      <div className="editor-header">
        <h3>Text Overlays</h3>
      </div>

      <div className="add-overlay">
        <div className="overlay-preview-hint">
          <Type size={16} />
          <span>Add text that appears on top of your video</span>
        </div>

        <textarea
          placeholder="Enter overlay text (e.g., 'Subscribe!', 'Chapter 1', '50% OFF')"
          value={newOverlay.text}
          onChange={e => setNewOverlay({ ...newOverlay, text: e.target.value })}
          rows={2}
        />

        <div className="overlay-timing">
          <div className="input-group">
            <label>Start (s)</label>
            <input
              type="number"
              step="0.1"
              value={newOverlay.start || ''}
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
              value={newOverlay.end || ''}
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
        <h4>Text Overlays ({textOverlays.length})</h4>
        {textOverlays.length === 0 ? (
          <p className="empty-message">No text overlays added yet. Add some text to display on your video.</p>
        ) : (
          textOverlays.map(overlay => (
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
                        min="12"
                        max="120"
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
                      <label>Background</label>
                      <input
                        type="color"
                        value={overlay.style.backgroundColor === 'transparent' ? '#000000' : overlay.style.backgroundColor}
                        onChange={e =>
                          updateTextOverlay(overlay.id, {
                            style: { ...overlay.style, backgroundColor: e.target.value }
                          })
                        }
                      />
                    </div>

                    <div className="input-group">
                      <label>Font</label>
                      <select
                        value={overlay.style.fontFamily}
                        onChange={e =>
                          updateTextOverlay(overlay.id, {
                            style: { ...overlay.style, fontFamily: e.target.value }
                          })
                        }
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Impact">Impact</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Comic Sans MS">Comic Sans MS</option>
                      </select>
                    </div>
                  </div>

                  <div className="position-controls">
                    <h5>Position</h5>
                    <div className="position-grid">
                      <div className="input-group">
                        <label>X Position (%)</label>
                        <input
                          type="range"
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
                        <span className="range-value">{overlay.style.position.x}%</span>
                      </div>

                      <div className="input-group">
                        <label>Y Position (%)</label>
                        <input
                          type="range"
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
                        <span className="range-value">{overlay.style.position.y}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="overlay-timing">
                    <div className="input-group">
                      <label>Start (s)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={overlay.start_time}
                        onChange={e =>
                          updateTextOverlay(overlay.id, {
                            start_time: parseFloat(e.target.value) || 0
                          })
                        }
                      />
                    </div>

                    <div className="input-group">
                      <label>End (s)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={overlay.end_time}
                        onChange={e =>
                          updateTextOverlay(overlay.id, {
                            end_time: parseFloat(e.target.value) || 0
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
                    <p className="overlay-text">{overlay.text}</p>
                    <div className="overlay-meta">
                      <span className="overlay-time">
                        {overlay.start_time.toFixed(2)}s - {overlay.end_time.toFixed(2)}s
                      </span>
                      <span className="overlay-style-preview" style={{
                        color: overlay.style.color,
                        fontFamily: overlay.style.fontFamily,
                        fontSize: '10px'
                      }}>
                        {overlay.style.fontFamily}, {overlay.style.fontSize}px
                      </span>
                    </div>
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
          ))
        )}
      </div>
    </div>
  )
}
