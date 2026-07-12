import React, { useRef, useState, useEffect } from 'react';
import YouTube, { YouTubeProps, YouTubePlayer } from 'react-youtube';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface VideoPlayerProps {
  videoId: string;
  contentId: string | number;
  onComplete?: () => void;
}

export default function VideoPlayer({ videoId, contentId, onComplete }: VideoPlayerProps) {
  const { user } = useAuth();
  
  // Refs
  const playerRef = useRef<YouTubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Custom Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isCcActive, setIsCcActive] = useState(false);
  
  // Tracking if video has started playing
  const [hasStarted, setHasStarted] = useState(false);
  
  // Quality Selection State
  const [availableQualities, setAvailableQualities] = useState<string[]>(['auto', 'hd1080', 'hd720', 'large', 'medium', 'small']);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  // Progress tracking (telemetry)
  const [watchStartTime, setWatchStartTime] = useState<Date | null>(null);
  const [accumulatedWatchTime, setAccumulatedWatchTime] = useState(0);

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      controls: 0,      // Hide default controls
      disablekb: 1,     // Disable default YouTube hotkeys
      fs: 0,            // Disable native fullscreen button
      iv_load_policy: 3, // Hide annotations
      autohide: 1,
    },
  };

  const syncProgressToBackend = async (completed: boolean = false) => {
    if (!user?.user_id) return;
    
    let currentSessionWatchTime = 0;
    const now = new Date();
    
    if (isPlaying && watchStartTime) {
      currentSessionWatchTime = (now.getTime() - watchStartTime.getTime()) / 1000;
    }
    
    const totalWatchTimeSeconds = accumulatedWatchTime + currentSessionWatchTime;
    const currentPosition = Math.round(currentTime);
    const progressVal = duration > 0 ? (currentTime / duration) * 100 : 0;
    const hasCompleted = completed || (progressVal >= 80.0);
    
    try {
      await api.post('/api/learning/video-progress', {
        user_id: String(user.user_id),
        content_id: String(contentId),
        progress: parseFloat(progressVal.toFixed(2)),
        watch_duration: Math.round(totalWatchTimeSeconds),
        completed: hasCompleted,
        last_position: currentPosition
      });
      
      if (hasCompleted && onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Failed to sync video progress:", error);
    }
  };

  // Sync periodically while playing
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        syncProgressToBackend(false);
      }, 30000); // Sync every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, watchStartTime, accumulatedWatchTime, duration]);

  // Sync on unmount
  useEffect(() => {
    return () => {
      if (isPlaying) {
        syncProgressToBackend(false);
      }
    };
  }, [isPlaying]);

  // Track playback time
  useEffect(() => {
    let interval: any;
    if (isPlaying && playerRef.current && !isSeeking) {
      interval = setInterval(() => {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isSeeking]);

  // Mouse activity listener to hide/show control overlay
  useEffect(() => {
    let timeout: any;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      if (isPlaying) {
        timeout = setTimeout(() => {
          setShowControls(false);
        }, 2500);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', () => {
        if (isPlaying) {
          setShowControls(false);
        }
      });
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      clearTimeout(timeout);
    };
  }, [isPlaying]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in any text input field
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isInput) return;

      if (!playerRef.current) return;

      switch (e.key.toLowerCase()) {
        case ' ': // Spacebar
        case 'k':
          e.preventDefault(); // Prevent scrolling page on space
          handleTogglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(prev => {
            const nextVol = Math.min(100, prev + 5);
            if (playerRef.current) {
              playerRef.current.setVolume(nextVol);
            }
            setIsMuted(false);
            return nextVol;
          });
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(prev => {
            const nextVol = Math.max(0, prev - 5);
            if (playerRef.current) {
              playerRef.current.setVolume(nextVol);
              if (nextVol === 0) {
                playerRef.current.mute();
                setIsMuted(true);
              }
            }
            return nextVol;
          });
          break;
        case 'm':
          handleToggleMute();
          break;
        case 'f':
          handleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying]);

  // Handlers
  const onReady: YouTubeProps['onReady'] = async (event) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
    setVolume(event.target.getVolume());
    setIsMuted(event.target.isMuted());
    
    // Fetch initial quality levels
    try {
      const qualities = event.target.getAvailableQualityLevels();
      if (qualities && qualities.length > 0) {
        setAvailableQualities(qualities);
      }
      const activeQuality = event.target.getPlaybackQuality();
      if (activeQuality) {
        setCurrentQuality(activeQuality);
      }
    } catch (e) {
      console.error("Failed to load initial quality levels:", e);
    }

    // Fetch and resume playback progress
    if (user?.user_id) {
      try {
        const { data } = await api.get(`/api/learning/video-progress/${user.user_id}/${contentId}`);
        if (data && data.last_position > 0) {
          const resumeTime = data.last_position;
          setCurrentTime(resumeTime);
          event.target.seekTo(resumeTime, true);
        }
      } catch (err) {
        console.error("Failed to retrieve resume progress:", err);
      }
    }
  };

  const onPlay: YouTubeProps['onPlay'] = () => {
    setIsPlaying(true);
    setHasStarted(true);
    setWatchStartTime(new Date());
  };

  const onPause: YouTubeProps['onPause'] = () => {
    setIsPlaying(false);
    if (watchStartTime) {
      const timeWatched = (new Date().getTime() - watchStartTime.getTime()) / 1000;
      setAccumulatedWatchTime(prev => prev + timeWatched);
      setWatchStartTime(null);
    }
    syncProgressToBackend(false);
  };

  const onEnd: YouTubeProps['onEnd'] = () => {
    setIsPlaying(false);
    setHasStarted(false); // Reset so that the thumbnail play cover shows again at the end
    if (watchStartTime) {
      const timeWatched = (new Date().getTime() - watchStartTime.getTime()) / 1000;
      setAccumulatedWatchTime(prev => prev + timeWatched);
      setWatchStartTime(null);
    }
    syncProgressToBackend(true);
  };

  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 3 = Buffering
    if (event.data === 3) {
      setIsBuffering(true);
    } else {
      setIsBuffering(false);
    }

    // Refresh dynamic qualities when video state updates
    if (playerRef.current) {
      try {
        const qualities = playerRef.current.getAvailableQualityLevels();
        if (qualities && qualities.length > 0) {
          setAvailableQualities(qualities);
        }
        const activeQuality = playerRef.current.getPlaybackQuality();
        if (activeQuality) {
          setCurrentQuality(activeQuality);
        }
      } catch (e) {
        console.error("Failed to refresh quality levels:", e);
      }
    }
  };

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
    if (playerRef.current) {
      playerRef.current.seekTo(currentTime, true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (playerRef.current) {
      playerRef.current.setVolume(val);
      if (val > 0) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  const handleToggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 50);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error("Error attempting fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleSkip = (seconds: number) => {
    if (!playerRef.current) return;
    try {
      const current = playerRef.current.getCurrentTime();
      const newTime = Math.max(0, Math.min(duration, current + seconds));
      setCurrentTime(newTime);
      playerRef.current.seekTo(newTime, true);
    } catch (err) {
      console.error("Failed to skip time:", err);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackSpeed(rate);
    setShowSpeedMenu(false);
    if (playerRef.current) {
      try {
        playerRef.current.setPlaybackRate(rate);
      } catch (err) {
        console.error("Failed to set playback rate:", err);
      }
    }
  };

  const handleQualityChange = (quality: string) => {
    setCurrentQuality(quality);
    setShowQualityMenu(false);
    if (playerRef.current) {
      try {
        playerRef.current.setPlaybackQuality(quality);
        if (typeof playerRef.current.setPlaybackQualityRange === 'function') {
          playerRef.current.setPlaybackQualityRange(quality, quality);
        }
      } catch (err) {
        console.error("Failed to set playback quality:", err);
      }
    }
  };

  const handleToggleCc = () => {
    if (!playerRef.current) return;
    const nextCc = !isCcActive;
    setIsCcActive(nextCc);
    try {
      if (nextCc) {
        playerRef.current.loadModule('captions');
        playerRef.current.setOption('captions', 'track', { languageCode: 'en' });
      } else {
        playerRef.current.setOption('captions', 'track', {});
      }
    } catch (err) {
      console.error("Failed to toggle subtitles:", err);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatQualityLabel = (quality: string) => {
    switch (quality) {
      case 'hd1080': return '1080p';
      case 'hd720': return '720p';
      case 'large': return '480p';
      case 'medium': return '360p';
      case 'small': return '240p';
      case 'tiny': return '144p';
      case 'auto':
      case 'unknown':
        return 'Auto';
      default: return quality;
    }
  };

  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10">
        <p className="text-slate-400">Video ID not provided</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative bg-black select-none group/player"
    >
      {/* 1. Native Iframe container (Clipped vertically by 7.5% top and bottom to mask title/watermark without side cropping) */}
      <div className="absolute w-full h-[115%] top-[-7.5%] left-0 pointer-events-none select-none overflow-hidden z-0 bg-black">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onPlay={onPlay}
          onPause={onPause}
          onEnd={onEnd}
          onStateChange={onStateChange}
          className="w-full h-full"
        />
      </div>

      {/* 2. Transparent click capturing overlay to prevent standard YouTube interactions (z-10) */}
      <div 
        className="absolute inset-x-0 top-0 bottom-20 z-10 cursor-pointer"
        onClick={handleTogglePlay}
      />

      {/* 3. Static Thumbnail + Play Button Cover when video has not started playing yet (z-40) */}
      {!hasStarted && (
        <div 
          onClick={handleTogglePlay}
          className="absolute inset-0 z-40 cursor-pointer bg-black flex items-center justify-center"
        >
          <img 
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} 
            alt="Video Thumbnail"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark gradient mask and center play button */}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-45">
            <div className="h-16 w-16 rounded-full bg-primary-500/25 border border-primary-500/40 flex items-center justify-center text-primary-300 hover:scale-110 hover:bg-primary-500/45 hover:text-white transition-all duration-300 shadow-glow">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
          </div>
        </div>
      )}

      {/* 4. Buffering / Loading Overlay (z-30) */}
      {isBuffering && (
        <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center z-30 pointer-events-none">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        </div>
      )}

      {/* 5. Custom Control Bar Overlay (z-50) */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-3 transition-all duration-300 z-50 ${
          showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()} // Prevent clicking on controls from pausing video
      >
        {/* Timeline Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-300 select-none">
            {formatTime(currentTime)}
          </span>
          
          <div className="flex-1 relative group py-2">
            <input 
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onChange={handleSeek}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              className="w-full h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-primary-500 group-hover:h-1.5 transition-all outline-none"
              style={{
                background: `linear-gradient(to right, rgb(99, 102, 241) ${duration > 0 ? (currentTime / duration) * 100 : 0}%, rgba(255, 255, 255, 0.2) ${duration > 0 ? (currentTime / duration) * 100 : 0}%)`
              }}
            />
          </div>
          
          <span className="text-xs font-mono text-slate-300 select-none">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause Button */}
            <button 
              onClick={handleTogglePlay}
              className="text-slate-300 hover:text-white hover:scale-105 transition-all mr-2"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Skip Controls */}
            <div className="flex items-center gap-1.5 mr-2">
              <button 
                onClick={() => handleSkip(-30)}
                className="text-[10px] font-bold text-slate-400 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                title="Rewind 30s"
              >
                -30s
              </button>
              <button 
                onClick={() => handleSkip(-10)}
                className="text-[10px] font-bold text-slate-400 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                title="Rewind 10s"
              >
                -10s
              </button>
              <button 
                onClick={() => handleSkip(10)}
                className="text-[10px] font-bold text-slate-400 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                title="Forward 10s"
              >
                +10s
              </button>
              <button 
                onClick={() => handleSkip(30)}
                className="text-[10px] font-bold text-slate-400 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                title="Forward 30s"
              >
                +30s
              </button>
            </div>

            {/* Volume controls */}
            <div className="flex items-center gap-2 group/volume">
              <button 
                onClick={handleToggleMute}
                className="text-slate-300 hover:text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              
              <input 
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-primary-500 outline-none"
                style={{
                  background: `linear-gradient(to right, rgb(99, 102, 241) ${isMuted ? 0 : volume}%, rgba(255, 255, 255, 0.2) ${isMuted ? 0 : volume}%)`
                }}
              />
            </div>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-3">
            {/* CC (Closed Captions) Button */}
            <button 
              onClick={handleToggleCc}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                isCcActive 
                  ? 'bg-primary-500 border-primary-400 text-white font-bold' 
                  : 'border-slate-500 text-slate-300 hover:text-white hover:border-white'
              }`}
              title="Toggle Subtitles"
            >
              CC
            </button>

            {/* Quality Control Dropup */}
            <div className="relative" onMouseLeave={() => setShowQualityMenu(false)}>
              <button 
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="text-[10px] font-bold text-slate-300 hover:text-white bg-white/[0.06] border border-white/10 px-2 py-1 rounded transition-colors"
                title="Video Quality"
              >
                {formatQualityLabel(currentQuality)}
              </button>
              
              {showQualityMenu && (
                <div 
                  className="absolute bottom-full right-0 w-24 bg-slate-950 border border-white/10 rounded-lg shadow-xl overflow-hidden z-60 max-h-48 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {availableQualities.map((q) => (
                    <button 
                      key={q}
                      onClick={() => handleQualityChange(q)}
                      className={`w-full block text-left px-3 py-1.5 text-xs transition-colors ${
                        currentQuality === q ? 'bg-primary-500 text-white font-bold' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {formatQualityLabel(q)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Speed Control Dropup */}
            <div className="relative" onMouseLeave={() => setShowSpeedMenu(false)}>
              <button 
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-[10px] font-bold text-slate-300 hover:text-white bg-white/[0.06] border border-white/10 px-2 py-1 rounded transition-colors"
                title="Playback Speed"
              >
                {playbackSpeed === 1 ? 'Speed' : `${playbackSpeed}x`}
              </button>
              
              {showSpeedMenu && (
                <div 
                  className="absolute bottom-full right-0 w-20 bg-slate-950 border border-white/10 rounded-lg shadow-xl overflow-hidden z-60"
                  onClick={(e) => e.stopPropagation()}
                >
                  {[1, 1.25, 1.5, 2].map((rate) => (
                    <button 
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`w-full block text-left px-3 py-1.5 text-xs transition-colors ${
                        playbackSpeed === rate ? 'bg-primary-500 text-white font-bold' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            <button 
              onClick={handleFullscreen}
              className="text-slate-300 hover:text-white hover:scale-105 transition-all"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
