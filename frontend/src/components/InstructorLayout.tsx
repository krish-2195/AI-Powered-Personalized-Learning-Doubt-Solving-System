import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Upload, HelpCircle, Users, Activity, MessageSquare, User, LogOut, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PageTransition from './PageTransition'

export default function InstructorLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const navItems = [
    { path: '/instructor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/instructor/courses', icon: BookOpen, label: 'My Courses' },
    { path: '/instructor/upload', icon: Upload, label: 'Upload Content' },
    { path: '/instructor/questions', icon: HelpCircle, label: 'Question Bank' },
    { path: '/instructor/analytics', icon: Users, label: 'Student Analytics' },
    { path: '/instructor/ai-analytics', icon: Activity, label: 'AI Analytics' },
    { path: '/instructor/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/instructor/profile', icon: User, label: 'Profile' },
  ]

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'IN'

  return (
    <div className="relative h-screen overflow-hidden text-slate-50 bg-[#0b0c10]">
      <div className="absolute inset-0 bg-grid opacity-50" aria-hidden />
      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" aria-hidden />

      <div className="relative flex h-screen p-3 gap-3">
        {/* Sidebar */}
        <aside className="hidden md:flex w-72 shrink-0 flex-col gap-6 rounded-3xl border border-blue-500/20 bg-surface-900/60 backdrop-blur-xl px-5 py-7 overflow-y-auto shadow-[0_0_40px_rgba(59,130,246,0.05)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">AI Learn</h1>
              <p className="mt-1 text-xs font-medium text-blue-400">Instructor Portal</p>
            </div>
          </div>

          <nav className="mt-4 flex flex-col gap-1.5">
            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Menu</p>
            {navItems.map((item) => {
              const Icon = item.icon
              // Consider /instructor equivalent to /instructor/dashboard
              const isDashboardRoot = item.path === '/instructor/dashboard' && location.pathname === '/instructor'
              const isActive = location.pathname.startsWith(item.path) || isDashboardRoot

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-300 active:scale-[0.98] ${
                    isActive
                      ? 'border-blue-500/40 bg-gradient-to-r from-blue-600/20 via-blue-600/5 to-transparent text-white'
                      : 'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
                  )}
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-300'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto">
            <div className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-surface-800 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-sm font-bold text-blue-400">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user?.full_name || 'Instructor'}</p>
                <p className="truncate text-[11px] font-medium text-slate-400 uppercase tracking-wider">{user?.role}</p>
              </div>
              <button
                onClick={() => { logout(); navigate('/login') }}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-3xl border border-white/[0.06] bg-surface-900/40 backdrop-blur-3xl px-4 py-6 sm:px-6 sm:py-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
