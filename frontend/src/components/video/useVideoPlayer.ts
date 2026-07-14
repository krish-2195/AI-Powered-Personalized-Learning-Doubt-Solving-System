import { useRef, useState, useEffect, useCallback } from 'react';
import { YouTubePlayer } from 'react-youtube';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface UseVideoPlayerOptions {
  contentId: string | number;
  onComplete?: () => void;
}

export function useVideoPlayer({ contentId, onComplete }: UseVideoPlayerOptions) {
  const { user } = useAuth();

  // Refs
  const playerRef = useRef<YouTubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Playback state
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
  const [hasStarted, setHasStarted] = useState(false);

  // Quality state
  const [availableQualities, setAvailableQualities] = useState<string[]>([
    'auto', 'hd1080', 'hd720', 'large', 'medium', 'small',
  ]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Watch-time telemetry
  const [watchStartTime, setWatchStartTime] = useState<Date | null>(null);
  const [accumulatedWatchTime, setAccumulatedWatchTime] = useState(0);

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  const fetchBookmarks = useCallback(async () => {
    if (!user?.user_id || !contentId) return;
    try {
      const { data } = await api.get(`/api/learning/bookmarks/${user.user_id}/${contentId}`);
      if (data?.bookmarks) {
        setBookmarks(data.bookmarks);
      }
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    }
  }, [user, contentId]);

  const addBookmark = async (note: string) => {
    if (!user?.user_id || !contentId) return;
    const nowTime = playerRef.current?.getCurrentTime?.() ?? currentTime;
    try {
      const { data } = await api.post('/api/learning/bookmarks', {
        user_id: String(user.user_id),
        content_id: String(contentId),
        timestamp: nowTime,
        note
      });
      if (data?.bookmark) {
        setBookmarks(prev => [...prev, data.bookmark].sort((a, b) => a.timestamp - b.timestamp));
      }
    } catch (err) {
      console.error('Failed to add bookmark:', err);
    }
  };

  const deleteBookmark = async (bookmarkId: string) => {
    try {
      await api.delete(`/api/learning/bookmarks/${bookmarkId}`);
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  // Load bookmarks on mount / change
  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatTime = (secs: number): string => {
    if (isNaN(secs)) return '00:00';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatQualityLabel = (quality: string): string => {
    const map: Record<string, string> = {
      hd1080: '1080p', hd720: '720p', large: '480p',
      medium: '360p', small: '240p', tiny: '144p',
      auto: 'Auto', unknown: 'Auto',
    };
    return map[quality] ?? quality;
  };

  // ─── Backend sync ────────────────────────────────────────────────────────────

  const syncProgressToBackend = useCallback(async (completed = false) => {
    if (!user?.user_id) return;

    let currentSessionWatchTime = 0;
    const now = new Date();
    if (isPlaying && watchStartTime) {
      currentSessionWatchTime = (now.getTime() - watchStartTime.getTime()) / 1000;
    }

    const totalWatchTimeSeconds = accumulatedWatchTime + currentSessionWatchTime;
    const activeTime = playerRef.current?.getCurrentTime?.() ?? currentTime;
    const currentPosition = Math.round(activeTime);
    const progressVal = duration > 0 ? (activeTime / duration) * 100 : 0;
    const hasCompleted = completed || progressVal >= 80.0;

    try {
      await api.post('/api/learning/video-progress', {
        user_id: String(user.user_id),
        content_id: String(contentId),
        progress: parseFloat(progressVal.toFixed(2)),
        watch_duration: Math.round(totalWatchTimeSeconds),
        completed: hasCompleted,
        last_position: currentPosition,
      });
      if (hasCompleted && onComplete) onComplete();
    } catch (error) {
      console.error('Failed to sync video progress:', error);
    }
  }, [user, isPlaying, watchStartTime, accumulatedWatchTime, currentTime, duration, contentId, onComplete]);

  // ─── Effects ─────────────────────────────────────────────────────────────────

  // Periodic sync every 30s while playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => syncProgressToBackend(false), 30000);
    return () => clearInterval(interval);
  }, [isPlaying, syncProgressToBackend]);

  // Sync on unmount
  useEffect(() => {
    return () => {
      if (isPlaying) syncProgressToBackend(false);
    };
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track current playback time
  useEffect(() => {
    if (!isPlaying || !playerRef.current || isSeeking) return;
    const interval = setInterval(() => {
      const time = playerRef.current?.getCurrentTime?.();
      if (time !== undefined) setCurrentTime(time);
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, isSeeking]);

  // Auto-hide controls on mouse inactivity
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      if (isPlaying) {
        timeout = setTimeout(() => setShowControls(false), 2500);
      }
    };
    const handleMouseLeave = () => {
      if (isPlaying) setShowControls(false);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timeout);
    };
  }, [isPlaying]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true');
      if (isInput || !playerRef.current) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
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
            const next = Math.min(100, prev + 5);
            playerRef.current?.setVolume(next);
            setIsMuted(false);
            return next;
          });
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(prev => {
            const next = Math.max(0, prev - 5);
            playerRef.current?.setVolume(next);
            if (next === 0) { playerRef.current?.mute(); setIsMuted(true); }
            return next;
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── YouTube event handlers ──────────────────────────────────────────────────

  const onReady = async (event: { target: YouTubePlayer }) => {
    playerRef.current = event.target;
    setDuration(event.target.getDuration());
    setVolume(event.target.getVolume());
    setIsMuted(event.target.isMuted());

    try {
      const qualities = event.target.getAvailableQualityLevels();
      if (qualities?.length > 0) setAvailableQualities(qualities);
      const activeQuality = event.target.getPlaybackQuality();
      if (activeQuality) setCurrentQuality(activeQuality);
    } catch (e) {
      console.error('Failed to load initial quality levels:', e);
    }

    if (user?.user_id) {
      try {
        const { data } = await api.get(`/api/learning/video-progress/${user.user_id}/${contentId}`);
        if (data?.last_position > 0) {
          setCurrentTime(data.last_position);
          event.target.seekTo(data.last_position, true);
        }
      } catch (err) {
        console.error('Failed to retrieve resume progress:', err);
      }
    }
  };

  const onPlay = () => {
    setIsPlaying(true);
    setHasStarted(true);
    setWatchStartTime(new Date());
  };

  const onPause = () => {
    setIsPlaying(false);
    if (watchStartTime) {
      const timeWatched = (new Date().getTime() - watchStartTime.getTime()) / 1000;
      setAccumulatedWatchTime(prev => prev + timeWatched);
      setWatchStartTime(null);
    }
    syncProgressToBackend(false);
  };

  const onEnd = () => {
    setIsPlaying(false);
    setHasStarted(false);
    if (watchStartTime) {
      const timeWatched = (new Date().getTime() - watchStartTime.getTime()) / 1000;
      setAccumulatedWatchTime(prev => prev + timeWatched);
      setWatchStartTime(null);
    }
    syncProgressToBackend(true);
  };

  const onStateChange = (event: { data: number }) => {
    setIsBuffering(event.data === 3);
    if (playerRef.current) {
      try {
        const qualities = playerRef.current.getAvailableQualityLevels();
        if (qualities?.length > 0) setAvailableQualities(qualities);
        const activeQuality = playerRef.current.getPlaybackQuality();
        if (activeQuality) setCurrentQuality(activeQuality);
      } catch (e) {
        console.error('Failed to refresh quality levels:', e);
      }
    }
  };

  // ─── Control handlers ────────────────────────────────────────────────────────

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
  };

  const handleSeekStart = () => setIsSeeking(true);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) =>
    setCurrentTime(Number(e.target.value));

  const handleSeekEnd = () => {
    setIsSeeking(false);
    playerRef.current?.seekTo(currentTime, true);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (playerRef.current) {
      playerRef.current.setVolume(val);
      if (val > 0) { playerRef.current.unMute(); setIsMuted(false); }
      else { playerRef.current.mute(); setIsMuted(true); }
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
      containerRef.current.requestFullscreen().catch(err =>
        console.error('Error attempting fullscreen:', err)
      );
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
      console.error('Failed to skip time:', err);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackSpeed(rate);
    setShowSpeedMenu(false);
    try { playerRef.current?.setPlaybackRate(rate); }
    catch (err) { console.error('Failed to set playback rate:', err); }
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
        console.error('Failed to set playback quality:', err);
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
      console.error('Failed to toggle subtitles:', err);
    }
  };

  return {
    // Refs
    playerRef,
    containerRef,
    // State
    isPlaying, duration, currentTime, volume, isMuted,
    isFullscreen, showControls, isBuffering, isSeeking,
    playbackSpeed, showSpeedMenu, setShowSpeedMenu,
    isCcActive, hasStarted,
    availableQualities, currentQuality,
    showQualityMenu, setShowQualityMenu,
    // Bookmarks
    bookmarks, addBookmark, deleteBookmark,
    // Formatters
    formatTime, formatQualityLabel,
    // YouTube event handlers
    onReady, onPlay, onPause, onEnd, onStateChange,
    // Control handlers
    handleTogglePlay, handleSeekStart, handleSeek, handleSeekEnd,
    handleVolumeChange, handleToggleMute, handleFullscreen,
    handleSkip, handleSpeedChange, handleQualityChange, handleToggleCc,
  };
}
