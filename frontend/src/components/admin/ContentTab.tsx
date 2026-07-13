import { useState, useEffect } from 'react'
import { BookOpen, Search, Plus, Filter, Edit2, Trash2, Video, FileText as ArticleIcon, HelpCircle, X, Check } from 'lucide-react'
import api from '../../lib/api'

export default function ContentTab() {
  const [activeSubTab, setActiveSubTab] = useState<'questions' | 'videos' | 'study-materials'>('questions')
  const [data, setData] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newQuestion, setNewQuestion] = useState({
    topic: 'Arrays', // Default or dummy
    difficulty: 'Medium',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer_index: 0,
    explanation: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData(activeSubTab)
  }, [activeSubTab])

  const fetchData = async (type: string) => {
    setLoading(true)
    try {
      const { data: res } = await api.get(`/api/admin/content/${type}`)
      setData(res.data)
    } catch (err) {
      console.error(`Failed to fetch ${type}`, err)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      await api.post('/api/admin/question', newQuestion)
      setMessage('Question added successfully!')
      setTimeout(() => {
        setIsModalOpen(false)
        fetchData('questions')
        setMessage('')
        setNewQuestion({
          topic: 'Arrays',
          difficulty: 'Medium',
          question_text: '',
          options: ['', '', '', ''],
          correct_answer_index: 0,
          explanation: ''
        })
      }, 1500)
    } catch (err: any) {
      setMessage(err.message || 'Failed to add question')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOptionChange = (index: number, val: string) => {
    const newOpts = [...newQuestion.options]
    newOpts[index] = val
    setNewQuestion({...newQuestion, options: newOpts})
  }

  const filteredData = (data || []).filter(item => {
    const term = searchTerm.toLowerCase()
    return (
      (item.question && item.question.toLowerCase().includes(term)) ||
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.topic && item.topic.toLowerCase().includes(term)) ||
      (item.difficulty && item.difficulty.toLowerCase().includes(term))
    )
  })

  return (
    <div className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 rounded-2xl border border-white/[0.08] shadow-soft overflow-hidden flex flex-col md:flex-row h-[700px]">
      
      {/* Sidebar for SubTabs */}
      <div className="w-full md:w-64 bg-surface-800 border-r border-white/[0.08] flex flex-col">
        <div className="p-6 border-b border-white/[0.08]">
          <h2 className="text-lg font-display font-bold text-slate-100 flex items-center gap-3">
            <span className="grid place-items-center h-9 w-9 rounded-xl border border-primary-400/30 bg-primary-500/15 text-primary-300"><BookOpen size={18}/></span>
            Repository
          </h2>
        </div>
        <div className="p-4 space-y-2 flex-1">
          <button 
            onClick={() => setActiveSubTab('questions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeSubTab === 'questions' ? 'bg-primary-500/10 text-primary-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
          >
            <HelpCircle size={18}/> Question Bank
          </button>
          <button 
            onClick={() => setActiveSubTab('videos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeSubTab === 'videos' ? 'bg-primary-500/10 text-primary-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
          >
            <Video size={18}/> Video Modules
          </button>
          <button 
            onClick={() => setActiveSubTab('study-materials')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeSubTab === 'study-materials' ? 'bg-primary-500/10 text-primary-400' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
          >
            <ArticleIcon size={18}/> Study Materials
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header toolbar */}
        <div className="p-6 border-b border-white/[0.08] flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-850">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
            <input 
              type="text" 
              placeholder={`Search by Topic, Difficulty, or Text...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-800 border border-white/[0.08] rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none text-white placeholder-slate-500" 
            />
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary text-sm">
              <Filter size={16}/> Filter
            </button>
            {activeSubTab === 'questions' && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="btn-primary text-sm"
              >
                <Plus size={18}/> Add Question
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto bg-surface-850">
          {loading ? (
            <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : filteredData.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 bg-surface-800 border border-white/[0.08] rounded-full flex items-center justify-center mb-4 text-slate-500">
                <Search size={24} />
              </div>
              {activeSubTab === 'videos' ? (
                <>
                  <p className="text-white font-bold mb-1">No Video Modules Available.</p>
                  <p className="text-xs text-slate-400">Video repository will be expanded in future versions.</p>
                </>
              ) : activeSubTab === 'study-materials' ? (
                <>
                  <p className="text-white font-bold mb-1">Future Content</p>
                  <p className="text-xs text-slate-400">Planned Feature - Reserved for Phase 2.</p>
                </>
              ) : (
                <>
                  <p className="text-white font-bold mb-1">No content found.</p>
                  <p className="text-xs text-slate-400">Add content or sync database.</p>
                </>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-800 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-white/[0.08]">
                  <th className="p-4 w-12 text-center">ID</th>
                  <th className="p-4">{activeSubTab === 'questions' ? 'Question' : 'Title'}</th>
                  <th className="p-4">Topic</th>
                  <th className="p-4">Difficulty</th>
                  {activeSubTab !== 'questions' && <th className="p-4">Duration</th>}
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-surface-800 transition-colors group">
                    <td className="p-4 text-xs font-bold text-slate-500 text-center">#{item.id}</td>
                    <td className="p-4 text-sm font-bold text-white max-w-xs truncate">
                      {item.question || item.title}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md text-[10px] uppercase tracking-wider font-bold border border-white/10">
                        {item.topic}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${
                        item.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400' :
                        item.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                        item.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {item.difficulty}
                      </span>
                    </td>
                    {activeSubTab !== 'questions' && (
                      <td className="p-4 text-sm text-slate-400 font-bold">{item.duration} min</td>
                    )}
                    <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex justify-end gap-1">
                        <button className="p-1.5 text-slate-400 hover:text-primary-400 hover:bg-primary-500/20 rounded transition-colors"><Edit2 size={16}/></button>
                        <button className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Question Modal */}
      {/* Add Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-850/80 backdrop-blur-sm">
          <div className="bg-surface-800 rounded-3xl w-full max-w-2xl shadow-2xl border border-white/[0.08] flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/[0.08] flex justify-between items-center">
              <h2 className="text-xl font-display font-bold text-slate-100 flex items-center gap-3"><span className="grid place-items-center h-9 w-9 rounded-xl border border-primary-400/30 bg-primary-500/15 text-primary-300"><HelpCircle size={18}/></span> Add New Question</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={24}/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {message && (
                <div className={`p-4 mb-6 rounded-xl text-sm font-bold flex items-center gap-2 ${message.includes('success') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {message.includes('success') && <Check size={18}/>}
                  {message}
                </div>
              )}

              <form id="add-question-form" onSubmit={handleAddQuestion} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Question Text</label>
                  <textarea 
                    required 
                    value={newQuestion.question_text}
                    onChange={e => setNewQuestion({...newQuestion, question_text: e.target.value})}
                    className="w-full p-3 bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.08] text-white rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none min-h-[100px] placeholder-slate-600"
                    placeholder="Enter the main question..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Topic</label>
                    <input 
                      type="text" 
                      required 
                      value={newQuestion.topic}
                      onChange={e => setNewQuestion({...newQuestion, topic: e.target.value})}
                      className="w-full p-3 bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.08] text-white rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Difficulty</label>
                    <select 
                      value={newQuestion.difficulty}
                      onChange={e => setNewQuestion({...newQuestion, difficulty: e.target.value})}
                      className="w-full p-3 bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.08] text-white rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">Options (Select the correct one)</label>
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`flex items-center gap-3 p-2 border rounded-xl transition-colors ${newQuestion.correct_answer_index === i ? 'border-primary-500 bg-primary-500/10' : 'border-white/[0.08] bg-surface-850'}`}>
                        <input 
                          type="radio" 
                          name="correct_option"
                          checked={newQuestion.correct_answer_index === i}
                          onChange={() => setNewQuestion({...newQuestion, correct_answer_index: i})}
                          className="w-5 h-5 text-primary-500 ml-2"
                        />
                        <input 
                          type="text" 
                          required
                          value={newQuestion.options[i]}
                          onChange={e => handleOptionChange(i, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          className="flex-1 bg-transparent p-2 focus:outline-none text-white placeholder-slate-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Explanation (Optional)</label>
                  <textarea 
                    value={newQuestion.explanation}
                    onChange={e => setNewQuestion({...newQuestion, explanation: e.target.value})}
                    className="w-full p-3 bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.08] text-white rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-none placeholder-slate-600"
                    placeholder="Explain why the correct answer is right..."
                  />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-white/[0.08] flex justify-end gap-3 bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 rounded-b-3xl">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="add-question-form"
                disabled={submitting}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
