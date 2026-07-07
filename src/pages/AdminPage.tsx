import { useState, useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import api from '../lib/api'
import DashboardTab from '../components/admin/DashboardTab'
import UsersTab from '../components/admin/UsersTab'
import ContentTab from '../components/admin/ContentTab'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'content'>('dashboard')
  const [stats, setStats] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchActivity()
    
    // Automatically update the admin portal data every 30 seconds
    const intervalId = setInterval(() => {
      fetchStats(false) // false to prevent loading spinner on background refresh
      fetchActivity()
    }, 30000)
    
    return () => clearInterval(intervalId)
  }, [])

  const fetchStats = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true)
    }
    try {
      setError(false)
      const { data } = await api.get('/api/admin/stats')
      setStats(data.data)
    } catch (err) {
      console.error("Failed to fetch admin stats", err)
      setError(true)
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }

  const handleRetry = () => {
    setLoading(true)
    fetchStats()
    fetchActivity()
  }

  const fetchActivity = async () => {
    try {
      const { data } = await api.get('/api/admin/activity')
      setActivity(data.data)
    } catch (err) {
      console.error("Failed to fetch activity", err)
    }
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto page-enter">
      {/* Header */}
      <div className="surface relative flex flex-col justify-between gap-6 overflow-hidden p-6 md:flex-row md:items-center min-h-[100px]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-primary-500/15 blur-3xl"></div>
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-accent-500/10 blur-3xl"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 text-white shadow-glow">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-100">Admin <span className="gradient-text">Portal</span></h1>
            <p className="mt-1 text-sm font-medium text-slate-400">Monitor platform health, AI models, and user activity.</p>
          </div>
        </div>
        <div className="relative z-10 flex gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5 backdrop-blur-xl">
          {['dashboard', 'users', 'content'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`whitespace-nowrap rounded-lg px-5 py-2 text-sm font-semibold capitalize transition-all duration-300 ${activeTab === tab ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-glow' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>


      {loading ? (
        <div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : activeTab === 'dashboard' ? (
        error || !stats ? (
          <div className="bg-red-500/10 p-10 rounded-2xl border border-red-500/20 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Failed to load Dashboard data</h3>
            <p className="text-slate-400 mb-6 max-w-md text-sm">The database connection may have timed out while waking up. Please try again.</p>
            <button 
              onClick={handleRetry}
              className="px-6 py-2 bg-red-600/80 text-white font-bold rounded-lg hover:bg-red-500 transition-colors"
            >
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
