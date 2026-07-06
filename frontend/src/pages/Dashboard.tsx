import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, TrendingUp, Target, Clock, Sparkles, ArrowRight, Check, Brain } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function Dashboard() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(() => {
    const cached = localStorage.getItem('dashboardData')
    return cached ? JSON.parse(cached) : null
  })

  useEffect(() => {
    if (user?.user_id) {
      api.get(`/api/dashboard/?user_id=${user.user_id}`)
        .then((res) => {
          setDashboardData(res.data.data)
          localStorage.setItem('dashboardData', JSON.stringify(res.data.data))
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
      // If user is loaded but has no user_id (e.g. stale session), stop loading
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

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center mt-32 space-x-2">
        <div className="w-3 h-3 bg-primary-500 rounded-full animate-bounce"></div>
        <div className="w-3 h-3 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-3 h-3 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    )
  }

  if (!dashboardData) {
    return <div className="text-white text-center mt-20">Failed to load dashboard.</div>
  }

  const {
    is_new_user,
    streak,
    accuracyBoostTarget,
    todayFocus,
    stats,
    recentActivity,
    examReadiness,
    recommendations: apiRecommendations,
    prerequisitePath,
    exam_date,
    exam_target
  } = dashboardData

  // Calculate dynamic "Exam in X Days"
  const examDaysRemaining = exam_date ? Math.max(0, Math.ceil((new Date(exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null

  const displayStats = {
    videosWatched: stats?.videosWatched || 0, 
    quizzesCompleted: recentActivity?.filter((a: any) => a.type === 'quiz').length || 0,
    averageScore: stats?.averageScore || 0,
    studyHours: stats?.studyHours || 0, 
    topicsMastered: stats?.topicsMastered || 0,
  }

  // Use real recommendations from the API, or fallback to default ones if none exist
  const recommendations = apiRecommendations && apiRecommendations.length > 0 
    ? apiRecommendations 
    : [
        { type: 'video', title: 'DP Fundamentals', topic: 'Dynamic Programming', time: 25 },
        { type: 'quiz', title: 'Recursion Practice', topic: 'Recursion', time: 15 },
        { type: 'revision', title: 'Graph Traversal', topic: 'Graphs', time: 20 },
      ]

  if (is_new_user) {
    return (
      <div className="space-y-6 text-slate-100 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-primary-600/80 via-primary-500/70 to-accent-500/60 backdrop-blur-xl rounded-3xl p-12 shadow-2xl shadow-purple-900/40 border border-white/20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-400/20 blur-3xl rounded-full"></div>
          
          <div className="bg-white/10 p-5 rounded-full mb-6 border border-white/20 shadow-xl">
            <Sparkles size={48} className="text-white" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Welcome to AI Learn, {user?.full_name?.split(' ')[0] || 'Student'}!
          </h1>
          
          <p className="text-lg md:text-xl text-slate-100/90 max-w-2xl mx-auto mb-8 leading-relaxed">
            Your personalized learning journey is almost ready. To unlock your custom study plan, weak topics analysis, and AI recommendations, we need to know where you stand.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-10">
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
              <div className="text-primary-300 font-bold text-xl mb-1">1.</div>
              <p className="text-sm font-medium">Complete your first practice quiz</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
              <div className="text-primary-300 font-bold text-xl mb-1">2.</div>
              <p className="text-sm font-medium">AI analyzes your performance</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
              <div className="text-primary-300 font-bold text-xl mb-1">3.</div>
              <p className="text-sm font-medium">Unlock your dashboard & AI Tutor</p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/learning')}
            className="bg-white text-primary-700 hover:bg-slate-50 px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl"
          >
            Start Learning <ArrowRight size={20} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-slate-100">
      <div className="bg-gradient-to-r from-primary-900 via-primary-800 to-accent-900 rounded-2xl p-8 shadow-2xl border border-white/10 relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-500/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-sm text-primary-200 font-semibold tracking-wider uppercase">
              <Sparkles size={16} className="text-accent-300" /> AI Personalized Dashboard
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-4 text-sm font-medium">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg shadow-inner">
                <span className="text-orange-400">🔥</span> {streak} Day Streak
              </span>
              {examDaysRemaining !== null && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg shadow-inner">
                  <Target size={16} className="text-accent-300" /> {exam_target ? `${exam_target} in ` : 'Exam in '}{examDaysRemaining} Days
                </span>
              )}
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/30 border border-primary-500/50 rounded-lg text-primary-100 shadow-inner">
                <BookOpen size={16} /> Today's Focus: {todayFocus}
              </span>
            </div>
          </div>
          
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
            <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10 flex items-center gap-4 min-w-[200px] shadow-xl">
              <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-inner"
                style={{ background: `conic-gradient(${(examReadiness?.score < 50 ? '#ef4444' : examReadiness?.score < 75 ? '#fbbf24' : '#22c55e')} ${examReadiness?.score}%, #1f2937 0)` }}
              >
                <div className="w-[85%] h-[85%] rounded-full bg-slate-900 flex items-center justify-center text-sm font-bold">
                  {examReadiness?.score || 0}%
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Readiness</p>
                <p className="text-lg font-semibold text-white leading-tight">
                  {examReadiness?.label === "Not enough data" ? "Need Data" : examReadiness?.label}
                </p>
                {examReadiness?.confidence && examReadiness?.label !== "Not enough data" && (
                  <p className={`text-xs mt-0.5 font-medium ${examReadiness.confidence.includes('High') ? 'text-green-400' : examReadiness.confidence.includes('Medium') ? 'text-amber-400' : 'text-red-400'}`}>
                    {examReadiness.confidence.replace(' Confidence', '')} Confidence
                  </p>
                )}
              </div>
            </div>
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
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="card bg-white/10 border-white/10 text-slate-100">
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

          {/* Prerequisite Path (Knowledge Graph) */}
          {prerequisitePath && prerequisitePath.length > 0 && (
            <div className="card bg-white/10 border-white/10 text-slate-100">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Brain size={18} className="text-accent-300" /> Knowledge Graph Gaps
              </h2>
              <div className="p-4 bg-black/20 rounded-xl border border-white/5">
                <p className="text-sm text-slate-300 mb-4">
                  Based on your recent performance, our AI has identified foundational concepts you should review before tackling advanced topics:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {prerequisitePath.map((topic: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="px-3 py-1.5 bg-accent-500/15 border border-accent-500/30 text-accent-200 rounded-lg text-sm font-medium">
                        {topic}
                      </div>
                      {idx < prerequisitePath.length - 1 && (
                        <ArrowRight size={14} className="text-slate-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Exam Readiness */}
        <div className="card bg-white/10 border-white/10 text-slate-100 flex flex-col h-full relative group cursor-help">
          <h2 className="text-xl font-semibold mb-4">Exam Readiness</h2>
          {examReadiness?.label === "Not enough data" ? (
            <div className="text-center space-y-4 flex-1 flex flex-col justify-center items-center">
              <div className="w-36 h-36 rounded-full bg-slate-800 border-4 border-slate-700 flex flex-col items-center justify-center p-4">
                <span className="text-3xl">🧊</span>
                <span className="font-bold text-amber-300 mt-2 text-sm">Need 3<br/>Quizzes</span>
              </div>
              <div className="text-left bg-black/20 rounded-xl p-4 mt-4 border border-white/5 w-full">
                <p className="text-xs text-amber-300 font-semibold mb-1">Cold Start Detected</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {examReadiness?.reason || 'Complete at least 3 quizzes to unlock ML predictions.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 flex-1">
              <div className="relative w-36 h-36 mx-auto">
                <div className="absolute inset-0 rounded-full bg-primary-500/20 blur-2xl animate-pulse" />
                <div
                  className="relative w-full h-full rounded-full flex items-center justify-center"
                  style={{
                    background: `conic-gradient(${(examReadiness?.score < 50 ? '#ef4444' : examReadiness?.score < 75 ? '#fbbf24' : '#22c55e')} ${examReadiness?.score}%, #1f2937 0)`
                  }}
                >
                  <div className="w-[78%] h-[78%] rounded-full bg-[#0f172a] flex items-center justify-center border border-white/10">
                    <span className="text-3xl font-bold">{examReadiness?.score || 0}%</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${
                  examReadiness?.confidence === 'Low' || examReadiness?.confidence === 'Low Confidence' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  examReadiness?.confidence === 'Medium' || examReadiness?.confidence === 'Medium Confidence' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {examReadiness?.confidence?.includes('Low') ? '🔴' : examReadiness?.confidence?.includes('Medium') ? '🟡' : '🟢'} {examReadiness?.confidence?.replace(' Confidence', '') || 'Low'} Confidence
                </div>
              </div>

              <div className="text-left bg-black/20 rounded-xl p-4 mt-4 border border-white/5">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-semibold">ML Prediction Breakdown:</p>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Check size={14} className="text-primary-400" /> Accuracy</span>
                    <span className="font-mono">{examReadiness?.metrics?.accuracy || 0}%</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Check size={14} className="text-primary-400" /> Coverage</span>
                    <span className="font-mono">{examReadiness?.metrics?.coverage || 0}%</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Check size={14} className="text-primary-400" /> Consistency</span>
                    <span className="font-mono">{examReadiness?.metrics?.consistency || 0}%</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Check size={14} className="text-primary-400" /> Engagement</span>
                    <span className="font-mono">{examReadiness?.metrics?.engagement || 0}%</span>
                  </li>
                  <li className="flex items-center justify-between text-amber-300/80">
                    <span className="flex items-center gap-2">⚠️ Weak Penalty</span>
                    <span className="font-mono">-{examReadiness?.metrics?.weak_penalty || 0}%</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          
          <button className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
            View Action Plan <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card bg-white/10 border-white/10 text-slate-100">
        <h2 className="text-xl font-semibold mb-4">Recommended for You</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((rec: any, idx: number) => (
            <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-sm hover:shadow-lg hover:-translate-y-1 transition cursor-pointer flex flex-col h-full relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-accent-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              <div className="flex justify-between items-start">
                <span className="text-xs uppercase text-primary-300 font-semibold">{rec.type}</span>
                {rec.match_score && (
                  <span className="text-xs font-bold text-accent-300 bg-accent-500/10 px-2 py-0.5 rounded-full border border-accent-500/20">
                    {rec.match_score}% Match
                  </span>
                )}
              </div>
              <h3 className="font-semibold mt-2 text-slate-50 leading-tight">{rec.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{rec.topic}</p>
              
              {rec.reason && (
                <div className="mt-3 p-2 bg-black/20 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-300 flex items-start gap-1.5">
                    <Sparkles size={12} className="text-primary-400 mt-0.5 shrink-0" />
                    <span>{rec.reason}</span>
                  </p>
                </div>
              )}
              
              <div className="mt-auto pt-4 flex items-center justify-between">
                <p className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12}/> {rec.time} min</p>
                <button 
                  onClick={() => handleStartRecommendation(rec)}
                  className="text-xs font-bold text-white bg-primary-600 hover:bg-primary-500 px-3 py-1.5 rounded-lg transition"
                >
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
