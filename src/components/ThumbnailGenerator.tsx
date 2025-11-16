import { useState, useEffect } from 'react'
import { useProject } from '../context/ProjectContext'
import { Image, Sparkles, Download, FolderOpen, Wand2, Palette, Share2, Smartphone } from 'lucide-react'
import { THUMBNAIL_TEMPLATES, BACKGROUND_OPTIONS, ThumbnailCandidate } from '../types/thumbnail'
import { BrandKit } from '../types/brandkit'
import MultiExportDialog from './MultiExportDialog'
import TemplateGallery from './TemplateGallery'
import ThumbnailMobilePreview from './ThumbnailMobilePreview'
import ThumbnailVariationsPreview from './ThumbnailVariationsPreview'
import toast from 'react-hot-toast'
import './ThumbnailGenerator.css'

export default function ThumbnailGenerator() {
  const { videoPath, projectPath, currentTime, unifiedAnalysis, isAnalyzing } = useProject()
  const [candidates, setCandidates] = useState<ThumbnailCandidate[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<ThumbnailCandidate | null>(null)
  const [customText, setCustomText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(THUMBNAIL_TEMPLATES[0]) // Professional by default
  const [selectedBackground, setSelectedBackground] = useState(BACKGROUND_OPTIONS[1]) // YouTube Blue by default
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPath, setGeneratedPath] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false) // Hide advanced options by default

  // AI Caption Generation
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false)
  const [suggestedCaptions, setSuggestedCaptions] = useState<string[]>([])
  const [captionContext, setCaptionContext] = useState<{ visual?: string; audio?: string } | null>(null)

  // Brand Kit
  const [brandKits, setBrandKits] = useState<any[]>([])
  const [selectedBrandKit, setSelectedBrandKit] = useState<string | null>(null)

  // Multi-Export
  const [showMultiExport, setShowMultiExport] = useState(false)

  // Mobile Preview
  const [showMobilePreview, setShowMobilePreview] = useState(false)

  // A/B Testing Variations
  const [showVariations, setShowVariations] = useState(false)
  const [variations, setVariations] = useState<any[]>([])
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false)

  // Container Style (Professional vs Gradient)
  const [useContainerStyle, setUseContainerStyle] = useState(true)

  useEffect(() => {
    loadBrandKits()
  }, [])

  // Load cached thumbnail candidates from unified analysis
  useEffect(() => {
    if (unifiedAnalysis?.thumbnail_candidates && unifiedAnalysis.thumbnail_candidates.length > 0) {
      const cachedCandidates: ThumbnailCandidate[] = unifiedAnalysis.thumbnail_candidates.map((candidate) => ({
        id: `candidate-${candidate.timestamp}`,
        timestamp: candidate.timestamp,
        score: candidate.score,
        hasFaces: candidate.has_faces,
        faceCount: candidate.face_count,
        sharpness: candidate.sharpness,
        contrast: candidate.contrast,
        vibrancy: candidate.vibrancy
      }))
      setCandidates(cachedCandidates)
      // Automatically select the best candidate (first one, sorted by score)
      if (cachedCandidates.length > 0) {
        setSelectedCandidate(cachedCandidates[0])
      }
    }
  }, [unifiedAnalysis])

  const loadBrandKits = async () => {
    try {
      const result = await window.electronAPI.brandkitList()
      if (result.success && result.brandKits) {
        setBrandKits(result.brandKits)
      }
    } catch (error) {
      console.error('Failed to load brand kits:', error)
    }
  }

  // AI Caption Generation
  const handleGenerateCaptions = async () => {
    if (!videoPath) {
      toast.error('No video loaded')
      return
    }

    // Use current video time or selected candidate timestamp
    const timestamp = selectedCandidate?.timestamp ?? currentTime

    setIsGeneratingCaptions(true)
    try {
      toast.loading('Analyzing video with AI to generate captions...')

      const result = await window.electronAPI.thumbnailGenerateCaptions(videoPath, timestamp)

      if (result.success && result.captions && result.captions.length > 0) {
        setSuggestedCaptions(result.captions)
        setCaptionContext({
          visual: result.visual_description,
          audio: result.audio_context
        })
        toast.success(`Generated ${result.captions.length} caption suggestions!`)
      } else {
        throw new Error(result.error || 'Failed to generate captions')
      }
    } catch (error: any) {
      console.error('Caption generation error:', error)
      toast.error(error.message || 'Failed to generate AI captions')

      // Provide fallback captions
      setSuggestedCaptions([
        'WATCH THIS NOW',
        'YOU WON\'T BELIEVE THIS',
        'MUST SEE'
      ])
    } finally {
      setIsGeneratingCaptions(false)
    }
  }

  // Auto-generate: Smart one-click thumbnail generation
  const handleAutoGenerate = async () => {
    if (!videoPath) {
      toast.error('No video loaded. Please load a video first.')
      return
    }

    if (!customText) {
      toast.error('Please enter thumbnail text')
      return
    }

    setIsGenerating(true)
    try {
      // First, analyze video to find best frame if we haven't already
      let bestCandidate = selectedCandidate

      if (!bestCandidate || candidates.length === 0) {
        // No cached analysis available, run new analysis
        toast.loading('Analyzing video for best frame...')
        const analyzeResult = await window.electronAPI.thumbnailAnalyze(videoPath)

        if (analyzeResult.success && analyzeResult.candidates && analyzeResult.candidates.length > 0) {
          // Pick the best scoring candidate
          const best = analyzeResult.candidates[0]
          bestCandidate = {
            id: `candidate-${best.timestamp}`,
            timestamp: best.timestamp,
            score: best.score,
            hasFaces: best.has_faces,
            faceCount: best.face_count,
            sharpness: best.sharpness,
            contrast: best.contrast,
            vibrancy: best.vibrancy
          }
        } else {
          throw new Error('Could not find suitable frames')
        }
      } else {
        // Using cached analysis from unified analysis
        console.log('Using cached thumbnail analysis from unified analysis')
      }

      toast.loading('Generating professional thumbnail with AI...')

      // Generate with auto template and auto background
      const result = await window.electronAPI.thumbnailGenerate({
        videoPath: videoPath!,
        timestamp: bestCandidate.timestamp,
        text: customText,
        template: 'auto',  // Let AI pick best template
        background: 'auto',  // Let AI pick best background
        brandKitId: selectedBrandKit || undefined
      })

      if (result.success && result.thumbnail_path) {
        let finalPath = result.thumbnail_path

        // Copy to project if available
        if (projectPath) {
          try {
            const relativePath = await window.electronAPI.copyAssetToProject(
              result.thumbnail_path,
              projectPath,
              'thumbnails'
            )
            // Resolve relative path to absolute path
            finalPath = await window.electronAPI.resolveProjectPath(projectPath, relativePath)
          } catch (error) {
            console.error('Failed to copy to project:', error)
            // Keep the original temp path if copy fails
          }
        }

        setGeneratedPath(finalPath)
        toast.success('✨ Professional thumbnail generated!')
      } else {
        throw new Error(result.error || 'Generation failed')
      }
    } catch (error: any) {
      console.error('Auto-generate error:', error)
      toast.error(error.message || 'Failed to generate thumbnail')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateVariations = async () => {
    if (!selectedCandidate) {
      toast.error('Please select a thumbnail candidate first')
      return
    }

    if (!customText) {
      toast.error('Please enter thumbnail text')
      return
    }

    setIsGeneratingVariations(true)
    try {
      toast.loading('Generating 6 thumbnail variations for A/B testing...')

      const result = await window.electronAPI.thumbnailGenerateVariations({
        videoPath: videoPath!,
        timestamp: selectedCandidate.timestamp,
        text: customText,
        numVariations: 6,
        brandKitId: selectedBrandKit || undefined
      })

      if (result.success && result.variations) {
        setVariations(result.variations)
        setShowVariations(true)
        toast.success(`Generated ${result.variations.length} variations!`)
      } else {
        throw new Error(result.error || 'Failed to generate variations')
      }
    } catch (error: any) {
      console.error('Variation generation error:', error)
      toast.error(error.message || 'Failed to generate variations')
    } finally {
      setIsGeneratingVariations(false)
    }
  }

  const handleSelectCandidate = async (candidate: ThumbnailCandidate) => {
    setSelectedCandidate(candidate)

    // Extract frame preview
    try {
      const result = await window.electronAPI.thumbnailExtract(videoPath!, candidate.timestamp)
      if (result.success && result.frame_path) {
        // Update candidate with frame path
        setCandidates(prev => prev.map(c =>
          c.id === candidate.id ? { ...c, framePath: result.frame_path } : c
        ))
      }
    } catch (error) {
      console.error('Failed to extract frame:', error)
    }
  }

  const handleGenerate = async () => {
    if (!selectedCandidate) {
      toast.error('Please select a thumbnail candidate first')
      return
    }

    if (!customText) {
      toast.error('Please enter thumbnail text')
      return
    }

    setIsGenerating(true)
    try {
      const result = await window.electronAPI.thumbnailGenerate({
        videoPath: videoPath!,
        timestamp: selectedCandidate.timestamp,
        text: customText,
        template: selectedTemplate.style,
        background: selectedBackground.type,
        brandKitId: selectedBrandKit || undefined
      })

      if (result.success && result.thumbnail_path) {
        let finalPath = result.thumbnail_path

        // Copy to project if available
        if (projectPath) {
          try {
            const relativePath = await window.electronAPI.copyAssetToProject(
              result.thumbnail_path,
              projectPath,
              'thumbnails'
            )
            finalPath = await window.electronAPI.resolveProjectPath(projectPath, relativePath)
          } catch (err) {
            console.error('Failed to copy thumbnail to project:', err)
          }
        }

        setGeneratedPath(finalPath)
        toast.success('Thumbnail generated successfully!')
      } else {
        throw new Error(result.error || 'Generation failed')
      }
    } catch (error: any) {
      console.error('Thumbnail generation error:', error)
      toast.error(error.message || 'Failed to generate thumbnail')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShowInFolder = async () => {
    if (generatedPath) {
      await window.electronAPI.showInFolder(generatedPath)
    }
  }

  return (
    <div className="thumbnail-generator">
      <div className="thumbnail-header">
        <h3>AI Thumbnail Generator</h3>
        <p className="help-text" style={{ margin: '8px 0', fontSize: '13px' }}>
          Enter text below and click "Auto Generate" for instant professional thumbnails
        </p>
      </div>

      {/* Quick Generate Section - Always Visible */}
      <div className="quick-generate-section" style={{ background: '#2a2d3a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <div className="form-group">
          <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Thumbnail Text</span>
            <button
              onClick={handleGenerateCaptions}
              disabled={!videoPath || isGeneratingCaptions}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: isGeneratingCaptions ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isGeneratingCaptions ? 0.6 : 1
              }}
            >
              <Wand2 size={14} />
              {isGeneratingCaptions ? 'Generating...' : 'AI Suggest'}
            </button>
          </label>

          {/* AI Suggested Captions */}
          {suggestedCaptions.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <small style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                AI-suggested captions (click to use):
              </small>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {suggestedCaptions.map((caption, index) => (
                  <button
                    key={index}
                    onClick={() => setCustomText(caption)}
                    style={{
                      padding: '8px 12px',
                      background: customText === caption ? '#667eea' : '#1e2029',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      color: customText === caption ? 'white' : '#ccc',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '13px',
                      transition: 'all 0.2s',
                      fontWeight: customText === caption ? 600 : 400
                    }}
                    onMouseEnter={(e) => {
                      if (customText !== caption) {
                        e.currentTarget.style.background = '#2a2d3a'
                        e.currentTarget.style.borderColor = '#667eea'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (customText !== caption) {
                        e.currentTarget.style.background = '#1e2029'
                        e.currentTarget.style.borderColor = '#444'
                      }
                    }}
                  >
                    {index + 1}. {caption}
                  </button>
                ))}
              </div>
              {captionContext && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#1e2029', borderRadius: '6px', fontSize: '11px', color: '#888' }}>
                  {captionContext.visual && <div>📸 Scene: {captionContext.visual}</div>}
                  {captionContext.audio && <div style={{ marginTop: '4px' }}>🎧 Audio: {captionContext.audio.slice(0, 100)}...</div>}
                </div>
              )}
            </div>
          )}

          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value.slice(0, 50))}
            placeholder="Enter catchy text (e.g., INSANE RESULTS!!)"
            maxLength={50}
            style={{ width: '100%', padding: '10px', fontSize: '14px' }}
          />
          <small className="help-text" style={{ marginTop: '4px' }}>{customText.length}/50 characters</small>
        </div>

        {/* Brand Kit Selection */}
        {brandKits.length > 0 && (
          <div className="form-group">
            <label style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Palette size={16} />
              Brand Kit (Optional)
            </label>
            <select
              value={selectedBrandKit || ''}
              onChange={(e) => setSelectedBrandKit(e.target.value || null)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#1e2029',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px'
              }}
            >
              <option value="">No Brand Kit (Default Styling)</option>
              {brandKits.map((kit) => (
                <option key={kit.id} value={kit.id}>
                  {kit.name}
                </option>
              ))}
            </select>
            <small className="help-text" style={{ marginTop: '4px' }}>
              Apply your brand colors and styling automatically
            </small>
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleAutoGenerate}
          disabled={!videoPath || !customText || isGenerating}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '14px',
            fontSize: '16px',
            fontWeight: 600,
            background: isGenerating ? '#555' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          <Sparkles size={18} />
          {isGenerating ? 'Generating Professional Thumbnail...' : '✨ Auto Generate (AI Powered)'}
        </button>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '8px',
            background: 'transparent',
            border: '1px solid #444',
            borderRadius: '6px',
            color: '#aaa',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          {showAdvanced ? '△ Hide Advanced Options' : '▽ Show Advanced Options'}
        </button>
      </div>

      {/* Advanced Options - Collapsible */}
      {showAdvanced && (
        <div style={{ marginBottom: '20px' }}>
          <div className="thumbnail-header">
            <h4>Advanced: Manual Frame Selection</h4>
            <p className="help-text" style={{ marginTop: '8px' }}>
              Click "Analyze Video" in the top bar to find the best frames for thumbnails
            </p>
          </div>
        </div>
      )}

      {showAdvanced && candidates.length > 0 && !isAnalyzing && (
        <>
          <div className="candidates-section">
            <h4>AI-Suggested Thumbnails (Top {candidates.length})</h4>
            <p className="help-text">
              Frames are scored based on faces, sharpness, contrast, and vibrancy. Click to select.
            </p>
            <div className="candidates-grid">
              {candidates.map(candidate => (
                <div
                  key={candidate.id}
                  className={`candidate-card ${selectedCandidate?.id === candidate.id ? 'selected' : ''}`}
                  onClick={() => handleSelectCandidate(candidate)}
                >
                  <div className="candidate-placeholder">
                    {candidate.framePath ? (
                      <img src={`file://${candidate.framePath}`} alt="Thumbnail candidate" />
                    ) : (
                      <div className="loading-placeholder">
                        <Image size={32} />
                        <span>Loading...</span>
                      </div>
                    )}
                  </div>
                  <div className="candidate-info">
                    <div className="score-badge">Score: {candidate.score.toFixed(0)}</div>
                    <div className="candidate-details">
                      <span>{candidate.timestamp.toFixed(1)}s</span>
                      {candidate.hasFaces && (
                        <span className="faces-badge">{candidate.faceCount} face{candidate.faceCount > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedCandidate && (
            <div className="customization-section">
              <h4>Customize Thumbnail</h4>

              <div className="form-group">
                <label>Thumbnail Text</label>
                <input
                  type="text"
                  placeholder="Enter your thumbnail text..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  maxLength={50}
                />
                <small className="help-text">{customText.length}/50 characters</small>
              </div>

              {/* Professional Template Gallery */}
              <TemplateGallery
                selectedTemplate={selectedTemplate}
                onSelectTemplate={setSelectedTemplate}
              />

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Background Removal</span>
                  <label className="toggle-switch" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={selectedBackground.type !== 'original'}
                      onChange={(e) => {
                        setSelectedBackground(e.target.checked ? BACKGROUND_OPTIONS[1] : BACKGROUND_OPTIONS[0])
                      }}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </label>
                <small className="help-text">
                  {selectedBackground.type === 'original'
                    ? 'Original background will be kept as-is'
                    : 'AI will remove background and apply template-specific styling'}
                </small>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Text Style</span>
                  <label className="toggle-switch" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={useContainerStyle}
                      onChange={(e) => setUseContainerStyle(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </label>
                <small className="help-text">
                  {useContainerStyle
                    ? '✅ Professional Containers: Clean white boxes with black text (RECOMMENDED)'
                    : 'Legacy Gradient: Colorful gradient text with multi-stroke outlines'}
                </small>
              </div>

              <div className="generate-actions">
                <button
                  className="btn-primary"
                  onClick={handleGenerate}
                  disabled={!customText || isGenerating}
                >
                  <Download size={16} />
                  {isGenerating ? 'Generating...' : 'Generate Thumbnail'}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleGenerateVariations}
                  disabled={!customText || isGeneratingVariations}
                  title="Generate multiple variations for A/B testing"
                >
                  <Sparkles size={16} />
                  {isGeneratingVariations ? 'Generating...' : 'A/B Test (6 Variations)'}
                </button>
              </div>
            </div>
          )}

        </>
      )}

      {/* Generated Thumbnail - Always Visible */}
      {generatedPath && (
        <div className="generated-section" style={{ background: '#2a2d3a', padding: '20px', borderRadius: '8px' }}>
          <h4>✨ Your Professional Thumbnail</h4>
          <div className="generated-preview">
            <img src={`file://${generatedPath}`} alt="Generated thumbnail" style={{ width: '100%', borderRadius: '8px' }} />
          </div>
          <div className="generated-actions" style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={handleShowInFolder} style={{ flex: 1, minWidth: '200px', padding: '12px' }}>
              <FolderOpen size={16} />
              Show in Folder
            </button>
            <button
              className="btn-secondary"
              onClick={() => setShowMobilePreview(true)}
              style={{ flex: 1, minWidth: '200px', padding: '12px', background: '#667eea', color: 'white', border: 'none' }}
            >
              <Smartphone size={16} />
              Mobile Preview
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowMultiExport(true)}
              style={{ flex: 1, minWidth: '200px', padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <Share2 size={16} />
              Export to Platforms
            </button>
          </div>
        </div>
      )}

      {/* Multi-Export Dialog */}
      {showMultiExport && generatedPath && (
        <MultiExportDialog
          sourceThumbnailPath={generatedPath}
          onClose={() => setShowMultiExport(false)}
        />
      )}

      {/* Mobile Preview Validator */}
      {showMobilePreview && (
        <ThumbnailMobilePreview
          thumbnailPath={generatedPath}
          onClose={() => setShowMobilePreview(false)}
        />
      )}

      {/* A/B Testing Variations Preview */}
      {showVariations && variations.length > 0 && (
        <ThumbnailVariationsPreview
          variations={variations}
          onClose={() => setShowVariations(false)}
          onSelect={(variation) => {
            setGeneratedPath(variation.path)
            toast.success(`Selected variation: ${variation.name}`)
          }}
        />
      )}
    </div>
  )
}
