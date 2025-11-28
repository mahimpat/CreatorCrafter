import { useState, useEffect, useRef } from 'react'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import './OnboardingTour.css'

interface TourStep {
    target: string // CSS selector
    title: string
    content: string
    position: 'top' | 'bottom' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
    {
        target: '.editor-left-sidebar',
        title: 'Project & Assets',
        content: 'Manage your media, overlays, and project files here. Switch tabs to access different libraries.',
        position: 'right'
    },
    {
        target: '.video-player-container',
        title: 'Video Preview',
        content: 'Watch your video here. Use the controls to play, pause, and seek through your timeline.',
        position: 'left'
    },
    {
        target: '.timeline-container',
        title: 'Timeline',
        content: 'This is where the magic happens. Drag and drop clips, trim videos, and arrange your story.',
        position: 'top'
    },
    {
        target: '.side-panel',
        title: 'Creative Tools',
        content: 'Access AI features, SFX library, subtitles, and more from this sidebar.',
        position: 'left'
    },
    {
        target: '.top-bar-right',
        title: 'Export & Settings',
        content: 'When you are done, export your video here. You can also configure AI settings.',
        position: 'bottom'
    }
]

interface OnboardingTourProps {
    isOpen: boolean
    onClose: () => void
    onComplete: () => void
}

export default function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

    // Reset step when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0)
        }
    }, [isOpen])

    // Update position when step changes or window resizes
    useEffect(() => {
        if (!isOpen) return

        const updatePosition = () => {
            const step = TOUR_STEPS[currentStep]
            const element = document.querySelector(step.target)

            if (element) {
                const rect = element.getBoundingClientRect()
                setPosition({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                })

                // Scroll element into view if needed
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else {
                // If element not found, skip to next step or close if it's the last one
                if (currentStep < TOUR_STEPS.length - 1) {
                    setCurrentStep(prev => prev + 1)
                } else {
                    onClose()
                }
            }
        }

        // Small delay to ensure UI is rendered
        const timer = setTimeout(updatePosition, 100)
        window.addEventListener('resize', updatePosition)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', updatePosition)
        }
    }, [currentStep, isOpen])

    if (!isOpen || !position) return null

    const step = TOUR_STEPS[currentStep]
    const isLastStep = currentStep === TOUR_STEPS.length - 1

    const handleNext = () => {
        if (isLastStep) {
            onComplete()
        } else {
            setCurrentStep(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        }
    }

    // Calculate tooltip position
    const getTooltipStyle = () => {
        const gap = 16
        let top = 0
        let left = 0

        switch (step.position) {
            case 'top':
                top = position.top - gap
                left = position.left + position.width / 2
                break
            case 'bottom':
                top = position.top + position.height + gap
                left = position.left + position.width / 2
                break
            case 'left':
                top = position.top + position.height / 2
                left = position.left - gap
                break
            case 'right':
                top = position.top + position.height / 2
                left = position.left + position.width + gap
                break
        }

        return {
            top,
            left,
            transform: step.position === 'top' || step.position === 'bottom'
                ? 'translateX(-50%)'
                : 'translateY(-50%)'
        }
    }

    return (
        <div className="tour-overlay">
            {/* Spotlight effect using SVG mask */}
            <svg className="tour-mask" width="100%" height="100%">
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <rect
                            x={position.left - 4}
                            y={position.top - 4}
                            width={position.width + 8}
                            height={position.height + 8}
                            rx="8"
                            fill="black"
                        />
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.7)"
                    mask="url(#spotlight-mask)"
                />

                {/* Highlight border */}
                <rect
                    x={position.left - 4}
                    y={position.top - 4}
                    width={position.width + 8}
                    height={position.height + 8}
                    rx="8"
                    fill="none"
                    stroke="var(--accent-color)"
                    strokeWidth="2"
                    className="tour-highlight-border"
                />
            </svg>

            {/* Tooltip */}
            <div
                className={`tour-tooltip tour-tooltip-${step.position}`}
                style={getTooltipStyle() as any}
            >
                <button className="tour-close" onClick={onClose}>
                    <X size={16} />
                </button>

                <div className="tour-content">
                    <h3>{step.title}</h3>
                    <p>{step.content}</p>
                </div>

                <div className="tour-footer">
                    <div className="tour-progress">
                        {currentStep + 1} / {TOUR_STEPS.length}
                    </div>
                    <div className="tour-buttons">
                        <button
                            className="tour-btn-secondary"
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            className="tour-btn-primary"
                            onClick={handleNext}
                        >
                            {isLastStep ? (
                                <>
                                    <span>Finish</span>
                                    <Check size={16} />
                                </>
                            ) : (
                                <>
                                    <span>Next</span>
                                    <ChevronRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
