import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import api from '../lib/api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No verification token provided.')
      return
    }

    const verify = async () => {
      try {
        const { data } = await api.post('/api/auth/verify-email', { token, new_password: "" }) // using generic payload for simplicity
        if (data.success === false) {
          throw new Error(data.error || 'Verification failed')
        }
        setStatus('success')
        setTimeout(() => {
          navigate('/login', { state: { message: 'Email verified successfully! You can now sign in.' } })
        }, 3000)
      } catch (err: any) {
        setStatus('error')
        setErrorMsg(err.response?.data?.error || err.message || 'Verification failed')
      }
    }

    verify()
  }, [token, navigate])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />

      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 glass-panel shadow-2xl p-8 text-center">
        {status === 'verifying' && (
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-500/20 text-primary-400">
              <Loader2 className="animate-spin" size={32} />
            </div>
            <h2 className="text-xl font-semibold text-white">Verifying email...</h2>
            <p className="mt-2 text-sm text-slate-400">Please wait while we verify your account.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-semibold text-white">Email Verified!</h2>
            <p className="mt-2 text-sm text-slate-400">Your account is ready. Redirecting to login...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-red-400">
              <XCircle size={32} />
            </div>
            <h2 className="text-xl font-semibold text-white">Verification Failed</h2>
            <p className="mt-2 text-sm text-slate-400">{errorMsg}</p>
            <Link to="/login" className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-slate-200">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
