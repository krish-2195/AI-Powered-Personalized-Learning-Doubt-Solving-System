import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowLeft, Mail } from 'lucide-react'
import api from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email })
      if (data.success === false) {
        throw new Error(data.error || data.message || 'Failed to request password reset')
      }
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary-500/25 blur-3xl floating" aria-hidden />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 glass-panel shadow-2xl p-8 sm:p-10">
        <Link to="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white">
          <ArrowLeft size={16} /> Back to login
        </Link>
        
        <div className="mb-8">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-lg border border-white/10">
            <Sparkles size={22} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset password</h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Mail size={24} />
            </div>
            <h3 className="mb-1 font-semibold text-emerald-300">Check your email</h3>
            <p className="text-sm text-emerald-200/70">
              We've sent a password reset link to <br/><span className="font-medium text-emerald-200">{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                required
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-primary-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-primary-500/30 font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 font-medium">{error}</p>
            )}

            <button type="submit" className="w-full rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200 active:bg-slate-300 hover:-translate-y-0.5 active:translate-y-0" disabled={loading}>
              {loading ? 'Sending link…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
