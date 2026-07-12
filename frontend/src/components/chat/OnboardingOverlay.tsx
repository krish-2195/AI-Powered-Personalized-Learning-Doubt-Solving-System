import { Sparkles } from 'lucide-react'

interface OnboardingOverlayProps {
  step: number // 1–4
}

const STEPS = [
  'Submitting baseline responses...',
  'AI is analyzing your knowledge graph...',
  'Generating personalized roadmap & recommendations...',
]

export default function OnboardingOverlay({ step }: OnboardingOverlayProps) {
  if (step === 0) return null

  return (
    <div className="fixed inset-0 bg-[#06070a]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0a0b10] border border-white/10 rounded-[32px] p-8 shadow-2xl text-center space-y-8 animate-pulse-slow">
        {/* Spinning icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-400 animate-spin">
            <Sparkles size={28} />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-extrabold text-white">AI Diagnostics Engine</h2>
          <p className="text-sm text-slate-400">Please wait while we set up your personalized learning path</p>
        </div>

        {/* Step list */}
        <div className="space-y-4 text-left">
          {STEPS.map((label, i) => {
            const stepNum = i + 1
            const done = step > stepNum
            const active = step === stepNum
            return (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  done   ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  active ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 animate-pulse' :
                           'bg-slate-800 text-slate-600 border border-slate-700'
                }`}>
                  {done ? '✓' : stepNum}
                </div>
                <span className={`text-sm font-medium ${step >= stepNum ? 'text-slate-200' : 'text-slate-500'}`}>
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
