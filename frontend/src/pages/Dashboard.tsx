import { useState } from 'react'
import { BookOpen, TrendingUp, Target, Clock, Sparkles, ArrowRight } from 'lucide-react'

export default function Dashboard() {
  const [stats] = useState({
    videosWatched: 45,
    quizzesCompleted: 30,
    averageScore: 78.5,
    studyHours: 120,
    topicsMastered: 12,
    weakTopics: 5,
  })

  const [recentActivity] = useState([
    { type: 'video', topic: 'Dynamic Programming', time: '2 hours ago', completed: true },
    { type: 'quiz', topic: 'Trees', score: 85, time: '5 hours ago' },
    { type: 'chat', topic: 'Graph Algorithms', time: '1 day ago' },
  ])

  const [recommendations] = useState([
    { type: 'video', title: 'DP Fundamentals', topic: 'Dynamic Programming', time: 25 },
    { type: 'quiz', title: 'Recursion Practice', topic: 'Recursion', time: 15 },
    { type: 'revision', title: 'Graph Traversal', topic: 'Graphs', time: 20 },
  ])

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex items-center justify-between bg-gradient-to-r from-primary-600/70 via-primary-500/60 to-accent-500/60 backdrop-blur-xl rounded-2xl p-6 shadow-lg shadow-purple-900/30 border border-white/10">
        <div>
          <p className="inline-flex items-center gap-2 text-sm text-white font-semibold">
            <Sparkles size={16} /> Personalized for you
          </p>
          <h1 className="text-3xl font-bold mt-1">Welcome back, Student!</h1>
          <p className="text-slate-100/80 mt-1">Keep the streak alive—you're on fire 🔥</p>
          <div className="mt-3 flex gap-3 text-sm">
            <span className="pill bg-white/20 border-white/25 text-white">Accuracy boost target: +5%</span>
            <span className="pill bg-white/20 border-white/25 text-white">Today's focus: DP & Graphs</span>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-4 shadow-xl floating border border-white/15">
            <p className="text-sm opacity-90">Exam readiness</p>
            <p className="text-3xl font-bold">75%</p>
            <p className="text-xs opacity-80">You're climbing! 🌟</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[{
          label: 'Videos Watched', value: stats.videosWatched, icon: <BookOpen className="text-primary-200" size={28} />, color: 'from-white/5 to-white/10'
        }, {
          label: 'Average Score', value: `${stats.averageScore}%`, icon: <TrendingUp className="text-accent-200" size={28} />, color: 'from-white/5 to-white/10'
        }, {
          label: 'Topics Mastered', value: stats.topicsMastered, icon: <Target className="text-glow-200" size={28} />, color: 'from-white/5 to-white/10'
        }, {
          label: 'Study Hours', value: stats.studyHours, icon: <Clock className="text-primary-100" size={28} />, color: 'from-white/5 to-white/10'
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
              <div className="h-full bg-gradient-to-r from-primary-500 via-accent-500 to-glow-500" style={{ width: `${Math.min(100, Number(stats.averageScore) || 80)}%` }} />
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
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 shadow-sm hover:-translate-y-0.5 hover:bg-white/8 transition">
                <div className="flex flex-col">
                  <p className="font-semibold text-slate-100">{activity.topic}</p>
                  <p className="text-sm text-slate-400">
                    {activity.type === 'quiz' && `Score: ${activity.score}%`}
                    {activity.type === 'video' && 'Completed'}
                    {activity.type === 'chat' && 'Doubt clarified'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                    activity.type === 'video'
                      ? 'bg-accent-500/15 text-accent-100 border-accent-500/40'
                      : activity.type === 'chat'
                        ? 'bg-primary-500/15 text-primary-100 border-primary-500/40'
                        : 'bg-white/10 text-white border-white/20'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${activity.type === 'video' ? 'bg-accent-400' : activity.type === 'chat' ? 'bg-primary-300' : 'bg-slate-300'}`} />
                    {activity.type === 'video' ? 'completed' : activity.type === 'chat' ? 'doubt solved' : 'quiz'}
                  </span>
                  <span className="text-xs text-slate-400">{activity.time}</span>
                </div>
              </div>
            ))}
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
                  background: `conic-gradient(${(stats.averageScore < 50 ? '#ef4444' : stats.averageScore < 75 ? '#fbbf24' : '#22c55e')} ${stats.averageScore}%, #1f2937 0)`
                }}
              >
                <div className="w-[78%] h-[78%] rounded-full bg-[#0f172a] flex items-center justify-center border border-white/10">
                  <span className="text-3xl font-bold">{stats.averageScore}%</span>
                </div>
              </div>
            </div>
            <p className="text-lg font-medium">
              {stats.averageScore < 50 ? 'Low readiness' : stats.averageScore < 75 ? 'Medium readiness' : 'High readiness'}
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
