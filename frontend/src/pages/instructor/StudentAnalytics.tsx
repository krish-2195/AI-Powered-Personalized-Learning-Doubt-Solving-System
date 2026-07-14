import { useState, useEffect } from 'react'
import { Search, Users, ShieldAlert, TrendingUp, TrendingDown, Clock, Activity, MessageSquare } from 'lucide-react'
import api from '../../lib/api'

type Student = {
  id: number
  name: string
  email: string
  completion: number
  avg_score: number
  last_active: string
  risk_level: 'High' | 'Medium' | 'Low'
}

export default function StudentAnalytics() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get('/api/instructor/students')
        if (response.data?.data) {
          setStudents(response.data.data)
        }
      } catch (error) {
        console.error('Failed to fetch students', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [])

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const riskColors = {
    'High': 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    'Medium': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'Low': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Student Analytics</h1>
          <p className="text-slate-400 mt-2 font-medium">Detailed performance metrics for your enrolled students.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-surface-800 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-400" />
            <span className="text-sm font-bold text-white">
              {students.filter(s => s.risk_level === 'High').length} At Risk
            </span>
          </div>
          <div className="bg-surface-800 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            <span className="text-sm font-bold text-white">{students.length} Total</span>
          </div>
        </div>
      </header>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search students by name or email..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-900/60 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
          />
        </div>
        <select className="bg-surface-900/60 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none min-w-[160px]">
          <option value="all">All Students</option>
          <option value="high">High Risk Only</option>
          <option value="medium">Medium Risk</option>
          <option value="low">On Track</option>
        </select>
      </div>

      {/* Student List */}
      <div className="bg-surface-800 border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-surface-900/30">
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Student</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Progress</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Avg Score</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Last Active</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    <td colSpan={6} className="p-5">
                      <div className="h-12 bg-surface-700/50 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                    No students found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-bold text-white">{student.name}</div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 w-48">
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-400">Completion</span>
                        <span className="text-white">{student.completion}%</span>
                      </div>
                      <div className="w-full bg-surface-900 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full" 
                          style={{ width: `${student.completion}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${student.avg_score >= 80 ? 'text-emerald-400' : student.avg_score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {student.avg_score}%
                        </span>
                        {student.avg_score >= 80 ? (
                          <TrendingUp size={14} className="text-emerald-400" />
                        ) : (
                          <TrendingDown size={14} className="text-rose-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock size={14} />
                        {student.last_active}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${riskColors[student.risk_level]}`}>
                        {student.risk_level} Risk
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors" title="Message Student">
                          <MessageSquare size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="View Full Profile">
                          <Activity size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
