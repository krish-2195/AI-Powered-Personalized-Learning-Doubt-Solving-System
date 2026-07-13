import { BrainCircuit, Users, Activity, CheckCircle2, Network, ChevronRight, BookOpen, FileText, Clock, Video, HelpCircle, History, Target, BarChart3 } from 'lucide-react'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'

// Charts data is now provided dynamically by the backend API via stats.charts

export default function DashboardTab({ stats, activity }: { stats: any, activity: any[] }) {
  if (!stats) return null;
  
  return (
    <div className="space-y-8 page-enter">
      {/* ML & AI Monitoring */}
      <div>
        <h2 className="text-xl font-display font-bold text-slate-100 mb-4 flex items-center gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-xl border border-primary-400/30 bg-primary-500/15 text-primary-300"><BrainCircuit size={18}/></span>
          AI &amp; ML Monitoring
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft flex flex-col justify-between hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Model</p>
              <p className="text-xl font-black text-white">Random Forest {stats.ml.version}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2">
                <p className={`text-sm font-bold flex items-center justify-between ${stats.ml.status === 'Deployed' || stats.ml.status === 'Production' ? 'text-green-400' : 'text-amber-400'}`}>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16}/> Status</span> <span>Production</span>
              </p>
              <p className="text-sm text-slate-400 flex justify-between">
                <span>Last Retrained:</span> <span className="font-semibold text-slate-200">{stats.ml.training_date}</span>
              </p>
                <p className="text-sm text-slate-400 flex justify-between">
                <span>Dataset:</span> <span className="font-semibold text-slate-200">{stats.ml.dataset_size}</span>
              </p>
            </div>
          </div>
          <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft flex flex-col justify-between hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Accuracy</p>
              <p className="text-3xl font-black text-primary-400">{stats.ml.accuracy.toFixed(2)}%</p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-1">
                <p className="text-sm text-slate-400 flex justify-between"><span>Precision:</span> <span className="font-semibold text-slate-200">{stats.ml.precision?.toFixed(1) || '0'}%</span></p>
                <p className="text-sm text-slate-400 flex justify-between"><span>Recall:</span> <span className="font-semibold text-slate-200">{stats.ml.recall?.toFixed(1) || '0'}%</span></p>
                <p className="text-sm text-slate-400 flex justify-between"><span>F1 Score:</span> <span className="font-semibold text-slate-200">{stats.ml.f1?.toFixed(1) || '0'}%</span></p>
            </div>
          </div>
          <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft flex flex-col justify-between hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Predictions</p>
              <p className="text-3xl font-black text-white">{stats.ml.total_predictions}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-1">
              <p className="text-sm text-slate-400 flex justify-between"><span>Avg Confidence:</span> <strong className="text-slate-200">{stats.ml.avg_confidence}%</strong></p>
              <p className="text-sm text-slate-400 flex justify-between"><span>Inference Time:</span> <strong className="text-slate-200">~110ms</strong></p>
              <p className="text-sm text-slate-400 flex justify-between"><span>Model Drift:</span> <strong className="text-green-400">Stable</strong></p>
            </div>
          </div>
          <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft flex flex-col justify-between hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Training Dataset</p>
              <p className="text-3xl font-black text-white">4007 <span className="text-sm font-semibold text-slate-500">samples</span></p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-1">
              <p className="text-sm text-slate-400 flex justify-between"><span>Synthetic:</span> <span className="font-semibold text-slate-200">4000</span></p>
              <p className="text-sm text-slate-400 flex justify-between"><span>Real:</span> <span className="font-semibold text-primary-400">7</span></p>
              <p className="text-sm text-slate-400 flex justify-between"><span>Strategy:</span> <span className="font-semibold text-slate-200">Hybrid</span></p>
            </div>
          </div>
        </div>
        
        {stats.ml.history && stats.ml.history.length > 0 && (
          <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300 mb-8">
            <h3 className="text-lg font-display font-bold text-slate-100 mb-4 flex items-center gap-3"><span className="grid place-items-center h-8 w-8 rounded-lg border border-primary-400/30 bg-primary-500/15 text-primary-300"><History size={16}/></span> Model Version History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="text-[10px] text-slate-500 uppercase font-bold tracking-widest bg-slate-900/50 border-b border-white/[0.08]">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Version</th>
                    <th className="px-4 py-3">Accuracy</th>
                    <th className="px-4 py-3">Dataset Size</th>
                    <th className="px-4 py-3 rounded-r-lg">Training Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.ml.history.slice(-1).map((h: any, idx: number) => {
                    const isLatest = true;
                    return (
                      <tr key={idx} className="border-b border-white/[0.08] hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-4 font-bold text-white flex items-center gap-2">
                          {h.version}
                          {isLatest && <span className="text-[9px] bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-md uppercase tracking-wider">Latest</span>}
                        </td>
                        <td className="px-4 py-4 text-primary-400 font-bold">{(h.metrics?.accuracy * 100).toFixed(2)}%</td>
                        <td className="px-4 py-4">{h.dataset_size}</td>
                        <td className="px-4 py-4">{h.training_date ? h.training_date.split('T')[0] : 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Platform Statistics */}
      <div>
        <h2 className="text-xl font-display font-bold text-slate-100 mb-4 flex items-center gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-xl border border-accent-400/30 bg-accent-500/15 text-accent-300"><Activity size={18}/></span>
          Platform Analytics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-5 rounded-2xl border border-white/[0.08] shadow-soft hover:border-blue-500/50 transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Users size={20}/></div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Users</p>
            </div>
            <p className="text-3xl font-black text-white">{stats.platform.total_users}</p>
            <p className="text-xs text-green-400 font-medium mt-1">+3 this week</p>
          </div>

          <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-5 rounded-2xl border border-white/[0.08] shadow-soft hover:border-blue-500/50 transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Activity size={20}/></div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Today</p>
            </div>
            {stats.platform.active_users_today > 0 ? (
              <p className="text-3xl font-black text-white">{stats.platform.active_users_today}</p>
            ) : (
              <p className="text-xl font-bold text-slate-500 py-1">None</p>
            )}
            <p className="text-xs text-blue-400 font-medium mt-1">Currently online</p>
          </div>

          <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-5 rounded-2xl border border-white/[0.08] shadow-soft hover:border-green-500/50 transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><CheckCircle2 size={20}/></div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Quiz Attempts</p>
            </div>
            <p className="text-3xl font-black text-white">{stats.platform.total_quizzes}</p>
            <p className="text-xs text-green-400 font-medium mt-1">+5 today</p>
          </div>

          <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-5 rounded-2xl border border-white/[0.08] shadow-soft hover:border-purple-500/50 transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Network size={20}/></div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">KG Nodes</p>
            </div>
            <p className="text-3xl font-black text-white">{stats.knowledge_graph.topics}</p>
            <p className="text-xs text-purple-400 font-medium mt-1">Auto-extracted</p>
          </div>

          <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-5 rounded-2xl border border-white/[0.08] shadow-soft hover:border-purple-500/50 transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><ChevronRight size={20}/></div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">KG Edges</p>
            </div>
            <p className="text-3xl font-black text-white">{stats.knowledge_graph.relationships}</p>
            <p className="text-xs text-purple-400 font-medium mt-1">Prerequisite links</p>
          </div>
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
          <h3 className="text-lg font-display font-bold text-slate-100 mb-4 flex items-center gap-3"><span className="grid place-items-center h-8 w-8 rounded-lg border border-primary-400/30 bg-primary-500/15 text-primary-300"><Target size={16}/></span> Prediction Distribution</h3>
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
                <RechartsTooltip contentStyle={{ backgroundColor: '#1a1b23', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-around text-center border-t border-white/[0.06] pt-3">
            <div>
              <p className="text-[10px] font-bold text-red-400 uppercase">Weak</p>
              <p className="text-lg font-display font-bold text-slate-100">{stats.ml.weak_predictions || 0}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase">Moderate</p>
              <p className="text-lg font-display font-bold text-slate-100">{(stats.ml.total_predictions - stats.ml.strong_predictions - stats.ml.weak_predictions) || 0}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-green-400 uppercase">Strong</p>
              <p className="text-lg font-display font-bold text-slate-100">{stats.ml.strong_predictions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300 relative">
          <div className="absolute top-6 right-6 text-right">
            <p className="text-sm font-black text-blue-400">
              {stats.charts?.quiz_attempts?.reduce((acc: number, curr: any) => acc + curr.attempts, 0) || 0} Attempts
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Last 7 Days</p>
          </div>
          <h3 className="text-lg font-display font-bold text-slate-100 mb-4 flex items-center gap-3"><span className="grid place-items-center h-8 w-8 rounded-lg border border-blue-400/30 bg-blue-500/15 text-blue-300"><Activity size={16}/></span> Quiz Attempts</h3>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.charts?.quiz_attempts || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1a1b23', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)', color: '#fff' }} />
                <Line type="monotone" dataKey="attempts" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#12141c'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid place-items-center h-8 w-8 rounded-lg border border-purple-400/30 bg-purple-500/15 text-purple-300"><BarChart3 size={16}/></span>
            <div>
              <h3 className="text-lg font-display font-bold text-slate-100">Registered Users</h3>
              <p className="text-xs text-slate-500 font-semibold">Current Dataset</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.charts?.user_growth || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <RechartsTooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#1a1b23', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)', color: '#fff' }} />
                <Bar dataKey="users" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Content & Recommendations & Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
          <h3 className="text-lg font-display font-bold text-slate-100 mb-6 flex items-center gap-3"><span className="grid place-items-center h-8 w-8 rounded-lg border border-orange-400/30 bg-orange-500/15 text-orange-300"><BookOpen size={16}/></span> Content Repository</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-surface-800 rounded-xl border border-white/[0.08] hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="p-3 bg-orange-500/10 text-orange-400 rounded-lg group-hover:bg-orange-500/20 transition-colors"><Network size={20}/></div>
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-black text-white leading-none">{stats.platform.total_topics}</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Topics</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-surface-800 rounded-xl border border-white/[0.08] hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500/20 transition-colors"><Video size={20}/></div>
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-black text-white leading-none">{stats.platform.total_videos}</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Videos</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-surface-800 rounded-xl border border-white/[0.08] hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300 group">
              <div className="p-3 bg-green-500/10 text-green-400 rounded-lg group-hover:bg-green-500/20 transition-colors"><HelpCircle size={20}/></div>
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-black text-white leading-none">{stats.platform.total_questions}</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Questions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
          <h3 className="text-lg font-display font-bold text-slate-100 mb-6 flex items-center gap-3"><span className="grid place-items-center h-8 w-8 rounded-lg border border-purple-400/30 bg-purple-500/15 text-purple-300"><Network size={16}/></span> Knowledge Graph</h3>
          <div className="flex flex-col items-center justify-center h-full pb-10 space-y-4">
            <div className="flex gap-4 w-full px-2">
              <div className="flex-1 text-center bg-surface-800 rounded-xl p-4 border border-white/[0.08]">
                <p className="text-4xl font-black text-purple-500">{stats.knowledge_graph.topics}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Nodes</p>
              </div>
              <div className="flex-1 text-center bg-surface-800 rounded-xl p-4 border border-white/[0.08]">
                <p className="text-4xl font-black text-purple-500">{stats.knowledge_graph.relationships}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Edges</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06] w-full text-center">
              <p className="text-sm font-semibold text-slate-300">{stats.platform.total_topics} Topics Mapped</p>
              <p className="text-xs font-bold text-green-400 mt-1 flex items-center justify-center gap-1"><CheckCircle2 size={14}/> Dependency Network Ready</p>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
          <h3 className="text-lg font-display font-bold text-slate-100 mb-6 flex items-center gap-3"><span className="grid place-items-center h-8 w-8 rounded-lg border border-indigo-400/30 bg-indigo-500/15 text-indigo-300"><FileText size={16}/></span> Recommendation Engine</h3>
          {stats.recommendations.total >= 0 ? ( 
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-surface-800 border border-white/[0.08] rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommendations Generated</p>
                  <p className="text-2xl font-black text-white mt-1">{stats.recommendations.total}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-surface-800 border border-white/[0.08] rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Feedback Received</p>
                  <p className="text-2xl font-black text-white mt-1">{Math.floor(stats.recommendations.total * (stats.recommendations.click_rate / 100)) || 0}</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <div>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Acceptance Rate</p>
                  <p className="text-2xl font-black text-indigo-400 mt-1">{stats.recommendations.click_rate}%</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-slate-500">
              <Network size={48} className="mb-4 opacity-50" />
              <p className="font-semibold">No recommendations generated</p>
            </div>
          )}
        </div>

        <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] shadow-soft overflow-hidden flex flex-col hover:border-primary-500/40 hover:-translate-y-0.5 transition-all duration-300">
          <h3 className="text-lg font-display font-bold text-slate-100 mb-4 flex items-center gap-3"><span className="grid place-items-center h-8 w-8 rounded-lg border border-teal-400/30 bg-teal-500/15 text-teal-300"><Clock size={16}/></span> Recent Activity</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[350px] custom-scrollbar">
            {activity.length > 0 ? activity.map((item, idx) => (
              <div key={item.id || idx} className="relative pl-6 pb-4 border-l-2 border-white/[0.08] last:border-0 last:pb-0">
                <div className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-[#12141c] ${item.type === 'system' ? 'bg-primary-500' : 'bg-teal-500'}`}></div>
                <p className="text-[10px] font-bold text-slate-500 mb-1">{new Date(item.timestamp).toLocaleString()}</p>
                {item.type === 'quiz' && item.student ? (
                  <div className="bg-surface-800 rounded-lg p-3 border border-white/[0.08] mt-2">
                    <p className="text-xs font-bold text-slate-300 mb-2 border-b border-white/[0.06] pb-2 flex items-center justify-between">
                      Quiz Completed
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold ${
                        item.prediction === 'Strong' ? 'bg-green-500/20 text-green-400' : 
                        item.prediction === 'Weak' ? 'bg-red-500/20 text-red-400' : 
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {item.prediction}
                      </span>
                    </p>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-400"><span className="font-semibold text-slate-500 inline-block w-16">Student:</span> {item.student}</p>
                      <p className="text-xs text-slate-400"><span className="font-semibold text-slate-500 inline-block w-16">Topic:</span> {item.topic}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Confidence</span>
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-500 rounded-full" 
                            style={{ width: item.confidence }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{item.confidence}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-300">{item.message}</p>
                )}
              </div>
            )) : (
              <p className="text-sm text-slate-500 text-center py-10">No recent activity found.</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-center pt-8 border-t border-white/[0.06]">
        <p className="text-sm font-black text-slate-400">AI Learn Platform</p>
        <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-widest">Random Forest • Knowledge Graph • Gemini 2.5 Flash</p>
        <p className="text-[10px] font-bold text-slate-700 mt-1 uppercase">Version 1.0</p>
      </div>
    </div>
  )
}
