import { useState, useEffect } from 'react'
import { Search, UserPlus, ShieldOff, Trash2, Mail, CheckCircle2 } from 'lucide-react'
import api from '../../lib/api'

type UserData = {
  id: number
  email: string
  full_name: string | null
  role: string
  status?: string // Add active/inactive status if available
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('instructor')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/admin/users')
      if (response.data?.data) {
        setUsers(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch users', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteSuccess('')
    try {
      await api.post('/api/admin/invite', { email: inviteEmail, role: inviteRole })
      setInviteSuccess(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      setTimeout(() => {
        setIsInviteModalOpen(false)
        setInviteSuccess('')
      }, 2000)
    } catch (error: any) {
      console.error('Failed to send invite', error)
      alert(error.response?.data?.detail || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role: newRole })
      fetchUsers() // Refresh the list
    } catch (error: any) {
      console.error('Failed to update role', error)
      alert(error.response?.data?.detail || 'Failed to update role')
    }
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.full_name && u.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const roleColors = {
    'super_admin': 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    'admin': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    'instructor': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'student': 'bg-slate-500/10 text-slate-400 border-slate-500/30'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 relative">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">User Management</h1>
          <p className="text-slate-400 mt-2 font-medium">Manage platform access, roles, and invitations.</p>
        </div>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2"
        >
          <UserPlus size={18} />
          Invite User
        </button>
      </header>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Search users by email or name..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-900/60 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* User List */}
      <div className="bg-surface-800 border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-surface-900/30">
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">User</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Role</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td colSpan={3} className="p-5">
                      <div className="h-12 bg-surface-700/50 rounded-xl animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-slate-500 font-medium">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold border border-white/5">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white">{user.full_name || 'Anonymous User'}</div>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${roleColors[user.role as keyof typeof roleColors] || roleColors['student']}`}
                      >
                        <option value="student">STUDENT</option>
                        <option value="instructor">INSTRUCTOR</option>
                        <option value="admin">ADMIN</option>
                        <option value="super_admin">SUPER ADMIN</option>
                      </select>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors" title="Suspend User">
                          <ShieldOff size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors" title="Delete User">
                          <Trash2 size={18} />
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

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-800 border border-white/10 rounded-3xl w-full max-w-md shadow-2xl p-8 relative">
            <h2 className="text-2xl font-bold text-white mb-6">Invite New User</h2>
            
            {inviteSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
                <p className="text-emerald-400 font-bold">{inviteSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      className="w-full bg-surface-950/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                      placeholder="instructor@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="w-full bg-surface-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 appearance-none cursor-pointer"
                  >
                    <option value="instructor">Instructor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-surface-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-rose-500/25 disabled:opacity-50"
                  >
                    {inviting ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
