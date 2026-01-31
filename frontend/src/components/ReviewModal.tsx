/**
 * ReviewModal - Quick survey for idea validation
 * Shown after user spends 15+ minutes in the app
 */
import { useState } from 'react'
import { X, Star, Send, Heart, MessageSquare, Lightbulb, AlertCircle } from 'lucide-react'
import { usersApi } from '../api'
import './ReviewModal.css'

interface ReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
}

export default function ReviewModal({ isOpen, onClose, onSubmit }: ReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null)
  const [feedback, setFeedback] = useState('')
  const [useCase, setUseCase] = useState('')
  const [featureRequest, setFeatureRequest] = useState('')
  const [painPoints, setPainPoints] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (rating === 0) return

    setIsSubmitting(true)
    try {
      await usersApi.submitReview({
        rating,
        feedback: feedback || undefined,
        would_recommend: wouldRecommend ?? undefined,
        use_case: useCase || undefined,
        feature_request: featureRequest || undefined,
        pain_points: painPoints || undefined,
      })
      setShowThankYou(true)
      setTimeout(() => {
        onSubmit()
      }, 2000)
    } catch (error) {
      console.error('Failed to submit review:', error)
      // Still close on error
      onSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDismiss = async () => {
    try {
      await usersApi.dismissReview()
    } catch (error) {
      console.error('Failed to dismiss review:', error)
    }
    onClose()
  }

  if (showThankYou) {
    return (
      <div className="review-overlay">
        <div className="review-modal thank-you">
          <div className="thank-you-content">
            <Heart size={64} className="thank-you-icon" />
            <h2>Thank You!</h2>
            <p>Your feedback helps us build a better product.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="review-overlay">
      <div className="review-modal">
        <button className="review-close" onClick={handleDismiss}>
          <X size={20} />
        </button>

        <div className="review-header">
          <MessageSquare size={32} className="review-header-icon" />
          <h2>Quick Feedback</h2>
          <p>Help us improve CreatorCrafter (takes 30 seconds)</p>
        </div>

        <div className="review-content">
          {/* Star Rating */}
          <div className="review-section">
            <label>How would you rate your experience so far?</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`star-btn ${star <= (hoverRating || rating) ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star size={32} fill={star <= (hoverRating || rating) ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <span className="rating-label">
                {rating === 1 && 'Needs work'}
                {rating === 2 && 'Could be better'}
                {rating === 3 && 'It\'s okay'}
                {rating === 4 && 'Pretty good!'}
                {rating === 5 && 'Love it!'}
              </span>
            )}
          </div>

          {/* Would Recommend */}
          <div className="review-section">
            <label>Would you recommend CreatorCrafter to a friend?</label>
            <div className="recommend-buttons">
              <button
                className={`recommend-btn ${wouldRecommend === true ? 'active yes' : ''}`}
                onClick={() => setWouldRecommend(true)}
              >
                Yes, definitely!
              </button>
              <button
                className={`recommend-btn ${wouldRecommend === false ? 'active no' : ''}`}
                onClick={() => setWouldRecommend(false)}
              >
                Not yet
              </button>
            </div>
          </div>

          {/* Use Case */}
          <div className="review-section">
            <label>
              <Lightbulb size={16} />
              What do you primarily use CreatorCrafter for?
            </label>
            <input
              type="text"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              placeholder="e.g., YouTube shorts, TikTok, marketing videos..."
              maxLength={200}
            />
          </div>

          {/* Feature Request */}
          <div className="review-section">
            <label>What feature would you love to see next?</label>
            <input
              type="text"
              value={featureRequest}
              onChange={(e) => setFeatureRequest(e.target.value)}
              placeholder="e.g., More transitions, voice-over, templates..."
              maxLength={200}
            />
          </div>

          {/* Pain Points */}
          <div className="review-section">
            <label>
              <AlertCircle size={16} />
              Any frustrations or issues we should fix?
            </label>
            <textarea
              value={painPoints}
              onChange={(e) => setPainPoints(e.target.value)}
              placeholder="Let us know what's not working well..."
              maxLength={500}
              rows={2}
            />
          </div>

          {/* General Feedback */}
          <div className="review-section">
            <label>Any other thoughts? (optional)</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your experience..."
              maxLength={1000}
              rows={2}
            />
          </div>
        </div>

        <div className="review-actions">
          <button className="review-btn secondary" onClick={handleDismiss}>
            Maybe Later
          </button>
          <button
            className="review-btn primary"
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
          >
            {isSubmitting ? 'Sending...' : (
              <>
                Submit Feedback
                <Send size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
