import { useState } from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Message } from '../../types/chat'

/** Inline code block with a copy button — used inside ReactMarkdown components prop */
function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl my-6 text-sm shadow-xl overflow-hidden border border-white/[0.08] bg-[#0d0f17]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#151722] border-b border-white/[0.08] text-slate-400 text-xs font-mono uppercase">
        <span>{language}</span>
        <button onClick={handleCopy} className="hover:text-white transition-colors flex items-center gap-1.5 p-1 rounded-md hover:bg-slate-700">
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, padding: '1.25rem', backgroundColor: 'transparent' }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

/** ReactMarkdown components map — shared across all AI message renders */
const markdownComponents: any = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '')
    return !inline && match ? (
      <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>
    ) : (
      <code className="bg-[#1e2132] text-primary-300 px-1.5 py-0.5 rounded-md text-[13px] font-mono border border-white/10" {...props}>
        {children}
      </code>
    )
  },
  p({ children }: any) { return <p className="mb-4 last:mb-0 text-slate-300">{children}</p> },
  h1({ children }: any) { return <h1 className="text-xl font-bold mt-8 mb-4 text-white">{children}</h1> },
  h2({ children }: any) { return <h2 className="text-lg font-bold mt-8 mb-4 text-white">{children}</h2> },
  h3({ children }: any) { return <h3 className="text-md font-bold mt-6 mb-3 text-white">{children}</h3> },
  ul({ children }: any) { return <ul className="list-disc pl-5 mb-5 space-y-2 text-slate-300 marker:text-slate-500">{children}</ul> },
  ol({ children }: any) { return <ol className="list-decimal pl-5 mb-5 space-y-2 text-slate-300 marker:text-slate-500">{children}</ol> },
  li({ children }: any) { return <li className="pl-1">{children}</li> },
  strong({ children }: any) { return <strong className="font-bold text-white">{children}</strong> },
  table({ children }: any) { return <div className="overflow-x-auto mb-6"><table className="min-w-full divide-y divide-slate-800 border border-white/[0.08] rounded-xl overflow-hidden">{children}</table></div> },
  th({ children }: any) { return <th className="bg-[#151722] px-4 py-3 text-left text-sm font-bold text-slate-300 uppercase tracking-wider">{children}</th> },
  td({ children }: any) { return <td className="px-4 py-3 text-sm text-slate-400 border-t border-white/[0.08]">{children}</td> },
}

interface ChatMessageListProps {
  messages: Message[]
  isThinking: boolean
  messagesEndRef: React.RefObject<HTMLDivElement>
}

export default function ChatMessageList({ messages, isThinking, messagesEndRef }: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 pb-40 scroll-smooth custom-scrollbar">
      <div className="max-w-[850px] mx-auto space-y-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="flex-shrink-0 mr-4 mt-1 hidden sm:block">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-[#151722] border border-white/10">
                  <Sparkles size={14} className="text-primary-400" />
                </div>
              </div>
            )}

            <div className={`${msg.role === 'user'
              ? 'bg-[#1e2132] text-slate-100 rounded-[20px] rounded-tr-sm px-6 py-4 max-w-[85%] sm:max-w-[70%] border border-white/10'
              : 'w-full sm:w-[85%] text-slate-300 bg-transparent py-2'}`}
            >
              {msg.role === 'user' ? (
                <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              ) : (
                <div className="prose prose-invert max-w-none text-[15px] leading-[1.8]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={markdownComponents}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  <div className="mt-4 pt-3 flex items-center justify-between">
                    <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                      AI Learn Powered by Gemini 2.5 Flash
                    </div>
                    <div className="text-[11px] text-slate-600">~1.2 sec</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex w-full justify-start max-w-4xl mx-auto">
            <div className="flex-shrink-0 mr-4 mt-1 hidden sm:block">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-[#151722] border border-white/10">
                <Sparkles size={14} className="text-primary-400" />
              </div>
            </div>
            <div className="bg-transparent py-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  )
}
