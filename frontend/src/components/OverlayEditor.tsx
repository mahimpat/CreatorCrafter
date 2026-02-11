import { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import { Pencil, Trash2, Type, Wand2 } from 'lucide-react'
import './OverlayEditor.css'

const OVERLAY_TYPE_STYLES: Record<string, any> = {
  intro_title: { fontSize: 48, fontFamily: 'Impact', position: { x: 50, y: 40 }, animation: 'fade' as const },
  lower_third: { fontSize: 22, backgroundColor: 'rgba(0,0,0,0.6)', position: { x: 10, y: 80 }, animation: 'slide' as const },
  section_title: { fontSize: 36, position: { x: 50, y: 50 }, animation: 'zoom' as const },
  callout: { fontSize: 28, color: '#FFD700', position: { x: 50, y: 30 }, animation: 'fade' as const },
  outro_title: { fontSize: 40, fontFamily: 'Georgia', position: { x: 50, y: 45 }, animation: 'fade' as const },
}

export default function OverlayEditor() {
  const {
    textOverlays,
    addTextOverlay,
    updateTextOverlay,
    deleteTextOverlay,
    currentTime,
    analysis
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

      {/* AI-Suggested Text Overlays */}
      {analysis?.suggested_text_overlays && analysis.suggested_text_overlays.length > 0 && (
        <div className="overlay-suggestions" style={{ margin: '12px 0', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Wand2 size={14} />
            AI Suggestions ({analysis.suggested_text_overlays.length})
          </h4>
          {analysis.suggested_text_overlays.map((suggestion, idx) => {
            const typeStyle = OVERLAY_TYPE_STYLES[suggestion.type] || {}
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{
                  fontSize: '0.7em', padding: '2px 6px', borderRadius: 4,
                  background: suggestion.type === 'intro_title' ? '#4caf50' :
                    suggestion.type === 'callout' ? '#ff9800' :
                    suggestion.type === 'lower_third' ? '#2196f3' : '#666',
                  color: '#fff', whiteSpace: 'nowrap'
                }}>
                  {suggestion.type.replace('_', ' ')}
                </span>
                <span style={{ flex: 1, fontSize: '0.9em' }}>{suggestion.text}</span>
                <span style={{ fontSize: '0.75em', color: '#999', whiteSpace: 'nowrap' }}>
                  {(suggestion.start_time ?? suggestion.timestamp ?? 0).toFixed(1)}s
                </span>
                <button
                  className="btn-small"
                  style={{ padding: '2px 10px', fontSize: '0.8em' }}
                  onClick={() => {
                    const startTime = suggestion.start_time ?? suggestion.timestamp ?? 0
                    addTextOverlay({
                      text: suggestion.text,
                      start_time: startTime,
                      end_time: suggestion.end_time ?? startTime + 3,
                      style: {
                        fontSize: typeStyle.fontSize || 32,
                        fontFamily: typeStyle.fontFamily || 'Arial',
                        color: typeStyle.color || '#ffffff',
                        backgroundColor: typeStyle.backgroundColor || 'transparent',
                        position: typeStyle.position || { x: 50, y: 50 },
                        animation: typeStyle.animation || 'fade',
                      }
                    })
                  }}
                >
                  Use
                </button>
              </div>
            )
          })}
        </div>
      )}

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
