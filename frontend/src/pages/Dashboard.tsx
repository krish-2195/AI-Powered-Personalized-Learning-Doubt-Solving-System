import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, TrendingUp, Target, Clock, Sparkles, ArrowRight, Check, Brain, CheckCircle, Play } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

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
    return cached ? JSON.parse(cached) : null
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
    todayFocus,
    stats,
    recentActivity,
    examReadiness,
    recommendations: apiRecommendations,
    prerequisitePath
  } = dashboardData  // Use real recommendations from the API, or fallback to default ones if none exist
  const recommendations = apiRecommendations && apiRecommendations.length > 0 
    ? apiRecommendations 
    : [
        { type: 'video', title: 'DP Fundamentals', topic: 'Dynamic Programming', time: 25 },
        { type: 'quiz', title: 'Recursion Practice', topic: 'Recursion', time: 15 },
        { type: 'revision', title: 'Graph Traversal', topic: 'Graphs', time: 20 },
      ]

  if (is_new_user && !skipWelcome) {
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
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={() => navigate('/chat', { state: { generateQuiz: true, topic: 'Baseline Assessment', isBaseline: true } })}
              className="bg-white text-primary-700 hover:bg-slate-50 px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl"
            >
              Start Learning <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => {
                localStorage.setItem('skipWelcome', 'true');
                setSkipWelcome(true);
              }}
              className="text-white/70 hover:text-white px-6 py-4 rounded-xl font-medium transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-slate-100">
      <div className="bg-gradient-to-r from-primary-900/40 to-accent-900/30 rounded-[20px] p-6 border border-white/[0.08]/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden min-h-[130px]">
        
        {/* Left: Greeting and Goal */}
        <div className="flex-1 min-w-0 z-10">
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-300">
            <span className="flex items-center gap-1.5"><Target size={16} className="text-primary-400"/> Today's Goal: Finish {todayFocus}</span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5"><Brain size={16} className="text-red-400"/> Weakest Topic: Arrays</span>
          </div>
        </div>
        
        {/* Right: Metrics & CTA */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 z-10">
          
          <div className="flex flex-col border-l border-white/10 pl-4">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Current Streak</span>
            <span className="text-lg font-bold text-white flex items-center gap-1.5"><span className="text-orange-400">🔥</span> {streak} Days</span>
          </div>
          
          <div className="flex flex-col border-l border-white/10 pl-4">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Exam Readiness</span>
            <span className="text-lg font-bold text-white">{examReadiness?.score || 0}%</span>
          </div>

          <button onClick={() => navigate('/learning')} className="ml-2 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center gap-2">
            Continue Learning <ArrowRight size={16} />
          </button>
        </div>

      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[{
          label: 'Videos Watched', value: stats?.videosWatched || 0, icon: <BookOpen className="text-primary-400" size={20} />
        }, {
          label: 'Average Score', value: `${stats?.averageScore || 0}%`, icon: <TrendingUp className="text-accent-400" size={20} />
        }, {
          label: 'Topics Mastered', value: stats?.topicsMastered || 0, icon: <Target className="text-red-400" size={20} />
        }, {
          label: 'Study Time', value: (stats?.studyHours || 0) < 1 ? `${Math.round((stats?.studyHours || 0) * 60)} min` : `${(stats?.studyHours || 0).toFixed(1)} hrs`, icon: <Clock className="text-blue-400" size={20} />
        }].map((stat, idx) => (
          <div key={idx} className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.08] rounded-2xl p-5 shadow-sm text-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[11px] uppercase font-bold tracking-widest">{stat.label}</p>
                <p className="text-2xl font-extrabold mt-1 text-white">{stat.value}</p>
              </div>
              <div className="p-3 bg-surface-800 border border-white/[0.08] rounded-xl">{stat.icon}</div>
            </div>
            {stat.label === 'Average Score' && (
              <div className="mt-4 h-1.5 w-full bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full bg-accent-500" style={{ width: `${Math.min(100, Number(stats?.averageScore) || 0)}%` }} />
              </div>
            )}
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
              {recentActivity.map((activity: any, idx: number) => {
                const isQuiz = activity.type.includes('quiz')
                return (
                  <div key={idx} className="flex items-center justify-between p-4 bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 rounded-xl border border-white/[0.08] shadow-sm hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-surface-800 rounded-lg border border-white/[0.08]">
                        {isQuiz ? <CheckCircle className="text-green-400" size={16} /> : <Play className="text-blue-400" size={16} />}
                      </div>
                      <div className="flex flex-col">
                        <p className="font-semibold text-slate-200 text-sm">
                          {isQuiz ? `Completed ${activity.details?.topic || 'General'} Quiz` : `Watched ${activity.details?.topic || 'Video'}`}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isQuiz ? `Accuracy ${activity.details?.score || '0%'} | Prediction Active` : '100% Completed'} • {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
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
                <div className="flex flex-col space-y-0 relative pl-4">
                  {prerequisitePath.map((topic: string, idx: number) => {
                    const isCompleted = idx < prerequisitePath.length - 2;
                    const isCurrent = idx === prerequisitePath.length - 2 || (prerequisitePath.length === 1 && idx === 0);

                    return (
                      <div key={idx} className="flex items-start gap-4 relative pb-6 last:pb-0">
                        {/* Connecting Line */}
                        {idx < prerequisitePath.length - 1 && (
                          <div className="absolute left-2.5 top-6 bottom-0 w-px bg-slate-700" />
                        )}
                        
                        {/* Status Icon */}
                        <div className="relative z-10 w-5 h-5 mt-1 shrink-0 bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 flex items-center justify-center">
                          {isCompleted ? (
                            <CheckCircle className="text-green-500 w-5 h-5" />
                          ) : isCurrent ? (
                            <div className="w-5 h-5 rounded-full border-2 border-primary-500 flex items-center justify-center">
                              <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-600 bg-surface-850" />
                          )}
                        </div>

                        {/* Topic Name */}
                        <div className={`text-sm font-semibold pt-1 ${
                          isCompleted ? 'text-slate-400' :
                          isCurrent ? 'text-white' : 'text-slate-500'
                        }`}>
                          {topic}
                        </div>
                      </div>
                    )
                  })}
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
              <div className="w-36 h-36 rounded-full bg-slate-800 border-4 border-white/10 flex flex-col items-center justify-center p-4">
                <span className="text-3xl">🧊</span>
                <span className="font-bold text-amber-300 mt-2 text-sm">Need 3<br/>Quizzes</span>
              </div>
              <div className="text-left bg-black/20 rounded-xl p-4 mt-4 border border-white/5 w-full">
                <p className="text-xs text-amber-300 font-semibold mb-2 uppercase tracking-wider">Unlock Predictions</p>
                <p className="text-sm text-slate-300 mb-3">
                  {examReadiness?.reason || 'Complete at least 3 quizzes to unlock ML predictions.'}
                </p>
                <div className="w-full bg-slate-800 rounded-full h-2.5 border border-white/10">
                  <div 
                    className="bg-amber-400 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(((dashboardData?.stats?.quizzesTaken || 0) / 3) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-right">
                  {dashboardData?.stats?.quizzesTaken || 0} / 3 Quizzes Completed
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
                  <div className="w-[78%] h-[78%] rounded-full bg-surface-950 flex items-center justify-center border border-white/10">
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
          
          <button onClick={() => navigate('/learning')} className="w-full py-2.5 mt-4 border border-white/10 hover:bg-surface-800 rounded-xl text-sm font-semibold text-slate-300 transition-all flex items-center justify-center gap-2">
            View Action Plan <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card bg-white/10 border-white/10 text-slate-100">
        <h2 className="text-xl font-semibold mb-4">Recommended for You</h2>
        <div className="grid grid-cols-1 gap-4">
              {recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.08] rounded-xl p-5 shadow-sm group hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-surface-800 rounded-xl flex items-center justify-center shrink-0 border border-white/10 group-hover:border-primary-500 transition-colors">
                        {rec.type === 'video' ? <Play className="text-primary-400" /> : rec.type === 'quiz' ? <Target className="text-accent-400" /> : <BookOpen className="text-green-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded-md">8{9-idx}% Match</span>
                          <span className="text-xs text-slate-500">{rec.time} min</span>
                        </div>
                        <h4 className="font-bold text-white text-base mb-1">{rec.title}</h4>
                        {rec.subject && (
                          <p className="text-xs text-slate-400 font-medium mb-1.5">
                            {rec.subject} › {rec.topic}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 leading-normal mb-1">
                          {rec.reason || "Recommended for you"}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleStartRecommendation(rec)} className="shrink-0 px-4 py-2 border border-white/10 hover:border-slate-500 rounded-lg text-sm font-semibold text-slate-300 hover:text-white transition-colors bg-transparent">
                      Start
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </div>
      
      {showOnboardingSuccess && (
        <div className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center gap-3.5 z-50 animate-bounce border border-green-400/20">
          <Sparkles size={20} className="text-amber-300 animate-pulse" />
          <div>
            <p className="font-extrabold text-sm">Onboarding Complete!</p>
            <p className="text-xs text-white/90 font-medium">Your personalized learning path has been successfully generated.</p>
          </div>
        </div>
      )}
    </div>
  )
}
