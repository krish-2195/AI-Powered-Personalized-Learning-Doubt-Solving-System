import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles, Eye, EyeOff } from 'lucide-react'
import api from '../lib/api'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Invalid or missing reset token.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/api/auth/reset-password', { token, new_password: password })
      if (data.success === false) {
        throw new Error(data.error || data.message || 'Failed to reset password')
      }
      navigate('/login', { state: { message: 'Password reset successfully. Please log in with your new password.' } })
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
          <p className="font-semibold">Invalid Link</p>
          <p className="mt-1 text-sm text-red-400/80">This password reset link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary-500/25 blur-3xl floating" aria-hidden />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 glass-panel shadow-2xl p-8 sm:p-10">
        <div className="mb-8">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-lg border border-white/10">
            <Sparkles size={22} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create new password</h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Please enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-12 text-slate-100 placeholder-slate-500 transition-all focus:border-primary-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary-500/30 font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-primary-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary-500/30 font-medium"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 font-medium">{error}</p>
          )}

          <button type="submit" className="w-full rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200 active:bg-slate-300 hover:-translate-y-0.5 active:translate-y-0" disabled={loading}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
