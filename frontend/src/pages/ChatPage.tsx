import { useRef, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, Sparkles, CheckCircle2, XCircle, BookOpen, BarChart2, Zap, BrainCircuit, Target, AlertTriangle, Copy, Check, Plus } from 'lucide-react'
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
  const [prediction, setPrediction] = useState<any>(null)

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
    }
  }, [location.state])

  useEffect(() => {
    if (userId) {
      api.get(`/api/dashboard/?user_id=${userId}`)
        .then(res => setContextData(res.data.data))
        .catch(console.error)
        
      api.get(`/api/performance/prediction/?user_id=${userId}`)
        .then(res => setPrediction(res.data.data))
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

  const handleGenerateQuiz = async () => {
    setError(null)
    setSelectedAnswers({})
    try {
      const { data } = await api.post('/api/chat/generate-quiz', {
        user_id: userId,
        topic: detectedTopic,
        difficulty: 'medium',
        count: 5,
      })
      setQuizQuestions(data.data?.questions || data.questions || [])
      setActiveTab('quiz')
    } catch (err: any) {
      setError(err.message || 'Could not generate quiz')
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
    if (quizDone) {
      const answersPayload = quizQuestions.map((q, i) => ({
        question_id: `q-${i}`,
        selected_answer: q.options[selectedAnswers[i]],
        time_taken_seconds: 30,
        is_correct: selectedAnswers[i] === q.answer_index
      }))

      api.post('/api/performance/submit', {
        user_id: userId,
        quiz_id: `quiz-${Date.now()}`,
        topic_id: 1,
        answers: answersPayload,
        difficulty_weight: 2.0
      }).catch(err => console.error("Failed to submit performance", err))
    }
  }, [quizDone])

  const handleSessionSummary = async () => {
    setError(null)
    try {
      const { data } = await api.get(`/api/chat/session-summary/${userId}`)
      setSummary(data)
      setActiveTab('summary')
    } catch (err: any) {
      setError(err.message || 'Could not generate session summary')
    }
  }

  return (
    <div className="flex h-[calc(100vh-6.5rem)] bg-slate-900 rounded-[28px] overflow-hidden border border-slate-700/50 shadow-2xl shadow-primary-900/10">
      
      {/* LEFT COLUMN: Main Chat Interface */}
      <div className="flex flex-col flex-1 min-w-0 bg-slate-50 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm shadow-slate-100">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="text-primary-600" size={20}/> AI Tutor
            </h1>
          </div>
          <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60">
            <button onClick={() => setActiveTab('chat')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'chat' ? 'bg-white text-primary-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>Chat</button>
            <button onClick={() => setActiveTab('quiz')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'quiz' ? 'bg-white text-primary-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>Quiz</button>
            <button onClick={() => setActiveTab('summary')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'summary' ? 'bg-white text-primary-700 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>Summary</button>
          </div>
          <div>
            <button 
              onClick={startNewSession}
              className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} /> New Session
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 text-sm text-center font-medium border-b border-red-100">
            {error}
          </div>
        )}

        {/* Chat Area */}
        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto px-4 py-8 pb-40 scroll-smooth">
              <div className="max-w-[850px] mx-auto space-y-10">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    
                    {msg.role === 'ai' && (
                      <div className="flex-shrink-0 mr-5 mt-1 hidden sm:block">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-full flex items-center justify-center text-white shadow-md border-2 border-white">
                          🤖
                        </div>
                      </div>
                    )}
                    
                    <div
                      className={`${msg.role === 'user'
                          ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-[24px] rounded-tr-md px-6 py-4 max-w-[85%] sm:max-w-[70%] shadow-md shadow-slate-900/10'
                          : 'w-full sm:w-[85%] text-slate-800 bg-white border border-slate-100 rounded-[28px] rounded-tl-md px-6 sm:px-8 py-6 shadow-sm shadow-slate-200/40'
                        }`}
                    >
                      {msg.role === 'ai' && (
                        <div className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <span className="sm:hidden w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-[10px] text-white">🤖</span>
                          AI Learn
                        </div>
                      )}
                      
                      {msg.role === 'user' ? (
                        <p className="text-[16px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="prose prose-slate max-w-none text-[16px] leading-[1.8]">
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
                                  <div className="rounded-2xl my-6 text-sm shadow-xl overflow-hidden border border-slate-800 bg-[#1e1e1e]">
                                    <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700/50 text-slate-400 text-xs font-mono uppercase">
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
                                  <code className="bg-slate-100 text-primary-700 px-1.5 py-0.5 rounded-md text-[14px] font-mono border border-slate-200/60" {...props}>
                                    {children}
                                  </code>
                                )
                              },
                              p({children}) { return <p className="mb-5 last:mb-0 text-slate-700">{children}</p> },
                              h1({children}) { return <h1 className="text-2xl font-bold mt-8 mb-4 text-slate-900">{children}</h1> },
                              h2({children}) { return <h2 className="text-xl font-bold mt-8 mb-4 text-slate-900">{children}</h2> },
                              h3({children}) { return <h3 className="text-lg font-bold mt-6 mb-3 text-slate-900">{children}</h3> },
                              ul({children}) { return <ul className="list-disc pl-5 mb-5 space-y-2 text-slate-700 marker:text-slate-400">{children}</ul> },
                              ol({children}) { return <ol className="list-decimal pl-5 mb-5 space-y-2 text-slate-700 marker:text-slate-400">{children}</ol> },
                              li({children}) { return <li className="pl-1">{children}</li> },
                              strong({children}) { return <strong className="font-bold text-slate-900">{children}</strong> },
                              table({children}) { return <div className="overflow-x-auto mb-6"><table className="min-w-full divide-y divide-slate-300 border border-slate-200 rounded-xl overflow-hidden shadow-sm">{children}</table></div> },
                              th({children}) { return <th className="bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-900 uppercase tracking-wider">{children}</th> },
                              td({children}) { return <td className="px-4 py-3 text-sm text-slate-700 border-t border-slate-200">{children}</td> },
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                             <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                               <Sparkles size={11} className="text-primary-500" /> Generated by Gemini 2.5 Flash
                             </div>
                             <div className="text-[11px] text-slate-400">
                               ~1.2s
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isThinking && (
                  <div className="flex w-full justify-start max-w-4xl mx-auto">
                    <div className="flex-shrink-0 mr-5 mt-1 hidden sm:block">
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-primary-600 border-2 border-white">
                        🤖
                      </div>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-[28px] rounded-tl-md px-6 py-5 shadow-sm flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-bounce" />
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-bounce" style={{animationDelay: '150ms'}} />
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-bounce" style={{animationDelay: '300ms'}} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>

            {/* Fixed Input Area */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-12 pb-6 px-4 pointer-events-none">
              <div className="max-w-[850px] mx-auto pointer-events-auto">
                <div className="flex flex-wrap gap-2.5 mb-4">
                  <button onClick={() => handleSend('Explain recursion simply')} className="text-[13px] font-semibold px-4 py-2 bg-white border border-slate-200/80 rounded-full text-slate-600 hover:border-primary-400 hover:text-primary-700 hover:shadow-md transition-all shadow-sm flex items-center gap-2"><BrainCircuit size={14} className="text-primary-500"/> Explain Recursion</button>
                  <button onClick={handleGenerateQuiz} className="text-[13px] font-semibold px-4 py-2 bg-white border border-slate-200/80 rounded-full text-slate-600 hover:border-accent-400 hover:text-accent-700 hover:shadow-md transition-all shadow-sm flex items-center gap-2"><Target size={14} className="text-accent-500"/> Generate Quiz</button>
                  <button onClick={() => handleSend('Difference between DFS and BFS')} className="text-[13px] font-semibold px-4 py-2 bg-white border border-slate-200/80 rounded-full text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:shadow-md transition-all shadow-sm flex items-center gap-2"><BookOpen size={14} className="text-blue-500"/> DFS vs BFS</button>
                </div>
                
                <div className="relative shadow-2xl shadow-slate-300/40 rounded-[24px] bg-white border border-slate-200 focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all">
                  <input
                    type="text"
                    className="w-full pl-6 pr-16 py-4 rounded-[24px] focus:outline-none text-slate-900 text-[16px] placeholder:text-slate-400"
                    placeholder="Message AI Learn..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button 
                    onClick={() => handleSend()} 
                    disabled={!input.trim() || isThinking}
                    className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-[18px] transition-all transform active:scale-95"
                  >
                    <Send size={18} className={input.trim() ? "ml-0.5" : ""} />
                  </button>
                </div>
                <p className="text-center text-xs text-slate-400 mt-4 font-medium">AI Learn can make mistakes. Consider verifying important information.</p>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ QUIZ TAB â”€â”€ */}
        {activeTab === 'quiz' && (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-8">
            <div className="max-w-[850px] mx-auto">
            {quizQuestions.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400">
                <BookOpen size={48} className="opacity-30" />
                <p className="text-lg">No quiz generated yet.</p>
                <button className="btn-primary" onClick={() => { setActiveTab('chat'); setTimeout(handleGenerateQuiz, 100) }}>
                  Generate Quiz in Chat
                </button>
              </div>
            ) : (
              <div className="space-y-6 pb-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 gap-4">
                  <div className="flex-1 w-full">
                    <h2 className="text-2xl font-bold text-slate-900">Practice Quiz</h2>
                    <p className="text-slate-500 mt-1">Topic: <span className="font-semibold text-slate-700">{detectedTopic}</span></p>
                  </div>
                  <div className="flex-1 w-full md:text-right">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Question {Object.keys(selectedAnswers).length === quizQuestions.length ? quizQuestions.length : Object.keys(selectedAnswers).length + 1} of {quizQuestions.length}
                    </p>
                    <div className="h-3 w-full md:w-48 md:ml-auto bg-slate-100 rounded-full overflow-hidden shadow-inner flex mb-1">
                      <div className="h-full bg-primary-500 transition-all duration-500" style={{width: `${(Object.keys(selectedAnswers).length / quizQuestions.length) * 100}%`}}></div>
                    </div>
                    {quizDone && (
                      <p className="text-sm font-bold text-slate-700 mt-2">Score: {quizScore}/{quizQuestions.length}</p>
                    )}
                  </div>
                </div>

                {quizQuestions.map((item, idx) => {
                  const picked = selectedAnswers[idx]
                  const answered = picked !== undefined
                  const correct = picked === item.answer_index
                  return (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="pb-4 border-b border-slate-100">
                        <p className="text-sm text-slate-400 font-bold tracking-widest uppercase mb-3">Question {idx + 1} of {quizQuestions.length}</p>
                        <p className="font-semibold text-xl text-slate-800 break-words leading-relaxed pl-4 border-l-4 border-primary-400">
                          {item.question}
                        </p>
                      </div>
                      <div className="space-y-3 mt-4">
                        {(item.options ?? []).map((opt, optIdx) => {
                          const isCorrect = optIdx === item.answer_index
                          const isPicked = optIdx === picked
                          let cls = 'text-[15px] px-5 py-3.5 rounded-xl border-2 w-full text-left transition-all flex items-center gap-3 font-medium '
                          if (!answered) {
                            cls += 'border-slate-200 hover:bg-slate-50 hover:border-slate-300 cursor-pointer bg-white text-slate-700'
                          } else if (isCorrect) {
                            cls += 'border-green-500 bg-green-50 text-green-800 shadow-sm'
                          } else if (isPicked) {
                            cls += 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                          } else {
                            cls += 'border-slate-100 text-slate-400 bg-slate-50/50 cursor-default'
                          }
                          return (
                            <button key={optIdx} className={cls} disabled={answered} onClick={() => handleSelectAnswer(idx, optIdx)}>
                              <span className={`w-7 h-7 rounded-full border-2 text-[13px] flex items-center justify-center shrink-0 font-bold ${!answered ? 'border-slate-300 text-slate-500' :
                                  isCorrect ? 'border-green-500 bg-green-500 text-white' :
                                    isPicked ? 'border-red-500 bg-red-500 text-white' :
                                      'border-slate-200 text-slate-300'
                                }`}>
                                {answered && isCorrect ? <CheckCircle2 size={16} /> :
                                  answered && isPicked ? <XCircle size={16} /> :
                                    String.fromCharCode(65 + optIdx)}
                              </span>
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                      {answered && (
                        <div className={`text-[15px] p-5 rounded-xl mt-4 border shadow-sm ${correct ? 'bg-green-50 text-green-900 border-green-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            {correct ? <CheckCircle2 className="text-green-600" size={24}/> : <XCircle className="text-red-500" size={24}/>}
                            <strong className="text-lg">{correct ? 'Correct!' : `Incorrect. The correct answer is Option ${String.fromCharCode(65 + item.answer_index)}.`}</strong>
                          </div>
                          <div className="prose prose-sm max-w-none opacity-90">
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {item.explanation.replace(/âœ…|â Œ/g, '').trim()}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {quizDone && (
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl mt-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 blur-3xl rounded-full"></div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                      
                      <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center justify-center p-4 bg-primary-500/20 rounded-full text-primary-400 mb-4">
                          <Target size={40} />
                        </div>
                        <h2 className="text-3xl font-black mb-2">Quiz Complete!</h2>
                        <p className="text-slate-300 text-lg mb-6">Topic: {detectedTopic}</p>
                        
                        <div className="flex justify-center md:justify-start gap-4 mb-6">
                          <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl text-center min-w-[100px]">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Score</p>
                            <p className="text-2xl font-bold">{quizScore} / {quizQuestions.length}</p>
                          </div>
                          <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl text-center min-w-[100px]">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Accuracy</p>
                            <p className="text-2xl font-bold text-primary-400">{Math.round((quizScore / quizQuestions.length) * 100)}%</p>
                          </div>
                        </div>
                        
                        {prediction && (
                          <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl mb-6 flex items-center justify-between">
                            <div>
                              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">ML Prediction</p>
                              <p className={`font-bold ${prediction.predicted_score === 'Weak' ? 'text-red-400' : prediction.predicted_score === 'Strong' ? 'text-green-400' : 'text-amber-400'}`}>
                                {prediction.predicted_score} Mastery
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Confidence</p>
                              <p className="font-bold">{prediction.confidence}%</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 w-full bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Recommended Next Steps</p>
                        <div className="space-y-3 mb-6">
                          <button className="w-full text-left bg-slate-800 hover:bg-slate-700 p-4 rounded-xl border border-slate-700 transition-colors flex items-center gap-3">
                            <BookOpen className="text-blue-400" size={20} />
                            <div>
                              <p className="font-bold text-sm text-slate-200">Review {detectedTopic}</p>
                              <p className="text-xs text-slate-400">Watch video lesson</p>
                            </div>
                          </button>
                        </div>
                        
                        <div className="pt-6 border-t border-slate-700/50">
                          <p className="text-sm text-slate-300 mb-3 text-center">Need help understanding {detectedTopic}?</p>
                          <button 
                            onClick={() => {
                              setActiveTab('chat')
                              handleSend(`I just got some questions wrong about ${detectedTopic}. Could you please explain this topic with simple examples?`)
                            }}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                          >
                            <BrainCircuit size={20}/> Ask AI Tutor
                          </button>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}

        {/* â”€â”€ SUMMARY TAB â”€â”€ */}
        {activeTab === 'summary' && (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-8">
            <div className="max-w-[850px] mx-auto">
            {!summary ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-400">
                <BarChart2 size={48} className="opacity-30" />
                <p className="text-lg">No session summary available.</p>
                <button className="btn-primary" onClick={handleSessionSummary}>
                  Generate Summary
                </button>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Session Summary</h2>
                  <p className="text-slate-500 mt-1">Review your learning progress from this chat session.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-primary-50 border border-primary-100 text-primary-800 px-6 py-5 rounded-2xl">
                    <p className="text-sm text-primary-600 font-bold uppercase tracking-wider mb-1">Total Messages</p>
                    <p className="text-4xl font-bold">{summary.total_messages}</p>
                  </div>
                  <div className="bg-accent-50 border border-accent-100 text-accent-800 px-6 py-5 rounded-2xl">
                    <p className="text-sm text-accent-600 font-bold uppercase tracking-wider mb-1">Topics Discussed</p>
                    <p className="text-4xl font-bold">{summary.topics_covered.length || 0}</p>
                  </div>
                </div>
                
                {summary.topics_covered.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Topics Covered</h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.topics_covered.map((t, i) => (
                        <span key={i} className="px-4 py-1.5 bg-slate-100 text-slate-800 border border-slate-200 rounded-full text-sm font-semibold shadow-sm">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {summary.key_takeaways.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Key Takeaways</h3>
                    <ul className="space-y-3">
                      {summary.key_takeaways.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-[15px] text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {summary.recommended_next_steps.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Recommended Next Steps</h3>
                    <ul className="space-y-3">
                      {summary.recommended_next_steps.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-[15px] text-slate-700 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">{idx + 1}</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-200">
                  <button className="btn-secondary w-full py-3" onClick={handleSessionSummary}>Refresh Summary</button>
                </div>
              </div>
            )}
            </div>
          </div>
        )}

      </div>

      {/* RIGHT COLUMN: Learning Context Sidebar */}
      <div className="hidden xl:flex w-[320px] bg-slate-900 flex-col text-slate-300 relative z-20 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.5)]">
        
        <div className="p-6 border-b border-slate-800/80">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Target size={14} className="text-accent-400"/> Context
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {contextData ? (
            <>
              {/* Active Topic */}
              <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/50 shadow-inner">
                <p className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-widest">Current Focus</p>
                <p className="text-white font-bold flex items-center gap-2 text-lg">
                  <BookOpen size={18} className="text-blue-400"/> {detectedTopic}
                </p>
              </div>
              
              {/* Weak Topics */}
              <div>
                <p className="text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-widest flex items-center gap-1.5"><AlertTriangle size={12} className="text-amber-400"/> Needs Attention</p>
                {contextData.todayFocus && contextData.todayFocus !== "General Review" ? (
                  <div className="flex flex-col gap-3">
                    {contextData.todayFocus.split(' & ').map((topic: string) => (
                      <div key={topic} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-amber-300 mb-2">
                          <AlertTriangle size={14} className="text-amber-400"/>
                          <span className="text-sm font-bold">{topic}</span>
                        </div>
                        {prediction && prediction.predicted_score === 'Weak' && (
                          <div className="mt-2 text-xs text-amber-200/80">
                            <p>Accuracy: {contextData.stats?.averageScore || 0}%</p>
                            {prediction.reasons && prediction.reasons.length > 0 && (
                                <p className="mt-1 font-semibold text-amber-300/90">Recommendation: Review {prediction.reasons[0].toLowerCase()}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 bg-slate-800/30 rounded-xl p-3 border border-slate-800">You are doing great! No major weak topics.</p>
                )}
              </div>

              {/* Exam Readiness */}
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-800/40 rounded-2xl p-5 border border-slate-700/50">
                <p className="text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-widest">Exam Readiness</p>
                {contextData.is_new_user || !contextData.examReadiness?.score ? (
                  <div className="text-center py-2">
                    <p className="text-sm font-bold text-slate-300 mb-1">Not Available Yet</p>
                    <p className="text-xs text-slate-500">Complete 3 quizzes to unlock prediction.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end justify-between mb-3">
                      <span className="text-3xl font-black text-white leading-none">{contextData.examReadiness.score}%</span>
                      <span className="text-xs text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded-md">{contextData.examReadiness.label}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{width: `${contextData.examReadiness.score}%`}}></div>
                    </div>
                  </>
                )}
              </div>

              {/* ML Prediction */}
              {prediction && (
                <div className="bg-gradient-to-br from-primary-900/30 to-accent-900/20 border border-primary-500/20 rounded-2xl p-5 shadow-lg shadow-primary-900/10">
                  <p className="text-[10px] text-primary-300 font-bold mb-3 uppercase tracking-widest flex items-center gap-1.5"><Zap size={12}/> ML Prediction</p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400 font-medium">Predicted Score</span>
                      <span className="text-lg text-white font-bold">{prediction.predicted_score}%</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400 font-medium">Confidence</span>
                      <span className="text-sm text-primary-200 font-bold bg-primary-500/20 px-2 py-0.5 rounded-md">{prediction.confidence}%</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="animate-pulse space-y-6">
               <div className="h-20 bg-slate-800/50 rounded-2xl"></div>
               <div className="h-24 bg-slate-800/50 rounded-2xl"></div>
               <div className="h-28 bg-slate-800/50 rounded-2xl"></div>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-800/80 bg-slate-900/50">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-600 to-accent-500 flex items-center justify-center border-2 border-slate-800 shadow-md">
              🤖
            </div>
            <div>
              <p className="text-xs font-bold text-white">AI Learn Active</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Context-aware tutoring</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
