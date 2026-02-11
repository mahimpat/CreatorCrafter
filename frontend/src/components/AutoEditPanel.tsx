/**
 * AutoEditPanel - Advanced AI-powered automatic editing
 * Template-first workflow for professional auto-editing
 */
import { useState, useEffect } from 'react'
import {
  Wand2,
  Sparkles,
  Film,
  Music,
  Subtitles,
  RefreshCw,
  Play,
  AlertCircle,
  CheckCircle2,
  Scissors,
  Upload,
  ChevronRight,
  Clock,
  ArrowLeft,
  Zap
} from 'lucide-react'
import { aiApi, VideoClip, TemplateSettings } from '../api'
import type { AutoGenerateResult } from '../api/ai'
import TemplateSelector, { EditingTemplate } from './TemplateSelector'
import ClipsPanel from './ClipsPanel'
import './AutoEditPanel.css'

interface AutoEditPanelProps {
  projectId: number
  isAnalyzing: boolean
  hasClips: boolean
  hasAnalysis: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis?: any
  onAnalyze: () => void
  onComplete: () => void
  onPreview?: () => void
  clips?: VideoClip[]
  onClipsChange?: (clips: VideoClip[]) => void
  // Callbacks for applying template effects
  onSetIntroEffect?: (effect: { type: string; duration: number } | null) => void
  onSetOutroEffect?: (effect: { type: string; duration: number } | null) => void
}

type WorkflowStep = 'clips' | 'template' | 'analyze' | 'generate'
type GenerationStep = 'idle' | 'analyzing' | 'generating' | 'complete' | 'error'

// Map frontend pacing to backend pacing
const mapPacingStyle = (frontendPacing: string): TemplateSettings['pacing_style'] => {
  const mapping: Record<string, TemplateSettings['pacing_style']> = {
    'very_fast': 'fast',
    'fast': 'fast',
    'moderate': 'moderate',
    'slow': 'slow',
    'cinematic': 'slow'
  }
  return mapping[frontendPacing] || 'moderate'
}

// Map frontend caption style to backend
const mapCaptionStyle = (frontendCaption: string): TemplateSettings['caption_style'] => {
  const mapping: Record<string, TemplateSettings['caption_style']> = {
    'none': 'none',
    'minimal': 'minimal',
    'word_by_word': 'animated',
    'karaoke': 'karaoke',
    'bold_impact': 'bold',
    'subtitle': 'standard',
    'dynamic': 'animated'
  }
  return mapping[frontendCaption] || 'standard'
}

// Map frontend intro effect to backend
const mapIntroEffect = (effect: string): TemplateSettings['intro_effect'] => {
  const mapping: Record<string, TemplateSettings['intro_effect']> = {
    'none': 'none',
    'fade': 'fade_in',
    'fade_in': 'fade_in',
    'zoom': 'zoom_in',
    'zoom_in': 'zoom_in',
    'slide': 'slide_in',
    'slide_in': 'slide_in',
    'glitch': 'glitch_in',
    'glitch_in': 'glitch_in',
    'flash': 'flash_in',
    'flash_in': 'flash_in'
  }
  return mapping[effect] || 'none'
}

// Map frontend outro effect to backend
const mapOutroEffect = (effect: string): TemplateSettings['outro_effect'] => {
  const mapping: Record<string, TemplateSettings['outro_effect']> = {
    'none': 'none',
    'fade': 'fade_out',
    'fade_out': 'fade_out',
    'zoom': 'zoom_out',
    'zoom_out': 'zoom_out',
    'slide': 'slide_out',
    'slide_out': 'slide_out',
    'glitch': 'glitch_out',
    'glitch_out': 'glitch_out',
    'flash': 'flash_out',
    'flash_out': 'flash_out'
  }
  return mapping[effect] || 'none'
}

interface GenerationProgress {
  step: GenerationStep
  stage: string
  progress: number
  message: string
  result?: AutoGenerateResult
  error?: string
}

export default function AutoEditPanel({
  projectId,
  isAnalyzing,
  hasClips,
  hasAnalysis,
  analysis,
  onAnalyze,
  onComplete,
  onPreview,
  clips = [],
  onClipsChange,
  onSetIntroEffect,
  onSetOutroEffect
}: AutoEditPanelProps) {
  // Template selection (first step - most important!)
  const [selectedTemplate, setSelectedTemplate] = useState<EditingTemplate | null>(null)

  // Workflow step tracking - start with clips upload
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('clips')

  // Generation progress
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    step: 'idle',
    stage: '',
    progress: 0,
    message: ''
  })

  // Determine current step based on state
  // NEW ORDER: Clips → Template → Analyze → Generate
  // User uploads clips first, then chooses template
  useEffect(() => {
    if (generationProgress.step !== 'idle') return // Don't change during generation

    // If user is on clips step, let them stay there to add more clips
    // They'll click "Continue" to manually advance
    if (currentStep === 'clips') {
      return // Don't auto-advance from clips step
    }

    // If user is on template step, let them stay there
    // They'll click "Continue" to manually advance
    if (currentStep === 'template') {
      return // Don't auto-advance from template step
    }

    // Only auto-advance to analyze/generate if we're already past clips & template
    if (currentStep === 'analyze' || currentStep === 'generate') {
      // If not analyzed yet, stay on analyze step
      if (!hasAnalysis) {
        setCurrentStep('analyze')
        return
      }
      // Analysis complete, go to generate step
      setCurrentStep('generate')
    }
  }, [selectedTemplate, hasClips, hasAnalysis, clips.length, generationProgress.step, currentStep])

  // Listen for WebSocket progress updates
  useEffect(() => {
    const handleWebSocketMessage = (event: CustomEvent) => {
      const data = event.detail
      if (data.type === 'auto_generate') {
        setGenerationProgress({
          step: 'generating',
          stage: data.stage,
          progress: data.progress,
          message: data.message
        })
      } else if (data.type === 'auto_generate_complete') {
        const result = data.result as AutoGenerateResult
        setGenerationProgress({
          step: 'complete',
          stage: 'done',
          progress: 100,
          message: 'Generation complete!',
          result: result
        })

        // Apply intro/outro effects from template
        if (result?.intro_effect && result?.intro_duration) {
          onSetIntroEffect?.({
            type: result.intro_effect,
            duration: result.intro_duration
          })
        }
        if (result?.outro_effect && result?.outro_duration) {
          onSetOutroEffect?.({
            type: result.outro_effect,
            duration: result.outro_duration
          })
        }

        onComplete()
      } else if (data.type === 'auto_generate_error') {
        setGenerationProgress({
          step: 'error',
          stage: 'error',
          progress: 0,
          message: data.error || 'An error occurred',
          error: data.error
        })
      }
    }

    window.addEventListener('ws-progress', handleWebSocketMessage as EventListener)
    return () => window.removeEventListener('ws-progress', handleWebSocketMessage as EventListener)
  }, [onComplete])

  const handleAutoGenerate = async () => {
    if (!selectedTemplate) return

    setGenerationProgress({
      step: 'generating',
      stage: 'starting',
      progress: 0,
      message: 'Starting auto-generation...'
    })

    try {
      const settings = selectedTemplate.settings
      await aiApi.autoGenerate(projectId, {
        include_subtitles: settings.captionsEnabled,
        include_sfx: settings.whooshOnTransitions || settings.impactOnCuts,
        include_transitions: true,
        sfx_confidence_threshold: 0.5,
        max_sfx_count: Math.round(settings.aiEnhancementLevel * 15),
        // Pass template settings to backend (with proper type mapping)
        template_id: selectedTemplate.id,
        template_settings: {
          intro_effect: mapIntroEffect(settings.introEffect),
          intro_duration: settings.introDuration,
          outro_effect: mapOutroEffect(settings.outroEffect),
          outro_duration: settings.outroDuration,
          transition_types: selectedTemplate.transitionTypes,
          pacing_style: mapPacingStyle(selectedTemplate.pacingStyle),
          min_clip_duration: settings.minClipDuration,
          max_clip_duration: settings.maxClipDuration,
          music_mood: selectedTemplate.musicMood,
          caption_style: mapCaptionStyle(selectedTemplate.captionStyle),
          energy_level: selectedTemplate.energyLevel
        }
      })
    } catch (error) {
      console.error('Auto-generate failed:', error)
      setGenerationProgress({
        step: 'error',
        stage: 'error',
        progress: 0,
        message: 'Failed to start auto-generation',
        error: String(error)
      })
    }
  }

  // Render step indicator
  // NEW ORDER: Clips → Style → Analyze → Generate
  const renderStepIndicator = () => {
    const steps = [
      { id: 'clips', label: 'Clips', icon: <Film size={14} /> },
      { id: 'template', label: 'Style', icon: <Wand2 size={14} /> },
      { id: 'analyze', label: 'Analyze', icon: <Sparkles size={14} /> },
      { id: 'generate', label: 'Generate', icon: <Zap size={14} /> }
    ]

    const getStepStatus = (stepId: string) => {
      const stepOrder = ['clips', 'template', 'analyze', 'generate']
      const currentIndex = stepOrder.indexOf(currentStep)
      const stepIndex = stepOrder.indexOf(stepId)

      if (stepId === 'clips' && hasClips && clips.length > 0 && currentIndex > 0) return 'completed'
      if (stepId === 'template' && selectedTemplate && currentIndex > 1) return 'completed'
      if (stepId === 'analyze' && hasAnalysis) return 'completed'
      if (stepIndex < currentIndex) return 'completed'
      if (stepIndex === currentIndex) return 'active'
      return 'pending'
    }

    // Allow clicking on completed steps to go back
    const handleStepClick = (stepId: WorkflowStep) => {
      const stepOrder = ['clips', 'template', 'analyze', 'generate']
      const currentIndex = stepOrder.indexOf(currentStep)
      const stepIndex = stepOrder.indexOf(stepId)

      // Can only go back to previous steps
      if (stepIndex < currentIndex) {
        setCurrentStep(stepId)
      }
    }

    return (
      <div className="step-indicator">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`step-item ${getStepStatus(step.id)} ${getStepStatus(step.id) === 'completed' ? 'clickable' : ''}`}
            onClick={() => getStepStatus(step.id) === 'completed' && handleStepClick(step.id as WorkflowStep)}
          >
            <div className="step-dot">
              {getStepStatus(step.id) === 'completed' ? (
                <CheckCircle2 size={16} />
              ) : (
                step.icon
              )}
            </div>
            <span className="step-label">{step.label}</span>
            {idx < steps.length - 1 && <div className="step-connector" />}
          </div>
        ))}
      </div>
    )
  }

  // STEP 1: Upload Clips (NEW: Clips first, then template)
  if (currentStep === 'clips' && generationProgress.step === 'idle') {
    return (
      <div className="auto-edit-panel">
        {renderStepIndicator()}

        <div className="step-content">
          <div className="step-header-large">
            <div className="step-icon-circle">
              <Upload size={28} />
            </div>
            <h2>Upload Your Clips</h2>
            <p>Add all the video clips you want to include in your final video. You can upload multiple clips before continuing.</p>
          </div>

          {clips.length > 0 && (
            <div className="clips-status">
              <CheckCircle2 size={18} className="success" />
              <span>{clips.length} clip{clips.length !== 1 ? 's' : ''} added - add more or click Continue</span>
            </div>
          )}

          <div className="clips-container">
            <ClipsPanel
              projectId={projectId}
              clips={clips}
              onClipsChange={onClipsChange || (() => {})}
              compact
            />
          </div>
        </div>

        {clips.length > 0 && (
          <div className="step-footer">
            <button
              className="next-step-btn"
              onClick={() => setCurrentStep('template')}
            >
              Continue with {clips.length} clip{clips.length !== 1 ? 's' : ''}
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    )
  }

  // STEP 2: Template Selection (After clips are uploaded)
  if (currentStep === 'template' && generationProgress.step === 'idle') {
    return (
      <div className="auto-edit-panel">
        {renderStepIndicator()}

        {/* Clips summary - clickable to go back */}
        <div className="selected-template-bar" onClick={() => setCurrentStep('clips')}>
          <div className="template-summary">
            <Film size={16} />
            <span>{clips.length} clip{clips.length !== 1 ? 's' : ''} uploaded</span>
          </div>
          <button className="change-btn">Add More</button>
        </div>

        <TemplateSelector
          selectedTemplate={selectedTemplate}
          onSelectTemplate={setSelectedTemplate}
        />

        <div className="step-footer">
          <button className="back-btn" onClick={() => setCurrentStep('clips')}>
            <ArrowLeft size={16} />
            Back
          </button>
          {selectedTemplate && (
            <button
              className="next-step-btn"
              onClick={() => setCurrentStep('analyze')}
            >
              Continue with {selectedTemplate.name}
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // STEP 3: Analyze
  if (currentStep === 'analyze' && generationProgress.step === 'idle') {
    return (
      <div className="auto-edit-panel">
        {renderStepIndicator()}

        {/* Completed steps summary - NEW ORDER: clips first, then template */}
        <div className="completed-summary">
          <div className="summary-item" onClick={() => setCurrentStep('clips')}>
            <Film size={16} />
            <span>{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="summary-item" onClick={() => setCurrentStep('template')}>
            <Wand2 size={16} />
            <span>{selectedTemplate?.name}</span>
          </div>
        </div>

        <div className="step-content">
          <div className="step-header-large">
            <div className="step-icon-circle analyzing">
              {isAnalyzing ? <RefreshCw size={28} className="spin" /> : <Sparkles size={28} />}
            </div>
            <h2>{isAnalyzing ? 'Analyzing...' : 'Analyze Your Content'}</h2>
            <p>
              {isAnalyzing
                ? 'AI is detecting scenes, speech, and optimal edit points'
                : 'AI will analyze your clips to understand the content and suggest edits'}
            </p>
          </div>

          {isAnalyzing ? (
            <div className="analyze-progress">
              <div className="progress-bar">
                <div className="progress indeterminate" />
              </div>
              <div className="analyze-tasks">
                <div className="task active">
                  <RefreshCw size={14} className="spin" />
                  <span>Detecting scenes and content...</span>
                </div>
                <div className="task">
                  <Clock size={14} />
                  <span>Transcribing speech...</span>
                </div>
                <div className="task">
                  <Clock size={14} />
                  <span>Finding highlight moments...</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              className="analyze-btn-large"
              onClick={onAnalyze}
              disabled={isAnalyzing}
            >
              <Sparkles size={20} />
              Start Analysis
            </button>
          )}
        </div>

        {!isAnalyzing && (
          <div className="step-footer">
            <button className="back-btn" onClick={() => setCurrentStep('clips')}>
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        )}
      </div>
    )
  }

  // STEP 4: Generate (analysis complete)
  if (currentStep === 'generate' && generationProgress.step === 'idle') {
    return (
      <div className="auto-edit-panel">
        {renderStepIndicator()}

        {/* Completed steps summary - NEW ORDER: clips first, then template */}
        <div className="completed-summary">
          <div className="summary-item" onClick={() => setCurrentStep('clips')}>
            <Film size={16} />
            <span>{clips.length} clip{clips.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="summary-item" onClick={() => setCurrentStep('template')}>
            <Wand2 size={16} />
            <span>{selectedTemplate?.name}</span>
          </div>
          <div className="summary-item completed">
            <CheckCircle2 size={16} />
            <span>Analyzed</span>
          </div>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="analysis-results">
            <h3>AI Analysis Complete</h3>
            <div className="results-grid">
              {analysis.transcription && analysis.transcription.length > 0 && (
                <div className="result-card">
                  <Subtitles size={24} />
                  <span className="result-count">{analysis.transcription.length}</span>
                  <span className="result-label">Speech segments</span>
                </div>
              )}
              {analysis.suggestedSFX && analysis.suggestedSFX.length > 0 && (
                <div className="result-card">
                  <Music size={24} />
                  <span className="result-count">{analysis.suggestedSFX.length}</span>
                  <span className="result-label">Sound effects</span>
                </div>
              )}
              {analysis.suggestedTransitions && analysis.suggestedTransitions.length > 0 && (
                <div className="result-card">
                  <Scissors size={24} />
                  <span className="result-count">{analysis.suggestedTransitions.length}</span>
                  <span className="result-label">Transitions</span>
                </div>
              )}
              {analysis.scenes && analysis.scenes.length > 0 && (
                <div className="result-card">
                  <Film size={24} />
                  <span className="result-count">{analysis.scenes.length}</span>
                  <span className="result-label">Scenes</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Template Preview */}
        {selectedTemplate && (
          <div className="template-preview-card">
            <h4>Your video will be created with:</h4>
            <div className="preview-grid">
              <div className="preview-item">
                <span className="preview-label">Style</span>
                <span className="preview-value">{selectedTemplate.name}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Pacing</span>
                <span className="preview-value">{selectedTemplate.pacingStyle.replace('_', ' ')}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Music Mood</span>
                <span className="preview-value">{selectedTemplate.musicMood}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Captions</span>
                <span className="preview-value">
                  {selectedTemplate.settings.captionsEnabled ? selectedTemplate.captionStyle.replace('_', ' ') : 'Off'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="generate-section">
          <button className="generate-btn-large" onClick={handleAutoGenerate}>
            <Wand2 size={24} />
            <span>Generate Video</span>
          </button>
          <p className="generate-hint">
            AI will create your video using the {selectedTemplate?.name} template
          </p>
        </div>
      </div>
    )
  }

  // GENERATION IN PROGRESS
  if (generationProgress.step === 'generating') {
    return (
      <div className="auto-edit-panel generating">
        <div className="generating-content">
          <div className="generating-animation">
            <div className="spinner-ring" />
            <Wand2 size={32} className="center-icon" />
          </div>

          <h2>Creating Your Video</h2>
          <p className="generating-message">{generationProgress.message}</p>

          <div className="progress-container">
            <div className="progress-bar-large">
              <div
                className="progress-fill"
                style={{ width: `${generationProgress.progress}%` }}
              />
            </div>
            <span className="progress-percent">{generationProgress.progress}%</span>
          </div>

          <div className="generation-stages">
            <div className={`stage ${generationProgress.stage === 'subtitles' || generationProgress.progress >= 25 ? 'active' : ''} ${generationProgress.progress >= 40 ? 'completed' : ''}`}>
              <Subtitles size={18} />
              <span>Captions</span>
            </div>
            <div className={`stage ${generationProgress.stage === 'sfx' || generationProgress.progress >= 50 ? 'active' : ''} ${generationProgress.progress >= 70 ? 'completed' : ''}`}>
              <Music size={18} />
              <span>Sound Effects</span>
            </div>
            <div className={`stage ${generationProgress.stage === 'transitions' || generationProgress.progress >= 75 ? 'active' : ''} ${generationProgress.progress >= 95 ? 'completed' : ''}`}>
              <Scissors size={18} />
              <span>Transitions</span>
            </div>
          </div>

          {selectedTemplate && (
            <div className="template-badge">
              <Wand2 size={14} />
              <span>{selectedTemplate.name}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // GENERATION COMPLETE
  if (generationProgress.step === 'complete') {
    const result = generationProgress.result
    return (
      <div className="auto-edit-panel complete">
        <div className="complete-content">
          <div className="success-animation">
            <CheckCircle2 size={64} />
          </div>

          <h2>Your Video is Ready!</h2>
          <p>AI has automatically edited your video</p>

          {result && (
            <div className="result-stats">
              <div className="stat">
                <Subtitles size={20} />
                <span className="stat-value">{result.subtitles_created}</span>
                <span className="stat-label">Captions</span>
              </div>
              <div className="stat">
                <Music size={20} />
                <span className="stat-value">{result.sfx_generated}</span>
                <span className="stat-label">Sound Effects</span>
              </div>
              <div className="stat">
                <Scissors size={20} />
                <span className="stat-value">{result.transitions_created}</span>
                <span className="stat-label">Transitions</span>
              </div>
            </div>
          )}

          <button
            className="preview-btn-large"
            onClick={() => {
              onPreview?.()
              setGenerationProgress({ step: 'idle', stage: '', progress: 0, message: '' })
            }}
          >
            <Play size={22} />
            <span>Preview Your Video</span>
          </button>

          <button
            className="regenerate-btn"
            onClick={() => {
              setGenerationProgress({ step: 'idle', stage: '', progress: 0, message: '' })
              setCurrentStep('template')
            }}
          >
            <RefreshCw size={16} />
            Start Over with Different Style
          </button>
        </div>
      </div>
    )
  }

  // GENERATION ERROR
  if (generationProgress.step === 'error') {
    return (
      <div className="auto-edit-panel error">
        <div className="error-content">
          <div className="error-icon">
            <AlertCircle size={64} />
          </div>
          <h2>Something Went Wrong</h2>
          <p>{generationProgress.error || 'An error occurred during generation'}</p>
          <button
            className="retry-btn"
            onClick={() => {
              setGenerationProgress({ step: 'idle', stage: '', progress: 0, message: '' })
            }}
          >
            <RefreshCw size={18} />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return null
}
