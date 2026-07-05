import { useState, useEffect } from 'react'
import { BookOpen, Search, Plus, Filter, Edit2, Trash2, Video, FileText as ArticleIcon, HelpCircle, X, Check } from 'lucide-react'
import api from '../../lib/api'

export default function ContentTab() {
  const [activeSubTab, setActiveSubTab] = useState<'questions' | 'videos' | 'articles'>('questions')
  const [data, setData] = useState<any[]>([])
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
      
      {/* Sidebar for SubTabs */}
      <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen size={20} className="text-primary-600"/>
            Repository
          </h2>
        </div>
        <div className="p-4 space-y-2 flex-1">
          <button 
            onClick={() => setActiveSubTab('questions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeSubTab === 'questions' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <HelpCircle size={18}/> Question Bank
          </button>
          <button 
            onClick={() => setActiveSubTab('videos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeSubTab === 'videos' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Video size={18}/> Video Modules
          </button>
          <button 
            onClick={() => setActiveSubTab('articles')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeSubTab === 'articles' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <ArticleIcon size={18}/> Articles
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header toolbar */}
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input type="text" placeholder={`Search ${activeSubTab}...`} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none" />
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center gap-2">
              <Filter size={16}/> Filter
            </button>
            {activeSubTab === 'questions' && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2"
              >
                <Plus size={16}/> Add Question
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : data.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <Search size={24} />
              </div>
              <p className="text-slate-500 font-semibold mb-1">No {activeSubTab} found.</p>
              <p className="text-xs text-slate-400">Add content or sync database.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-semibold w-12 text-center">ID</th>
                  <th className="p-4 font-semibold">{activeSubTab === 'questions' ? 'Question' : 'Title'}</th>
                  <th className="p-4 font-semibold">Topic</th>
                  <th className="p-4 font-semibold">Difficulty</th>
                  {activeSubTab !== 'questions' && <th className="p-4 font-semibold">Duration</th>}
                  <th className="p-4 font-semibold">Created</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 text-xs font-semibold text-slate-400 text-center">#{item.id}</td>
                    <td className="p-4 text-sm font-medium text-slate-800 max-w-xs truncate">
                      {item.question || item.title}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold border border-slate-200">
                        {item.topic}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        item.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                        item.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        item.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {item.difficulty}
                      </span>
                    </td>
                    {activeSubTab !== 'questions' && (
                      <td className="p-4 text-sm text-slate-600 font-medium">{item.duration} min</td>
                    )}
                    <td className="p-4 text-xs text-slate-500">{item.created_at}</td>
                    <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex justify-end gap-1">
                        <button className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"><Edit2 size={16}/></button>
                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
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
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><HelpCircle className="text-primary-600"/> Add New Question</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24}/>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {message && (
                <div className={`p-4 mb-6 rounded-xl text-sm font-bold flex items-center gap-2 ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {message.includes('success') && <Check size={18}/>}
                  {message}
                </div>
              )}

              <form id="add-question-form" onSubmit={handleAddQuestion} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Question Text</label>
                  <textarea 
                    required 
                    value={newQuestion.question_text}
                    onChange={e => setNewQuestion({...newQuestion, question_text: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none min-h-[100px]"
                    placeholder="Enter the main question..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Topic</label>
                    <input 
                      type="text" 
                      required 
                      value={newQuestion.topic}
                      onChange={e => setNewQuestion({...newQuestion, topic: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Difficulty</label>
                    <select 
                      value={newQuestion.difficulty}
                      onChange={e => setNewQuestion({...newQuestion, difficulty: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Options (Select the correct one)</label>
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`flex items-center gap-3 p-2 border rounded-xl transition-colors ${newQuestion.correct_answer_index === i ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}>
                        <input 
                          type="radio" 
                          name="correct_option"
                          checked={newQuestion.correct_answer_index === i}
                          onChange={() => setNewQuestion({...newQuestion, correct_answer_index: i})}
                          className="w-5 h-5 text-primary-600 ml-2"
                        />
                        <input 
                          type="text" 
                          required
                          value={newQuestion.options[i]}
                          onChange={e => handleOptionChange(i, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          className="flex-1 bg-transparent p-2 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Explanation (Optional)</label>
                  <textarea 
                    value={newQuestion.explanation}
                    onChange={e => setNewQuestion({...newQuestion, explanation: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="Explain why the correct answer is right..."
                  />
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="add-question-form"
                disabled={submitting}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
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
