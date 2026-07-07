import { useRef, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, Sparkles, CheckCircle2, XCircle, BarChart2, BrainCircuit, Target, AlertTriangle, Copy, Check, Plus } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

type Tab = 'chat' | 'quiz' | 'summary'

type Message = {
  role: 'user' | 'ai'
  content: string
}

type QuizQuestion = {
  question: string
  options: string[]
  answer_index: number
  explanation: string
  difficulty?: string
}

type SessionSummary = {
  user_id: string
  total_messages: number
  topics_covered: string[]
  key_takeaways: string[]
  unresolved_doubts: string[]
  recommended_next_steps: string[]
}

export default function ChatPage() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('chatMessages')
    return saved ? JSON.parse(saved) : [
      { role: 'ai', content: "Hello! I'm your **AI tutor**. Ask me any questions about your subjects! I can explain concepts, generate practice quizzes, or review code snippets." },
    ]
  })
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detectedTopic, setDetectedTopic] = useState<string>('General Problem Solving')
  const [contextData, setContextData] = useState<any>(null)
  // const [prediction, setPrediction] = useState<any>(null) // the general performance prediction
  const [quizMLResult, setQuizMLResult] = useState<any>(null) // the specific quiz ML prediction
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false)

  const [quizDifficulty, setQuizDifficulty] = useState('Medium')
  const [quizCount, setQuizCount] = useState(5)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)


  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { user } = useAuth()
  const userId = user?.user_id || 1
  
  const [sessionId, setSessionId] = useState(() => {
    const saved = localStorage.getItem('chatSessionId')
    if (saved) return saved
    const newId = `session-${userId}-${Date.now()}`
    localStorage.setItem('chatSessionId', newId)
    return newId
  })
  
  const startNewSession = () => {
    const newId = `session-${userId}-${Date.now()}`
    setSessionId(newId)
    const initialMessage: Message = { role: 'ai', content: "Hello! I'm your **AI tutor**. We've started a new study session. What would you like to learn today?" }
    setMessages([initialMessage])
    localStorage.setItem('chatSessionId', newId)
    localStorage.setItem('chatMessages', JSON.stringify([initialMessage]))
    setActiveTab('chat')
  }

  useEffect(() => {
    const syncHistory = async () => {
      try {
        const { data } = await api.get(`/api/chat/history/${userId}`)
        if (data.status === 'success' && data.data.messages.length > 0) {
          const remoteSession = data.data.session_id
          const remoteMessages = data.data.messages
          
          const localMessages = JSON.parse(localStorage.getItem('chatMessages') || '[]')
          const localSession = localStorage.getItem('chatSessionId')
          
          // If remote session is newer or has more messages, use it
          if (remoteSession !== localSession || remoteMessages.length > localMessages.length) {
            setSessionId(remoteSession)
            setMessages(remoteMessages)
            localStorage.setItem('chatSessionId', remoteSession)
            localStorage.setItem('chatMessages', JSON.stringify(remoteMessages))
          }
        }
      } catch (err) {
        console.error("Failed to sync chat history", err)
      }
    }
    syncHistory()
  }, [userId])
  
  const location = useLocation()

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    if (location.state?.prefill) {
      setInput(location.state.prefill)
      // Optional: Clear state so it doesn't prefill again on refresh
      window.history.replaceState({}, document.title)
    } else if (location.state?.generateQuiz && location.state?.topic) {
      handleGenerateQuiz(location.state.topic)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  useEffect(() => {
    if (userId) {
      api.get(`/api/dashboard/?user_id=${userId}`)
        .then(res => setContextData(res.data.data))
        .catch(console.error)
    }
  }, [userId])

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isThinking, activeTab])

  const handleSend = async (prefilledText?: string) => {
    const text = (prefilledText ?? input).trim()
    if (!text) return

    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setIsThinking(true)
    setInput('')

    try {
      const { data } = await api.post('/api/chat/message', {
        user_id: userId,
        session_id: sessionId,
        message: text,
      })

      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: data.data?.response || data.response,
        },
      ])

      if (data.topic_detected) setDetectedTopic(data.topic_detected)
    } catch (err: any) {
      setError(err.message || 'Could not reach AI Tutor')
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'I could not process that right now. Please try again.' },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  const handleGenerateQuiz = async (topicOverride?: string, quizType: 'standard' | 'ai' | 'hybrid' = 'hybrid') => {
    setError(null)
    setSelectedAnswers({})
    setQuizMLResult(null)
    setIsSubmittingQuiz(false)
    setIsGeneratingQuiz(true)
    setActiveTab('quiz')
    const topic = topicOverride || detectedTopic
    try {
      const { data } = await api.post('/api/chat/generate-quiz', {
        user_id: userId,
        topic: topic,
        difficulty: quizDifficulty.toLowerCase(),
        count: quizCount,
        quiz_type: quizType
      })
      setQuizQuestions(data.data?.questions || data.questions || [])
      if (topicOverride) {
        setDetectedTopic(topicOverride)
      }
    } catch (err: any) {
      setError(err.message || 'Could not generate quiz')
      setActiveTab('chat')
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
  }

  const quizScore = quizQuestions.length
    ? quizQuestions.filter((q, i) => selectedAnswers[i] === q.answer_index).length
    : 0
  const quizDone = quizQuestions.length > 0 && Object.keys(selectedAnswers).length === quizQuestions.length

  useEffect(() => {
    if (quizDone && !quizMLResult && !isSubmittingQuiz) {
      setIsSubmittingQuiz(true)

      const payload = {
        user_id: String(userId),
        quiz_id: `quiz-${Date.now()}`,
        topic: detectedTopic,
        questions_count: quizQuestions.length,
        correct_answers: quizScore,
        time_taken_seconds: 120, // Estimated time taken
        attempt_number: 1,
        difficulty: "medium",
        topic_id: null,
        avg_time_per_question: 120 / quizQuestions.length
      }

      api.post('/api/learning/quiz/submit', payload)
        .then(res => {
          setQuizMLResult(res.data.ml_prediction || res.data)
        })
        .catch(err => console.error("Failed to submit quiz to ML Engine", err))
        .finally(() => setIsSubmittingQuiz(false))
    }
  }, [quizDone, quizMLResult, isSubmittingQuiz, quizQuestions.length, quizScore, userId, detectedTopic])

  const handleSessionSummary = async () => {
    setError(null)
    setIsGeneratingSummary(true)
    try {
      const { data } = await api.get(`/api/chat/session-summary/${userId}`)
      setSummary(data)
      setActiveTab('summary')
    } catch (err: any) {
      setError(err.message || 'Could not generate session summary')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'summary' && !summary && !isGeneratingSummary) {
      handleSessionSummary()
    }
  }, [activeTab, summary])

  return (
    <div className="flex h-[calc(100vh-6.5rem)] bg-[#0f111a] rounded-[28px] overflow-hidden border border-white/[0.08] shadow-2xl">
      
      {/* LEFT COLUMN: Main Chat Interface */}
      <div className="flex flex-col flex-1 min-w-0 bg-[#0a0b10] relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0a0b10]/90 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-display font-bold flex items-center gap-2">
              <Sparkles className="text-primary-400" size={20}/> <span className="gradient-text">AI Tutor</span>
            </h1>
          </div>
          <div className="flex gap-1 bg-[#151722] p-1 rounded-xl border border-white/[0.08]">
            <button onClick={() => setActiveTab('chat')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'chat' ? 'bg-[#212435] text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}>Chat</button>
            <button onClick={() => setActiveTab('quiz')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'quiz' ? 'bg-[#212435] text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}>Quiz</button>
            <button onClick={() => setActiveTab('summary')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'summary' ? 'bg-[#212435] text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}>Summary</button>
          </div>
          <div>
            <button 
              onClick={startNewSession}
              className="btn-primary text-sm !px-4 !py-2"
            >
              <Plus size={16} /> New Session
            </button>
          </div>
        </div>


        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 text-sm text-center font-medium border-b border-red-500/20">
            {error}
          </div>
        )}

        {/* Chat Area */}
        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 overflow-hidden relative">
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
                    
                    <div
                      className={`${msg.role === 'user'
                          ? 'bg-[#1e2132] text-slate-100 rounded-[20px] rounded-tr-sm px-6 py-4 max-w-[85%] sm:max-w-[70%] border border-white/10'
                          : 'w-full sm:w-[85%] text-slate-300 bg-transparent py-2'
                        }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="prose prose-invert max-w-none text-[15px] leading-[1.8]">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              code({node, inline, className, children, ...props}: any) {
                                const match = /language-(\w+)/.exec(className || '')
                                const [copied, setCopied] = useState(false)
                                const handleCopy = () => {
                                  navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
                                  setCopied(true)
                                  setTimeout(() => setCopied(false), 2000)
                                }
                                return !inline && match ? (
                                  <div className="rounded-xl my-6 text-sm shadow-xl overflow-hidden border border-white/[0.08] bg-[#0d0f17]">
                                    <div className="flex items-center justify-between px-4 py-2 bg-[#151722] border-b border-white/[0.08] text-slate-400 text-xs font-mono uppercase">
                                      <span>{match[1]}</span>
                                      <button onClick={handleCopy} className="hover:text-white transition-colors flex items-center gap-1.5 p-1 rounded-md hover:bg-slate-700">
                                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        {copied ? 'Copied!' : 'Copy'}
                                      </button>
                                    </div>
                                    <SyntaxHighlighter
                                      style={vscDarkPlus}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{ margin: 0, padding: '1.25rem', backgroundColor: 'transparent' }}
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  </div>
                                ) : (
                                  <code className="bg-[#1e2132] text-primary-300 px-1.5 py-0.5 rounded-md text-[13px] font-mono border border-white/10" {...props}>
                                    {children}
                                  </code>
                                )
                              },
                              p({children}) { return <p className="mb-4 last:mb-0 text-slate-300">{children}</p> },
                              h1({children}) { return <h1 className="text-xl font-bold mt-8 mb-4 text-white">{children}</h1> },
                              h2({children}) { return <h2 className="text-lg font-bold mt-8 mb-4 text-white">{children}</h2> },
                              h3({children}) { return <h3 className="text-md font-bold mt-6 mb-3 text-white">{children}</h3> },
                              ul({children}) { return <ul className="list-disc pl-5 mb-5 space-y-2 text-slate-300 marker:text-slate-500">{children}</ul> },
                              ol({children}) { return <ol className="list-decimal pl-5 mb-5 space-y-2 text-slate-300 marker:text-slate-500">{children}</ol> },
                              li({children}) { return <li className="pl-1">{children}</li> },
                              strong({children}) { return <strong className="font-bold text-white">{children}</strong> },
                              table({children}) { return <div className="overflow-x-auto mb-6"><table className="min-w-full divide-y divide-slate-800 border border-white/[0.08] rounded-xl overflow-hidden">{children}</table></div> },
                              th({children}) { return <th className="bg-[#151722] px-4 py-3 text-left text-sm font-bold text-slate-300 uppercase tracking-wider">{children}</th> },
                              td({children}) { return <td className="px-4 py-3 text-sm text-slate-400 border-t border-white/[0.08]">{children}</td> },
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                          <div className="mt-4 pt-3 flex items-center justify-between">
                             <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                               AI Learn Powered by Gemini 2.5 Flash
                             </div>
                             <div className="text-[11px] text-slate-600">
                               ~1.2 sec
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isThinking && (
                  <div className="flex w-full justify-start max-w-4xl mx-auto">
                    <div className="flex-shrink-0 mr-4 mt-1 hidden sm:block">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-[#151722] border border-white/10">
                        <Sparkles size={14} className="text-primary-400" />
                      </div>
                    </div>
                    <div className="bg-transparent py-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                      <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{animationDelay: '150ms'}} />
                      <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" style={{animationDelay: '300ms'}} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>

            {/* Fixed Input Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/90 to-transparent pt-16 pb-6 px-4 pointer-events-none">
              <div className="max-w-[850px] mx-auto pointer-events-auto">
                <div className="flex flex-wrap gap-2.5 mb-4 justify-center">
                  <button onClick={() => handleSend('Explain recursion simply')} className="text-[12px] font-semibold px-4 py-1.5 bg-[#151722] border border-white/[0.08] rounded-full text-slate-400 hover:border-primary-500 hover:text-primary-400 transition-all flex items-center gap-2"><BrainCircuit size={13}/> Explain Recursion</button>
                  <button onClick={() => handleGenerateQuiz(undefined, 'hybrid')} className="text-[12px] font-semibold px-4 py-1.5 bg-[#151722] border border-white/[0.08] rounded-full text-slate-400 hover:border-accent-500 hover:text-accent-400 transition-all flex items-center gap-2"><Target size={13}/> Generate Quiz</button>
                </div>
                
                <div className="relative rounded-[20px] bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/10/80 focus-within:border-primary-500/80 focus-within:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all">
                  <input
                    type="text"
                    className="w-full pl-6 pr-16 py-4 rounded-[20px] bg-transparent focus:outline-none text-slate-200 text-[15px] placeholder:text-slate-500"
                    placeholder="Ask AI anything... ⌘ Enter to send"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button 
                    onClick={() => handleSend()} 
                    disabled={!input.trim() || isThinking}
                    className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-primary-600 hover:bg-primary-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-[14px] transition-all transform active:scale-95"
                  >
                    <Send size={16} className={input.trim() ? "ml-0.5" : ""} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── QUIZ TAB ── */}
        {activeTab === 'quiz' && (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-8 custom-scrollbar relative">
             <button onClick={() => setActiveTab('chat')} className="absolute top-8 left-8 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors">
               ← Back to Chat
             </button>
            <div className="max-w-[850px] mx-auto mt-10">
            {isGeneratingQuiz ? (
              <div className="h-64 flex flex-col items-center justify-center gap-5 text-slate-400 mt-20">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg font-medium text-slate-300">Generating personalized quiz...</p>
              </div>
            ) : quizQuestions.length === 0 ? (
              <div className="max-w-md mx-auto mt-10 p-8 rounded-[24px] bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.08] shadow-xl">
                 <div className="flex items-center gap-3 mb-2">
                   <Target className="text-accent-400" size={24} />
                   <h2 className="text-xl font-bold text-white">No active quiz</h2>
                 </div>
                 <p className="text-slate-400 mb-8 text-sm">Configure and generate a personalized practice quiz based on your weak topics.</p>
                 
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Difficulty</label>
                 <div className="flex gap-2 mb-8">
                   {['Easy', 'Medium', 'Hard'].map(d => (
                     <button key={d} onClick={() => setQuizDifficulty(d)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${quizDifficulty === d ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/20' : 'bg-surface-800 border-white/[0.08] text-slate-400 hover:border-primary-500/40'}`}>{d}</button>
                   ))}
                 </div>
          
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Questions</label>
                 <div className="flex gap-2 mb-10">
                   {[5, 10, 20].map(c => (
                     <button key={c} onClick={() => setQuizCount(c)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${quizCount === c ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/20' : 'bg-surface-800 border-white/[0.08] text-slate-400 hover:border-primary-500/40'}`}>{c}</button>
                   ))}
                 </div>
          
                 <button onClick={() => handleGenerateQuiz(undefined, 'hybrid')} className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-lg shadow-primary-900/20 transition-all flex justify-center items-center gap-2">
                   <Sparkles size={18}/> Generate personalized quiz
                 </button>
              </div>
            ) : (
              <div className="space-y-6 pb-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] mb-6 gap-4">
                  <div className="flex-1 w-full">
                    <h2 className="text-2xl font-bold text-white">Practice Quiz</h2>
                    <p className="text-slate-400 mt-1">Topic: <span className="font-semibold text-slate-300">{detectedTopic}</span></p>
                  </div>
                  <div className="flex-1 w-full md:text-right">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Question {Object.keys(selectedAnswers).length === quizQuestions.length ? quizQuestions.length : Object.keys(selectedAnswers).length + 1} of {quizQuestions.length}
                    </p>
                    <div className="h-2 w-full md:w-48 md:ml-auto bg-surface-800 rounded-full overflow-hidden flex mb-1">
                      <div className="h-full bg-primary-500 transition-all duration-500" style={{width: `${(Object.keys(selectedAnswers).length / quizQuestions.length) * 100}%`}}></div>
                    </div>
                    {quizDone && (
                      <p className="text-sm font-bold text-slate-300 mt-2">Score: {quizScore}/{quizQuestions.length}</p>
                    )}
                  </div>
                </div>
                {quizQuestions.map((item, idx) => {
                  const picked = selectedAnswers[idx]
                  const answered = picked !== undefined
                  const correct = picked === item.answer_index
                  return (
                    <div key={idx} className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] space-y-4">
                      <div className="pb-4 border-b border-white/[0.08]/80">
                        <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-3">Question {idx + 1} of {quizQuestions.length}</p>
                        <p className="font-semibold text-lg text-slate-200 break-words leading-relaxed pl-4 border-l-2 border-primary-500">
                          {item.question}
                        </p>
                      </div>
                      <div className="space-y-3 mt-4">
                        {(item.options ?? []).map((opt, optIdx) => {
                          const isCorrect = optIdx === item.answer_index
                          const isPicked = optIdx === picked
                          let cls = 'text-[14px] px-5 py-3.5 rounded-xl border w-full text-left transition-all flex items-center gap-3 font-medium '
                          if (!answered) {
                            cls += 'border-white/[0.08] hover:bg-surface-800 hover:border-white/10 cursor-pointer bg-transparent text-slate-300'
                          } else if (isCorrect) {
                            cls += 'border-green-500/50 bg-green-500/10 text-green-400'
                          } else if (isPicked) {
                            cls += 'border-red-500/50 bg-red-500/10 text-red-400'
                          } else {
                            cls += 'border-white/[0.06] text-slate-600 bg-transparent cursor-default'
                          }
                          return (
                            <button key={optIdx} className={cls} disabled={answered} onClick={() => handleSelectAnswer(idx, optIdx)}>
                              <span className={`w-6 h-6 rounded-full border text-[12px] flex items-center justify-center shrink-0 font-bold ${!answered ? 'border-white/10 text-slate-500' :
                                  isCorrect ? 'border-green-500 bg-green-500 text-white' :
                                    isPicked ? 'border-red-500 bg-red-500 text-white' :
                                      'border-white/[0.08] text-slate-700'
                                }`}>
                                {answered && isCorrect ? <CheckCircle2 size={14} /> :
                                  answered && isPicked ? <XCircle size={14} /> :
                                    String.fromCharCode(65 + optIdx)}
                              </span>
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                      {answered && (
                        <div className={`text-[14px] p-5 rounded-xl mt-4 border ${correct ? 'bg-green-500/5 text-green-300 border-green-500/20' : 'bg-red-500/5 text-red-300 border-red-500/20'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            {correct ? <CheckCircle2 className="text-green-500" size={20}/> : <XCircle className="text-red-500" size={20}/>}
                            <strong className="text-base">{correct ? 'Correct!' : `Incorrect. The correct answer is Option ${String.fromCharCode(65 + item.answer_index)}.`}</strong>
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none opacity-90">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {item.explanation.replace(/âœ…|â Œ/g, '').trim()}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            </div>
          </div>
        )}

        {/* ── SUMMARY TAB ── */}
        {activeTab === 'summary' && (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-8 custom-scrollbar relative">
            <button onClick={() => setActiveTab('chat')} className="absolute top-8 left-8 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors">
               ← Back to Chat
            </button>
            <div className="max-w-[850px] mx-auto mt-10">
            {isGeneratingSummary ? (
              <div className="h-64 flex flex-col items-center justify-center gap-5 text-slate-400 mt-20">
                <div className="w-10 h-10 border-4 border-accent-500 border-t-transparent rounded-full animate-spin"></div>
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
                    <Sparkles className="text-primary-500" size={24}/> Today's Summary
                  </h2>
                  <p className="text-slate-400 mt-1">Review your learning progress from this chat session.</p>
                </div>
                
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
        )}

      </div>

      {/* RIGHT COLUMN: Learning Context Sidebar */}
      <div className="hidden xl:flex w-[300px] bg-[#0c0d12] flex-col text-slate-300 relative z-20 border-l border-white/[0.08] shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.5)]">
        
        <div className="p-6 border-b border-white/[0.08]/80">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Target size={14} className="text-accent-500"/> Context
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {contextData ? (
            <>
              {/* Weak Topic Block */}
              <div className="bg-[#151722] rounded-2xl p-5 border border-white/[0.08]">
                <p className="text-[10px] text-slate-500 font-bold mb-3 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-red-400"/> Weak Topic
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
              
              {/* Exam Readiness */}
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
                      <div className="h-full bg-emerald-500 rounded-full" style={{width: `${contextData.examReadiness.score}%`}}></div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="animate-pulse space-y-6">
               <div className="h-40 bg-slate-800/30 rounded-2xl"></div>
               <div className="h-24 bg-slate-800/30 rounded-2xl"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
