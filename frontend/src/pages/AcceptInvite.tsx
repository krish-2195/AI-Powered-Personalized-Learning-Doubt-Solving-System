import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles, User, Lock, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { setToken } = useAuth()

  const [formData, setFormData] = useState({
    full_name: '',
    password: '',
    confirm_password: ''
  })
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid or missing invitation token. Please check your email link.')
    }
  }, [token])

  const calculatePasswordStrength = (pwd: string) => {
    let score = 0
    if (pwd.length > 8) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[a-z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1
    return score
  }

  const getStrengthColor = (score: number) => {
    if (score === 0) return 'bg-slate-700'
    if (score <= 2) return 'bg-red-500'
    if (score <= 4) return 'bg-amber-500'
    return 'bg-emerald-500'
  }
  
  const getStrengthLabel = (score: number) => {
    if (score === 0) return ''
    if (score <= 2) return 'Weak'
    if (score <= 4) return 'Good'
    return 'Strong'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirm_password) {
      setStatus('error')
      setMessage('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setStatus('error')
      setMessage('Password must be at least 8 characters')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const response = await api.post('/api/auth/accept-invite', {
        token,
        full_name: formData.full_name,
        password: formData.password
      })

      setStatus('success')
      setMessage(response.data.message)
      
      // Auto login
      if (response.data.data.token) {
        setTimeout(() => {
          setToken(response.data.data.token)
          // Navigation will be handled by App.tsx routing logic once token is set
          // but we can force it here just in case
          const role = response.data.data.role
          if (role === 'admin' || role === 'super_admin') navigate('/admin')
          else if (role === 'instructor') navigate('/instructor')
          else navigate('/dashboard')
        }, 1500)
      }
    } catch (err: any) {
      setStatus('error')
      setMessage(err.response?.data?.message || 'Failed to accept invitation. The link may have expired.')
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md bg-surface-900 border border-red-500/20 p-8 rounded-3xl text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Invalid Invitation</h2>
          <p className="text-slate-400 text-sm mb-6">{message}</p>
          <button onClick={() => navigate('/login')} className="text-primary-400 hover:text-primary-300 font-medium">
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md bg-surface-900 border border-emerald-500/20 p-8 rounded-3xl text-center">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome Aboard!</h2>
          <p className="text-emerald-400 text-sm mb-6">{message}</p>
          <div className="flex justify-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-500 text-xs mt-4">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-600/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md z-10">
        <div className="bg-surface-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white mb-6 shadow-lg shadow-primary-500/25">
              <Sparkles size={32} />
            </div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Accept Invitation</h1>
            <p className="text-slate-400 mt-2 text-sm">
              Complete your profile to access your new account.
            </p>
          </div>

          {status === 'error' && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
              <ShieldCheck className="shrink-0 mt-0.5" size={16} />
              <p>{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-surface-950/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder:text-slate-600"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-surface-950/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
              
              {formData.password.length > 0 && (
                <div className="flex items-center gap-3 px-1 mt-2">
                  <div className="flex-1 flex gap-1 h-1">
                    {[1, 2, 3, 4, 5].map((level) => {
                      const score = calculatePasswordStrength(formData.password)
                      return (
                        <div 
                          key={level} 
                          className={`flex-1 rounded-full transition-colors duration-300 ${
                            level <= score ? getStrengthColor(score) : 'bg-slate-800'
                          }`}
                        />
                      )
                    })}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider w-12 text-right ${
                    getStrengthColor(calculatePasswordStrength(formData.password)).replace('bg-', 'text-')
                  }`}>
                    {getStrengthLabel(calculatePasswordStrength(formData.password))}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="password"
                  required
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  className="w-full bg-surface-950/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 group mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
