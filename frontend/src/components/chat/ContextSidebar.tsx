import { Target, AlertTriangle } from 'lucide-react'

interface ContextSidebarProps {
  contextData: any
  detectedTopic: string
}

export default function ContextSidebar({ contextData, detectedTopic }: ContextSidebarProps) {
  return (
    <div className="hidden xl:flex w-[300px] bg-[#0c0d12] flex-col text-slate-300 relative z-20 border-l border-white/[0.08] shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.5)]">
      <div className="p-6 border-b border-white/[0.08]/80">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Target size={14} className="text-accent-500" /> Context
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {contextData ? (
          <>
            {/* Weak Topic block */}
            <div className="bg-[#151722] rounded-2xl p-5 border border-white/[0.08]">
              <p className="text-[10px] text-slate-500 font-bold mb-3 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-red-400" /> Weak Topic
              </p>
              <p className="text-white font-bold text-lg mb-4">{detectedTopic}</p>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Accuracy</span>
                  <span className="text-slate-200 font-bold">28%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Mastery</span>
                  <span className="text-xs font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md">Weak</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Prerequisites</span>
                  <span className="text-slate-200 font-medium text-right max-w-[120px] truncate">Arrays</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/[0.08]/80">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Recommended</p>
                <p className="text-sm font-medium text-slate-300">2 videos, 1 quiz</p>
              </div>
            </div>

            {/* Exam Readiness block */}
            <div className="bg-[#151722] rounded-2xl p-5 border border-white/[0.08]">
              <p className="text-[10px] text-slate-500 font-bold mb-3 uppercase tracking-widest">Exam Readiness</p>
              {contextData.is_new_user || !contextData.examReadiness?.score ? (
                <div className="text-center py-2">
                  <p className="text-sm font-bold text-slate-300 mb-1">Not Available Yet</p>
                </div>
              ) : (
                <>
                  <div className="flex items-end justify-between mb-3">
                    <span className="text-2xl font-black text-white leading-none">{contextData.examReadiness.score}%</span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">{contextData.examReadiness.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#0a0b10] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${contextData.examReadiness.score}%` }} />
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="animate-pulse space-y-6">
            <div className="h-40 bg-slate-800/30 rounded-2xl" />
            <div className="h-24 bg-slate-800/30 rounded-2xl" />
          </div>
        )}
      </div>
    </div>
  )
}
