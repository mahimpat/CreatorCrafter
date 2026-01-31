/**
 * Main Application Component
 */
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import EditorPage from './pages/EditorPage'
import OnboardingModal from './components/OnboardingModal'
import ReviewModal from './components/ReviewModal'
import { useTimeTracking } from './hooks/useTimeTracking'
import { usersApi } from './api'
import './App.css'

/**
 * AppWrapper - Handles onboarding and review modals for authenticated users
 */
function AppWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  // Time tracking - only when authenticated
  const { shouldShowReview, markReviewShown } = useTimeTracking({
    enabled: isAuthenticated && onboardingChecked,
  })

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!isAuthenticated) {
        setOnboardingChecked(true)
        return
      }

      try {
        const response = await usersApi.getOnboardingStatus()
        if (!response.data.completed) {
          setShowOnboarding(true)
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error)
      } finally {
        setOnboardingChecked(true)
      }
    }

    checkOnboarding()
  }, [isAuthenticated])

  // Show review modal when time tracking says so
  useEffect(() => {
    if (shouldShowReview && !showOnboarding) {
      setShowReview(true)
    }
  }, [shouldShowReview, showOnboarding])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  const handleReviewClose = () => {
    setShowReview(false)
    markReviewShown()
  }

  const handleReviewSubmit = () => {
    setShowReview(false)
    markReviewShown()
  }

  return (
    <>
      {children}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
      <ReviewModal
        isOpen={showReview}
        onClose={handleReviewClose}
        onSubmit={handleReviewSubmit}
      />
    </>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return isAuthenticated ? <Navigate to="/dashboard" /> : <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/project/:projectId"
        element={
          <PrivateRoute>
            <EditorPage />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppWrapper>
          <div className="app">
            <AppRoutes />
          </div>
        </AppWrapper>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
