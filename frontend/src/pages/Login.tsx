import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, Brain, Target, TrendingUp, Github, ChevronDown, ChevronUp, Mail, KeyRound, Smartphone, Fingerprint } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useGoogleLogin } from '@react-oauth/google'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle, loading, error } = useAuth()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showOtherOptions, setShowOtherOptions] = useState(false)
  const sessionMessage = (location.state as { message?: string } | null)?.message

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const user = await login(formData.email, formData.password)
      if (user.role === 'admin' || user.role === 'super_admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch {
      /* error handled in context */
    }
  }

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await loginWithGoogle(tokenResponse.access_token)
        if (response.needs_onboarding) {
          navigate('/register', { state: { oauthData: response.oauth_data } })
        } else if (response.role === 'admin' || response.role === 'super_admin') {
          navigate('/admin')
        } else {
          navigate('/dashboard')
        }
      } catch {
        /* error handled in context */
      }
    },
    onError: () => {
      console.error('Google Login Failed')
    }
  });

  const handleOAuthLogin = (provider: 'github' | 'microsoft' | 'apple') => {
    // Redirect to backend to start OAuth flow
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
    window.location.href = `${apiUrl}/api/auth/${provider}/url`
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary-500/25 blur-3xl floating" aria-hidden />
      <div className="pointer-events-none absolute -right-16 bottom-6 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl floating" aria-hidden />

      <div className="relative grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-white/10 glass-panel lg:grid-cols-2 shadow-2xl">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-700/60 via-primary-600/30 to-accent-600/40 p-10 lg:flex">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="sparkle flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg shadow-white/5 border border-white/10">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none tracking-tight">AI Learn</h1>
              <p className="mt-1 text-xs text-white/70 font-medium">Adaptive Learning Platform</p>
            </div>
          </div>

          <div className="relative space-y-6">
            <h2 className="text-3xl font-bold leading-tight text-white text-balance tracking-tight">
              Learn smarter with a tutor that adapts to you.
            </h2>
            <div className="space-y-4">
              {[
                { icon: Brain, text: 'AI-powered doubt solving in real time' },
                { icon: Target, text: 'Personalized study plans & weak-topic tracking' },
                { icon: TrendingUp, text: 'Exam readiness predictions that improve daily' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-white/90">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/5">
                    <Icon size={18} />
                  </div>
                  <span className="font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs text-white/50 font-medium tracking-wide uppercase">Trusted by focused learners.</p>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-lg border border-white/10">
              <Sparkles size={22} />
            </div>
          </div>
          
          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-400">Sign in to continue your learning journey.</p>
          </div>

          {sessionMessage && (
            <div className="mb-5 rounded-xl border border-glow-500/30 bg-glow-500/10 px-4 py-3 text-sm text-glow-200 flex items-center justify-center font-medium">
              {sessionMessage}
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <button
              onClick={() => handleGoogleLogin()}
              disabled={loading}
              className="group flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200 transition-all hover:bg-white/[0.08] hover:border-white/20 hover:text-white disabled:opacity-50 shadow-sm"
            >
              <svg className="h-5 w-5 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button
              onClick={() => handleOAuthLogin('github')}
              type="button"
              className="group flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200 transition-all hover:bg-white/[0.08] hover:border-white/20 hover:text-white shadow-sm"
            >
              <Github size={20} className="shrink-0 transition-transform group-hover:scale-105" />
              GitHub
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs font-medium uppercase tracking-wider">
              <span className="bg-slate-900 px-3 text-slate-500">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="sr-only">Email Address</label>
              <input
                type="email"
                required
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-primary-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary-500/30 font-medium"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
              />
            </div>

            <div>
              <label className="sr-only">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-12 text-slate-100 placeholder-slate-500 transition-all focus:border-primary-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary-500/30 font-medium"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition-colors hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 font-medium flex items-center justify-center text-center">{error}</p>
            )}

            <button type="submit" className="w-full rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200 active:bg-slate-300 hover:-translate-y-0.5 active:translate-y-0" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-medium text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary-400 transition-colors hover:text-primary-300">
              Sign up
            </Link>
          </p>

          <div className="mt-8 border-t border-white/10 pt-6">
            <button
              onClick={() => setShowOtherOptions(!showOtherOptions)}
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
            >
              Other Login Options
              {showOtherOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            <div className={`mt-4 grid gap-3 transition-all duration-300 ease-in-out ${showOtherOptions ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden flex flex-col gap-2">
                {[
                  { name: 'Microsoft', icon: 'M', comingSoon: true },
                  { name: 'Apple', icon: '', comingSoon: true },
                  { name: 'Email OTP', icon: <Mail size={16} />, comingSoon: true },
                  { name: 'Magic Link', icon: <KeyRound size={16} />, comingSoon: true },
                  { name: 'Phone OTP', icon: <Smartphone size={16} />, comingSoon: true },
                  { name: 'Passkey / Biometrics', icon: <Fingerprint size={16} />, comingSoon: true },
                ].map((option) => (
                  <button 
                    key={option.name}
                    disabled
                    className="flex items-center justify-between w-full rounded-lg border border-white/5 bg-white/[0.01] px-4 py-2.5 text-sm font-medium text-slate-500 opacity-60 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      {typeof option.icon === 'string' ? (
                        <span className="font-bold text-base w-4 text-center">{option.icon}</span>
                      ) : (
                        <span className="w-4 flex justify-center">{option.icon}</span>
                      )}
                      <span>Continue with {option.name}</span>
                    </div>
                    {option.comingSoon && (
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-white/5 px-2 py-0.5 rounded-full text-slate-400">Soon</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
