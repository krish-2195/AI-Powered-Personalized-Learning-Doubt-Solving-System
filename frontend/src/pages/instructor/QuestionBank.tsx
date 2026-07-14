import { useState, useEffect } from 'react'
import { Plus, Search, HelpCircle, Edit2, Trash2, Check, X } from 'lucide-react'
import api from '../../lib/api'

type Question = {
  id: number
  topic: string
  difficulty: string
  question_text: string
  options: string[]
  correct_answer_index: number
  explanation: string
}

export default function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    topic: '',
    difficulty: 'Medium',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer_index: 0,
    explanation: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/instructor/questions')
      if (response.data?.data) {
        setQuestions(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch questions', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [])

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData({ ...formData, options: newOptions })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/api/instructor/questions', formData)
      setIsModalOpen(false)
      setFormData({
        topic: '',
        difficulty: 'Medium',
        question_text: '',
        options: ['', '', '', ''],
        correct_answer_index: 0,
        explanation: ''
      })
      fetchQuestions()
    } catch (error) {
      console.error('Failed to add question', error)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredQuestions = questions.filter(q => 
    q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) || 
    q.topic.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const difficultyColors = {
    'Easy': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Medium': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Hard': 'bg-red-500/10 text-red-400 border-red-500/20'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 relative">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Question Bank</h1>
          <p className="text-slate-400 mt-2 font-medium">Manage quiz and assignment questions across all topics.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Create Question
        </button>
      </header>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder="Search questions by text or topic..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-900/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
        />
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-medium">Loading questions...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12 bg-surface-800/50 rounded-3xl border border-dashed border-white/10">
            <div className="w-16 h-16 bg-surface-800 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <HelpCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No questions found</h3>
            <p className="text-slate-400">Add your first question to build the bank.</p>
          </div>
        ) : (
          filteredQuestions.map(q => (
            <div key={q.id} className="bg-surface-800 border border-white/[0.06] rounded-2xl p-6 hover:border-blue-500/30 transition-colors group">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold bg-surface-700 text-slate-300 px-3 py-1 rounded-full uppercase tracking-wider">
                      {q.topic}
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${difficultyColors[q.difficulty as keyof typeof difficultyColors] || difficultyColors['Medium']} uppercase tracking-wider`}>
                      {q.difficulty}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-4 leading-relaxed">{q.question_text}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {q.options.map((opt, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-xl border text-sm flex items-center gap-3 ${
                          idx === q.correct_answer_index 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100' 
                            : 'bg-surface-900 border-white/5 text-slate-300'
                        }`}
                      >
                        <div className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center border ${
                          idx === q.correct_answer_index ? 'bg-emerald-500 text-surface-900 border-transparent' : 'border-slate-600'
                        }`}>
                          {idx === q.correct_answer_index && <Check size={12} strokeWidth={3} />}
                        </div>
                        {opt}
                      </div>
                    ))}
                  </div>
                  
                  {q.explanation && (
                    <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-sm">
                      <span className="font-bold text-blue-400 mb-1 block">Explanation:</span>
                      <p className="text-slate-300 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors" title="Edit">
                    <Edit2 size={18} />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface-800 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl relative my-8">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors p-1 bg-surface-700 rounded-full"
            >
              <X size={20} />
            </button>
            
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Question</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Topic</label>
                    <input
                      type="text"
                      required
                      value={formData.topic}
                      onChange={e => setFormData({...formData, topic: e.target.value})}
                      className="w-full bg-surface-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      placeholder="e.g. Recursion"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label>
                    <select
                      value={formData.difficulty}
                      onChange={e => setFormData({...formData, difficulty: e.target.value})}
                      className="w-full bg-surface-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Question Text</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.question_text}
                    onChange={e => setFormData({...formData, question_text: e.target.value})}
                    className="w-full bg-surface-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    placeholder="Type the question here..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Options</label>
                  {formData.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, correct_answer_index: idx})}
                        className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center border ${
                          formData.correct_answer_index === idx 
                            ? 'bg-emerald-500 text-surface-900 border-transparent' 
                            : 'border-slate-500 text-transparent hover:border-emerald-500/50'
                        }`}
                        title="Mark as correct answer"
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={e => handleOptionChange(idx, e.target.value)}
                        className={`w-full bg-surface-950/50 border rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 transition-all ${
                          formData.correct_answer_index === idx
                            ? 'border-emerald-500/50 focus:ring-emerald-500/50'
                            : 'border-white/10 focus:ring-blue-500/50'
                        }`}
                        placeholder={`Option ${idx + 1}`}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-slate-500 mt-2">Click the circle next to an option to mark it as the correct answer.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Explanation (Optional)</label>
                  <textarea
                    rows={2}
                    value={formData.explanation}
                    onChange={e => setFormData({...formData, explanation: e.target.value})}
                    className="w-full bg-surface-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    placeholder="Explain why the correct answer is right..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-surface-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Question'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
