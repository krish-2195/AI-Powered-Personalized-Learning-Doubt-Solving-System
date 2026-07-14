import { useState, useEffect } from 'react'
import { BrainCircuit, AlertTriangle, Lightbulb, TrendingDown, Users, BookOpen, ChevronRight, Activity } from 'lucide-react'
import api from '../../lib/api'

type StruggleTopic = {
  topic: string
  student_count: number
  severity: 'high' | 'critical' | 'medium' | 'low'
}

export default function AIAnalytics() {
  const [strugglingTopics, setStrugglingTopics] = useState<StruggleTopic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/api/instructor/struggling-topics')
        if (response.data?.data) {
          setStrugglingTopics(response.data.data)
        }
      } catch (error) {
        console.error('Failed to fetch AI analytics', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', bar: 'bg-rose-500', icon: AlertTriangle }
      case 'high':
        return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: 'bg-amber-500', icon: TrendingDown }
      case 'medium':
        return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', bar: 'bg-blue-500', icon: Activity }
      default:
        return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: 'bg-emerald-500', icon: Lightbulb }
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 relative">
      <header className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/80 to-[#12141c] shadow-2xl p-8 md:p-10">
        <div className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
            <BrainCircuit className="text-indigo-400" size={40} />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight mb-2">
              AI Struggle Detection
            </h1>
            <p className="text-indigo-200/80 font-medium text-lg max-w-2xl">
              Our ML models analyze quiz performance and knowledge graph gaps to instantly highlight exactly where your class is getting stuck.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - The Top Struggles */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="text-amber-400" size={20} />
            Class Interventions Needed
          </h2>
          
          <div className="space-y-4">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-surface-800/50 border border-white/5 rounded-2xl p-6 h-28 animate-pulse" />
              ))
            ) : strugglingTopics.length === 0 ? (
              <div className="bg-surface-800 border border-emerald-500/20 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Looking Good!</h3>
                <p className="text-slate-400">The AI hasn't detected any significant class-wide struggles yet.</p>
              </div>
            ) : (
              strugglingTopics.map((topic, idx) => {
                const styles = getSeverityStyles(topic.severity)
                const Icon = styles.icon
                
                return (
                  <div key={idx} className="bg-surface-800 border border-white/[0.06] rounded-2xl p-6 hover:border-white/10 transition-colors group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${styles.bg} ${styles.color}`}>
                          <Icon size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{topic.topic}</h3>
                          <p className="text-slate-400 text-sm mt-0.5">
                            <span className="font-bold text-white">{topic.student_count} students</span> repeatedly failing quizzes on this topic.
                          </p>
                        </div>
                      </div>
                      
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border ${styles.border} ${styles.color} ${styles.bg}`}>
                        {topic.severity}
                      </span>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      <button className="flex-1 bg-surface-700 hover:bg-surface-600 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                        <BookOpen size={16} className="text-slate-400" />
                        Assign Reading
                      </button>
                      <button className="flex-1 bg-surface-700 hover:bg-surface-600 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                        <Users size={16} className="text-slate-400" />
                        Message Students
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column - AI Recommendations */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lightbulb className="text-indigo-400" size={20} />
            AI Suggestions
          </h2>
          
          <div className="bg-surface-800 border border-white/[0.06] rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            
            <div className="space-y-6 mt-2">
              <div className="group cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-indigo-400 shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                  <div>
                    <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">Record a conceptual breakdown</h4>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                      42 students are failing "Trees". A short 5-minute video clarifying Binary Search Trees vs generic Trees could resolve 80% of errors.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="w-full h-[1px] bg-white/5" />
              
              <div className="group cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                  <div>
                    <h4 className="font-bold text-white group-hover:text-amber-400 transition-colors">Adjust "Recursion" difficulty</h4>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                      The current Question Bank for Recursion has a 12% pass rate. Consider adding 5 more "Easy" level foundational questions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <button className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 group">
              Generate AI Study Plan
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          {/* Knowledge Graph Preview */}
          <div className="bg-surface-800 border border-white/[0.06] rounded-3xl p-6">
            <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-widest text-slate-400">Knowledge Graph Weaknesses</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">Data Structures</span>
                  <span className="text-rose-400">45% Mastery</span>
                </div>
                <div className="w-full bg-surface-900 rounded-full h-1.5">
                  <div className="bg-rose-500 h-1.5 rounded-full w-[45%]" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">Algorithms</span>
                  <span className="text-amber-400">62% Mastery</span>
                </div>
                <div className="w-full bg-surface-900 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full w-[62%]" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-300">System Design</span>
                  <span className="text-emerald-400">88% Mastery</span>
                </div>
                <div className="w-full bg-surface-900 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full w-[88%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}

// Ensure the CheckCircle2 icon is imported for the empty state
import { CheckCircle2 } from 'lucide-react'
