import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { TrendingUp, Target, Clock, Award, Brain, AlertTriangle, Activity } from 'lucide-react'

type WeakTopic = {
  topic: string
  reason: string
}

type AnalyticsData = {
  weak_topics: WeakTopic[]
  topic_performance: any[]
  trend_data: any[]
}

type StatsData = {
  total_quizzes_completed: number
  average_score: number
  time_spent_hours: number
  topics_mastered: number
  weak_topics: number
  total_videos_watched: number
  exam_readiness: any
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.user_id) return
    
    Promise.all([
      api.get(`/api/analytics/summary/${user.user_id}`),
      api.get(`/api/users/stats/${user.user_id}`)
    ])
      .then(([analyticsRes, statsRes]) => {
        const rawData = analyticsRes.data.data || { trend_data: [], weak_topics: [], topic_performance: [] }

        setData(rawData)
        setStats(statsRes.data.data || statsRes.data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to load analytics data')
        setLoading(false)
      })
  }, [user])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="grid place-items-center h-14 w-14 rounded-2xl border border-primary-400/30 bg-primary-500/15 text-primary-300 shrink-0">
            <TrendingUp size={28} />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            Performance <span className="gradient-text">Analytics</span>
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="surface h-24 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="surface h-80 animate-pulse" />
          <div className="surface h-80 animate-pulse" />
        </div>
      </div>
    )
  }

  if (error) return <div className="text-center mt-20 text-red-500">{error}</div>

  const hasQuizData = data && (data.trend_data?.some(d => d.accuracy > 0) || data.topic_performance?.length > 0)

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <div className="grid place-items-center h-14 w-14 rounded-2xl border border-primary-400/30 bg-primary-500/15 text-primary-300 shrink-0">
          <TrendingUp size={28} />
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
          Performance <span className="gradient-text">Analytics</span>
        </h1>
      </div>

      {/* Stats Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="surface p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/20 text-primary-300 rounded-lg"><Target size={20} /></div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Average Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xl font-bold leading-none">{stats.average_score}%</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    stats.average_score >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                    stats.average_score >= 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {stats.average_score >= 80 ? 'Excellent' : stats.average_score >= 50 ? 'Good' : 'Needs Improvement'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="surface p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-500/20 text-accent-300 rounded-lg"><Clock size={20} /></div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Study Time</p>
                <p className="text-xl font-bold">
                  {stats.time_spent_hours < 1 
                    ? `${Math.round(stats.time_spent_hours * 60)} min` 
                    : `${stats.time_spent_hours.toFixed(1)} hrs`}
                </p>
              </div>
            </div>
          </div>
          <div className="surface p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 text-green-400 rounded-lg"><Award size={20} /></div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Topics Mastered</p>
                <p className="text-xl font-bold">{stats.topics_mastered}</p>
              </div>
            </div>
          </div>
          <div className="surface p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 text-red-400 rounded-lg"><AlertTriangle size={20} /></div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Weak Topics</p>
                <p className="text-xl font-bold">{stats.weak_topics}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasQuizData ? (
        <div className="surface p-6 text-slate-100 text-center py-16">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-2">No Analytics Data Yet</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Complete your first quiz to start seeing performance trends, topic breakdowns, and AI-powered insights here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="surface p-6">
              <h2 className="text-xl font-display font-semibold mb-4 text-slate-100 flex items-center gap-2">
                <Activity size={18} className="text-primary-300" /> Performance Trend
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data!.trend_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="date" stroke="#ffffff70" />
                  <YAxis domain={[0, 100]} stroke="#ffffff70" tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    formatter={(value: number) => [`${Math.round(value)}%`, undefined]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="accuracy" name="Accuracy (%)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="coverage" name="Coverage" stroke="#22c55e" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="consistency" name="Consistency" stroke="#f97316" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="engagement" name="Engagement" stroke="#a855f7" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="topics" name="Topics Covered" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="surface p-6">
              <h2 className="text-xl font-display font-semibold mb-4 text-slate-100 flex items-center gap-2">
                <Brain size={18} className="text-accent-300" /> Topic Performance
              </h2>
              {data!.topic_performance.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-slate-400">
                  <p>No topic performance data yet.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data!.topic_performance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="topic" stroke="#ffffff70" angle={-20} textAnchor="end" height={60} />
                    <YAxis domain={[0, 100]} stroke="#ffffff70" tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      formatter={(value: number) => [`${Math.round(value)}%`, 'EWMA Accuracy']}
                    />
                    <Bar dataKey="score" name="EWMA Accuracy" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Exam Readiness */}
          {stats?.exam_readiness && stats.exam_readiness.label !== "Not enough data" && (
            <div className="surface p-6 text-slate-100">
              <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
                <Brain size={18} className="text-primary-300" /> Exam Readiness Analysis
              </h2>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{
                      background: `conic-gradient(${(stats.exam_readiness.score < 50 ? '#ef4444' : stats.exam_readiness.score < 75 ? '#fbbf24' : '#22c55e')} ${stats.exam_readiness.score}%, #1f2937 0)`
                    }}
                  >
                    <div className="w-[78%] h-[78%] rounded-full bg-surface-950 flex items-center justify-center border border-white/10">
                      <span className="text-2xl font-bold">{stats.exam_readiness.score}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-semibold">{stats.exam_readiness.label}</p>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                      stats.exam_readiness.confidence === 'Low' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      stats.exam_readiness.confidence === 'Medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {stats.exam_readiness.confidence === 'Low' ? '🔴' : stats.exam_readiness.confidence === 'Medium' ? '🟡' : '🟢'} {stats.exam_readiness.confidence} Confidence
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">{stats.exam_readiness.reason}</p>
                  {stats.exam_readiness.metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                      {Object.entries(stats.exam_readiness.metrics).map(([key, val]) => (
                        <div key={key} className="bg-black/20 rounded-lg p-2 border border-white/5 text-center">
                          <p className="text-xs text-slate-400 capitalize">{key.replace('_', ' ')}</p>
                          <p className="text-sm font-bold text-slate-200">{String(val)}%</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Weak Topics */}
          <div className="surface p-6">
            <h2 className="text-xl font-display font-semibold mb-4 text-slate-100 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" /> Weak Topics
            </h2>
            {data!.weak_topics.length === 0 ? (
              <p className="text-slate-400">No weak topics detected. Great job! 🎉</p>
            ) : (
              <div className="space-y-3">
                {data!.weak_topics.map((item, idx) => (
                  <div key={idx} className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="font-medium text-red-400">{item.topic}</p>
                    <p className="text-sm text-red-300/70 mt-1">{item.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
