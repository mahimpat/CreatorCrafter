/**
 * Login Page
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn, AlertCircle } from 'lucide-react'
import './AuthPages.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>CreatorCrafter</h1>
          <p>AI-Powered Video Content Creation</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Welcome Back</h2>

          {error && (
            <div className="auth-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? (
              'Signing in...'
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
