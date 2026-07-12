import { useState, useEffect } from 'react'
import {
  ShieldCheck, LayoutDashboard, Users, FileText,
  RefreshCw, AlertTriangle, LogOut, Activity, Database, Cpu, Bell,
} from 'lucide-react'
import api from '../lib/api'
import DashboardTab from '../components/admin/DashboardTab'
import UsersTab from '../components/admin/UsersTab'
import ContentTab from '../components/admin/ContentTab'

type TabKey = 'dashboard' | 'users' | 'content'

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Platform & AI health' },
  { key: 'users', label: 'Users', icon: Users, hint: 'Accounts & activity' },
  { key: 'content', label: 'Content', icon: FileText, hint: 'Topics, videos & quizzes' },
]

interface AdminPageProps {
  onLogout?: () => void
}

export default function AdminPage({ onLogout }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [stats, setStats] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchStats()
    fetchActivity()
    const intervalId = setInterval(() => {
      fetchStats(false)
      fetchActivity()
    }, 30000)
    return () => clearInterval(intervalId)
  }, [])

  const fetchStats = async (showLoader = true) => {
    if (showLoader) setLoading(true)
    try {
      setError(false)
      const { data } = await api.get('/api/admin/stats')
      setStats(data.data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch admin stats', err)
      setError(true)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  const fetchActivity = async () => {
    try {
      const { data } = await api.get('/api/admin/activity')
      setActivity(data.data)
    } catch (err) {
      console.error('Failed to fetch activity', err)
    }
  }

  const handleRetry = () => {
    setLoading(true)
    fetchStats()
    fetchActivity()
  }

  const handleLogout = () => {
    if (onLogout) return onLogout()
    // Sensible default fallbacks; keep app-specific logic external.
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  const totalPredictions = stats?.totalPredictions ?? stats?.total_predictions ?? '—'
  const activeUsers = stats?.activeUsers ?? stats?.users?.total ?? '—'
  const modelStatus = stats?.modelStatus ?? 'Operational'

  return (
    <div className="pb-20 max-w-7xl mx-auto space-y-6">
      {/* Header — fills full width, no empty sides */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#12141c] shadow-2xl">
        <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-primary-500/10 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 bg-primary-600/5 blur-3xl rounded-full" />

        {/* Top row: title (left) + quick-stats (center, fills gap) + actions (right) */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-5 p-6">
          {/* Title */}
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-500/15 ring-1 ring-primary-500/30">
              <ShieldCheck className="text-primary-500" size={26} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl sm:text-2xl font-black text-white leading-tight">
                Admin Portal
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-400">
                Monitor platform health, AI models, and user activity.
              </p>
            </div>
          </div>

          {/* Middle: quick stats — fills the empty midsection */}
          <div className="hidden lg:grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-[#1a1b23]/70 p-1.5">
            <QuickStat icon={Cpu} label="Model" value={String(modelStatus)} tone="emerald" />
            <QuickStat icon={Activity} label="Predictions" value={String(totalPredictions)} tone="primary" />
            <QuickStat icon={Database} label="Users" value={String(activeUsers)} tone="sky" />
          </div>

          {/* Right: live pill + notifications + logout */}
          <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#1a1b23] px-3 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold text-slate-300">Live</span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Syncing…'}
              </span>
              <button
                onClick={handleRetry}
                className="ml-1 grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition"
                aria-label="Refresh"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            <button
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-800 bg-[#1a1b23] text-slate-400 hover:text-white hover:bg-white/5 transition"
              aria-label="Notifications"
            >
              <Bell size={16} />
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 hover:text-white hover:bg-red-500/80 hover:border-red-500 transition-all"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>

        {/* Tabs strip */}
        <nav
          role="tablist"
          className="relative z-10 flex gap-1 overflow-x-auto border-t border-slate-800/80 bg-black/20 px-3 py-2"
        >
          {TABS.map(({ key, label, icon: Icon, hint }) => {
            const active = activeTab === key
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(key)}
                className={[
                  'group flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-bold whitespace-nowrap transition-all',
                  active
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5',
                ].join(' ')}
              >
                <Icon size={16} className={active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'} />
                <span>{label}</span>
                <span
                  className={[
                    'hidden lg:inline text-[11px] font-medium',
                    active ? 'text-white/70' : 'text-slate-600 group-hover:text-slate-500',
                  ].join(' ')}
                >
                  · {hint}
                </span>
              </button>
            )
          })}
        </nav>
      </header>

      {/* Body */}
      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-[#12141c] p-20 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-400">Loading admin data…</p>
        </div>
      ) : activeTab === 'dashboard' ? (
        error || !stats ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 grid place-items-center mb-4">
              <AlertTriangle size={30} />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Failed to load Dashboard data</h3>
            <p className="text-slate-400 mb-6 max-w-md text-sm">
              The database connection may have timed out while waking up. Please try again.
            </p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600/80 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
            >
              <RefreshCw size={15} />
              Retry Connection
            </button>
          </div>
        ) : (
          <DashboardTab stats={stats} activity={activity} />
        )
      ) : activeTab === 'users' ? (
        <UsersTab />
      ) : (
        <ContentTab />
      )}
    </div>
  )
}

function QuickStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof LayoutDashboard
  label: string
  value: string
  tone: 'primary' | 'emerald' | 'sky'
}) {
  const toneMap = {
    primary: 'text-primary-400 bg-primary-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    sky: 'text-sky-400 bg-sky-500/10',
  } as const
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${toneMap[tone]}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
        <div className="text-sm font-black text-white truncate">{value}</div>
      </div>
    </div>
  )
}
