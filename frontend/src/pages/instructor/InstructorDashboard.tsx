import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, BookOpen, Clock, Activity, ArrowRight } from 'lucide-react'
import api from '../../lib/api'

export default function InstructorDashboard() {
  const [stats, setStats] = useState({
    active_students: 0,
    total_courses: 0,
    avg_quiz_score: '0%',
    watch_time_hrs: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/instructor/stats')
        if (response.data?.data) {
          setStats(response.data.data)
        }
      } catch (error) {
        console.error('Failed to fetch stats', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#12141c] shadow-2xl p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full" />
        <div className="relative z-10 flex min-w-0 items-center gap-5">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-500/30">
            <LayoutDashboard className="text-blue-400" size={32} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
              Instructor Dashboard
            </h1>
            <p className="mt-1 text-slate-400 font-medium">
              Welcome back. Here's what's happening with your students today.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Students', value: loading ? '...' : stats.active_students.toString(), icon: Users, tone: 'text-sky-400', bg: 'bg-sky-500/10' },
          { label: 'Total Courses', value: loading ? '...' : stats.total_courses.toString(), icon: BookOpen, tone: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Avg. Quiz Score', value: loading ? '...' : stats.avg_quiz_score, icon: Activity, tone: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Watch Time (hrs)', value: loading ? '...' : stats.watch_time_hrs.toString(), icon: Clock, tone: 'text-amber-400', bg: 'bg-amber-500/10' }
        ].map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="bg-surface-800 rounded-2xl p-5 border border-white/[0.08] shadow-soft">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.tone}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black text-white mt-1">{stat.value}</h3>
            </div>
          )
        })}
      </div>

      <div className="bg-surface-800 rounded-2xl border border-white/[0.08] shadow-soft p-10 text-center flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4">
          <BookOpen size={32} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Ready to start teaching?</h3>
        <p className="text-slate-400 max-w-md mx-auto mb-6">
          Upload your first video lecture, PDF notes, or create a quiz to get your course started.
        </p>
        <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2">
          Upload Content
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
