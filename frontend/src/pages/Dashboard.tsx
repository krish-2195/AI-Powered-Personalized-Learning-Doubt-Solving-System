import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, TrendingUp, Target, Clock, Sparkles, ArrowRight, Check, Brain, CheckCircle, Play } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

export default function Dashboard() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(false)

  useEffect(() => {
    if (location.state?.onboardingComplete) {
      setShowOnboardingSuccess(true)
      window.history.replaceState({}, document.title)
      const timer = setTimeout(() => setShowOnboardingSuccess(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [location.state])

  const [dashboardData, setDashboardData] = useState<any>(() => {
    const cached = localStorage.getItem('dashboardData')
    const cachedTime = localStorage.getItem('dashboardDataTime')
    const isStale = !cachedTime || Date.now() - Number(cachedTime) > 5 * 60 * 1000
    return (cached && !isStale) ? JSON.parse(cached) : null
  })
  const [skipWelcome, setSkipWelcome] = useState(() => {
    return localStorage.getItem('skipWelcome') === 'true'
  })

  useEffect(() => {
    if (user?.user_id) {
      api.get(`/api/dashboard/?user_id=${user.user_id}`)
        .then((res) => {
          setDashboardData(res.data.data)
          localStorage.setItem('dashboardData', JSON.stringify(res.data.data))
          localStorage.setItem('dashboardDataTime', Date.now().toString())
          if (res.data.data.streak !== undefined && user?.streak_count !== res.data.data.streak) {
            updateUser({ streak_count: res.data.data.streak })
          }
          setLoading(false)
        })
        .catch((err) => {
          console.error("Failed to load dashboard data", err)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [user])

  const handleStartRecommendation = async (rec: any) => {
    if (rec.resource_id) {
      try {
        await api.post('/api/recommendations/feedback', {
          user_id: user?.user_id,
          content_id: rec.resource_id,
          clicked: true
        })
      } catch (err) {
        console.error("Failed to log recommendation feedback", err)
      }
    }
    navigate('/chat', { state: { prefill: `I want to start the recommended ${rec.type} on ${rec.topic}: ${rec.title}` } })
  }

  // ── Skeleton loading ──────────────────────────────────────────────────────
  if (loading && !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-32 w-full rounded-[20px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return <div className="text-white text-center mt-20">Failed to load dashboard.</div>
  }

  const {
    is_new_user,
    streak,
    todayFocus,
    stats,
    recentActivity,
    examReadiness,
    recommendations: apiRecommendations,
    prerequisitePath
  } = dashboardData

  const recommendations = apiRecommendations && apiRecommendations.length > 0
    ? apiRecommendations
    : [
        { type: 'video', title: 'DP Fundamentals', topic: 'Dynamic Programming', time: 25 },
        { type: 'quiz', title: 'Recursion Practice', topic: 'Recursion', time: 15 },
        { type: 'revision', title: 'Graph Traversal', topic: 'Graphs', time: 20 },
      ]

  // ── New user welcome ──────────────────────────────────────────────────────
  if (is_new_user && !skipWelcome) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-6 text-slate-100 max-w-5xl mx-auto"
      >
        <div className="relative flex flex-col items-center justify-center bg-gradient-to-br from-primary-600/80 via-primary-500/70 to-accent-500/60 backdrop-blur-xl rounded-3xl p-12 shadow-2xl shadow-purple-900/40 border border-white/20 text-center overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-400/20 blur-3xl rounded-full" />
          <div className="relative z-10">
            <div className="bg-white/10 p-5 rounded-full mb-6 border border-white/20 shadow-xl inline-flex">
              <Sparkles size={48} className="text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Welcome to AI Learn, {user?.full_name?.split(' ')[0] || 'Student'}!
            </h1>
            <p className="text-lg md:text-xl text-slate-100/90 max-w-2xl mx-auto mb-8 leading-relaxed">
              Your personalized learning journey is almost ready. To unlock your custom study plan, we need to know where you stand.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-10">
              {[
                { step: '1', text: 'Complete your first practice quiz' },
                { step: '2', text: 'AI analyzes your performance' },
                { step: '3', text: 'Unlock your dashboard & AI Tutor' },
              ].map(({ step, text }) => (
                <div key={step} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                  <div className="text-primary-300 font-bold text-xl mb-1">{step}.</div>
                  <p className="text-sm font-medium">{text}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/chat', { state: { generateQuiz: true, topic: 'Baseline Assessment', isBaseline: true } })}
                className="bg-white text-primary-700 hover:bg-slate-50 px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 shadow-xl"
              >
                Start Learning <ArrowRight size={20} />
              </motion.button>
              <button
                onClick={() => { localStorage.setItem('skipWelcome', 'true'); setSkipWelcome(true) }}
                className="text-white/70 hover:text-white px-6 py-4 rounded-xl font-medium transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // ── Main Dashboard ────────────────────────────────────────────────────────
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6 text-slate-100"
    >
      {/* Hero welcome strip */}
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[20px] p-6 border border-white/[0.08] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 min-h-[130px]"
        style={{
          background: 'linear-gradient(135deg, rgba(109,40,217,0.35) 0%, rgba(20,184,166,0.15) 100%)',
        }}
      >
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 bottom-0 h-32 w-32 rounded-full bg-accent-500/15 blur-2xl" />

        {/* Left: Greeting */}
        <div className="flex-1 min-w-0 z-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-300">
            <span className="flex items-center gap-1.5"><Target size={16} className="text-primary-400" /> Today: {todayFocus}</span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5"><Brain size={16} className="text-red-400" /> Weak: {dashboardData?.weak_topics?.[0]?.topic || todayFocus}</span>
          </div>
        </div>

        {/* Right: Metrics */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 z-10">
          <div className="flex flex-col border-l border-white/10 pl-4">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Streak</span>
            <span className="text-lg font-bold text-white flex items-center gap-1.5">
              <span className="text-orange-400">🔥</span> {streak} Days
            </span>
          </div>
          <div className="flex flex-col border-l border-white/10 pl-4">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Exam Ready</span>
            <span className="text-lg font-bold text-white">{examReadiness?.score || 0}%</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/learning')}
            className="ml-2 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2"
          >
            Continue Learning <ArrowRight size={16} />
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Grid — Double-Bezel cards with stagger */}
      <motion.div
        variants={staggerContainer}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[{
          label: 'Videos Watched',
          value: stats?.videosWatched || 0,
          icon: <BookOpen className="text-primary-400" size={18} />,
          accent: 'rgba(124,58,237,0.25)',
        }, {
          label: 'Average Score',
          value: `${stats?.averageScore || 0}%`,
          icon: <TrendingUp className="text-accent-400" size={18} />,
          accent: 'rgba(20,184,166,0.25)',
          progress: Math.min(100, Number(stats?.averageScore) || 0),
        }, {
          label: 'Topics Mastered',
          value: stats?.topicsMastered || 0,
          icon: <Target className="text-red-400" size={18} />,
          accent: 'rgba(239,68,68,0.2)',
        }, {
          label: 'Study Time',
          value: (stats?.studyHours || 0) < 1
            ? `${Math.round((stats?.studyHours || 0) * 60)} min`
            : `${(stats?.studyHours || 0).toFixed(1)} hrs`,
          icon: <Clock className="text-blue-400" size={18} />,
          accent: 'rgba(59,130,246,0.2)',
        }].map((stat, idx) => (
          <motion.div
            key={idx}
            variants={fadeUp}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] } }}
            className="card-bezel cursor-default"
          >
            <div className="card-bezel-inner">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-500 text-[11px] uppercase font-bold tracking-widest">{stat.label}</p>
                {/* Icon with tinted background */}
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06]"
                  style={{ background: stat.accent }}
                >
                  {stat.icon}
                </div>
              </div>
              <p className="text-2xl font-extrabold text-white">{stat.value}</p>
              {stat.progress !== undefined && (
                <div className="mt-3 h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${stat.progress}%` }}
                    transition={{ duration: 1, delay: 0.3 + idx * 0.1, ease: [0.32, 0.72, 0, 1] }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Recent Activity */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-primary-300" /> Recent Activity
            </h2>
            <div className="space-y-3">
              {recentActivity.map((activity: any, idx: number) => {
                const isQuiz = activity.type.includes('quiz')
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center justify-between p-4 bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 rounded-xl border border-white/[0.06] hover:border-primary-500/30 hover:-translate-y-0.5 transition-all duration-300 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-surface-800 rounded-lg border border-white/[0.06]">
                        {isQuiz
                          ? <CheckCircle className="text-green-400" size={16} />
                          : <Play className="text-blue-400" size={16} />
                        }
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">
                          {isQuiz
                            ? `Completed ${activity.details?.topic || 'General'} Quiz`
                            : `Watched ${activity.details?.topic || 'Video'}`
                          }
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isQuiz ? `${activity.details?.score || '0%'} accuracy` : '100% completed'} · {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              {recentActivity.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">No recent activity. Start a quiz!</p>
              )}
            </div>
          </div>

          {/* Knowledge Graph Gaps */}
          {prerequisitePath && prerequisitePath.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="card"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Brain size={18} className="text-accent-300" /> Knowledge Graph Gaps
              </h2>
              <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                <p className="text-sm text-slate-300 mb-4">
                  Based on your recent performance, foundational concepts to review before tackling advanced topics:
                </p>
                <div className="flex flex-col space-y-0 relative pl-4">
                  {prerequisitePath.map((topic: string, idx: number) => {
                    const isCompleted = idx < prerequisitePath.length - 2
                    const isCurrent = idx === prerequisitePath.length - 2 || (prerequisitePath.length === 1 && idx === 0)
                    return (
                      <div key={idx} className="flex items-start gap-4 relative pb-6 last:pb-0">
                        {idx < prerequisitePath.length - 1 && (
                          <div className="absolute left-2.5 top-6 bottom-0 w-px bg-slate-700/60" />
                        )}
                        <div className="relative z-10 w-5 h-5 mt-1 shrink-0 flex items-center justify-center">
                          {isCompleted
                            ? <CheckCircle className="text-green-500 w-5 h-5" />
                            : isCurrent
                              ? <div className="w-5 h-5 rounded-full border-2 border-primary-500 flex items-center justify-center"><div className="w-2.5 h-2.5 bg-primary-500 rounded-full" /></div>
                              : <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
                          }
                        </div>
                        <div className={`text-sm font-semibold pt-1 ${isCompleted ? 'text-slate-400' : isCurrent ? 'text-white' : 'text-slate-500'}`}>
                          {topic}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Exam Readiness — Double-Bezel card */}
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="card-bezel h-full">
            <div className="card-bezel-inner flex flex-col h-full">
              <h2 className="text-xl font-semibold mb-4">Exam Readiness</h2>
              {examReadiness?.label === "Not enough data" ? (
                <div className="text-center space-y-4 flex-1 flex flex-col justify-center items-center">
                  <div className="w-36 h-36 rounded-full bg-slate-800/80 border-4 border-white/10 flex flex-col items-center justify-center p-4">
                    <span className="text-3xl">🧊</span>
                    <span className="font-bold text-amber-300 mt-2 text-sm">Need 3<br />Quizzes</span>
                  </div>
                  <div className="text-left bg-black/20 rounded-xl p-4 w-full border border-white/5">
                    <p className="text-xs text-amber-300 font-semibold mb-2 uppercase tracking-wider">Unlock Predictions</p>
                    <p className="text-sm text-slate-300 mb-3">
                      {examReadiness?.reason || 'Complete at least 3 quizzes to unlock ML predictions.'}
                    </p>
                    <div className="w-full bg-slate-800 rounded-full h-2 border border-white/10">
                      <motion.div
                        className="bg-amber-400 h-2 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min(((dashboardData?.stats?.quizzesTaken || 0) / 3) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: 0.4, ease: [0.32, 0.72, 0, 1] }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-right">
                      {dashboardData?.stats?.quizzesTaken || 0} / 3 quizzes
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 flex-1">
                  {/* Conic score ring */}
                  <div className="relative w-36 h-36 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-primary-500/15 blur-2xl animate-pulse" />
                    <div
                      className="relative w-full h-full rounded-full flex items-center justify-center"
                      style={{
                        background: `conic-gradient(${
                          examReadiness?.score < 50 ? '#ef4444' :
                          examReadiness?.score < 75 ? '#fbbf24' : '#22c55e'
                        } ${examReadiness?.score}%, rgba(255,255,255,0.05) 0)`
                      }}
                    >
                      <div className="w-[78%] h-[78%] rounded-full bg-[#131420] flex items-center justify-center border border-white/10">
                        <span className="text-3xl font-bold">{examReadiness?.score || 0}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${
                      examReadiness?.confidence?.includes('Low') ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      examReadiness?.confidence?.includes('Medium') ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {examReadiness?.confidence?.includes('Low') ? '🔴' : examReadiness?.confidence?.includes('Medium') ? '🟡' : '🟢'}{' '}
                      {examReadiness?.confidence?.replace(' Confidence', '') || 'Low'} Confidence
                    </div>
                  </div>

                  <div className="text-left bg-black/20 rounded-xl p-4 border border-white/5">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">ML Breakdown</p>
                    <ul className="space-y-1.5 text-sm text-slate-300">
                      {[
                        { label: 'Accuracy', value: `${examReadiness?.metrics?.accuracy || 0}%` },
                        { label: 'Coverage', value: `${examReadiness?.metrics?.coverage || 0}%` },
                        { label: 'Consistency', value: `${examReadiness?.metrics?.consistency || 0}%` },
                        { label: 'Engagement', value: `${examReadiness?.metrics?.engagement || 0}%` },
                      ].map(({ label, value }) => (
                        <li key={label} className="flex items-center justify-between">
                          <span className="flex items-center gap-2"><Check size={13} className="text-primary-400" /> {label}</span>
                          <span className="font-mono">{value}</span>
                        </li>
                      ))}
                      <li className="flex items-center justify-between text-amber-300/80">
                        <span>⚠️ Weak Penalty</span>
                        <span className="font-mono">-{100 - (examReadiness?.metrics?.weak_penalty ?? 100)}%</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/learning')}
                className="w-full py-2.5 mt-4 border border-white/10 hover:bg-white/[0.05] rounded-xl text-sm font-semibold text-slate-300 transition-all flex items-center justify-center gap-2"
              >
                View Action Plan <ArrowRight size={14} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recommendations */}
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="card"
      >
        <h2 className="text-xl font-semibold mb-4">Recommended for You</h2>
        <div className="grid grid-cols-1 gap-4">
          {recommendations.map((rec: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3, transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] } }}
              className="rounded-[1.25rem] p-[1.5px] bg-gradient-to-r from-white/[0.05] to-transparent border border-white/[0.05]"
            >
              <div className="rounded-[calc(1.25rem-1.5px)] bg-[#0f1020]/90 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-surface-800 rounded-xl flex items-center justify-center shrink-0 border border-white/[0.08]">
                      {rec.type === 'video'
                        ? <Play className="text-primary-400" size={18} />
                        : rec.type === 'quiz'
                          ? <Target className="text-accent-400" size={18} />
                          : <BookOpen className="text-green-400" size={18} />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-md">
                          {rec.match_score ? `${rec.match_score}% Match` : `${89 - idx}% Match`}
                        </span>
                        <span className="text-xs text-slate-500">{rec.time} min</span>
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">{rec.title}</h4>
                      {rec.subject && (
                        <p className="text-xs text-slate-500 font-medium">{rec.subject} › {rec.topic}</p>
                      )}
                      {rec.reason && (
                        <p className="text-xs text-slate-500 mt-0.5 leading-normal">{rec.reason}</p>
                      )}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleStartRecommendation(rec)}
                    className="shrink-0 px-4 py-2 border border-white/10 hover:border-primary-500/40 hover:bg-primary-500/10 hover:text-primary-300 rounded-lg text-sm font-semibold text-slate-400 transition-all"
                  >
                    Start
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Onboarding success toast */}
      {showOnboardingSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-3.5 z-50 border border-green-400/20"
        >
          <Sparkles size={20} className="text-amber-300 animate-pulse" />
          <div>
            <p className="font-extrabold text-sm">Onboarding Complete!</p>
            <p className="text-xs text-white/90 font-medium">Your personalized learning path has been generated.</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
