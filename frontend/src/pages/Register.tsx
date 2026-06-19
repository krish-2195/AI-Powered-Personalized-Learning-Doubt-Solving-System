import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type RegisterForm = {
  fullName: string
  email: string
  password: string
  course: string
  subjects: string[]
  currentLevel: string
  examTarget: string
  examTimeline: string
}

export default function Register() {
  const navigate = useNavigate()
  const { register, loading, error } = useAuth()
  const subjectOptions = [
    'Data Structures',
    'Algorithms',
    'Operating Systems',
    'DBMS',
    'AI/ML',
    'Mathematics'
  ]
  const timelineOptions = ['4 weeks', '8 weeks', '12 weeks', '16 weeks', '24 weeks']
  const [formData, setFormData] = useState<RegisterForm>({
    fullName: '',
    email: '',
    password: '',
    course: '',
    subjects: [],
    currentLevel: 'Beginner',
    examTarget: '',
    examTimeline: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [subjectError, setSubjectError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [emailHint, setEmailHint] = useState<string | null>(null)
  const [passwordHint, setPasswordHint] = useState<string | null>(null)
  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!formData.email.trim()) {
        setEmailHint(null)
        return
      }
      const normalized = formData.email.trim().toLowerCase()
      const hasAt = normalized.includes('@')
      const hasDomain = /@.+\./.test(normalized)
      setEmailHint(hasAt && hasDomain ? 'Looks good' : 'Use a valid email format (name@example.com).')
    }, 250)
    return () => clearTimeout(timer)
  }, [formData.email])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!formData.password) {
        setPasswordHint(null)
        return
      }
      const pwd = formData.password
      const strong = pwd.length >= 10 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /\d/.test(pwd)
      const medium = pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /\d/.test(pwd)
      setPasswordHint(strong ? 'Strong password' : medium ? 'Good start — add uppercase and symbols for strength.' : 'Use at least 8 chars with letters and numbers.')
    }, 250)
    return () => clearTimeout(timer)
  }, [formData.password])

  useEffect(() => () => {
    if (redirectTimeout.current) clearTimeout(redirectTimeout.current)
  }, [])

  const toggleSubject = (subject: string) => {
    setFormData((prev) => {
      const exists = prev.subjects.includes(subject)
      const subjects = exists
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject]
      return { ...prev, subjects }
    })
    setSubjectError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.subjects.length === 0) {
      setSubjectError('Select at least one subject to personalize your plan.')
      return
    }
    setSubjectError(null)
    const sanitized = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password.trim(),
      course: formData.course.trim(),
      subjects: formData.subjects,
      currentLevel: formData.currentLevel,
      examTarget: formData.examTarget.trim(),
      examTimeline: formData.examTimeline,
    }

    try {
      await register(sanitized)
      setSuccessMessage('Account created! Redirecting to your dashboard...')
      if (redirectTimeout.current) clearTimeout(redirectTimeout.current)
      redirectTimeout.current = setTimeout(() => navigate('/dashboard'), 900)
    } catch {
      /* error handled in context */
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1e1b4b] py-12">
      <div className="bg-white/10 text-slate-100 backdrop-blur-xl p-8 rounded-2xl shadow-2xl shadow-purple-900/30 border border-white/10 w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Join AI Learn</h1>
          <p className="text-slate-300 mt-2">Create your personalized learning profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-white/20 bg-white/10 text-slate-100 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-white/20 bg-white/10 text-slate-100 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {emailHint && <p className="text-xs mt-1 text-slate-300">{emailHint}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full px-4 py-2 pr-12 border border-white/20 bg-white/10 text-slate-100 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-sm text-slate-300 hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {passwordHint && <p className="text-xs mt-1 text-slate-300">{passwordHint}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Course
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Computer Science"
                className="w-full px-4 py-2 border border-white/20 bg-white/10 text-slate-100 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Current Level
              </label>
              <select
                className="w-full px-4 py-2 border border-white/20 bg-white/15 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.currentLevel}
                onChange={(e) => setFormData({ ...formData, currentLevel: e.target.value })}
              >
                <option value="Beginner" className="text-slate-900">Beginner</option>
                <option value="Intermediate" className="text-slate-900">Intermediate</option>
                <option value="Advanced" className="text-slate-900">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Exam Target
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Final Exam, JEE"
                className="w-full px-4 py-2 border border-white/20 bg-white/10 text-slate-100 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.examTarget}
                onChange={(e) => setFormData({ ...formData, examTarget: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Timeline
              </label>
              <select
                required
                className="w-full px-4 py-2 border border-white/20 bg-white/15 text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={formData.examTimeline}
                onChange={(e) => setFormData({ ...formData, examTimeline: e.target.value })}
              >
                <option value="" disabled>Select timeline</option>
                {timelineOptions.map((opt) => (
                  <option key={opt} value={opt} className="text-slate-900">{opt}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Subject Focus
            </label>
            <div className="flex flex-wrap gap-2">
              {subjectOptions.map((subject) => {
                const active = formData.subjects.includes(subject)
                return (
                  <button
                    type="button"
                    key={subject}
                    onClick={() => toggleSubject(subject)}
                    aria-pressed={active}
                    className={`px-3 py-2 rounded-lg border transition duration-150 ease-out backdrop-blur-sm text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 ${
                      active
                        ? 'bg-primary-500/20 border-primary-400 text-primary-100 shadow-inner'
                        : 'bg-white/10 border-white/20 text-slate-100 hover:border-primary-400 hover:bg-white/15'
                    }`}
                  >
                    {subject}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-xs text-slate-400">Choose multiple topics to tailor your plan.</p>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, subjects: [] }))}
                className={`text-xs px-3 py-1 rounded-full border transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 ${
                  formData.subjects.length
                    ? 'border-white/30 text-slate-100 hover:border-primary-400 hover:text-primary-100'
                    : 'border-white/10 text-slate-500 cursor-not-allowed'
                }`}
                disabled={formData.subjects.length === 0}
                aria-label="Clear all selected subjects"
              >
                Clear all
              </button>
            </div>
            {subjectError && <p className="text-xs text-red-400 mt-1">{subjectError}</p>}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {successMessage && <p className="text-sm text-emerald-300">{successMessage}</p>}

          <button type="submit" className="w-full btn-primary mt-6" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-slate-300">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-300 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
