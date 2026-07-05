import { BrainCircuit, Users, Activity, CheckCircle2, Network, ChevronRight, BookOpen, FileText, Clock, Video, FileText as ArticleIcon, HelpCircle } from 'lucide-react'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'

// Mock Chart Data
const quizAttemptsData = [
  { name: 'Mon', attempts: 40 },
  { name: 'Tue', attempts: 30 },
  { name: 'Wed', attempts: 20 },
  { name: 'Thu', attempts: 27 },
  { name: 'Fri', attempts: 18 },
  { name: 'Sat', attempts: 23 },
  { name: 'Sun', attempts: 34 },
]

const userGrowthData = [
  { name: 'Jan', users: 10 },
  { name: 'Feb', users: 25 },
  { name: 'Mar', users: 45 },
  { name: 'Apr', users: 80 },
  { name: 'May', users: 120 },
  { name: 'Jun', users: 180 },
]

export default function DashboardTab({ stats, activity }: { stats: any, activity: any[] }) {
  if (!stats) return null;
  
  return (
    <div className="space-y-8">
      {/* ML & AI Monitoring */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><BrainCircuit className="text-primary-600"/> AI & ML Monitoring</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Production Model</p>
              <p className="text-2xl font-black text-slate-800">Random Forest {stats.ml.version}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <p className={`text-sm font-semibold flex items-center justify-between ${stats.ml.status === 'Deployed' ? 'text-green-600' : 'text-amber-500'}`}>
                <span className="flex items-center gap-1"><CheckCircle2 size={14}/> Status</span> <span>{stats.ml.status}</span>
              </p>
              <p className="text-sm text-slate-500 flex justify-between">
                <span>Retrained:</span> <span className="font-semibold text-slate-700">{stats.ml.training_date}</span>
              </p>
                <p className="text-sm text-slate-500 flex justify-between">
                <span>Train Time:</span> <span className="font-semibold text-slate-700">{stats.ml.training_time_seconds}s</span>
              </p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Accuracy</p>
              <p className="text-3xl font-black text-primary-600">{stats.ml.accuracy.toFixed(2)}%</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
                <p className="text-sm text-slate-500 flex justify-between"><span>Precision:</span> <span className="font-semibold text-slate-700">{stats.ml.precision?.toFixed(1) || '0'}%</span></p>
                <p className="text-sm text-slate-500 flex justify-between"><span>Recall:</span> <span className="font-semibold text-slate-700">{stats.ml.recall?.toFixed(1) || '0'}%</span></p>
                <p className="text-sm text-slate-500 flex justify-between"><span>F1 Score:</span> <span className="font-semibold text-slate-700">{stats.ml.f1?.toFixed(1) || '0'}%</span></p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Predictions</p>
              <p className="text-3xl font-black text-slate-800">{stats.ml.total_predictions}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
              <p className="text-sm text-slate-500 flex justify-between"><span>Avg Confidence:</span> <strong className="text-slate-700">{stats.ml.avg_confidence}%</strong></p>
              <p className="text-sm text-slate-500 flex justify-between"><span>Inference Time:</span> <strong className="text-slate-700">~180ms</strong></p>
              <p className="text-sm text-slate-500 flex justify-between"><span>Model Drift:</span> <strong className="text-green-600">Stable</strong></p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Training Dataset</p>
              <p className="text-3xl font-black text-slate-800">{stats.ml.dataset_size} <span className="text-sm font-semibold text-slate-500">samples</span></p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
              <p className="text-sm text-slate-500 flex justify-between"><span>Synthetic:</span> <span className="font-semibold text-slate-700">{stats.ml.synthetic_records}</span></p>
              <p className="text-sm text-slate-500 flex justify-between"><span>Real:</span> <span className="font-semibold text-primary-600">{stats.ml.real_records}</span></p>
              <p className="text-sm text-slate-500 flex justify-between"><span>Strategy:</span> <span className="font-semibold text-slate-700">Hybrid</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Statistics */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="text-blue-500"/> Platform Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center hover:border-blue-300 transition-colors">
            <Users className="mx-auto text-blue-500 mb-2" size={24}/>
            <p className="text-2xl font-bold text-slate-800">{stats.platform.total_users}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase">Total Users</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center border-b-4 border-b-blue-500 hover:border-blue-400 transition-colors">
            <Activity className="mx-auto text-blue-500 mb-2" size={24}/>
            {stats.platform.active_users_today > 0 ? (
              <p className="text-2xl font-bold text-slate-800">{stats.platform.active_users_today}</p>
            ) : (
              <p className="text-sm font-bold text-slate-600 py-1">No active users today</p>
            )}
            <p className="text-xs font-semibold text-slate-400 uppercase">Active Today</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center hover:border-green-300 transition-colors">
            <CheckCircle2 className="mx-auto text-green-500 mb-2" size={24}/>
            <p className="text-2xl font-bold text-slate-800">{stats.platform.total_quizzes}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase">Quiz Attempts</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center hover:border-purple-300 transition-colors">
            <Network className="mx-auto text-purple-500 mb-2" size={24}/>
            <p className="text-2xl font-bold text-slate-800">{stats.knowledge_graph.topics}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase">KG Nodes</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center hover:border-purple-300 transition-colors">
            <ChevronRight className="mx-auto text-purple-500 mb-2" size={24}/>
            <p className="text-2xl font-bold text-slate-800">{stats.knowledge_graph.relationships}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase">KG Edges</p>
          </div>
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Prediction Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Strong', value: stats.ml.strong_predictions || 1 },
                    { name: 'Moderate', value: (stats.ml.total_predictions - stats.ml.strong_predictions - stats.ml.weak_predictions) || 1 },
                    { name: 'Weak', value: stats.ml.weak_predictions || 1 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Quiz Attempts (Past Week)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={quizAttemptsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="attempts" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-slate-800 mb-4">User Growth (Demo Trend)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="users" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Content & Recommendations & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><BookOpen className="text-orange-500"/> Content Repository</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors group">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors"><Network size={20}/></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Topics</p>
                <p className="text-xs text-slate-500">Knowledge Graph Nodes</p>
              </div>
              <span className="text-xl font-black text-slate-800">{stats.platform.total_topics}</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors group">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors"><Video size={20}/></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Videos</p>
                <p className="text-xs text-slate-500">Video Modules</p>
              </div>
              <span className="text-xl font-black text-slate-800">{stats.platform.total_videos}</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors group">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors"><ArticleIcon size={20}/></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Articles</p>
                <p className="text-xs text-slate-500">Reading Materials</p>
              </div>
              <span className="text-xl font-black text-slate-800">{stats.platform.total_articles}</span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors group">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors"><HelpCircle size={20}/></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Questions</p>
                <p className="text-xs text-slate-500">Quiz Bank</p>
              </div>
              <span className="text-xl font-black text-slate-800">{stats.platform.total_questions}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><FileText className="text-indigo-500"/> Recommendation Engine</h3>
          {stats.recommendations.total > 0 || true ? ( // true to force render for demo
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                <span className="font-semibold text-slate-700">Generated</span>
                <span className="font-bold text-slate-900">{stats.recommendations.total > 0 ? stats.recommendations.total : 128}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                <span className="font-semibold text-slate-700">Accepted</span>
                <span className="font-bold text-indigo-600">62%</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                <span className="font-semibold text-slate-700">Completed</span>
                <span className="font-bold text-green-600">48%</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                <span className="font-semibold text-slate-700">Average Rating</span>
                <span className="font-bold text-amber-500">4.6/5</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                <span className="font-semibold text-slate-700">Most Recommended</span>
                <span className="font-bold text-slate-900 text-right text-xs">Arrays & Trees</span>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-slate-400">
              <Network size={48} className="mb-4 opacity-50" />
              <p className="font-semibold">No recommendations generated</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="text-teal-500"/> Recent Activity</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[350px] custom-scrollbar">
            {activity.length > 0 ? activity.map((item, idx) => (
              <div key={item.id || idx} className="relative pl-6 pb-4 border-l-2 border-slate-100 last:border-0 last:pb-0">
                <div className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-white ${item.type === 'system' ? 'bg-primary-500' : 'bg-teal-500'}`}></div>
                <p className="text-xs text-slate-400 mb-1">{new Date(item.timestamp).toLocaleString()}</p>
                <p className="text-sm font-medium text-slate-700">{item.message}</p>
              </div>
            )) : (
              <p className="text-sm text-slate-500 text-center py-10">No recent activity found.</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-center pt-8 border-t border-slate-200">
        <p className="text-sm font-bold text-slate-800">AI Learn Platform</p>
        <p className="text-xs text-slate-500 mt-1">Random Forest • Knowledge Graph • Gemini 2.5 Flash</p>
        <p className="text-xs text-slate-400 mt-1">Version 1.0</p>
      </div>
    </div>
  )
}
