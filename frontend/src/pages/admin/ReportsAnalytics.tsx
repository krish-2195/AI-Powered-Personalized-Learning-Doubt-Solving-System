import { useState, useEffect } from 'react'
import { Activity, BrainCircuit, AlertTriangle, TrendingUp, Download, Server, Network } from 'lucide-react'
import api from '../../lib/api'

type ChartData = { name: string, value: number }
type MLStats = {
  version: string
  status: string
  accuracy: number
  precision: number
  recall: number
  f1: number
  dataset_size: number
  synthetic_records: number
  real_records: number
  training_date: string
  training_time_seconds: number
}

export default function ReportsAnalytics() {
  const [mlStats, setMlStats] = useState<MLStats | null>(null)
  const [quizHistory, setQuizHistory] = useState<ChartData[]>([])
  const [userGrowth, setUserGrowth] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/admin/stats')
        if (response.data?.data) {
          const payload = response.data.data;
          setMlStats(payload.ml)
          
          // Map backend arrays to chart format
          if (payload.charts?.quiz_attempts) {
            setQuizHistory(payload.charts.quiz_attempts.map((item: any) => ({
              name: item.name,
              value: item.attempts
            })))
          }
          
          if (payload.charts?.user_growth) {
            setUserGrowth(payload.charts.user_growth.map((item: any) => ({
              name: item.name,
              value: item.users
            })))
          }
        }
      } catch (error) {
        console.error('Failed to fetch analytics', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-400 mt-2 font-medium">Deep dive into platform health, ML models, and growth metrics.</p>
        </div>
        <button className="bg-surface-800 hover:bg-surface-700 text-white font-bold py-3 px-6 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2">
          <Download size={18} />
          Export CSV
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Charts Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* User Growth Chart */}
          <div className="bg-surface-800 border border-white/[0.06] rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">User Growth (6 Months)</h2>
                <p className="text-sm text-slate-400">Total registered accounts on the platform</p>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-2">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-slate-500">Loading chart...</div>
              ) : (
                userGrowth.map((data, idx) => (
                  <div key={idx} className="w-full flex flex-col items-center gap-3 group">
                    <div className="w-full relative h-full flex items-end justify-center">
                      <div className="absolute -top-8 bg-surface-700 text-white text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {data.value}
                      </div>
                      <div 
                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-xl opacity-80 group-hover:opacity-100 transition-all cursor-pointer max-w-[60px]"
                        style={{ height: `${Math.max((data.value / Math.max(...userGrowth.map(d => d.value))) * 100, 5)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{data.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quiz Activity Chart */}
          <div className="bg-surface-800 border border-white/[0.06] rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Activity size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Quiz Attempts (Last 7 Days)</h2>
                <p className="text-sm text-slate-400">Platform-wide engagement metric</p>
              </div>
            </div>
            
            <div className="h-48 flex items-end justify-between gap-2">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-slate-500">Loading chart...</div>
              ) : (
                quizHistory.map((data, idx) => (
                  <div key={idx} className="w-full flex flex-col items-center gap-3 group">
                    <div className="w-full relative h-full flex items-end justify-center">
                      <div className="absolute -top-8 bg-surface-700 text-white text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {data.value}
                      </div>
                      <div 
                        className="w-full bg-emerald-500/80 rounded-t-lg hover:bg-emerald-400 transition-colors cursor-pointer max-w-[40px]"
                        style={{ height: `${Math.max((data.value / (Math.max(...quizHistory.map(d => d.value)) || 1)) * 100, 5)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{data.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column - ML & System Health */}
        <div className="space-y-6">
          
          {/* ML Model Health */}
          <div className="bg-surface-800 border border-rose-500/20 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/10 blur-[50px] rounded-full pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <BrainCircuit size={20} />
              </div>
              <h2 className="text-xl font-bold text-white">ML Core Status</h2>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-slate-400">Active Model</span>
                <span className="text-sm font-bold text-white uppercase tracking-widest">{loading ? '...' : mlStats?.version}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-slate-400">Status</span>
                <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-widest">
                  {loading ? '...' : mlStats?.status}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-slate-400">Prediction Accuracy</span>
                <span className="text-sm font-bold text-rose-400">{mlStats?.accuracy || 0}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-slate-400">F1 Score</span>
                <span className="text-sm font-bold text-white">{((mlStats?.f1 || 0) / 100).toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-400">Last Training</span>
                <span className="text-sm font-bold text-white">{mlStats?.training_date}</span>
              </div>
            </div>
            
            <button className="w-full mt-6 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-rose-500/25 text-sm">
              Force Retrain Model
            </button>
          </div>

          {/* Infrastructure Health */}
          <div className="bg-surface-800 border border-white/[0.06] rounded-3xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Server size={20} className="text-purple-400" />
              Infrastructure
            </h2>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-400 flex items-center gap-1.5"><Network size={12}/> PostgreSQL DB</span>
                  <span className="text-emerald-400">Healthy (24ms ping)</span>
                </div>
                <div className="w-full bg-surface-900 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full w-[15%]" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-400 flex items-center gap-1.5"><Server size={12}/> Redis Cache</span>
                  <span className="text-emerald-400">Healthy (2ms ping)</span>
                </div>
                <div className="w-full bg-surface-900 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full w-[45%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-400 flex items-center gap-1.5"><AlertTriangle size={12}/> Error Rate</span>
                  <span className="text-amber-400">0.05% (Slight spike)</span>
                </div>
                <div className="w-full bg-surface-900 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full w-[5%]" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
