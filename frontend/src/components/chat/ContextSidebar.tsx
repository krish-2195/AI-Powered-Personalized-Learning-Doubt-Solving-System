import { Target, AlertTriangle, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

interface ContextSidebarProps {
  contextData: any
  detectedTopic: string
}

export default function ContextSidebar({ contextData, detectedTopic }: ContextSidebarProps) {
  const examScore = contextData?.examReadiness?.score ?? 0
  const examLabel = contextData?.examReadiness?.label ?? ''
  const hasExamData = !contextData?.is_new_user && examScore > 0
  const weakTopic = contextData?.weak_topic

  return (
    <div className="hidden xl:flex w-[300px] bg-[#0c0d12] flex-col text-slate-300 relative z-20 border-l border-white/[0.06] shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="p-6 border-b border-white/[0.06]">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <Target size={13} className="text-accent-500" /> Context
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {contextData ? (
          <>
            {/* Weak Topic — Double-Bezel card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[1.25rem] p-[1.5px] bg-gradient-to-b from-red-500/20 to-transparent"
            >
              <div className="rounded-[calc(1.25rem-1.5px)] bg-[#131420] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-[10px] text-slate-500 font-bold mb-3 uppercase tracking-[0.18em] flex items-center gap-1.5">
                  <AlertTriangle size={11} className="text-red-400" /> Weak Topic
                </p>
                <p className="text-white font-bold text-base mb-4 leading-tight">
                  {weakTopic?.name || detectedTopic}
                </p>

                <div className="space-y-3">
                  {[
                    { label: 'Accuracy', value: weakTopic ? `${weakTopic.accuracy}%` : '—', valueClass: 'text-slate-200 font-bold' },
                    {
                      label: 'Mastery',
                      value: weakTopic?.mastery || '—',
                      valueClass: `text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        weakTopic?.mastery === 'Weak'
                          ? 'bg-red-500/20 text-red-400'
                          : weakTopic?.mastery === 'Moderate'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`,
                    },
                    {
                      label: 'Prerequisites',
                      value: weakTopic?.prerequisites?.length ? weakTopic.prerequisites.join(', ') : 'None',
                      valueClass: 'text-slate-200 font-medium'
                    },
                  ].map(({ label, value, valueClass }) => (
                    <div key={label} className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">{label}</span>
                      <span className={valueClass}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/[0.05]">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.18em] mb-1.5">Recommended</p>
                  <p className="text-sm font-medium text-slate-400">
                    {weakTopic ? 'Review prerequisites first' : 'Start a quiz to identify weak areas'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Exam Readiness — Double-Bezel card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[1.25rem] p-[1.5px] bg-gradient-to-b from-emerald-500/20 to-transparent"
            >
              <div className="rounded-[calc(1.25rem-1.5px)] bg-[#131420] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-[10px] text-slate-500 font-bold mb-3 uppercase tracking-[0.18em] flex items-center gap-1.5">
                  <TrendingUp size={11} className="text-emerald-400" /> Exam Readiness
                </p>

                {!hasExamData ? (
                  <div className="text-center py-3">
                    <p className="text-sm font-bold text-slate-400 mb-1">Not available yet</p>
                    <p className="text-xs text-slate-600">Complete 3 quizzes to unlock</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end justify-between mb-3">
                      <span className="text-2xl font-black text-white leading-none">{examScore}%</span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">{examLabel}</span>
                    </div>

                    {/* Animated progress bar */}
                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${examScore}%` }}
                        transition={{ duration: 1.1, delay: 0.3, ease: [0.32, 0.72, 0, 1] }}
                      />
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </>
        ) : (
          // Skeleton loading state
          <div className="space-y-4">
            <div className="skeleton h-48 w-full" />
            <div className="skeleton h-28 w-full" />
          </div>
        )}
      </div>
    </div>
  )
}
