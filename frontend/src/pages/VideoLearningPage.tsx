import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, BarChart, BookOpen, ChevronRight, ChevronLeft, CheckCircle2, Target, Play, Bookmark, Plus, Trash2 } from 'lucide-react';
import api from '../lib/api';
import VideoPlayer from '../components/VideoPlayer';
import { useVideoPlayer } from '../components/video/useVideoPlayer';
import { useAuth } from '../context/AuthContext';

interface VideoDetails {
  id: number;
  title: string;
  description: string;
  topic: string;
  difficulty: string;
  youtube_video_id: string;
  estimated_time: number;
  prev_id?: number | null;
  next_id?: number | null;
}

interface RecommendationItem {
  resource_id: number;
  type: string;
  title: string;
  topic: string;
  subject?: string;
  difficulty: string;
  estimated_time_minutes: number;
  reason: string;
}

export default function VideoLearningPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);

  // Fetch Video details
  useEffect(() => {
    const fetchVideoDetails = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/content/${id}`);
        if (data && data.data) {
          setVideo(data.data);
        } else {
          setError('Video not found.');
        }
      } catch (err) {
        console.error('Failed to load video details', err);
        setError('Failed to load video details.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchVideoDetails();
    }
  }, [id]);

  // Fetch Video progress
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user?.user_id || !id) return;
      try {
        const { data } = await api.get(`/api/learning/video-progress/${user.user_id}/${id}`);
        if (data) {
          setCompleted(data.completed || false);
          setProgressPercent(data.progress || 0);
        }
      } catch (err) {
        console.error('Failed to load video progress', err);
      }
    };
    fetchProgress();
  }, [user?.user_id, id]);

  // Fetch Recommended Next list
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user?.user_id) return;
      try {
        const { data } = await api.get(`/api/recommendations/personalized/${user.user_id}`);
        if (data && data.data) {
          // Filter to show the top 3 recommendations
          setRecommendations(data.data.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load recommendations', err);
      }
    };
    
    fetchRecommendations();
  }, [user?.user_id, id]);

  const handleVideoComplete = () => {
    setCompleted(true);
    setProgressPercent(100);
  };

  const player = useVideoPlayer({ contentId: id || '', onComplete: handleVideoComplete });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <p className="text-red-400">{error || 'Video not found'}</p>
          <button onClick={() => navigate('/learning')} className="mt-4 btn-secondary">
            <ArrowLeft className="w-4 h-4" /> Back to Learning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 page-enter">
      {/* Header Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link to="/learning" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Curriculum
        </Link>
        <div className="flex gap-2">
           <button 
             onClick={() => navigate(`/learning/video/${video.prev_id}`)}
             disabled={!video.prev_id}
             className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
           >
             <ChevronLeft className="w-3.5 h-3.5" /> Previous
           </button>
           <button 
             onClick={() => navigate(`/learning/video/${video.next_id}`)}
             disabled={!video.next_id}
             className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
           >
             Next <ChevronRight className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-sm">
            <VideoPlayer 
              videoId={video.youtube_video_id || ''} 
              player={player}
            />
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-100">{video.title}</h1>
              {completed && (
                <div className="inline-flex items-center gap-1.5 bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-sm font-medium shadow-glow">
                  <CheckCircle2 className="w-4 h-4" />
                  Completed ✓
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <div className="inline-flex items-center gap-1.5 bg-white/[0.06] border border-white/10 px-3 py-1 rounded-lg text-sm text-slate-300">
                <BookOpen className="w-4 h-4 text-primary-400" />
                {video.topic}
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/[0.06] border border-white/10 px-3 py-1 rounded-lg text-sm text-slate-300 capitalize">
                <BarChart className="w-4 h-4 text-accent-400" />
                {video.difficulty}
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/[0.06] border border-white/10 px-3 py-1 rounded-lg text-sm text-slate-300">
                <Clock className="w-4 h-4 text-glow-400" />
                {video.estimated_time || 15} min
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              <h3 className="text-lg font-semibold text-slate-200 mb-2">About this lesson</h3>
              <p className="text-slate-400 leading-relaxed">
                {video.description || "No description provided for this video lesson."}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="bg-gradient-to-br from-primary-900/40 to-slate-900 border border-primary-500/20 rounded-2xl p-6 shadow-glow">
            <h3 className="text-lg font-display font-bold text-slate-100 mb-4">Your Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-400">Lesson Progress</span>
                  <span className="text-primary-300 font-medium">{Math.round(progressPercent)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bookmarks & Timestamp Notes */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-100 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-primary-400" /> Bookmarks & Notes
            </h3>
            
            {/* Add Bookmark form */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem('bookmarkNote') as HTMLInputElement;
              if (input && input.value.trim() !== '') {
                await player.addBookmark(input.value.trim());
                input.value = '';
              }
            }} className="flex gap-2">
              <input
                name="bookmarkNote"
                type="text"
                placeholder="Add note at current time..."
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500/50"
              />
              <button
                type="submit"
                className="bg-primary-500 hover:bg-primary-600 text-white rounded-lg px-3 py-1.5 flex items-center justify-center transition-colors text-xs font-bold"
                title="Bookmark Current Position"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Bookmarks List */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {player.bookmarks && player.bookmarks.length > 0 ? (
                player.bookmarks.map((bm: any) => (
                  <div 
                    key={bm.id} 
                    className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
                  >
                    <div 
                      onClick={() => {
                        player.playerRef.current?.seekTo(bm.timestamp, true);
                        player.playerRef.current?.playVideo();
                      }}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-mono font-bold text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">
                          {player.formatTime(bm.timestamp)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(bm.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium leading-snug line-clamp-2">
                        {bm.note || "Bookmark"}
                      </p>
                    </div>
                    <button 
                      onClick={() => player.deleteBookmark(bm.id)}
                      className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors ml-2"
                      title="Delete Bookmark"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic py-2">No bookmarks saved yet. Type a note and click the plus button to save key moments!</p>
              )}
            </div>
          </div>

          {/* Recommended Next Section */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-display font-bold text-slate-100 mb-4">Recommended Next</h3>
            {recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div 
                    key={rec.resource_id}
                    onClick={() => {
                      if (rec.type === 'video') {
                        navigate(`/learning/video/${rec.resource_id}`);
                      } else {
                        navigate('/learning');
                      }
                    }}
                    className="group cursor-pointer p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-primary-500/30 transition-all duration-200"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h4 className="text-sm font-medium text-slate-200 group-hover:text-primary-300 transition-colors line-clamp-1">
                        {rec.title}
                      </h4>
                      <span className="text-[9px] uppercase tracking-wider font-bold text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                        {rec.type === 'video' ? <Play className="w-2 h-2 fill-current" /> : <Target className="w-2 h-2" />}
                        {rec.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-normal">
                      {rec.reason}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>{rec.subject ? `${rec.subject} › ${rec.topic}` : rec.topic}</span>
                      <span>{rec.estimated_time_minutes} min</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No recommendations available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
