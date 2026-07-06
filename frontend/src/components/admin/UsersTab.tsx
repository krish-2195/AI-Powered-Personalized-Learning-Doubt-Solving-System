import { useState, useEffect } from 'react'
import { Search, Eye, Ban } from 'lucide-react'
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-slate-50">
        <h2 className="text-xl font-bold text-slate-800">User Management</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
          <input type="text" placeholder="Search users by name or email..." className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none w-full md:w-80" />
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
              <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Course</th>
                <th className="p-4 font-semibold">Readiness</th>
                <th className="p-4 font-semibold text-center">Quizzes</th>
                <th className="p-4 font-semibold">Last Login</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.user_id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm uppercase">
                      {u.name.substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-700 font-medium">{u.course}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      u.readiness === 'High' ? 'bg-green-100 text-green-700' : 
                      u.readiness === 'Low' ? 'bg-red-100 text-red-700' : 
                      u.readiness === 'Moderate' ? 'bg-amber-100 text-amber-700' : 
                      'bg-slate-100 text-slate-700'
                    }`}>{!u.readiness || u.readiness === 'N/A' ? 'Not Evaluated' : u.readiness}</span>
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-700 text-center">{u.total_quizzes}</td>
                  <td className="p-4 text-sm text-slate-500">{u.last_active_date}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${u.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
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
                          api.get(`/api/dashboard/${u.user_id}`).then(res => {
                            setUserDetails(res.data.data)
                            setModalLoading(false)
                          }).catch(() => setModalLoading(false))
                        }}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" 
                        title="View Profile"
                      >
                        <Eye size={18}/>
                      </button>
                      <button className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Disable User">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm uppercase">
                  {selectedUser.name.substring(0, 2)}
                </div>
                Student Profile: {selectedUser.name}
              </h2>
              <button onClick={() => {setIsModalOpen(false); setUserDetails(null)}} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Ban size={24}/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {modalLoading ? (
                <div className="p-20 text-center text-slate-500 font-semibold flex flex-col items-center">
                   <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                   Loading complete student profile...
                </div>
              ) : userDetails ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info & Readiness */}
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">Overview</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Email:</span> <span className="font-semibold text-slate-800">{selectedUser.email}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Course:</span> <span className="font-semibold text-slate-800">{selectedUser.course}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Last Active:</span> <span className="font-semibold text-slate-800">{selectedUser.last_active_date}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Total Quizzes:</span> <span className="font-semibold text-slate-800">{selectedUser.total_quizzes} attempts</span></div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">Exam Readiness</h3>
                      <div className="flex items-center gap-4">
                        <div className="text-4xl font-black text-primary-600">{userDetails.examReadiness?.score || 0}%</div>
                        <div>
                          <p className="font-bold text-slate-800">{userDetails.examReadiness?.level || 'Not Evaluated'}</p>
                          <p className="text-xs text-slate-500">Probability of passing exam</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">Machine Learning Prediction</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Current Mastery Label:</span> 
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            userDetails.prediction?.label === 'Strong' ? 'bg-green-100 text-green-700' :
                            userDetails.prediction?.label === 'Weak' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>{userDetails.prediction?.label || 'Moderate'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Prediction Confidence:</span> 
                          <span className="font-bold text-slate-800">{Math.round((userDetails.prediction?.confidence || 0.8)*100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weak Topics & Activity */}
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider flex justify-between">
                        <span>Weak Topics</span>
                        <span className="text-red-500 font-semibold">{userDetails.weakTopics?.length || 0} Found</span>
                      </h3>
                      {userDetails.weakTopics && userDetails.weakTopics.length > 0 ? (
                        <div className="space-y-3">
                          {userDetails.weakTopics.map((wt: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100">
                              <span className="font-semibold text-red-800 text-sm">{wt.topic}</span>
                              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">{wt.score}% accuracy</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No weak topics identified yet.</p>
                      )}
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1">
                      <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">Recent Activity (Last 5)</h3>
                      <div className="space-y-3">
                        {userDetails.recentActivity && userDetails.recentActivity.slice(0, 5).map((act: any, idx: number) => (
                          <div key={idx} className="text-sm flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                            <span className="text-slate-400 w-16 shrink-0">{new Date(act.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                            <span className="font-medium text-slate-700 line-clamp-2">{act.title || act.type}</span>
                          </div>
                        ))}
                        {(!userDetails.recentActivity || userDetails.recentActivity.length === 0) && (
                          <p className="text-sm text-slate-500 text-center py-4">No recent activity.</p>
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
