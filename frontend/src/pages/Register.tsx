import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Sparkles, Eye, EyeOff, Check, Brain, Target, Shield, Github, ChevronDown, ChevronUp, Mail, KeyRound, Smartphone, Fingerprint } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useGoogleLogin } from '@react-oauth/google'
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
  const location = useLocation()
  const { register, registerOAuth, loginWithGoogle, loading, error } = useAuth()
  
  const oauthData = location.state?.oauthData
  const isOAuthOnboarding = !!oauthData
  
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
  const [showOtherOptions, setShowOtherOptions] = useState(false)
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

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await loginWithGoogle(tokenResponse.access_token)
        if (response.needs_onboarding) {
          navigate('/register', { state: { oauthData: response.oauth_data }, replace: true })
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
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
    window.location.href = `${apiUrl}/api/auth/${provider}/url`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.subjects.length === 0) {
      setSubjectError('Select at least one subject to personalize your plan.')
      return
    }
    setSubjectError(null)
    
    if (isOAuthOnboarding) {
      try {
        await registerOAuth({
          email: oauthData.email,
          fullName: oauthData.full_name,
          provider: oauthData.provider,
          providerUserId: oauthData.provider_user_id,
          profilePicture: oauthData.profile_picture,
          course: formData.course.trim(),
          subjects: formData.subjects,
          currentLevel: formData.currentLevel,
          examTarget: formData.examTarget.trim(),
          examTimeline: formData.examTimeline,
        })
        navigate('/dashboard')
      } catch {
        // error in context
      }
    } else {
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
        setSuccessMessage('Account created! Please check your email to verify your account.')
        if (redirectTimeout.current) clearTimeout(redirectTimeout.current)
        redirectTimeout.current = setTimeout(() => navigate('/login', { state: { message: 'Registration successful! Please check your email to verify your account before logging in.' } }), 2500)
      } catch {
        /* error handled in context */
      }
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
            {!isOAuthOnboarding && (
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => handleGoogleLogin()}
                  disabled={loading}
                  className="group flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200 transition-all hover:bg-white/[0.08] hover:border-white/20 hover:text-white disabled:opacity-50 shadow-sm"
                >
                  <svg className="h-5 w-5 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
                    <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
                    <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
                    <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853" />
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
            )}

            {!isOAuthOnboarding && (
              <div className="relative mb-6 mt-8">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-xs font-medium uppercase tracking-wider">
                  <span className="bg-[#0b1021] px-3 text-slate-500">Or register with email</span>
                </div>
              </div>
            )}

            {isOAuthOnboarding && (
              <div className="mb-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                <p className="text-white text-sm font-medium">
                  Welcome, <strong className="text-primary-300">{oauthData.full_name}</strong>! Just a few more details to personalize your AI tutor.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isOAuthOnboarding && (
                <>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input
                        type="text"
                        required={!isOAuthOnboarding}
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
                        required={!isOAuthOnboarding}
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
                        required={!isOAuthOnboarding}
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
                </>
              )}

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

            <div className="mt-8 border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={() => setShowOtherOptions(!showOtherOptions)}
                className="flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
              >
                Other Registration Options
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
                      type="button"
                      disabled
                      className="flex items-center justify-between w-full rounded-lg border border-white/5 bg-white/[0.01] px-4 py-2.5 text-sm font-medium text-slate-500 opacity-60 cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        {typeof option.icon === 'string' ? (
                          <span className="font-bold text-base w-4 text-center">{option.icon}</span>
                        ) : (
                          <span className="w-4 flex justify-center">{option.icon}</span>
                        )}
                        <span>Sign up with {option.name}</span>
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
    </div>
  )
}
