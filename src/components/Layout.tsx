import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen, MessageSquare, User, BarChart3, LogOut, Sparkles, Flame, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PageTransition from './PageTransition'
import StreakWidget from './StreakWidget'
import StreakCelebration from './StreakCelebration'

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

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'AL'

  return (
    <div className="relative h-screen overflow-hidden text-slate-50">
      <StreakCelebration />
      <div className="absolute inset-0 bg-grid opacity-70" aria-hidden />
      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-primary-500/25 blur-3xl floating" aria-hidden />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-accent-500/20 blur-3xl floating" aria-hidden />

      <div className="relative flex h-screen p-3 gap-3">
        {/* Sidebar */}
        <aside className="hidden md:flex w-72 shrink-0 flex-col gap-6 rounded-3xl border border-white/10 glass-panel px-5 py-7 overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="sparkle flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-glow">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">AI Learn</h1>
              <p className="mt-1 text-xs text-slate-400">Adaptive Learning</p>
            </div>
          </div>

          <StreakWidget />

          <nav className="mt-1 flex flex-col gap-1.5">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Menu</p>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-300 active:scale-[0.98] ${
                    isActive
                      ? 'border-primary-500/40 bg-gradient-to-r from-primary-600/25 via-primary-600/10 to-accent-500/15 text-white shadow-[0_12px_40px_-20px_rgba(124,58,237,0.9)]'
                      : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary-400 to-accent-400" />
                  )}
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                      isActive
                        ? 'bg-white text-primary-600 shadow'
                        : 'bg-white/[0.06] text-slate-200 group-hover:bg-white/15'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-primary-700/80 to-accent-600/70 p-4 text-white shadow-soft">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/80">
                  <Zap size={13} /> Daily Quest
                </div>
                <p className="font-semibold">Finish 2 quizzes today</p>
                <button
                  onClick={() => navigate('/chat')}
                  className="mt-3 w-full rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-white/25"
                >
                  Jump back in
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 text-sm font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user?.full_name || 'Student'}</p>
                <p className="truncate text-xs text-slate-400">{user?.email || ''}</p>
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
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden rounded-3xl border border-white/[0.06] bg-white/[0.015] px-4 py-6 sm:px-6 sm:py-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
