import { ShieldCheck, Activity, Server, RefreshCw, AlertTriangle } from 'lucide-react'
import { useApiHealth } from '../hooks/useApiHealth'

export default function AdminPage() {
  const { data, isLoading, isError } = useApiHealth()

  const status = isLoading ? 'checking...' : isError ? 'unreachable' : data?.status || 'unknown'
  const statusColor = isError || status !== 'healthy' ? 'text-amber-400' : 'text-accent-300'
  const statusBg = isError || status !== 'healthy' ? 'bg-amber-500/15' : 'bg-accent-500/15'

  return (
    <div className="space-y-6 text-slate-100">
      <div className="card bg-white/10 border-white/10 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Control center</p>
          <h1 className="text-3xl font-bold mt-1">Admin Portal</h1>
          <p className="text-slate-400 mt-1">Monitor backend health and manage platform status.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`pill ${statusBg} border-white/10`}>Backend: <span className={statusColor}>{status}</span></div>
          <RefreshCw className="text-white/70" size={18} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-white/10 border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-500/20 text-primary-200">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-sm text-slate-400">API</p>
              <p className="text-lg font-semibold">Health Status</p>
            </div>
          </div>
          <p className={`mt-3 font-semibold ${statusColor}`}>{status}</p>
          <p className="text-sm text-slate-400">/health endpoint via React Query bridge.</p>
        </div>

        <div className="card bg-white/10 border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-accent-500/20 text-accent-200">
              <Server size={22} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Services</p>
              <p className="text-lg font-semibold">Gateway Ready</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-300">Base URL: {import.meta.env.VITE_API_URL || 'http://localhost:8000'}</p>
          <p className="text-sm text-slate-400">Axios client configured with CORS-ready base URL.</p>
        </div>

        <div className="card bg-white/10 border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-glow-500/20 text-glow-200">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-sm text-slate-400">Actions</p>
              <p className="text-lg font-semibold">Next Steps</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-slate-300 list-disc list-inside">
            <li>Monitor API response times and throughput</li>
            <li>Review user engagement and retention metrics</li>
            <li>Analyze topic performance distributions</li>
          </ul>
        </div>
      </div>

      <div className="card bg-white/10 border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-amber-400" />
          <h2 className="text-xl font-semibold">Debug Panel</h2>
        </div>
        <pre className="bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-slate-200 overflow-x-auto">
{JSON.stringify({ status, baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000' }, null, 2)}
        </pre>
      </div>
    </div>
  )
}
