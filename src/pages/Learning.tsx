import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, FileText, CheckCircle, MessageSquare, Brain, ExternalLink, Sparkles, Library } from 'lucide-react'
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
  
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [userProfileSubjects, setUserProfileSubjects] = useState<string[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [localSearch, setLocalSearch] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [loadingFilters, setLoadingFilters] = useState(true)

  // Fetch user's profile preferences on mount
  useEffect(() => {
    const loadFiltersAndProfile = async () => {
      if (!user?.user_id) return
      try {
        const { data } = await api.get(`/api/users/profile/${user.user_id}`)
        const profile = data.data || data
        if (profile) {
          if (profile.course) {
            setSelectedCourse(profile.course)
          }
          if (profile.subjects) {
            setUserProfileSubjects(profile.subjects)
          }
          if (profile.subjects && profile.subjects.length > 0) {
            setSelectedSubject(profile.subjects[0])
          }
        }
      } catch (err) {
        console.error("Failed to initialize course-subject filters", err)
      } finally {
        setLoadingFilters(false)
      }
    }
    
    loadFiltersAndProfile()
  }, [user])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch])

  // Fetch filtered learning path items
  useEffect(() => {
    const fetchContent = async () => {
      if (!user?.user_id || loadingFilters) return
      setLoading(true)
      try {
        const params: any = {}
        if (selectedCourse) params.course = selectedCourse
        if (selectedSubject) params.subject = selectedSubject
        if (searchQuery) params.search = searchQuery
        
        const { data } = await api.get(`/api/content/learning-path/${user.user_id}`, { params })
        if (data && data.data) {
          setVideos(data.data.videos || [])
          setArticles(data.data.articles || [])
          setPractice(data.data.practice || [])
        }
      } catch (err) {
        console.error("Failed to load dynamic learning path", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchContent()
  }, [user, selectedCourse, selectedSubject, searchQuery, loadingFilters])

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
      return <div className="col-span-full p-10 text-center text-slate-400 rounded-2xl border border-white/10 bg-white/[0.03]">No content available for this category yet.</div>
    }
    
    return items.map((item, idx) => {
      // Determine type based on where it came from, or we can just infer from item fields
      // We will infer type from the original arrays
      const isVideo = videos.some(v => v.id === item.id)
      const isArticle = articles.some(a => a.id === item.id)
      const type = isVideo ? 'video' : isArticle ? 'article' : 'practice'

      return (
        <div key={`${item.id}-${idx}`} className="card group flex flex-col h-full">
          {item.is_recommended && (
            <div className="absolute -top-3 right-4 inline-flex items-center gap-1.5 rounded-full border border-primary-400/40 bg-primary-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-200 backdrop-blur-xl shadow-glow">
              <Brain className="w-3 h-3" /> AI Recommended
            </div>
          )}
          
          <div className="flex items-start gap-4 mb-4">
            <div className={`grid place-items-center h-12 w-12 shrink-0 rounded-xl border ${
              type === 'video' ? 'border-primary-400/30 bg-primary-500/15 text-primary-300'
              : type === 'article' ? 'border-accent-400/30 bg-accent-500/15 text-accent-300'
              : 'border-glow-400/30 bg-glow-500/15 text-glow-300'
            }`}>
              {type === 'video' ? <Play className="w-5 h-5" /> : type === 'article' ? <FileText className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-lg leading-tight mb-2 text-slate-100 group-hover:text-primary-200 transition-colors">{item.title}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="rounded-md border border-white/10 bg-white/[0.06] px-2 py-0.5 text-slate-200">{item.topic}</span>
                <span className="capitalize">{item.difficulty}</span>
                <span className="text-slate-600">•</span>
                <span>{item.duration_minutes} min</span>
              </div>
            </div>
          </div>

          {item.is_recommended && item.recommendation_reason && (
            <div className="mb-4 rounded-xl border border-primary-400/20 bg-primary-500/10 p-3">
              <p className="text-xs text-primary-200 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span><span className="font-semibold">Why:</span> {item.recommendation_reason}</span>
              </p>
            </div>
          )}
          
          <div className="mt-auto pt-4 flex items-center gap-3 border-t border-white/5">
            {type === 'practice' ? (
              <button
                onClick={() => handleStartPractice(item)}
                className="flex-1 btn-primary text-sm cursor-pointer"
              >
                Start Practice
                <ExternalLink className="w-4 h-4" />
              </button>
            ) : type === 'video' ? (
              <button
                onClick={() => navigate(`/learning/video/${item.id}`)}
                className="flex-1 btn-primary text-sm cursor-pointer"
              >
                Watch Video
                <Play className="w-4 h-4 ml-1" />
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
                className="flex-1 btn-primary text-sm"
              >
                Read Article
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button 
              onClick={() => handleAskAI(item)}
              className="btn-secondary text-sm whitespace-nowrap"
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
      return <div className="col-span-full p-10 text-center text-slate-400 rounded-2xl border border-white/10 bg-white/[0.03]">No content available for this category yet.</div>
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
            <h3 className="text-lg font-display font-bold text-slate-100 border-l-[3px] border-primary-500 pl-3">{topic}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderContentCards(topicItems)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-12 page-enter">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="sparkle grid place-items-center h-14 w-14 rounded-2xl border border-primary-400/30 bg-primary-500/15 text-primary-300 shrink-0">
          <Library className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            Learning <span className="gradient-text">Repository</span>
          </h1>
          <p className="text-slate-400 mt-1">Videos, study materials, and practice quizzes tailored to your knowledge gaps.</p>
        </div>
      </div>

      {/* Dynamic Course and Subject Filters */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Registered Course (Locked)</label>
          <select
            value={selectedCourse}
            disabled
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-slate-400 cursor-not-allowed transition-all focus:outline-none"
          >
            {selectedCourse && (
              <option value={selectedCourse} className="text-slate-900">{selectedCourse}</option>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Select Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={userProfileSubjects.length === 0}
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100 transition-all focus:border-primary-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="" className="text-slate-900">All My Subjects</option>
            {userProfileSubjects.map((subject) => (
              <option key={subject} value={subject} className="text-slate-900">{subject}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Search Within Subject</label>
          <input
            type="text"
            placeholder="Search lessons, tags, topics..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-slate-100 transition-all focus:border-primary-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <>
          {/* RECOMMENDED SECTION */}
          {recommendedItems.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="grid place-items-center h-11 w-11 rounded-xl border border-primary-400/30 bg-primary-500/15 text-primary-300">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-display font-bold text-slate-100">Recommended For You</h2>
                  <p className="text-sm text-primary-200/80">Personalized content based on your recent quiz performance.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderContentCards(recommendedItems)}
              </div>
            </div>
          )}

          {/* BROWSE ALL SECTION */}
          <div className="space-y-6 pt-2">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl md:text-2xl font-display font-bold text-slate-100">Browse All Content</h2>
                <p className="text-sm text-slate-400">Explore the complete curriculum library.</p>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/10 w-fit">
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'videos' ? 'btn-primary !py-2 !px-5' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  <Play className="w-4 h-4" /> Videos ({videos.length})
                </button>
                <button
                  onClick={() => setActiveTab('articles')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'articles' ? 'btn-primary !py-2 !px-5' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Study Material
                </button>
                <button
                  onClick={() => setActiveTab('practice')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'practice' ? 'btn-primary !py-2 !px-5' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" /> Practice ({practice.length})
                </button>
              </div>
            </div>

            <div className="w-full">
              {activeTab === 'videos' && renderGroupedContentCards(videos)}
              {activeTab === 'articles' && (
                <div className="col-span-full p-12 text-center surface mt-4">
                  <div className="mx-auto mb-4 grid place-items-center h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-slate-100 mb-2">Future Content</h3>
                  <p className="text-slate-400">Planned Feature — Reserved for Phase 2</p>
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
