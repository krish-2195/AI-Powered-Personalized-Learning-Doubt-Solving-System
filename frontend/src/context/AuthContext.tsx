import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../lib/api'

interface User {
  user_id: number
  email: string
  full_name: string
  streak_count: number
  longest_streak?: number
  role: string
  provider: string
  email_verified: boolean
  profile_picture?: string | null
  needs_onboarding?: boolean
  oauth_data?: any
}

interface AuthContextValue {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<User>
  register: (input: RegisterInput) => Promise<void>
  loginWithGoogle: (token: string) => Promise<User>
  loginWithGitHub: (code: string) => Promise<User>
  logout: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
  registerOAuth: (input: OAuthRegisterInput) => Promise<any>
  setToken: (token: string | null) => void
}

interface OAuthRegisterInput {
  email: string
  fullName: string
  provider: string
  providerUserId: string
  profilePicture?: string
  course: string
  subjects: string[]
  currentLevel: string
  examTarget: string
  examTimeline: string
}

interface RegisterInput {
  fullName: string
  email: string
  password: string
  course: string
  subjects: string[]
  currentLevel: string
  examTarget: string
  examTimeline: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  })
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem(USER_KEY)
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Listen for the auth_logout event triggered by the axios interceptor
  useEffect(() => {
    const handleLogoutEvent = () => {
      setToken(null)
      setUser(null)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
    window.addEventListener('auth_logout', handleLogoutEvent)
    return () => window.removeEventListener('auth_logout', handleLogoutEvent)
  }, [])

  useEffect(() => {
    if (token && user) {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  }, [token, user])

  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const { data } = await api.get('/api/auth/me')
          if (data.success === false) {
            // Let the interceptor handle 401s and token refresh
          } else if (data.data) {
             updateUser({
               role: data.data.role,
               streak_count: data.data.streak_count,
               longest_streak: data.data.longest_streak,
               email_verified: data.data.email_verified,
               provider: data.data.provider,
               profile_picture: data.data.profile_picture
             })
          }
        } catch {
          // If the interceptor couldn't refresh the token, it triggers auth_logout
        }
      }
    }
    verifySession()
  }, [])

  const _handleAuthSuccess = (data: any) => {
    setToken(data.data.token)
    const newUser = {
      user_id: data.data.user_id,
      email: data.data.email,
      full_name: data.data.full_name,
      role: data.data.role || 'student',
      streak_count: data.data.streak_count || 0,
      longest_streak: data.data.longest_streak || 0,
      provider: data.data.provider || 'email',
      email_verified: data.data.email_verified || false,
      profile_picture: data.data.profile_picture || null
    }
    setUser(newUser)
    return newUser
  }

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      if (data.success === false) {
        throw new Error(data.error || data.message || 'Login failed')
      }
      return _handleAuthSuccess(data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async (googleToken: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/api/auth/google', { token: googleToken })
      if (data.success === false) {
        throw new Error(data.error || data.message || 'Login failed')
      }
      if (data.data?.needs_onboarding) {
        return data.data
      }
      return _handleAuthSuccess(data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Google login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const loginWithGitHub = async (code: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/api/auth/github/callback?code=${code}`)
      if (data.success === false) {
        throw new Error(data.error || data.message || 'Login failed')
      }
      if (data.data?.needs_onboarding) {
        return data.data
      }
      return _handleAuthSuccess(data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'GitHub login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const registerOAuth = async (input: OAuthRegisterInput) => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        email: input.email,
        full_name: input.fullName,
        provider: input.provider,
        provider_user_id: input.providerUserId,
        profile_picture: input.profilePicture,
        course: input.course,
        subjects: input.subjects ?? [],
        current_level: input.currentLevel,
        exam_target: input.examTarget,
        exam_timeline: input.examTimeline,
      }
      const { data } = await api.post('/api/auth/register/oauth', payload)
      if (data.success === false) {
        throw new Error(data.error || data.message || 'Registration failed')
      }
      return _handleAuthSuccess(data)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const register = async (input: RegisterInput) => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        email: input.email,
        password: input.password,
        full_name: input.fullName,
        course: input.course,
        subjects: input.subjects ?? [],
        current_level: input.currentLevel,
        exam_target: input.examTarget,
        exam_timeline: input.examTimeline,
      }
      const { data } = await api.post('/api/auth/register', payload)
      if (data.success === false) {
        throw new Error(data.error || data.message || 'Registration failed')
      }
      // Registration no longer automatically logs in (email verification required)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
        await api.post('/api/auth/logout')
    } catch (err) {
        // Ignore errors on logout
    } finally {
        setToken(null)
        setUser(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
    }
  }

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null)
  }

  return (
    <AuthContext.Provider value={{ 
        token, user, loading, error, 
        login, register, registerOAuth, loginWithGoogle, loginWithGitHub, 
        logout, updateUser, setToken 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
