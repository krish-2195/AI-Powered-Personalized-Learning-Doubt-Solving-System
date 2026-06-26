import { useState, useEffect } from 'react'
import { BookOpen, TrendingUp, Target, Clock, Sparkles, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)

  useEffect(() => {
    if (user?.user_id) {
      api.get(`/api/dashboard/?user_id=${user.user_id}`)
        .then((res) => {
          setDashboardData(res.data.data)
          setLoading(false)
        })
        .catch((err) => {
          console.error("Failed to load dashboard data", err)
          setLoading(false)
        })
    }
  }, [user])

  if (loading) {
    return <div className="text-white text-center mt-20">Loading your personalized dashboard...</div>
  }

  if (!dashboardData) {
    return <div className="text-white text-center mt-20">Failed to load dashboard.</div>
  }

  const {
    streak,
    dailyQuest,
    accuracyBoostTarget,
    todayFocus,
    stats,
    recentActivity,
    examReadiness
  } = dashboardData

  // We will mock some stats that the backend doesn't provide yet to keep the UI beautiful
  const displayStats = {
    videosWatched: 45, // Mocked for now
    quizzesCompleted: recentActivity.filter((a: any) => a.type === 'quiz').length || 10,
    averageScore: stats.averageScore,
    studyHours: 120, // Mocked for now
    topicsMastered: stats.topicsMastered,
  }

  const recommendations = [
    { type: 'video', title: 'DP Fundamentals', topic: 'Dynamic Programming', time: 25 },
    { type: 'quiz', title: 'Recursion Practice', topic: 'Recursion', time: 15 },
    { type: 'revision', title: 'Graph Traversal', topic: 'Graphs', time: 20 },
  ]

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex items-center justify-between bg-gradient-to-r from-primary-600/70 via-primary-500/60 to-accent-500/60 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-purple-900/30 border border-white/10">
        <div>
          <p className="inline-flex items-center gap-2 text-sm text-white font-semibold">
            <Sparkles size={16} /> Personalized for you
          </p>
          <h1 className="text-3xl font-bold mt-1">Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!</h1>
          <p className="text-slate-100/80 mt-1">You are on a {streak} day streak! 🔥</p>
          <div className="mt-3 flex gap-3 text-sm">
            <span className="pill bg-white/20 border-white/25 text-white">Accuracy boost target: {accuracyBoostTarget}</span>
            <span className="pill bg-white/20 border-white/25 text-white">Today's focus: {todayFocus}</span>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-4 shadow-xl floating border border-white/15">
            <p className="text-sm opacity-90">Exam readiness</p>
            <p className="text-3xl font-bold">{examReadiness?.score}%</p>
            <p className="text-xs opacity-80">{examReadiness?.label} 🌟</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[{
          label: 'Videos Watched', value: displayStats.videosWatched, icon: <BookOpen className="text-primary-200" size={28} />, color: 'from-white/5 to-white/10'
        }, {
          label: 'Average Score', value: `${displayStats.averageScore}%`, icon: <TrendingUp className="text-accent-200" size={28} />, color: 'from-white/5 to-white/10'
        }, {
          label: 'Topics Mastered', value: displayStats.topicsMastered, icon: <Target className="text-glow-200" size={28} />, color: 'from-white/5 to-white/10'
        }, {
          label: 'Study Hours', value: displayStats.studyHours, icon: <Clock className="text-primary-100" size={28} />, color: 'from-white/5 to-white/10'
        }].map((stat, idx) => (
          <div key={idx} className={`card bg-gradient-to-br ${stat.color} sparkle text-slate-100 border-white/10 shadow-purple-900/20`}
            style={{ boxShadow: '0 10px 40px -18px rgba(124,58,237,0.55)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className="p-2 bg-white/15 text-white rounded-xl shadow-md border border-white/10">{stat.icon}</div>
            </div>
            <div className="mt-3 h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-500 via-accent-500 to-glow-500" style={{ width: `${Math.min(100, Number(displayStats.averageScore) || 80)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card bg-white/10 border-white/10 text-slate-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-primary-300" /> Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivity.map((activity: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 shadow-sm hover:-translate-y-0.5 hover:bg-white/8 transition">
                <div className="flex flex-col">
                  <p className="font-semibold text-slate-100">{activity.details?.topic || 'General Activity'}</p>
                  <p className="text-sm text-slate-400 capitalize">
                    {activity.type.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                    activity.type.includes('video')
                      ? 'bg-accent-500/15 text-accent-100 border-accent-500/40'
                      : activity.type.includes('chat')
                        ? 'bg-primary-500/15 text-primary-100 border-primary-500/40'
                        : 'bg-white/10 text-white border-white/20'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${activity.type.includes('video') ? 'bg-accent-400' : activity.type.includes('chat') ? 'bg-primary-300' : 'bg-slate-300'}`} />
                    {activity.type.includes('video') ? 'completed' : activity.type.includes('chat') ? 'doubt solved' : 'quiz'}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(activity.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-slate-400 text-sm">No recent activity found. Start a quiz!</p>
            )}
          </div>
        </div>

        {/* Exam Readiness */}
        <div className="card bg-white/10 border-white/10 text-slate-100">
          <h2 className="text-xl font-semibold mb-4">Exam Readiness</h2>
          <div className="text-center space-y-4">
            <div className="relative w-36 h-36 mx-auto">
              <div className="absolute inset-0 rounded-full bg-primary-500/20 blur-2xl animate-pulse" />
              <div
                className="relative w-full h-full rounded-full flex items-center justify-center"
                style={{
                  background: `conic-gradient(${(examReadiness?.score < 50 ? '#ef4444' : examReadiness?.score < 75 ? '#fbbf24' : '#22c55e')} ${examReadiness?.score}%, #1f2937 0)`
                }}
              >
                <div className="w-[78%] h-[78%] rounded-full bg-[#0f172a] flex items-center justify-center border border-white/10">
                  <span className="text-3xl font-bold">{examReadiness?.score}%</span>
                </div>
              </div>
            </div>
            <p className="text-lg font-medium">
              {examReadiness?.label}
            </p>
            <p className="text-sm text-slate-400">Color-coded confidence with a subtle pulse to keep momentum.</p>
            <button className="btn-primary w-full flex items-center justify-center gap-2">
              View Action Plan <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card bg-white/10 border-white/10 text-slate-100">
        <h2 className="text-xl font-semibold mb-4">Recommended for You</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-sm hover:shadow-lg hover:-translate-y-1 transition cursor-pointer">
              <span className="text-xs uppercase text-primary-300 font-semibold">{rec.type}</span>
              <h3 className="font-semibold mt-2 text-slate-50">{rec.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{rec.topic}</p>
              <p className="text-xs text-slate-500 mt-2">{rec.time} minutes</p>
              <button className="btn-secondary w-full mt-3">Start</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
