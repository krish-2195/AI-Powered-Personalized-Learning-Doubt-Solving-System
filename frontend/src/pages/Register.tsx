import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, Check, Brain, Target, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

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
  
  const [courseMappings, setCourseMappings] = useState<Record<string, string[]>>({})
  const [courseOptions, setCourseOptions] = useState<string[]>([
    'Computer Science', 
    'Information Technology', 
    'Software Engineering', 
    'Data Science'
  ])

  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const { data } = await api.get('/api/content/course-mappings')
        if (data && data.data) {
          setCourseMappings(data.data)
          setCourseOptions(Object.keys(data.data))
        }
      } catch (err) {
        console.error("Failed to load dynamic course mappings", err)
      }
    }
    fetchMappings()
  }, [])

  const timelineOptions = ['4 weeks', '8 weeks', '12 weeks', '16 weeks', '24 weeks']
  const examTargetOptions = ['Midterms', 'Final Exam', 'University Finals', 'Certification', 'Other']
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
  const subjectOptions = formData.course ? (courseMappings[formData.course] || []) : []
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

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-primary-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary-500/30'
  const selectClass =
    'w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100 transition-all focus:border-primary-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary-500/30'
  const labelClass = 'mb-2 block text-sm font-medium text-slate-300'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl floating" aria-hidden />
      <div className="pointer-events-none absolute -right-16 bottom-6 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl floating" aria-hidden />

      <div className="relative w-full max-w-5xl rounded-3xl border border-white/10 glass-panel p-8 sm:p-10 lg:p-12">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          {/* Left Side: Branding */}
          <div className="md:w-1/3 md:border-r border-white/10 md:pr-8 lg:pr-12 flex flex-col justify-start pt-4">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-glow">
              <Sparkles size={28} />
            </div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl mb-4">Join AI Learn</h1>
            <p className="text-sm text-slate-400 leading-relaxed mb-10">
              Create your personalized learning profile
            </p>

            <div className="hidden md:flex flex-col gap-6 mt-4">
              <div className="flex gap-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-primary-300">
                  <Brain size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 text-sm">Adaptive AI</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">Our AI learns how you learn and customizes your path.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-accent-300">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 text-sm">Exam Focused</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">Target specific goals to maximize your exam performance.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 text-sm">Progress Tracking</h3>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">Visualize your mastery across different subjects instantly.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="md:w-2/3">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input
                    type="text"
                    required
                    className={inputClass}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Karanpreet Singh"
                  />
                </div>

                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email"
                    required
                    className={inputClass}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                  />
                  {emailHint && (
                    <p className={`mt-1.5 text-xs ${emailHint === 'Looks good' ? 'text-emerald-300' : 'text-slate-400'}`}>{emailHint}</p>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className={`${inputClass} pr-12`}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                {passwordHint && (
                  <p className={`mt-1.5 text-xs ${passwordHint === 'Strong password' ? 'text-emerald-300' : 'text-slate-400'}`}>{passwordHint}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Course</label>
                  <select
                    required
                    className={selectClass}
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value, subjects: [] })}
                  >
                    <option value="" disabled>Select your course</option>
                    {courseOptions.map((opt) => (
                      <option key={opt} value={opt} className="text-slate-900">{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Current Level</label>
                  <select
                    className={selectClass}
                    value={formData.currentLevel}
                    onChange={(e) => setFormData({ ...formData, currentLevel: e.target.value })}
                  >
                    <option value="Beginner" className="text-slate-900">Beginner</option>
                    <option value="Intermediate" className="text-slate-900">Intermediate</option>
                    <option value="Advanced" className="text-slate-900">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Exam Target</label>
                  <select
                    required
                    className={selectClass}
                    value={formData.examTarget}
                    onChange={(e) => setFormData({ ...formData, examTarget: e.target.value })}
                  >
                    <option value="" disabled>Select exam target</option>
                    {examTargetOptions.map((opt) => (
                      <option key={opt} value={opt} className="text-slate-900">{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Timeline</label>
                  <select
                    required
                    className={selectClass}
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
                <label className={labelClass}>Subject Focus</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {subjectOptions.map((subject) => {
                    const active = formData.subjects.includes(subject)
                    return (
                      <button
                        type="button"
                        key={subject}
                        onClick={() => toggleSubject(subject)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm transition-all duration-150 ${active
                          ? 'border-primary-400/60 bg-primary-500/20 text-primary-100 shadow-[0_0_0_1px_rgba(124,58,237,0.2)]'
                          : 'border-white/10 bg-white/[0.05] text-slate-200 hover:border-primary-400/50 hover:bg-white/[0.09]'
                          }`}
                      >
                        {active && <Check size={14} />}
                        {subject}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-slate-400">Choose multiple topics to tailor your plan.</p>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, subjects: [] }))}
                    className={`rounded-full border px-3 py-1 text-xs transition duration-150 ${formData.subjects.length
                      ? 'border-white/20 text-slate-200 hover:border-primary-400 hover:text-primary-100'
                      : 'cursor-not-allowed border-white/10 text-slate-500'
                      }`}
                    disabled={formData.subjects.length === 0}
                    aria-label="Clear all selected subjects"
                  >
                    Clear all
                  </button>
                </div>
                {subjectError && <p className="mt-1.5 text-xs text-red-400">{subjectError}</p>}
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
              )}
              {successMessage && (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{successMessage}</p>
              )}

              <button type="submit" className="btn-primary mt-4 w-full py-3.5 text-base" disabled={loading}>
                {loading ? 'Creating…' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-300 transition-colors hover:text-primary-200">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
