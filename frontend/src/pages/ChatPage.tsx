import { useRef, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, Plus } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Tab, Message, QuizQuestion, SessionSummary } from '../types/chat'
import ChatMessageList from '../components/chat/ChatMessageList'
import ChatInputBar from '../components/chat/ChatInputBar'
import QuizTab from '../components/chat/QuizTab'
import SummaryTab from '../components/chat/SummaryTab'
import ContextSidebar from '../components/chat/ContextSidebar'
import OnboardingOverlay from '../components/chat/OnboardingOverlay'

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
  const [quizMLResult, setQuizMLResult] = useState<any>(null)
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false)
  const [quizDifficulty, setQuizDifficulty] = useState('Medium')
  const [quizCount, setQuizCount] = useState(5)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [isBaseline, setIsBaseline] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const userId = user?.user_id || 1
  const navigate = useNavigate()
  const location = useLocation()

  const [sessionId, setSessionId] = useState(() => {
    const saved = localStorage.getItem('chatSessionId')
    if (saved) return saved
    const newId = `session-${userId}-${Date.now()}`
    localStorage.setItem('chatSessionId', newId)
    return newId
  })

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const quizScore = quizQuestions.length
    ? quizQuestions.filter((q, i) => selectedAnswers[i] === q.answer_index).length
    : 0
  const quizDone = quizQuestions.length > 0 && Object.keys(selectedAnswers).length === quizQuestions.length

  // ─── Effects ─────────────────────────────────────────────────────────────────

  // Sync chat history from backend on mount
  useEffect(() => {
    const syncHistory = async () => {
      try {
        const { data } = await api.get(`/api/chat/history/${userId}`)
        if (data.status === 'success' && data.data.messages.length > 0) {
          const remoteSession = data.data.session_id
          const remoteMessages = data.data.messages
          const localMessages = JSON.parse(localStorage.getItem('chatMessages') || '[]')
          const localSession = localStorage.getItem('chatSessionId')
          if (remoteSession !== localSession) {
            setSessionId(remoteSession)
            setMessages(remoteMessages)
            localStorage.setItem('chatSessionId', remoteSession)
            localStorage.setItem('chatMessages', JSON.stringify(remoteMessages))
          } else {
            // Merge strategy: Keep optimistic local messages that haven't reached remote yet
            const merged = [...remoteMessages]
            if (localMessages.length > remoteMessages.length) {
              const optimisticMessages = localMessages.slice(remoteMessages.length)
              merged.push(...optimisticMessages)
            }
            setMessages(merged)
            localStorage.setItem('chatMessages', JSON.stringify(merged))
          }
        }
      } catch (err) {
        console.error('Failed to sync chat history', err)
      }
    }
    syncHistory()
  }, [userId])

  // Persist messages to localStorage
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages))
  }, [messages])

  // Handle prefill / quiz-from-route state
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const prefillQuery = queryParams.get('prefill');

    if (location.state?.prefill || prefillQuery) {
      const textToPrefill = location.state?.prefill || prefillQuery;
      setInput(textToPrefill)
      if (prefillQuery) {
        window.history.replaceState({}, document.title, location.pathname);
      } else {
        window.history.replaceState({}, document.title)
      }
    } else if (location.state?.generateQuiz && location.state?.topic) {
      if (location.state?.isBaseline) setIsBaseline(true)
      handleGenerateQuiz(location.state.topic)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Start onboarding flow once baseline quiz ML result is ready
  useEffect(() => {
    if (isBaseline && quizMLResult && onboardingStep === 0) setOnboardingStep(1)
  }, [isBaseline, quizMLResult, onboardingStep])

  // Advance onboarding steps automatically
  useEffect(() => {
    if (onboardingStep > 0 && onboardingStep < 4) {
      const timer = setTimeout(() => setOnboardingStep(prev => prev + 1), 1500)
      return () => clearTimeout(timer)
    } else if (onboardingStep === 4) {
      navigate('/dashboard', { state: { onboardingComplete: true } })
    }
  }, [onboardingStep, navigate])

  // Fetch dashboard context for sidebar
  useEffect(() => {
    if (userId) {
      api.get(`/api/dashboard/?user_id=${userId}`)
        .then((res: any) => setContextData(res.data.data))
        .catch(console.error)
    }
  }, [userId])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isThinking, activeTab])

  // Auto-submit quiz results to ML when quiz is complete
  useEffect(() => {
    if (quizDone && !quizMLResult && !isSubmittingQuiz) {
      setIsSubmittingQuiz(true)
      const payload = {
        user_id: String(userId),
        quiz_id: `quiz-${Date.now()}`,
        topic: detectedTopic,
        questions_count: quizQuestions.length,
        correct_answers: quizScore,
        time_taken_seconds: 120,
        attempt_number: 1,
        difficulty: 'medium',
        topic_id: null,
        avg_time_per_question: 120 / quizQuestions.length,
      }
      api.post('/api/learning/quiz/submit', payload)
        .then((res: any) => setQuizMLResult(res.data.ml_prediction || res.data))
        .catch((err: any) => console.error('Failed to submit quiz to ML Engine', err))
        .finally(() => setIsSubmittingQuiz(false))
    }
  }, [quizDone, quizMLResult, isSubmittingQuiz, quizQuestions.length, quizScore, userId, detectedTopic])

  // Auto-fetch summary when switching to summary tab
  useEffect(() => {
    if (activeTab === 'summary' && !summary && !isGeneratingSummary) {
      handleSessionSummary()
    }
  }, [activeTab, summary])

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const startNewSession = () => {
    const newId = `session-${userId}-${Date.now()}`
    const initialMessage: Message = { role: 'ai', content: "Hello! I'm your **AI tutor**. We've started a new study session. What would you like to learn today?" }
    setSessionId(newId)
    setMessages([initialMessage])
    localStorage.setItem('chatSessionId', newId)
    localStorage.setItem('chatMessages', JSON.stringify([initialMessage]))
    setActiveTab('chat')
  }

  const handleSend = async (prefilledText?: string) => {
    const text = (prefilledText ?? input).trim()
    if (!text) return
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsThinking(true)
    setInput('')
    try {
      const { data } = await api.post('/api/chat/message', {
        user_id: userId, session_id: sessionId, message: text,
      })
      setMessages(prev => [...prev, { role: 'ai', content: data.data?.response || data.response }])
      if (data.topic_detected) setDetectedTopic(data.topic_detected)
    } catch (err: any) {
      setError(err.message || 'Could not reach AI Tutor')
      setMessages(prev => [...prev, { role: 'ai', content: 'I could not process that right now. Please try again.' }])
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
        user_id: userId, topic, difficulty: quizDifficulty.toLowerCase(), count: quizCount, quiz_type: quizType,
      })
      setQuizQuestions(data.data?.questions || data.questions || [])
      if (topicOverride) setDetectedTopic(topicOverride)
    } catch (err: any) {
      setError(err.message || 'Could not generate quiz')
      setActiveTab('chat')
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

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

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-6.5rem)] bg-[#0f111a] rounded-[28px] overflow-hidden border border-white/[0.08] shadow-2xl">

      {/* LEFT COLUMN: Main chat area */}
      <div className="flex flex-col flex-1 min-w-0 bg-[#0a0b10] relative">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0a0b10]/90 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-display font-bold flex items-center gap-2">
              <Sparkles className="text-primary-400" size={20} />
              <span className="gradient-text">{isBaseline ? 'AI Diagnostic Onboarding' : 'AI Tutor'}</span>
            </h1>
          </div>

          {!isBaseline ? (
            <div className="flex gap-1 bg-[#151722] p-1 rounded-xl border border-white/[0.08]">
              {(['chat', 'quiz', 'summary'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all capitalize ${
                    activeTab === tab
                      ? 'bg-[#212435] text-white shadow-sm border border-white/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs font-bold text-primary-400 bg-primary-500/10 px-4 py-1.5 rounded-full border border-primary-500/20 animate-pulse uppercase tracking-wider">
              Diagnostic Mode
            </div>
          )}

          <div>
            {!isBaseline && (
              <button onClick={startNewSession} className="btn-primary text-sm !px-4 !py-2">
                <Plus size={16} /> New Session
              </button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 text-sm text-center font-medium border-b border-red-500/20">
            {error}
          </div>
        )}

        {/* Chat tab */}
        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 overflow-hidden relative">
            <ChatMessageList
              messages={messages}
              isThinking={isThinking}
              messagesEndRef={messagesEndRef}
            />
            <ChatInputBar
              input={input}
              isThinking={isThinking}
              onInputChange={setInput}
              onSend={handleSend}
              onGenerateQuiz={() => handleGenerateQuiz(undefined, 'hybrid')}
            />
          </div>
        )}

        {/* Quiz tab */}
        {activeTab === 'quiz' && (
          <QuizTab
            isBaseline={isBaseline}
            isGeneratingQuiz={isGeneratingQuiz}
            quizQuestions={quizQuestions}
            selectedAnswers={selectedAnswers}
            quizDifficulty={quizDifficulty}
            quizCount={quizCount}
            detectedTopic={detectedTopic}
            quizScore={quizScore}
            quizDone={quizDone}
            quizMLResult={quizMLResult}
            onSelectAnswer={(qIdx, optIdx) => setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
            onSetDifficulty={setQuizDifficulty}
            onSetCount={setQuizCount}
            onGenerateQuiz={() => handleGenerateQuiz(undefined, 'hybrid')}
            onBackToChat={() => setActiveTab('chat')}
          />
        )}

        {/* Summary tab */}
        {activeTab === 'summary' && (
          <SummaryTab
            isGeneratingSummary={isGeneratingSummary}
            summary={summary}
            onBackToChat={() => setActiveTab('chat')}
          />
        )}
      </div>

      {/* RIGHT COLUMN: Context sidebar */}
      <ContextSidebar contextData={contextData} detectedTopic={detectedTopic} />

      {/* Onboarding overlay */}
      <OnboardingOverlay step={onboardingStep} />
    </div>
  )
}
