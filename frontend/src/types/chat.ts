export type Tab = 'chat' | 'quiz' | 'summary'

export type Message = {
  role: 'user' | 'ai'
  content: string
}

export type QuizQuestion = {
  question: string
  options: string[]
  answer_index: number
  explanation: string
  difficulty?: string
}

export type SessionSummary = {
  user_id: string
  total_messages: number
  topics_covered: string[]
  key_takeaways: string[]
  unresolved_doubts: string[]
  recommended_next_steps: string[]
}
