import YouTube, { YouTubeProps } from 'react-youtube';
import { Loader2 } from 'lucide-react';
import { useVideoPlayer } from './video/useVideoPlayer';
import VideoThumbnailCover from './video/VideoThumbnailCover';
import VideoControlBar from './video/VideoControlBar';

interface VideoPlayerProps {
  videoId: string;
  player: any; // Externalized player state
}

const youtubeOpts: YouTubeProps['opts'] = {
  height: '100%',
  width: '100%',
  playerVars: {
    autoplay: 0,
    modestbranding: 1,
    rel: 0,
    controls: 0,       // Hide default YouTube controls
    disablekb: 1,      // Disable default YouTube hotkeys
    fs: 0,             // Disable native fullscreen button
    iv_load_policy: 3, // Hide annotations
    autohide: 1,
  },
};

export default function VideoPlayer({ videoId, player }: VideoPlayerProps) {
  if (!videoId) {
    return (
      <div className="w-full aspect-video bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10">
        <p className="text-slate-400">Video ID not provided</p>
      </div>
    );
  }

  return (
    <div
      ref={player.containerRef}
      className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative bg-black select-none group/player"
    >
      {/* 1. YouTube iframe — clipped ±7.5% vertically to mask title/watermark */}
      <div className="absolute w-full h-[115%] top-[-7.5%] left-0 pointer-events-none select-none overflow-hidden z-0 bg-black">
        <YouTube
          videoId={videoId}
          opts={youtubeOpts}
          onReady={player.onReady}
          onPlay={player.onPlay}
          onPause={player.onPause}
          onEnd={player.onEnd}
          onStateChange={player.onStateChange}
          className="w-full h-full"
        />
      </div>

      {/* 2. Transparent click-capture overlay to intercept YouTube default interactions */}
      <div
        className="absolute inset-x-0 top-0 bottom-20 z-10 cursor-pointer"
        onClick={player.handleTogglePlay}
      />

      {/* 3. Pre-play thumbnail + play button cover */}
      {!player.hasStarted && (
        <VideoThumbnailCover
          videoId={videoId}
          onPlay={player.handleTogglePlay}
        />
      )}

      {/* 4. Buffering spinner overlay */}
      {player.isBuffering && (
        <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center z-30 pointer-events-none">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        </div>
      )}

      {/* 5. Custom control bar */}
      <VideoControlBar
        isPlaying={player.isPlaying}
        duration={player.duration}
        currentTime={player.currentTime}
        volume={player.volume}
        isMuted={player.isMuted}
        isFullscreen={player.isFullscreen}
        showControls={player.showControls}
        playbackSpeed={player.playbackSpeed}
        showSpeedMenu={player.showSpeedMenu}
        setShowSpeedMenu={player.setShowSpeedMenu}
        isCcActive={player.isCcActive}
        availableQualities={player.availableQualities}
        currentQuality={player.currentQuality}
        showQualityMenu={player.showQualityMenu}
        setShowQualityMenu={player.setShowQualityMenu}
        formatTime={player.formatTime}
        formatQualityLabel={player.formatQualityLabel}
        onTogglePlay={player.handleTogglePlay}
        onSeekStart={player.handleSeekStart}
        onSeek={player.handleSeek}
        onSeekEnd={player.handleSeekEnd}
        onVolumeChange={player.handleVolumeChange}
        onToggleMute={player.handleToggleMute}
        onFullscreen={player.handleFullscreen}
        onSkip={player.handleSkip}
        onSpeedChange={player.handleSpeedChange}
        onQualityChange={player.handleQualityChange}
        onToggleCc={player.handleToggleCc}
        bookmarks={player.bookmarks}
        onBookmarkClick={(time) => {
          player.playerRef.current?.seekTo(time, true);
          player.playerRef.current?.playVideo();
        }}
      />
    </div>
  );
}
