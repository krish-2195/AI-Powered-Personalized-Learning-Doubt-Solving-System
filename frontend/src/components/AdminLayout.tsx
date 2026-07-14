import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Shield, BarChart3, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AdminLayout() {
  const location = useLocation()
  const { logout, user } = useAuth()

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Content Moderation', path: '/admin/content', icon: Shield },
    { name: 'Reports', path: '/admin/reports', icon: BarChart3 }
  ]

  // Render super admin settings if the user is a super_admin
  if (user?.role === 'super_admin') {
    navItems.push({ name: 'System Settings', path: '/admin/settings', icon: Settings })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-300 font-sans flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-950 border-r border-white/5 h-screen sticky top-0 shrink-0">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:shadow-rose-500/40 transition-all">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tight">AdminOps</span>
              <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-none">Command Center</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            // Exact match for dashboard, prefix match for others
            const isActive = item.path === '/admin' 
              ? location.pathname === '/admin' || location.pathname === '/admin/dashboard'
              : location.pathname.startsWith(item.path)
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-rose-500/10 text-rose-400' 
                    : 'hover:bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-rose-400' : 'text-slate-500 group-hover:text-rose-400 transition-colors'} />
                <span className="font-semibold">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="bg-surface-900 rounded-xl p-4 mb-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Logged in as</div>
            <div className="text-white font-bold truncate">{user?.email}</div>
            <div className="text-rose-400 text-xs font-bold capitalize mt-0.5 flex items-center gap-1">
              <Shield size={12} /> {user?.role.replace('_', ' ')}
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-colors text-slate-400 font-semibold"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Top Navigation */}
        <div className="md:hidden sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
          <span className="text-xl font-black text-white tracking-tight">AdminOps</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 w-full bg-surface-950 border-t border-white/5 pb-safe z-50">
        <div className="flex justify-around p-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.path === '/admin' 
              ? location.pathname === '/admin' || location.pathname === '/admin/dashboard'
              : location.pathname.startsWith(item.path)
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  isActive ? 'text-rose-400' : 'text-slate-500'
                }`}
              >
                <Icon size={24} />
                <span className="text-[10px] font-semibold">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
