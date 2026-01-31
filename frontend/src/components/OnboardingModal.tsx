/**
 * OnboardingModal - Multi-step onboarding wizard for new users
 */
import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles, Video, Wand2, Music, CheckCircle } from 'lucide-react'
import { usersApi } from '../api'
import './OnboardingModal.css'

interface OnboardingModalProps {
  isOpen: boolean
  onComplete: () => void
}

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to CreatorCrafter!',
    description: 'Your AI-powered video editing assistant. Create professional content with intelligent automation.',
    icon: <Sparkles size={48} />,
  },
  {
    id: 'upload',
    title: 'Upload Your Videos',
    description: 'Start by uploading your video clips. CreatorCrafter supports multiple clips that can be stitched together with smooth transitions.',
    icon: <Video size={48} />,
  },
  {
    id: 'analyze',
    title: 'AI Analysis',
    description: 'Our AI analyzes your content to understand scenes, detect emotions, and suggest the perfect edits. It finds the best moments for sound effects and transitions.',
    icon: <Wand2 size={48} />,
  },
  {
    id: 'sfx',
    title: 'Auto-Generate SFX',
    description: 'Get AI-generated sound effects that match your content. From dramatic impacts to ambient sounds, your video will come alive.',
    icon: <Music size={48} />,
  },
  {
    id: 'ready',
    title: "You're All Set!",
    description: 'Start creating amazing videos. Choose from Manual, Semi-Automatic, or Full Auto editing modes to match your workflow.',
    icon: <CheckCircle size={48} />,
  },
]

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)

  if (!isOpen) return null

  const step = ONBOARDING_STEPS[currentStep]
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1
  const isFirstStep = currentStep === 0

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await usersApi.completeOnboarding(ONBOARDING_STEPS.map(s => s.id))
      onComplete()
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      onComplete() // Still close, can retry later
    } finally {
      setIsCompleting(false)
    }
  }

  const handleSkip = async () => {
    await handleComplete()
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        {/* Skip button */}
        <button className="onboarding-skip" onClick={handleSkip}>
          Skip <X size={16} />
        </button>

        {/* Progress dots */}
        <div className="onboarding-progress">
          {ONBOARDING_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`progress-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
              onClick={() => setCurrentStep(idx)}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="onboarding-content">
          <div className="onboarding-icon">
            {step.icon}
          </div>
          <h2 className="onboarding-title">{step.title}</h2>
          <p className="onboarding-description">{step.description}</p>
        </div>

        {/* Navigation buttons */}
        <div className="onboarding-actions">
          {!isFirstStep && (
            <button className="onboarding-btn secondary" onClick={handlePrev}>
              <ChevronLeft size={20} />
              Back
            </button>
          )}
          <button
            className="onboarding-btn primary"
            onClick={handleNext}
            disabled={isCompleting}
          >
            {isLastStep ? (
              isCompleting ? 'Starting...' : 'Get Started'
            ) : (
              <>
                Next
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
