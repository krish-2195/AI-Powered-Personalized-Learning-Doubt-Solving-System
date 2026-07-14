import { useState, useEffect } from 'react'
import { BookOpen, Users, Star, MoreVertical, Plus, PlayCircle, CheckCircle2 } from 'lucide-react'
import api from '../../lib/api'

type Course = {
  id: number
  title: string
  status: 'Published' | 'Draft'
  students: number
  rating: number
  modules: number
  progress: number
}

export default function InstructorCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/api/instructor/courses')
        if (response.data?.data) {
          setCourses(response.data.data)
        }
      } catch (error) {
        console.error('Failed to fetch courses', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCourses()
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 relative">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">My Courses</h1>
          <p className="text-slate-400 mt-2 font-medium">Manage your curriculum and content modules.</p>
        </div>
        <button 
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Create Course
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-800 border border-white/[0.06] rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Courses</p>
            <h3 className="text-2xl font-black text-white">{courses.length}</h3>
          </div>
        </div>
        <div className="bg-surface-800 border border-white/[0.06] rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Published</p>
            <h3 className="text-2xl font-black text-white">{courses.filter(c => c.status === 'Published').length}</h3>
          </div>
        </div>
        <div className="bg-surface-800 border border-white/[0.06] rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Enrolled</p>
            <h3 className="text-2xl font-black text-white">{courses.reduce((acc, curr) => acc + curr.students, 0)}</h3>
          </div>
        </div>
      </div>

      {/* Course List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="bg-surface-800/50 border border-white/5 rounded-3xl h-64 animate-pulse" />
          ))
        ) : (
          courses.map(course => (
            <div key={course.id} className="bg-surface-800 border border-white/[0.06] rounded-3xl p-6 md:p-8 hover:border-blue-500/30 transition-colors group flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${
                  course.status === 'Published' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {course.status}
                </span>
                <button className="text-slate-400 hover:text-white transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-white mb-6 flex-1">{course.title}</h3>

              {course.status === 'Draft' && (
                <div className="mb-6">
                  <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                    <span>Draft Progress</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="w-full bg-surface-900 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${course.progress}%` }} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/5">
                <div>
                  <div className="text-slate-500 flex items-center gap-1.5 text-sm font-medium mb-1">
                    <Users size={14} /> Students
                  </div>
                  <div className="text-white font-bold">{course.students}</div>
                </div>
                <div>
                  <div className="text-slate-500 flex items-center gap-1.5 text-sm font-medium mb-1">
                    <PlayCircle size={14} /> Modules
                  </div>
                  <div className="text-white font-bold">{course.modules}</div>
                </div>
                <div>
                  <div className="text-slate-500 flex items-center gap-1.5 text-sm font-medium mb-1">
                    <Star size={14} className="text-amber-400" /> Rating
                  </div>
                  <div className="text-white font-bold">{course.rating > 0 ? course.rating : '-'}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
