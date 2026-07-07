import { useState, useEffect } from 'react'
import { User, BookOpen, Clock, Activity, Target, Award, Brain } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authUser?.user_id) return

    const fetchProfileData = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([
          api.get(`/api/users/profile/${authUser.user_id}`),
          api.get(`/api/users/stats/${authUser.user_id}`)
        ])
        
        // FastAPI returns { data: ..., message: ... } for these endpoints
        setProfile(profileRes.data.data || profileRes.data)
        setStats(statsRes.data.data || statsRes.data)
      } catch (error) {
        console.error("Failed to load profile data", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [authUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center mt-32 space-x-2">
        <div className="w-4 h-4 rounded-full bg-primary-400 animate-bounce"></div>
        <div className="w-4 h-4 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-4 h-4 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    )
  }

  const courseMapping: Record<string, string> = {
    'ai': 'Artificial Intelligence (AI)',
    'aiml': 'AI & Machine Learning',
    'cs': 'Computer Science',
    'cse': 'Computer Science Engineering',
  }
  const displayCourse = profile?.course ? (courseMapping[profile.course.toLowerCase()] || profile.course) : 'Unknown'

  if (!profile) {
    return <div className="text-center mt-32 text-slate-400">Failed to load profile</div>
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto page-enter">
      <div className="flex items-center gap-4">
        <div className="sparkle grid place-items-center h-14 w-14 rounded-2xl border border-primary-400/30 bg-primary-500/15 text-primary-300 shrink-0">
          <User size={28} />
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
          Profile <span className="gradient-text">& Settings</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="card text-slate-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 via-primary-500 to-accent-500 flex items-center justify-center text-2xl font-display font-bold shadow-glow">
              {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold">{profile.full_name}</h2>
              <p className="text-sm text-slate-400">{profile.email}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-xs uppercase text-slate-400 font-semibold flex items-center gap-2">
                <BookOpen size={14} /> Course
              </span>
              <p className="mt-1 font-medium">{displayCourse}</p>
            </div>
            
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-xs uppercase text-slate-400 font-semibold flex items-center gap-2">
                <Target size={14} /> Exam Target
              </span>
              <p className="mt-1 font-medium">{profile.exam_target} ({profile.exam_timeline})</p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-xs uppercase text-slate-400 font-semibold flex items-center gap-2">
                <Activity size={14} /> Joined
              </span>
              <p className="mt-1 font-medium">{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Recently'}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-xs uppercase text-slate-400 font-semibold flex items-center gap-2">
                <Target size={14} /> Current Prediction
              </span>
              <p className="mt-1 font-medium text-amber-400">Needs Improvement</p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-xs uppercase text-slate-400 font-semibold flex items-center gap-2">
                <Brain size={14} /> Learning Style
              </span>
              <p className="mt-1 font-medium">Visual Learner</p>
            </div>
          </div>
        </div>

        {/* Stats & Readiness */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card text-slate-100">
            <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
              <Activity className="text-accent-400" size={20} /> Learning Statistics
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-primary-500/20 text-primary-300 rounded-lg">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Quizzes Completed</p>
                  <p className="text-2xl font-bold">{stats?.total_quizzes_completed || 0}</p>
                </div>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-accent-500/20 text-accent-300 rounded-lg">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Hours Spent</p>
                  <p className="text-2xl font-bold">{stats?.time_spent_hours || 0}</p>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Average Score</p>
                  <p className="text-2xl font-bold">{stats?.average_score || 0}%</p>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-green-500/20 text-green-400 rounded-lg">
                  <Award size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Topics Mastered</p>
                  <p className="text-2xl font-bold">{stats?.topics_mastered || 0}</p>
                </div>
              </div>
              
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-red-500/20 text-red-400 rounded-lg">
                  <Target size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Weak Topics</p>
                  <p className="text-2xl font-bold">{stats?.weak_topics || 0}</p>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 text-purple-400 rounded-lg">
                  <BookOpen size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-400 font-medium">Videos Watched</p>
                  <p className="text-2xl font-bold">{stats?.total_videos_watched || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Exam Readiness */}
          <div className="card text-slate-100">
            <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
              <Brain className="text-primary-400" size={20} /> Exam Readiness
            </h2>
            {stats?.exam_readiness?.label === "Not enough data" ? (
              <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
                <p className="text-3xl mb-2">🧊</p>
                <p className="text-amber-300 font-semibold text-sm">Cold Start Detected</p>
                <p className="text-slate-400 text-sm mt-1">{stats.exam_readiness.reason}</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{
                      background: `conic-gradient(${(stats?.exam_readiness?.score < 50 ? '#ef4444' : stats?.exam_readiness?.score < 75 ? '#fbbf24' : '#22c55e')} ${stats?.exam_readiness?.score || 0}%, #1f2937 0)`
                    }}
                  >
                    <div className="w-[78%] h-[78%] rounded-full bg-surface-950 flex items-center justify-center border border-white/10">
                      <span className="text-2xl font-bold">{stats?.exam_readiness?.score || 0}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-lg font-semibold">{stats?.exam_readiness?.label}</p>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    stats?.exam_readiness?.confidence === 'Low' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    stats?.exam_readiness?.confidence === 'Medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {stats?.exam_readiness?.confidence === 'Low' ? '🔴' : stats?.exam_readiness?.confidence === 'Medium' ? '🟡' : '🟢'} {stats?.exam_readiness?.confidence} Confidence
                  </div>
                  <p className="text-sm text-slate-400">{stats?.exam_readiness?.reason}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Subjects Grid */}
          <div className="card text-slate-100">
            <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
              <Brain className="text-primary-400" size={20} /> My Subjects
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.subjects && profile.subjects.map((sub: string, idx: number) => (
                <span key={idx} className="px-4 py-2 bg-primary-500/10 text-primary-200 border border-primary-500/30 rounded-lg text-sm font-medium">
                  {sub}
                </span>
              ))}
              {(!profile.subjects || profile.subjects.length === 0) && (
                <p className="text-slate-400 text-sm">No subjects selected.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
