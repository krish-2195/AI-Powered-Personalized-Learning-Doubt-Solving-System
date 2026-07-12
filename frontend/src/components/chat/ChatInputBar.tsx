import { Send, BrainCircuit, Target } from 'lucide-react'

interface ChatInputBarProps {
  input: string
  isThinking: boolean
  onInputChange: (value: string) => void
  onSend: (text?: string) => void
  onGenerateQuiz: () => void
}

export default function ChatInputBar({
  input, isThinking, onInputChange, onSend, onGenerateQuiz,
}: ChatInputBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/90 to-transparent pt-16 pb-6 px-4 pointer-events-none">
      <div className="max-w-[850px] mx-auto pointer-events-auto">
        {/* Quick-prompt chips */}
        <div className="flex flex-wrap gap-2.5 mb-4 justify-center">
          <button
            onClick={() => onSend('Explain recursion simply')}
            className="text-[12px] font-semibold px-4 py-1.5 bg-[#151722] border border-white/[0.08] rounded-full text-slate-400 hover:border-primary-500 hover:text-primary-400 transition-all flex items-center gap-2"
          >
            <BrainCircuit size={13} /> Explain Recursion
          </button>
          <button
            onClick={onGenerateQuiz}
            className="text-[12px] font-semibold px-4 py-1.5 bg-[#151722] border border-white/[0.08] rounded-full text-slate-400 hover:border-accent-500 hover:text-accent-400 transition-all flex items-center gap-2"
          >
            <Target size={13} /> Generate Quiz
          </button>
        </div>

        {/* Text input */}
        <div className="relative rounded-[20px] bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/10/80 focus-within:border-primary-500/80 focus-within:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all">
          <input
            type="text"
            className="w-full pl-6 pr-16 py-4 rounded-[20px] bg-transparent focus:outline-none text-slate-200 text-[15px] placeholder:text-slate-500"
            placeholder="Ask AI anything... ⌘ Enter to send"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
          />
          <button
            onClick={() => onSend()}
            disabled={!input.trim() || isThinking}
            className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-primary-600 hover:bg-primary-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-[14px] transition-all transform active:scale-95"
          >
            <Send size={16} className={input.trim() ? 'ml-0.5' : ''} />
          </button>
        </div>
      </div>
    </div>
  )
}
