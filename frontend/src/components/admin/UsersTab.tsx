import { useState, useEffect } from 'react'
import { Search, Eye, Ban, Users } from 'lucide-react'
import api from '../../lib/api'

export default function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    api.get('/api/admin/users').then(res => {
      setUsers(res.data.data)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

  const formatCourse = (courseCode: string) => {
    if (!courseCode || courseCode === 'N/A') return 'Not Set';
    const mapping: Record<string, string> = {
      'CS': 'Computer Science',
      'AI': 'Artificial Intelligence',
      'IT': 'Information Technology',
      'SE': 'Software Engineering',
      'DS': 'Data Science'
    };
    return mapping[courseCode.toUpperCase()] || courseCode;
  };

  return (
    <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 rounded-2xl border border-white/[0.08] shadow-soft overflow-hidden">
      <div className="p-6 border-b border-white/[0.08] flex flex-col md:flex-row justify-between md:items-center gap-4 bg-surface-800">
        <h2 className="text-xl font-display font-bold text-slate-100 flex items-center gap-3"><span className="grid place-items-center h-9 w-9 rounded-xl border border-primary-400/30 bg-primary-500/15 text-primary-300"><Users size={18}/></span> User Management</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
          <input type="text" placeholder="Search users by name or email..." className="pl-10 pr-4 py-2 bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.08] rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none w-full md:w-80 text-white placeholder-slate-500" />
        </div>
      </div>
      
      {loading ? (
        <div className="p-10 text-center text-slate-500 font-semibold">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="p-10 text-center text-slate-500 font-semibold">No users found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-800 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-white/[0.08]">
                <th className="p-4">User</th>
                <th className="p-4">Course</th>
                <th className="p-4">Readiness</th>
                <th className="p-4 text-center">Quizzes</th>
                <th className="p-4">Last Login</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map(u => (
                <tr key={u.user_id} className="hover:bg-surface-800 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center font-bold text-sm uppercase">
                      {u.name.substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold text-white">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-300 font-medium">{formatCourse(u.course)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      u.readiness === 'High' ? 'bg-green-500/10 text-green-400' : 
                      u.readiness === 'Low' ? 'bg-red-500/10 text-red-400' : 
                      u.readiness === 'Moderate' ? 'bg-amber-500/10 text-amber-400' : 
                      'bg-slate-800 text-slate-400'
                    }`}>{!u.readiness || u.readiness === 'N/A' ? 'Not Evaluated' : u.readiness}</span>
                  </td>
                  <td className="p-4 text-sm font-bold text-white text-center">{u.total_quizzes}</td>
                  <td className="p-4 text-sm text-slate-400">{u.last_active_date === 'Never' ? 'Never Logged In' : u.last_active_date}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border flex items-center justify-center w-max mx-auto gap-1.5 ${u.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-800 text-slate-400 border-white/10'}`}>
                      {u.status === 'Active' && <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>}
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setSelectedUser(u)
                          setIsModalOpen(true)
                          setModalLoading(true)
                          api.get(`/api/admin/users/${u.user_id}`).then(res => {
                            setUserDetails(res.data.data)
                            setModalLoading(false)
                          }).catch(() => setModalLoading(false))
                        }}
                        className="p-1.5 text-primary-400 hover:bg-primary-500/20 rounded-lg transition-colors group relative" 
                        title="View User"
                      >
                        <Eye size={18}/>
                      </button>
                      <button className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors group relative" title="Disable User">
                        <Ban size={18}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Student Details Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-850/80 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-3xl w-full max-w-4xl shadow-2xl border border-white/[0.08] flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/[0.08] flex justify-between items-center bg-surface-800 rounded-t-3xl">
              <h2 className="text-xl font-display font-bold text-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-sm uppercase">
                  {selectedUser.name.substring(0, 2)}
                </div>
                Student Profile: {selectedUser.name}
              </h2>
              <button onClick={() => {setIsModalOpen(false); setUserDetails(null)}} className="text-slate-500 hover:text-slate-300 transition-colors">
                <Ban size={24}/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-surface-850">
              {modalLoading ? (
                <div className="p-20 text-center text-slate-500 font-semibold flex flex-col items-center">
                   <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                   Loading complete student profile...
                </div>
              ) : userDetails ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info & Readiness */}
                  <div className="space-y-6">
                    <div className="bg-surface-800 p-5 rounded-2xl border border-white/[0.08] shadow-soft">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Overview</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500 font-semibold">Email:</span> <span className="font-bold text-white">{selectedUser.email}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 font-semibold">Course:</span> <span className="font-bold text-white">{formatCourse(selectedUser.course)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 font-semibold">Last Active:</span> <span className="font-bold text-white">{selectedUser.last_active_date === 'Never' ? 'Never Logged In' : selectedUser.last_active_date}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 font-semibold">Total Quizzes:</span> <span className="font-bold text-white">{selectedUser.total_quizzes} attempts</span></div>
                      </div>
                    </div>
                    
                    <div className="bg-surface-800 p-5 rounded-2xl border border-white/[0.08] shadow-soft">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Exam Readiness</h3>
                      <div className="flex items-center gap-4">
                        <div className="text-4xl font-black text-primary-500">{userDetails.examReadiness?.score || 0}%</div>
                        <div>
                          <p className="font-bold text-white">{userDetails.examReadiness?.level || 'Not Evaluated'}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Probability of passing exam</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-surface-800 p-5 rounded-2xl border border-white/[0.08] shadow-soft">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Machine Learning Prediction</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-semibold text-sm">Current Mastery Label:</span> 
                          <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                            userDetails.prediction?.label === 'Strong' ? 'bg-green-500/20 text-green-400' :
                            userDetails.prediction?.label === 'Weak' ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>{userDetails.prediction?.label || 'Moderate'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-semibold text-sm">Prediction Confidence:</span> 
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.round((userDetails.prediction?.confidence || 0.8)*100)}%` }}></div>
                            </div>
                            <span className="font-bold text-white text-sm">{Math.round((userDetails.prediction?.confidence || 0.8)*100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weak Topics & Activity */}
                  <div className="space-y-6 flex flex-col">
                    <div className="bg-surface-800 p-5 rounded-2xl border border-white/[0.08] shadow-soft">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest flex justify-between items-center">
                        <span>Weak Topics</span>
                        <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded font-bold">{userDetails.weakTopics?.length || 0} Found</span>
                      </h3>
                      {userDetails.weakTopics && userDetails.weakTopics.length > 0 ? (
                        <div className="space-y-3">
                          {userDetails.weakTopics.map((wt: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                              <span className="font-bold text-white text-sm">{wt.topic}</span>
                              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">{wt.score}% accuracy</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4 font-semibold">No weak topics identified yet.</p>
                      )}
                    </div>

                    <div className="bg-surface-800 p-5 rounded-2xl border border-white/[0.08] shadow-soft flex-1">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Recent Activity (Last 5)</h3>
                      <div className="space-y-3">
                        {userDetails.recentActivity && userDetails.recentActivity.slice(0, 5).map((act: any, idx: number) => (
                          <div key={idx} className="text-sm flex gap-3 pb-3 border-b border-white/[0.06] last:border-0 last:pb-0">
                            <span className="text-[10px] font-bold text-slate-500 uppercase w-16 shrink-0 mt-0.5">{new Date(act.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                            <span className="font-semibold text-slate-300 line-clamp-2">{act.title || act.type}</span>
                          </div>
                        ))}
                        {(!userDetails.recentActivity || userDetails.recentActivity.length === 0) && (
                          <p className="text-sm text-slate-500 text-center py-4 font-semibold">No recent activity.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center text-red-500 font-semibold">Failed to load student details.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
