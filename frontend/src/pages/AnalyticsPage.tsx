import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

type WeakTopic = {
  topic: string
  reason: string
}

type AnalyticsData = {
  weak_topics: WeakTopic[]
  topic_performance: any[]
  trend_data: any[]
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.user_id) return
    
    api.get(`/api/analytics/summary/${user.user_id}`)
      .then(res => {
        setData(res.data.data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Failed to load analytics data')
        setLoading(false)
      })
  }, [user])

  if (loading) return <div className="text-center mt-20">Loading analytics...</div>
  if (error || !data) return <div className="text-center mt-20 text-red-500">{error || 'No data found'}</div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Performance Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-white/10 border-white/10">
          <h2 className="text-xl font-semibold mb-4">Performance Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trend_data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="date" stroke="#ffffff70" />
              <YAxis domain={[0, 100]} stroke="#ffffff70" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
              <Legend />
              <Line type="monotone" dataKey="accuracy" stroke="#0284c7" strokeWidth={2} />
              <Line type="monotone" dataKey="topics" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card bg-white/10 border-white/10">
          <h2 className="text-xl font-semibold mb-4">Topic Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topic_performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="topic" stroke="#ffffff70" />
              <YAxis domain={[0, 100]} stroke="#ffffff70" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
              <Bar dataKey="score" fill="#0284c7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card bg-white/10 border-white/10">
        <h2 className="text-xl font-semibold mb-4">Weak Topics</h2>
        {data.weak_topics.length === 0 ? (
          <p className="text-slate-400">No weak topics detected. Great job!</p>
        ) : (
          <div className="space-y-3">
            {data.weak_topics.map((item, idx) => (
              <div key={idx} className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="font-medium text-red-400">{item.topic}</p>
                <p className="text-sm text-red-300/70 mt-1">{item.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
