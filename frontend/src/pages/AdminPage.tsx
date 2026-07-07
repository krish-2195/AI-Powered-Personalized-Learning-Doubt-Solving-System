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
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#12141c] rounded-2xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 min-h-[100px]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-3xl rounded-full"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <ShieldCheck className="text-primary-500" size={28} />
            Admin Portal
          </h1>
          <p className="text-slate-400 mt-1 text-sm font-medium">Monitor platform health, AI models, and user activity.</p>
        </div>
        <div className="relative z-10 flex bg-[#1a1b23] p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
          {['dashboard', 'users', 'content'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2 rounded-lg font-bold text-sm capitalize transition-all whitespace-nowrap ${activeTab === tab ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
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
