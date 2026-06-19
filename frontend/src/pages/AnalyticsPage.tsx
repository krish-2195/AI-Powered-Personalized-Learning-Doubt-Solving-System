import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function AnalyticsPage() {
  const trendData = [
    { date: '12/05', accuracy: 65, topics: 3 },
    { date: '12/12', accuracy: 68, topics: 5 },
    { date: '12/19', accuracy: 72, topics: 7 },
    { date: '12/26', accuracy: 74, topics: 9 },
    { date: '01/02', accuracy: 76, topics: 12 },
  ]

  const topicPerformance = [
    { topic: 'Arrays', score: 85 },
    { topic: 'Linked Lists', score: 75 },
    { topic: 'Trees', score: 65 },
    { topic: 'Graphs', score: 50 },
    { topic: 'DP', score: 40 },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Performance Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Performance Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="accuracy" stroke="#0284c7" strokeWidth={2} />
              <Line type="monotone" dataKey="topics" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Topic Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topicPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="topic" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#0284c7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Weak Topics</h2>
        <div className="space-y-3">
          {['Dynamic Programming', 'Graph Algorithms'].map((topic, idx) => (
            <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-red-900">{topic}</p>
              <p className="text-sm text-red-700 mt-1">Needs improvement - Low accuracy and high time consumption</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
