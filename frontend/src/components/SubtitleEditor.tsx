import { useState } from 'react'
import { useProject } from '../context/ProjectContext'
import { Pencil, Trash2, Wand2, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Move } from 'lucide-react'
import { useToast } from './Toast'
import './SubtitleEditor.css'

// Popular web-safe and Google fonts
const FONT_OPTIONS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Comic Sans MS', label: 'Comic Sans' },
  { value: 'Trebuchet MS', label: 'Trebuchet' },
  { value: 'Palatino Linotype', label: 'Palatino' },
  // Modern fonts (require @import in CSS)
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
]

export default function SubtitleEditor() {
  const {
    subtitles,
    addSubtitle,
    updateSubtitle,
    deleteSubtitle,
    currentTime,
    analysis
  } = useProject()

  const { showWarning, showSuccess } = useToast()
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

  // Speaker colors for differentiation
  const SPEAKER_COLORS = [
    '#ffffff', '#00BFFF', '#FFD700', '#FF6B6B',
    '#7CFC00', '#FF69B4', '#00CED1', '#FFA500',
  ]

  const handleAutoGenerateFromTranscription = () => {
    if (!analysis?.transcription) {
      showWarning('Please analyze the video first to generate transcription')
      return
    }

    const captionRules = analysis.genre_rules?.caption_rules
    const maxWordsPerLine = captionRules?.max_words_per_line || 8

    let count = 0
    analysis.transcription.forEach((transcript) => {
      const words = transcript.words
      const speakerId = transcript.speaker_id
      const energyLevel = transcript.energy_level

      // Build speaker-aware style
      const baseStyle: any = {
        fontSize: 24,
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        position: 'bottom' as const,
      }

      // Apply speaker color
      if (speakerId !== undefined && speakerId !== null) {
        baseStyle.color = SPEAKER_COLORS[speakerId % SPEAKER_COLORS.length]
      }

      // Apply energy emphasis
      if (energyLevel === 'high') {
        baseStyle.fontWeight = 'bold'
        baseStyle.fontSize = 28
      } else if (energyLevel === 'low') {
        baseStyle.fontStyle = 'italic'
      }

      // Genre style override
      if (captionRules?.style === 'minimal') {
        baseStyle.backgroundColor = 'transparent'
        baseStyle.fontSize = Math.min(baseStyle.fontSize, 20)
      } else if (captionRules?.style === 'bold') {
        baseStyle.fontWeight = 'bold'
      }

      // Use word-level timing if available
      if (words && words.length > 0) {
        let currentWords: typeof words = []
        let chunkStart = words[0].start

        for (const w of words) {
          currentWords.push(w)
          if (currentWords.length >= maxWordsPerLine) {
            addSubtitle({
              text: currentWords.map(cw => cw.word).join(' '),
              start_time: chunkStart,
              end_time: w.end,
              style: baseStyle
            })
            count++
            currentWords = []
            chunkStart = 0 // Will be set by next word
          } else if (currentWords.length === 1) {
            chunkStart = w.start
          }
        }
        // Remaining words
        if (currentWords.length > 0) {
          addSubtitle({
            text: currentWords.map(cw => cw.word).join(' '),
            start_time: chunkStart,
            end_time: currentWords[currentWords.length - 1].end,
            style: baseStyle
          })
          count++
        }
      } else {
        // Fallback: use segment as-is
        addSubtitle({
          text: transcript.text,
          start_time: transcript.start,
          end_time: transcript.end,
          style: baseStyle
        })
        count++
      }
    })

    const hasSpeakers = analysis.transcription.some(t => t.speaker_id !== undefined)
    const hasWords = analysis.transcription.some(t => t.words && t.words.length > 0)
    const extras = [
      hasWords ? 'word-level timing' : null,
      hasSpeakers ? 'speaker colors' : null,
    ].filter(Boolean).join(', ')

    showSuccess(`${count} subtitles generated${extras ? ` with ${extras}` : ''}!`)
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
                    {/* Font Family */}
                    <div className="input-group full-width">
                      <label>Font Family</label>
                      <select
                        value={subtitle.style.fontFamily}
                        onChange={e =>
                          updateSubtitle(subtitle.id, {
                            style: { ...subtitle.style, fontFamily: e.target.value }
                          })
                        }
                      >
                        {FONT_OPTIONS.map(font => (
                          <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                            {font.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Font Size & Style */}
                    <div className="style-row">
                      <div className="input-group">
                        <label>Size</label>
                        <input
                          type="number"
                          min="12"
                          max="120"
                          value={subtitle.style.fontSize}
                          onChange={e =>
                            updateSubtitle(subtitle.id, {
                              style: { ...subtitle.style, fontSize: parseInt(e.target.value) || 24 }
                            })
                          }
                        />
                      </div>

                      <div className="style-buttons">
                        <button
                          className={`style-btn ${subtitle.style.fontWeight === 'bold' ? 'active' : ''}`}
                          onClick={() =>
                            updateSubtitle(subtitle.id, {
                              style: {
                                ...subtitle.style,
                                fontWeight: subtitle.style.fontWeight === 'bold' ? 'normal' : 'bold'
                              }
                            })
                          }
                          title="Bold"
                        >
                          <Bold size={14} />
                        </button>
                        <button
                          className={`style-btn ${subtitle.style.fontStyle === 'italic' ? 'active' : ''}`}
                          onClick={() =>
                            updateSubtitle(subtitle.id, {
                              style: {
                                ...subtitle.style,
                                fontStyle: subtitle.style.fontStyle === 'italic' ? 'normal' : 'italic'
                              }
                            })
                          }
                          title="Italic"
                        >
                          <Italic size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div className="input-group">
                      <label>Alignment</label>
                      <div className="style-buttons">
                        <button
                          className={`style-btn ${(subtitle.style.textAlign || 'center') === 'left' ? 'active' : ''}`}
                          onClick={() =>
                            updateSubtitle(subtitle.id, {
                              style: { ...subtitle.style, textAlign: 'left' }
                            })
                          }
                          title="Align Left"
                        >
                          <AlignLeft size={14} />
                        </button>
                        <button
                          className={`style-btn ${(subtitle.style.textAlign || 'center') === 'center' ? 'active' : ''}`}
                          onClick={() =>
                            updateSubtitle(subtitle.id, {
                              style: { ...subtitle.style, textAlign: 'center' }
                            })
                          }
                          title="Align Center"
                        >
                          <AlignCenter size={14} />
                        </button>
                        <button
                          className={`style-btn ${(subtitle.style.textAlign || 'center') === 'right' ? 'active' : ''}`}
                          onClick={() =>
                            updateSubtitle(subtitle.id, {
                              style: { ...subtitle.style, textAlign: 'right' }
                            })
                          }
                          title="Align Right"
                        >
                          <AlignRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="style-row">
                      <div className="input-group">
                        <label>Text Color</label>
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
                        <label>
                          <input
                            type="checkbox"
                            checked={subtitle.style.textShadow !== false}
                            onChange={e =>
                              updateSubtitle(subtitle.id, {
                                style: { ...subtitle.style, textShadow: e.target.checked }
                              })
                            }
                          />
                          Text Shadow
                        </label>
                      </div>
                    </div>

                    {/* Position */}
                    <div className="input-group">
                      <label>Position</label>
                      <select
                        value={subtitle.style.position}
                        onChange={e => {
                          const newPosition = e.target.value as 'top' | 'center' | 'bottom' | 'custom'
                          const updates: any = {
                            style: { ...subtitle.style, position: newPosition }
                          }
                          // Set default x/y for custom position
                          if (newPosition === 'custom' && !subtitle.style.x) {
                            updates.style.x = 50
                            updates.style.y = 80
                          }
                          updateSubtitle(subtitle.id, updates)
                        }}
                      >
                        <option value="top">Top</option>
                        <option value="center">Center</option>
                        <option value="bottom">Bottom</option>
                        <option value="custom">Custom (Drag on video)</option>
                      </select>
                    </div>

                    {/* Custom position controls */}
                    {subtitle.style.position === 'custom' && (
                      <div className="custom-position-controls">
                        <div className="style-row">
                          <div className="input-group">
                            <label>X Position (%)</label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={subtitle.style.x || 50}
                              onChange={e =>
                                updateSubtitle(subtitle.id, {
                                  style: { ...subtitle.style, x: parseInt(e.target.value) }
                                })
                              }
                            />
                            <span className="range-value">{subtitle.style.x || 50}%</span>
                          </div>
                        </div>
                        <div className="style-row">
                          <div className="input-group">
                            <label>Y Position (%)</label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={subtitle.style.y || 80}
                              onChange={e =>
                                updateSubtitle(subtitle.id, {
                                  style: { ...subtitle.style, y: parseInt(e.target.value) }
                                })
                              }
                            />
                            <span className="range-value">{subtitle.style.y || 80}%</span>
                          </div>
                        </div>
                        <p className="hint">
                          <Move size={12} /> Drag the subtitle on the video preview to position
                        </p>
                      </div>
                    )}
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
