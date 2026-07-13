import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, Brain, Target, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const features = [
  { icon: Brain, text: 'AI-powered doubt solving in real time' },
  { icon: Target, text: 'Personalized study plans & weak-topic tracking' },
  { icon: TrendingUp, text: 'Exam readiness predictions that improve daily' },
]

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, error } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const sessionMessage = (location.state as { message?: string } | null)?.message

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const user = await login(formData.email, formData.password)
      if (user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch {
      /* error handled in context */
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />

      {/* Animated ambient orbs */}
      <motion.div
        animate={{ y: [0, -18, 0], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary-500/25 blur-3xl"
        aria-hidden
      />
      <motion.div
        animate={{ y: [0, 14, 0], opacity: [0.2, 0.32, 0.2] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="pointer-events-none absolute -right-16 bottom-6 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl"
        aria-hidden
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-white/10 glass-panel lg:grid-cols-2"
      >
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-700/60 via-primary-600/30 to-accent-600/40 p-10 lg:flex">
          {/* Inner glow orbs */}
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-4 bottom-20 h-20 w-20 rounded-full bg-accent-500/20 blur-2xl"
          />

          <div className="relative flex items-center gap-3">
            <div className="sparkle flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white shadow-[0_0_24px_rgba(255,255,255,0.15)]">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">AI Learn</h1>
              <p className="mt-1 text-xs text-white/70">Adaptive Learning Platform</p>
            </div>
          </div>

          <div className="relative space-y-6">
            <h2 className="text-3xl font-bold leading-tight text-white text-balance">
              Learn smarter with a tutor that adapts to you.
            </h2>
            <div className="space-y-4">
              {features.map(({ icon: Icon, text }, idx) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-3 text-sm text-white/90"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                    <Icon size={18} />
                  </div>
                  <span>{text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <p className="relative text-xs text-white/60">Trusted by focused learners preparing for exams.</p>
        </div>

        {/* Form panel */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="p-8 sm:p-10"
        >
          <div className="mb-8 lg:hidden">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white">
              <Sparkles size={22} />
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-400">Sign in to continue your learning journey.</p>
          </div>

          {sessionMessage && (
            <div className="mb-5 rounded-xl border border-primary-500/30 bg-primary-500/10 px-4 py-2.5 text-sm text-primary-200">
              {sessionMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100 placeholder-slate-600 transition-all duration-200 focus:border-primary-500/60 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:shadow-[0_0_0_1px_rgba(124,58,237,0.3)]"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 pr-12 text-slate-100 placeholder-slate-600 transition-all duration-200 focus:border-primary-500/60 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:shadow-[0_0_0_1px_rgba(124,58,237,0.3)]"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 transition-colors hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -1 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary w-full py-3 relative"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  {/* Spinning ring */}
                  <span className="block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-primary-300 transition-colors hover:text-primary-200">
              Sign up
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
