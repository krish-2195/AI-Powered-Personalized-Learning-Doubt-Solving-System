import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../lib/api'

interface User {
  user_id: number
  email: string
  full_name: string
  streak_count: number
  role: string
}

interface AuthContextValue {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
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
            logout()
          } else if (data.data) {
             // Sync latest role/streak on hard refresh
             updateUser({
               role: data.data.role,
               streak_count: data.data.streak_count
             })
          }
        } catch {
          logout()
        }
      }
    }
    verifySession()
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/api/auth/login', {
        email,
        password,
      })
      if (data.success === false) {
        throw new Error(data.error || data.message || 'Login failed')
      }
      setToken(data.data.token)
      const newUser = {
        user_id: data.data.user_id,
        email: data.data.email,
        full_name: data.data.full_name,
        role: data.data.role || 'student',
        streak_count: data.data.streak_count || 0,
      }
      setUser(newUser)
      return newUser
    } catch (err: any) {
      setError(err.message || 'Login failed')
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
      setToken(data.data.token)
      const newUser = {
        user_id: data.data.user_id,
        email: data.data.email,
        full_name: data.data.full_name,
        role: data.data.role || 'student',
        streak_count: data.data.streak_count || 0,
      }
      setUser(newUser)
      return newUser
    } catch (err: any) {
      setError(err.message || 'Registration failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.clear()
  }

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, error, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
