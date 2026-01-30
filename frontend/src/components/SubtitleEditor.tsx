import { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import { Pencil, Trash2, Wand2 } from 'lucide-react'
import './SubtitleEditor.css'

export default function SubtitleEditor() {
  const {
    subtitles,
    addSubtitle,
    updateSubtitle,
    deleteSubtitle,
    currentTime,
    analysis
  } = useProject()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [newSubtitle, setNewSubtitle] = useState({
    text: '',
    start: 0,
    end: 0
  })

  const handleAddSubtitle = () => {
    addSubtitle({
      text: newSubtitle.text,
      start_time: newSubtitle.start || currentTime,
      end_time: newSubtitle.end || currentTime + 3,
      style: {
        fontSize: 24,
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        position: 'bottom'
      }
    })
    setNewSubtitle({ text: '', start: 0, end: 0 })
  }

  const handleAutoGenerateFromTranscription = () => {
    if (!analysis?.transcription) {
      alert('Please analyze the video first to generate transcription')
      return
    }

    analysis.transcription.forEach((transcript: { text: string; start: number; end: number }) => {
      addSubtitle({
        text: transcript.text,
        start_time: transcript.start,
        end_time: transcript.end,
        style: {
          fontSize: 24,
          fontFamily: 'Arial',
          color: '#ffffff',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          position: 'bottom'
        }
      })
    })
  }

  return (
    <div className="subtitle-editor">
      <div className="editor-header">
        <h3>Subtitles & Captions</h3>
        <button
          className="btn-small auto-gen-btn"
          onClick={handleAutoGenerateFromTranscription}
          disabled={!analysis?.transcription}
        >
          <Wand2 size={14} />
          Auto-Generate
        </button>
      </div>

      <div className="add-subtitle">
        <textarea
          placeholder="Enter subtitle text..."
          value={newSubtitle.text}
          onChange={e => setNewSubtitle({ ...newSubtitle, text: e.target.value })}
          rows={3}
        />

        <div className="subtitle-timing">
          <div className="input-group">
            <label>Start (s)</label>
            <input
              type="number"
              step="0.1"
              value={newSubtitle.start || ''}
              onChange={e =>
                setNewSubtitle({ ...newSubtitle, start: parseFloat(e.target.value) || 0 })
              }
              placeholder={currentTime.toFixed(2)}
            />
          </div>

          <div className="input-group">
            <label>End (s)</label>
            <input
              type="number"
              step="0.1"
              value={newSubtitle.end || ''}
              onChange={e =>
                setNewSubtitle({ ...newSubtitle, end: parseFloat(e.target.value) || 0 })
              }
              placeholder={(currentTime + 3).toFixed(2)}
            />
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleAddSubtitle}
          disabled={!newSubtitle.text}
        >
          Add Subtitle
        </button>
      </div>

      <div className="subtitle-list">
        <h4>Current Subtitles ({subtitles.length})</h4>
        {subtitles.length === 0 ? (
          <p className="empty-message">No subtitles added yet. Add manually or use auto-generate.</p>
        ) : (
          subtitles.map(subtitle => (
            <div key={subtitle.id} className="subtitle-item">
              {editingId === subtitle.id ? (
                <div className="subtitle-edit">
                  <textarea
                    value={subtitle.text}
                    onChange={e =>
                      updateSubtitle(subtitle.id, { text: e.target.value })
                    }
                    rows={2}
                  />

                  <div className="subtitle-style-controls">
                    <div className="input-group">
                      <label>Font Size</label>
                      <input
                        type="number"
                        value={subtitle.style.fontSize}
                        onChange={e =>
                          updateSubtitle(subtitle.id, {
                            style: { ...subtitle.style, fontSize: parseInt(e.target.value) }
                          })
                        }
                      />
                    </div>

                    <div className="input-group">
                      <label>Position</label>
                      <select
                        value={subtitle.style.position}
                        onChange={e =>
                          updateSubtitle(subtitle.id, {
                            style: {
                              ...subtitle.style,
                              position: e.target.value as 'top' | 'center' | 'bottom'
                            }
                          })
                        }
                      >
                        <option value="top">Top</option>
                        <option value="center">Center</option>
                        <option value="bottom">Bottom</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label>Color</label>
                      <input
                        type="color"
                        value={subtitle.style.color}
                        onChange={e =>
                          updateSubtitle(subtitle.id, {
                            style: { ...subtitle.style, color: e.target.value }
                          })
                        }
                      />
                    </div>

                    <div className="input-group">
                      <label>Font</label>
                      <select
                        value={subtitle.style.fontFamily}
                        onChange={e =>
                          updateSubtitle(subtitle.id, {
                            style: { ...subtitle.style, fontFamily: e.target.value }
                          })
                        }
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Courier New">Courier New</option>
                      </select>
                    </div>
                  </div>

                  <div className="subtitle-timing">
                    <div className="input-group">
                      <label>Start (s)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={subtitle.start_time}
                        onChange={e =>
                          updateSubtitle(subtitle.id, {
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
                        value={subtitle.end_time}
                        onChange={e =>
                          updateSubtitle(subtitle.id, {
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
                  <div className="subtitle-content">
                    <p>{subtitle.text}</p>
                    <span className="subtitle-time">
                      {subtitle.start_time.toFixed(2)}s - {subtitle.end_time.toFixed(2)}s
                    </span>
                  </div>
                  <div className="subtitle-actions">
                    <button onClick={() => setEditingId(subtitle.id)} title="Edit subtitle">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => deleteSubtitle(subtitle.id)} title="Delete subtitle">
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
