import { Send, BrainCircuit, Target } from 'lucide-react'
import { motion } from 'framer-motion'

interface ChatInputBarProps {
  input: string
  isThinking: boolean
  onInputChange: (value: string) => void
  onSend: (text?: string) => void
  onGenerateQuiz: () => void
}

const quickPrompts = [
  { icon: BrainCircuit, label: 'Explain Recursion', text: 'Explain recursion simply' },
  { icon: Target, label: 'Generate Quiz', text: null },
]

export default function ChatInputBar({
  input, isThinking, onInputChange, onSend, onGenerateQuiz,
}: ChatInputBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/90 to-transparent pt-16 pb-6 px-4 pointer-events-none">
      <div className="max-w-[850px] mx-auto pointer-events-auto">

        {/* Quick-prompt chips — stagger in */}
        <div className="flex flex-wrap gap-2.5 mb-4 justify-center">
          {quickPrompts.map((prompt, idx) => {
            const Icon = prompt.icon
            return (
              <motion.button
                key={prompt.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => prompt.text ? onSend(prompt.text) : onGenerateQuiz()}
                className="text-[12px] font-semibold px-4 py-1.5 bg-[#151722]/90 backdrop-blur-sm border border-white/[0.08] rounded-full text-slate-400 hover:border-primary-500/60 hover:text-primary-300 hover:bg-primary-500/10 transition-colors duration-200 flex items-center gap-2"
              >
                <Icon size={13} /> {prompt.label}
              </motion.button>
            )
          })}
        </div>

        {/* Glass Island input */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Outer bezel shell */}
          <div className="rounded-[22px] p-[2px] bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.06] border border-white/[0.08]">
            {/* Inner core */}
            <div
              className="relative rounded-[20px] bg-[#0e0f1a]/95 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-all duration-300 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_0_1px_rgba(124,58,237,0.45),0_8px_32px_-8px_rgba(124,58,237,0.3)]"
            >
              <input
                type="text"
                className="w-full pl-6 pr-[4.5rem] py-4 rounded-[20px] bg-transparent focus:outline-none text-slate-200 text-[15px] placeholder:text-slate-600"
                placeholder="Ask your AI tutor anything…"
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
              />

              {/* Send button — button-in-button pattern */}
              <div className="absolute right-2 top-2 bottom-2 flex items-center">
                <motion.button
                  onClick={() => onSend()}
                  disabled={!input.trim() || isThinking}
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.93 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="group flex h-full aspect-square items-center justify-center rounded-[14px] bg-gradient-to-br from-primary-600 to-primary-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white shadow-[0_4px_16px_-4px_rgba(124,58,237,0.6)] disabled:shadow-none transition-all duration-200"
                >
                  <motion.div
                    animate={{ x: input.trim() ? 0 : 0 }}
                    className="group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-transform duration-200"
                  >
                    <Send size={16} />
                  </motion.div>
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
