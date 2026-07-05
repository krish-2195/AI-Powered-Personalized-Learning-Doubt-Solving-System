import { useState, useEffect } from 'react'
import { Search, Eye, Ban } from 'lucide-react'
import api from '../../lib/api'

export default function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
                    }`}>{u.readiness || 'N/A'}</span>
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
                      <button className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="View Profile">
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
    </div>
  )
}
