import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, FileText, CheckCircle, MessageSquare, Brain, ExternalLink, Sparkles } from 'lucide-react'
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
  recommendation_reason?: string
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

  const handleStartPractice = (item: ContentItem) => {
    navigate('/chat', { state: { generateQuiz: true, topic: item.topic } })
  }

  const allContent = useMemo(() => {
    return [...videos, ...articles, ...practice]
  }, [videos, articles, practice])

  const recommendedItems = useMemo(() => {
    return allContent.filter(item => item.is_recommended)
  }, [allContent])

  const renderContentCards = (items: ContentItem[]) => {
    if (items.length === 0) {
      return <div className="col-span-full p-8 text-center text-gray-500 bg-white/5 rounded-xl border border-white/10">No content available for this category yet.</div>
    }
    
    return items.map((item, idx) => {
      // Determine type based on where it came from, or we can just infer from item fields
      // We will infer type from the original arrays
      const isVideo = videos.some(v => v.id === item.id)
      const isArticle = articles.some(a => a.id === item.id)
      const type = isVideo ? 'video' : isArticle ? 'article' : 'practice'

      return (
        <div key={`${item.id}-${idx}`} className="card relative group bg-white/5 border-white/10 hover:bg-white/10 transition-all flex flex-col h-full">
          {item.is_recommended && (
            <div className="absolute -top-3 -right-3 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] uppercase font-bold flex items-center gap-1">
              <Brain className="w-3 h-3" /> AI Recommended
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

          {item.is_recommended && item.recommendation_reason && (
            <div className="mb-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
              <p className="text-xs text-indigo-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span><span className="font-semibold">Reason:</span> {item.recommendation_reason}</span>
              </p>
            </div>
          )}
          
          <div className="mt-auto pt-4 flex items-center gap-3 border-t border-white/5">
            {type === 'practice' ? (
              <button
                onClick={() => handleStartPractice(item)}
                className="flex-1 btn-primary py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                Start Practice
                <ExternalLink className="w-4 h-4" />
              </button>
            ) : (
              <a 
                href={item.url !== '#' && !item.url.includes('example.com') ? item.url : '#'}
                target={item.url !== '#' && !item.url.includes('example.com') ? '_blank' : undefined}
                rel="noreferrer"
                onClick={(e) => {
                  if (item.url.includes('example.com') || item.url === '#') {
                    e.preventDefault();
                    alert("This is a sample demonstration URL seeded for testing purposes.");
                  }
                }}
                className="flex-1 btn-primary py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm"
              >
                {type === 'video' ? 'Watch Video' : 'Read Article'}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
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
      )
    })
  }

  const renderGroupedContentCards = (items: ContentItem[]) => {
    if (items.length === 0) {
      return <div className="col-span-full p-8 text-center text-gray-500 bg-white/5 rounded-xl border border-white/10">No content available for this category yet.</div>
    }
    
    // Group items by topic
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.topic]) acc[item.topic] = []
      acc[item.topic].push(item)
      return acc
    }, {} as Record<string, ContentItem[]>)
    
    return (
      <div className="space-y-8 w-full">
        {Object.entries(grouped).map(([topic, topicItems]) => (
          <div key={topic} className="space-y-4">
            <h3 className="text-xl font-bold text-white border-l-4 border-primary pl-3">{topic}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderContentCards(topicItems)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Learning Repository</h1>
        <p className="text-gray-400">Explore videos, study materials, and take practice quizzes tailored to your knowledge gaps.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* RECOMMENDED SECTION */}
          {recommendedItems.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Recommended For You</h2>
                  <p className="text-sm text-indigo-300">Personalized content based on your recent quiz performance.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderContentCards(recommendedItems)}
              </div>
            </div>
          )}

          {/* BROWSE ALL SECTION */}
          <div className="space-y-6 pt-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Browse All Content</h2>
                <p className="text-sm text-gray-400">Explore the complete curriculum library.</p>
              </div>
              
              {/* Tabs */}
              <div className="flex space-x-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'videos' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Play className="w-4 h-4" /> Videos ({videos.length})
                </button>
                <button
                  onClick={() => setActiveTab('articles')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'articles' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Study Material
                </button>
                <button
                  onClick={() => setActiveTab('practice')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'practice' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" /> Practice ({practice.length})
                </button>
              </div>
            </div>

            <div className="w-full">
              {activeTab === 'videos' && renderGroupedContentCards(videos)}
              {activeTab === 'articles' && (
                <div className="col-span-full p-12 text-center bg-white/5 rounded-xl border border-white/10 mt-4">
                  <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Future Content</h3>
                  <p className="text-gray-400">Planned Feature - Reserved for Phase 2</p>
                </div>
              )}
              {activeTab === 'practice' && renderGroupedContentCards(practice)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
