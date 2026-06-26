import { useMemo, useRef, useEffect, useState } from 'react'
import { Send, Sparkles, CheckCircle2, XCircle, MessageSquare, BookOpen, BarChart2 } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

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
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: "Hello! I'm your AI tutor. Ask me any questions about your subjects!" },
  ])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detectedTopic, setDetectedTopic] = useState<string>('General Problem Solving')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { user } = useAuth()
  const userId = user?.user_id || 1
  const sessionId = useMemo(() => `session-${userId}-${Date.now()}`, [userId])

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

      if (data.topic_detected) {
        setDetectedTopic(data.topic_detected)
      }
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
        time_taken_seconds: 30, // Mocked 30 seconds per question for now
        is_correct: selectedAnswers[i] === q.answer_index
      }))

      api.post('/api/performance/submit', {
        user_id: userId,
        quiz_id: `quiz-${Date.now()}`,
        topic_id: 1, // Mocked topic_id 1 since we don't have a Topic ID lookup here yet
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
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-3 overflow-hidden">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-3xl font-bold">AI Tutor</h1>
          <p className="text-gray-500">Ask, explore, and get instant explanations.</p>
        </div>
        <div className="pill shrink-0">
          <Sparkles size={16} className="text-primary-600" /> Tip: Ask for examples!
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'chat'
              ? 'bg-white border border-b-white border-slate-200 text-primary-600 -mb-px'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <MessageSquare size={14} /> Chat
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'quiz'
              ? 'bg-white border border-b-white border-slate-200 text-primary-600 -mb-px'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <BookOpen size={14} />
          Quiz
          {quizQuestions.length > 0 && (
            <span className="ml-1 bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full">
              {quizDone ? `${quizScore}/${quizQuestions.length}` : quizQuestions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'summary'
              ? 'bg-white border border-b-white border-slate-200 text-primary-600 -mb-px'
              : 'text-slate-500 hover:text-slate-700'
            }`}
        >
          <BarChart2 size={14} /> Summary
          {summary && <span className="ml-1 w-2 h-2 rounded-full bg-green-500 inline-block" />}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 shrink-0">{error}</p>}

      {/* â”€â”€ CHAT TAB â”€â”€ */}
      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {[
              'Explain recursion with a story',
              'Give me 3 DP practice questions',
              'Show me a quick graph BFS refresher',
            ].map((prompt) => (
              <button key={prompt} className="btn-secondary text-sm" onClick={() => handleSend(prompt)}>
                {prompt}
              </button>
            ))}
            <button className="btn-secondary text-sm" onClick={handleGenerateQuiz}>
              Generate 5-question quiz
            </button>
            <button className="btn-secondary text-sm" onClick={handleSessionSummary}>
              Summarize session
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 card overflow-y-auto space-y-4 bg-gradient-to-br from-white/80 to-accent-50/70">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] p-4 rounded-2xl shadow-sm whitespace-pre-wrap break-words ${msg.role === 'user'
                      ? 'bg-gradient-to-r from-primary-600 to-accent-500 text-white'
                      : 'bg-white text-gray-900 border border-white/70'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                AI is thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="flex gap-2 shrink-0">
            <input
              type="text"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-600 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={() => handleSend()} className="btn-primary flex items-center gap-2 px-5">
              <Send size={18} />
              Ask
            </button>
          </div>
        </div>
      )}

      {/* â”€â”€ QUIZ TAB â”€â”€ */}
      {activeTab === 'quiz' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {quizQuestions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
              <BookOpen size={48} className="opacity-30" />
              <p className="text-lg">No quiz yet</p>
              <button className="btn-primary" onClick={() => { setActiveTab('chat'); setTimeout(handleGenerateQuiz, 100) }}>
                Generate Quiz
              </button>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Practice Quiz</h2>
                  <p className="text-sm text-slate-500">{detectedTopic}</p>
                </div>
                {quizDone && (
                  <div className={`px-4 py-2 rounded-xl font-semibold text-sm ${quizScore === quizQuestions.length ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {quizScore}/{quizQuestions.length} Â· {quizScore === quizQuestions.length ? 'Perfect! ðŸŽ‰' : 'Keep practising!'}
                  </div>
                )}
              </div>

              {quizQuestions.map((item, idx) => {
                const picked = selectedAnswers[idx]
                const answered = picked !== undefined
                const correct = picked === item.answer_index
                return (
                  <div key={idx} className="card space-y-3">
                    <p className="font-medium break-words">
                      <span className="text-primary-600 font-bold mr-1">Q{idx + 1}.</span> {item.question}
                    </p>
                    <div className="space-y-2">
                      {(item.options ?? []).map((opt, optIdx) => {
                        const isCorrect = optIdx === item.answer_index
                        const isPicked = optIdx === picked
                        let cls = 'text-sm px-4 py-2.5 rounded-xl border w-full text-left transition-colors flex items-center gap-2 '
                        if (!answered) {
                          cls += 'border-slate-300 hover:bg-primary-50 hover:border-primary-400 cursor-pointer bg-white text-slate-800'
                        } else if (isCorrect) {
                          cls += 'border-green-400 bg-green-50 text-green-800'
                        } else if (isPicked) {
                          cls += 'border-red-400 bg-red-50 text-red-700'
                        } else {
                          cls += 'border-slate-100 text-slate-400 bg-slate-50 cursor-default'
                        }
                        return (
                          <button key={optIdx} className={cls} disabled={answered} onClick={() => handleSelectAnswer(idx, optIdx)}>
                            <span className={`w-6 h-6 rounded-full border text-xs flex items-center justify-center shrink-0 font-medium ${!answered ? 'border-slate-300 text-slate-500' :
                                isCorrect ? 'border-green-500 bg-green-500 text-white' :
                                  isPicked ? 'border-red-400 bg-red-400 text-white' :
                                    'border-slate-200 text-slate-300'
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
                      <div className={`text-sm p-3 rounded-xl ${correct ? 'bg-green-50 text-green-800' : 'bg-slate-50 text-slate-700'}`}>
                        {correct ? 'âœ… Correct! ' : `âŒ Correct answer: Option ${String.fromCharCode(65 + item.answer_index)}. `}
                        {item.explanation}
                      </div>
                    )}
                  </div>
                )
              })}

              {quizDone && (
                <button className="btn-secondary w-full" onClick={() => { setActiveTab('chat'); setTimeout(handleGenerateQuiz, 100) }}>
                  Try another quiz
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ SUMMARY TAB â”€â”€ */}
      {activeTab === 'summary' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {!summary ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
              <BarChart2 size={48} className="opacity-30" />
              <p className="text-lg">No summary yet</p>
              <button className="btn-primary" onClick={handleSessionSummary}>
                Generate Summary
              </button>
            </div>
          ) : (
            <div className="card space-y-4 max-w-2xl bg-white">
              <h2 className="text-xl font-semibold text-slate-900">Session Summary</h2>
              <div className="flex gap-4 text-sm">
                <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-xl">
                  <p className="text-xs text-primary-600 font-medium">Messages</p>
                  <p className="text-xl font-bold">{summary.total_messages}</p>
                </div>
                <div className="bg-accent-50 text-accent-700 px-4 py-2 rounded-xl">
                  <p className="text-xs text-accent-600 font-medium">Topics</p>
                  <p className="text-xl font-bold">{summary.topics_covered.length || 0}</p>
                </div>
              </div>
              {summary.topics_covered.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Topics covered</p>
                  <div className="flex flex-wrap gap-2">
                    {summary.topics_covered.map((t, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-200 text-slate-900 rounded-full text-sm font-medium">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {summary.key_takeaways.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Key takeaways</p>
                  <ul className="space-y-2">
                    {summary.key_takeaways.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-800">
                        <CheckCircle2 size={15} className="text-green-600 mt-0.5 shrink-0" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.recommended_next_steps.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Recommended next steps</p>
                  <ul className="space-y-2">
                    {summary.recommended_next_steps.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-800">
                        <span className="text-primary-600 font-bold shrink-0">{idx + 1}.</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button className="btn-secondary" onClick={handleSessionSummary}>Refresh summary</button>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
