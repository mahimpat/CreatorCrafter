/**
 * Authentication Context
 * Manages user authentication state across the application.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi, User } from '../api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token and fetch user on mount
    const token = localStorage.getItem('access_token')
    if (token) {
      authApi
        .getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          // Token invalid, clear it
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)

    localStorage.setItem('access_token', res.data.access_token)
    localStorage.setItem('refresh_token', res.data.refresh_token)

    const userRes = await authApi.getMe()
    setUser(userRes.data)
  }

  const register = async (email: string, username: string, password: string) => {
    await authApi.register(email, username, password)
    // Auto-login after registration
    await login(email, password)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
