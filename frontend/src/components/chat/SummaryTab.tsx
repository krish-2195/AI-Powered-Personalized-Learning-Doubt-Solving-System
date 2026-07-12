import { Sparkles, BarChart2, Target } from 'lucide-react'
import { SessionSummary } from '../../types/chat'

interface SummaryTabProps {
  isGeneratingSummary: boolean
  summary: SessionSummary | null
  onBackToChat: () => void
}

export default function SummaryTab({ isGeneratingSummary, summary, onBackToChat }: SummaryTabProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-8 custom-scrollbar relative">
      <button
        onClick={onBackToChat}
        className="absolute top-8 left-8 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors"
      >
        ← Back to Chat
      </button>

      <div className="max-w-[850px] mx-auto mt-10">
        {isGeneratingSummary ? (
          <div className="h-64 flex flex-col items-center justify-center gap-5 text-slate-400 mt-20">
            <div className="w-10 h-10 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium text-slate-300">Generating Session Summary...</p>
          </div>

        ) : !summary ? (
          <div className="max-w-md mx-auto mt-20 p-8 rounded-[24px] bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.08] shadow-xl text-center">
            <BarChart2 size={48} className="mx-auto mb-4 text-slate-600" />
            <h2 className="text-xl font-bold text-white mb-2">No summary available</h2>
            <p className="text-slate-400 text-sm mb-6">Ask some questions first to generate a summary.</p>
          </div>

        ) : (
          <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-8 rounded-3xl border border-white/[0.08] shadow-sm space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-primary-500" size={24} /> Today's Summary
              </h2>
              <p className="text-slate-400 mt-1">Review your learning progress from this chat session.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-surface-800 border border-white/[0.08] text-slate-200 px-6 py-5 rounded-2xl">
                <p className="text-xs text-primary-400 font-bold uppercase tracking-wider mb-1">Questions Asked</p>
                <p className="text-3xl font-bold">{summary.total_messages}</p>
              </div>
              <div className="bg-surface-800 border border-white/[0.08] text-slate-200 px-6 py-5 rounded-2xl">
                <p className="text-xs text-accent-400 font-bold uppercase tracking-wider mb-1">Study Time</p>
                <p className="text-3xl font-bold">~{Math.max(1, Math.round(summary.total_messages * 1.5))} min</p>
              </div>
            </div>

            {/* Topics covered */}
            {summary.topics_covered.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Topics Covered</h3>
                <div className="flex flex-wrap gap-2">
                  {summary.topics_covered.map((t, i) => (
                    <span key={i} className="px-3 py-1 bg-surface-800 text-slate-300 border border-white/10 rounded-lg text-sm font-medium">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {summary.recommended_next_steps.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Next Recommendation</h3>
                <div className="space-y-3">
                  {summary.recommended_next_steps.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-[14px] text-slate-300 leading-relaxed bg-surface-800 p-4 rounded-xl border border-white/[0.08]">
                      <Target size={18} className="text-accent-400 shrink-0 mt-0.5" />
                      <span className="font-semibold">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
