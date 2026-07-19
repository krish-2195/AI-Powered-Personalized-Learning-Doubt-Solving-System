import { useState, useEffect } from 'react'
import { Search, ShieldAlert, CheckCircle2, Trash2, Video, FileText, HelpCircle, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'

type TabType = 'questions' | 'videos' | 'materials'

export default function ContentModeration() {
  const [activeTab, setActiveTab] = useState<TabType>('questions')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = async (tab: TabType) => {
    setLoading(true)
    try {
      let endpoint = ''
      if (tab === 'questions') endpoint = '/api/admin/content/questions'
      else if (tab === 'videos') endpoint = '/api/admin/content/videos'
      else if (tab === 'materials') endpoint = '/api/admin/content/study-materials'

      const response = await api.get(endpoint)
      if (response.data) {
        // The API might return it directly or wrapped in 'data'
        setData(response.data.data || response.data)
      }
    } catch (error) {
      console.error(`Failed to fetch ${tab}`, error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab])

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return
    
    try {
      if (activeTab === 'questions') {
        await api.delete(`/api/admin/content/questions/${id}`)
      } else {
        await api.delete(`/api/admin/content/materials/${id}`)
      }
      // Refresh
      fetchData(activeTab)
    } catch (error) {
      console.error('Failed to delete content', error)
      alert('Failed to delete content')
    }
  }

  const filteredData = data.filter(item => {
    const textToSearch = (item.question_text || item.title || item.topic || '').toLowerCase()
    return textToSearch.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <ShieldAlert className="text-rose-500" />
          Content Moderation
        </h1>
        <p className="text-slate-400 mt-2 font-medium">Review, flag, and remove inappropriate or low-quality platform content.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-1">
        <button 
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'questions' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <HelpCircle size={16} /> Question Bank
        </button>
        <button 
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'videos' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Video size={16} /> Video Lectures
        </button>
        <button 
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'materials' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <FileText size={16} /> Study Materials
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-900/60 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-surface-800/50 border border-white/5 rounded-2xl h-24 animate-pulse" />
          ))
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 bg-surface-800/50 rounded-3xl border border-dashed border-white/10">
            <CheckCircle2 size={32} className="text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Queue Empty</h3>
            <p className="text-slate-400">No content found in this category.</p>
          </div>
        ) : (
          filteredData.map((item, idx) => (
            <div key={idx} className="bg-surface-800 border border-white/[0.06] rounded-2xl p-6 hover:border-rose-500/30 transition-colors group">
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                
                <div className="flex-1">
                  {activeTab === 'questions' ? (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold bg-surface-700 text-slate-300 px-3 py-1 rounded-full uppercase tracking-wider">
                          {item.topic_name || item.topic_id || 'Unknown Topic'}
                        </span>
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          <AlertTriangle size={12} className="text-amber-500" /> Auto-Flagged (AI)
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{item.question_text}</h3>
                      <p className="text-sm text-slate-400"><strong>Options:</strong> {item.options?.join(', ')}</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold bg-surface-700 text-slate-300 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                          {activeTab === 'videos' ? <Video size={12} /> : <FileText size={12} />}
                          {item.content_type}
                        </span>
                        {item.reports_count > 0 && (
                           <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                             <AlertTriangle size={12} /> {item.reports_count} User Reports
                           </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                      <p className="text-sm text-slate-400">{item.description}</p>
                      <a href={item.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-sm font-medium mt-2 inline-block">
                        View Source
                      </a>
                    </>
                  )}
                </div>

                <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                  <button className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-2 px-4 rounded-xl transition-colors text-sm">
                    Approve
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2 text-sm"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
