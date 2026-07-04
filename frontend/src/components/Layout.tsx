import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen, MessageSquare, User, BarChart3, LogOut, Sparkles, Flame } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PageTransition from './PageTransition'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/learning', icon: BookOpen, label: 'Learning' },
    { path: '/chat', icon: MessageSquare, label: 'AI Tutor' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1e1b4b] text-slate-50">
      <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
      <div className="absolute -left-20 top-10 h-64 w-64 bg-primary-500/30 blur-3xl opacity-60 rounded-full floating" aria-hidden />
      <div className="absolute -right-10 bottom-10 h-64 w-64 bg-accent-500/30 blur-3xl opacity-50 rounded-full floating" aria-hidden />

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-72 rounded-r-3xl px-6 py-8 flex flex-col gap-6 bg-gradient-to-b from-[#111827] via-[#141732] to-[#1e1b4b] border border-white/10 shadow-2xl shadow-purple-900/40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white flex items-center justify-center shadow-lg sparkle">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Learn</h1>
              <p className="text-sm text-slate-400">Adaptive Learning Platform</p>
            </div>
          </div>

          <div className="pill">
            <Flame size={16} className="text-glow-600" />
            <span className="font-semibold">Streak: {user?.streak_count || 0} days 🔥</span>
          </div>

          <nav className="mt-2 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all border backdrop-blur active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-600/25 via-primary-600/15 to-accent-500/20 text-white border-primary-500/40 shadow-[0_10px_40px_-18px_rgba(124,58,237,0.8)]'
                      : 'text-slate-200 border-transparent hover:bg-white/5 hover:border-primary-500/30'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-white text-primary-600 shadow' : 'bg-white/10 text-slate-100 group-hover:bg-white/20 group-hover:shadow-sm'}`}>
                    <Icon size={18} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                  {isActive && <span className="ml-auto text-xs text-accent-100">● Live</span>}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary-700 to-accent-600 text-white shadow-lg">
              <p className="text-sm opacity-90">Daily Quest</p>
              <p className="font-semibold mt-1">Finish 2 quizzes today</p>
              <button onClick={() => navigate('/chat')} className="btn-secondary mt-3 w-full bg-white/20 text-white border-white/30 hover:bg-white/30 transition-all cursor-pointer">Jump back in</button>
            </div>

            <button
              onClick={() => { logout(); navigate('/login') }}
              className="mt-4 flex items-center gap-3 text-gray-300 hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-6 py-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
