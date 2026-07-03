import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, FileText, CheckCircle, MessageSquare, Brain, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

interface ContentItem {
  id: string | number
  title: string
  topic: string
  difficulty: string
  duration_minutes: number
  url: string
  is_recommended: boolean
}

export default function Learning() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState<ContentItem[]>([])
  const [articles, setArticles] = useState<ContentItem[]>([])
  const [practice, setPractice] = useState<ContentItem[]>([])
  const [activeTab, setActiveTab] = useState<'videos' | 'articles' | 'practice'>('videos')
  
  useEffect(() => {
    const fetchContent = async () => {
      if (!user?.user_id) return
      
      try {
        const { data } = await api.get(`/api/content/learning-path/${user.user_id}`)
        if (data && data.data) {
          setVideos(data.data.videos || [])
          setArticles(data.data.articles || [])
          setPractice(data.data.practice || [])
        }
      } catch (err) {
        console.error("Failed to load learning path", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchContent()
  }, [user])

  const handleAskAI = (item: ContentItem) => {
    const context = item.is_recommended ? "Note: This is a weak topic for me." : ""
    const prompt = `Explain the concept of ${item.topic} to me. I'm currently looking at: "${item.title}". ${context}`
    navigate('/chat', { state: { prefill: prompt } })
  }

  const renderContentCards = (items: ContentItem[], type: 'video' | 'article' | 'practice') => {
    if (items.length === 0) {
      return <div className="col-span-full p-8 text-center text-gray-500 bg-white/5 rounded-xl border border-white/10">No content available for this category yet.</div>
    }
    
    return items.map((item, idx) => (
      <div key={`${item.id}-${idx}`} className="card relative group bg-white/5 border-white/10 hover:bg-white/10 transition-all flex flex-col h-full">
        {item.is_recommended && (
          <div className="absolute -top-3 -right-3 bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Brain className="w-3 h-3" /> Recommended
          </div>
        )}
        
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-primary/20 text-primary rounded-xl shrink-0">
            {type === 'video' ? <Play className="w-6 h-6" /> : type === 'article' ? <FileText className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight mb-1 group-hover:text-primary transition-colors">{item.title}</h3>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{item.topic}</span>
              <span>•</span>
              <span>{item.difficulty}</span>
              <span>•</span>
              <span>{item.duration_minutes} min</span>
            </p>
          </div>
        </div>
        
        <div className="mt-auto pt-4 flex items-center gap-3 border-t border-white/5">
          <a 
            href={item.url !== '#' ? item.url : undefined}
            target={item.url !== '#' ? "_blank" : undefined}
            rel="noreferrer"
            className="flex-1 btn-primary py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm"
          >
            {type === 'video' ? 'Watch Video' : type === 'article' ? 'Read Article' : 'Start Practice'}
            <ExternalLink className="w-4 h-4" />
          </a>
          <button 
            onClick={() => handleAskAI(item)}
            className="btn-secondary py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm whitespace-nowrap"
            title="Ask AI about this topic"
          >
            <MessageSquare className="w-4 h-4" />
            Ask AI
          </button>
        </div>
      </div>
    ))
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Learning Repository</h1>
        <p className="text-gray-400">Explore videos, read articles, and take practice quizzes tailored to your knowledge gaps.</p>
      </div>
      
      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'videos' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Play className="w-4 h-4" /> Videos ({videos.length})
        </button>
        <button
          onClick={() => setActiveTab('articles')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'articles' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4" /> Articles ({articles.length})
        </button>
        <button
          onClick={() => setActiveTab('practice')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'practice' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CheckCircle className="w-4 h-4" /> Practice ({practice.length})
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'videos' && renderContentCards(videos, 'video')}
          {activeTab === 'articles' && renderContentCards(articles, 'article')}
          {activeTab === 'practice' && renderContentCards(practice, 'practice')}
        </div>
      )}
    </div>
  )
}
