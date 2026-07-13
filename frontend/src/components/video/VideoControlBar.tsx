import React from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

interface VideoControlBarProps {
  // Playback
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  // Volume
  volume: number;
  isMuted: boolean;
  // Fullscreen
  isFullscreen: boolean;
  // Visibility
  showControls: boolean;
  // Speed
  playbackSpeed: number;
  showSpeedMenu: boolean;
  setShowSpeedMenu: (v: boolean) => void;
  // CC
  isCcActive: boolean;
  // Quality
  availableQualities: string[];
  currentQuality: string;
  showQualityMenu: boolean;
  setShowQualityMenu: (v: boolean) => void;
  // Formatters
  formatTime: (secs: number) => string;
  formatQualityLabel: (quality: string) => string;
  // Handlers
  onTogglePlay: () => void;
  onSeekStart: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSeekEnd: () => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleMute: () => void;
  onFullscreen: () => void;
  onSkip: (seconds: number) => void;
  onSpeedChange: (rate: number) => void;
  onQualityChange: (quality: string) => void;
  onToggleCc: () => void;
  bookmarks?: any[];
  onBookmarkClick?: (time: number) => void;
}

/**
 * The full bottom control bar: timeline, play/pause, skip, volume,
 * CC, quality picker, speed picker, and fullscreen toggle.
 */
export default function VideoControlBar({
  isPlaying, duration, currentTime,
  volume, isMuted,
  isFullscreen, showControls,
  playbackSpeed, showSpeedMenu, setShowSpeedMenu,
  isCcActive,
  availableQualities, currentQuality, showQualityMenu, setShowQualityMenu,
  formatTime, formatQualityLabel,
  onTogglePlay, onSeekStart, onSeek, onSeekEnd,
  onVolumeChange, onToggleMute, onFullscreen,
  onSkip, onSpeedChange, onQualityChange, onToggleCc,
  bookmarks = [],
  onBookmarkClick,
}: VideoControlBarProps) {
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePct = isMuted ? 0 : volume;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-3 transition-all duration-300 z-50 ${
        showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Timeline ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-slate-300 select-none">
          {formatTime(currentTime)}
        </span>

        <div className="flex-1 relative group py-2">
          {/* Bookmark Timeline Markers */}
          {bookmarks.map((bm) => {
            const leftPct = duration > 0 ? (bm.timestamp / duration) * 100 : 0;
            return (
              <div
                key={bm.id}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 border border-white cursor-pointer z-20 group/marker transition-transform hover:scale-150"
                style={{ left: `${leftPct}%` }}
                onClick={() => onBookmarkClick && onBookmarkClick(bm.timestamp)}
              >
                {/* Tooltip */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] py-1 px-2 rounded-lg border border-white/10 shadow-xl opacity-0 group-hover/marker:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30 font-medium font-sans">
                  {bm.note ? `${bm.note} (${formatTime(bm.timestamp)})` : `Bookmark (${formatTime(bm.timestamp)})`}
                </div>
              </div>
            );
          })}

          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onMouseDown={onSeekStart}
            onTouchStart={onSeekStart}
            onChange={onSeek}
            onMouseUp={onSeekEnd}
            onTouchEnd={onSeekEnd}
            className="w-full h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-primary-500 group-hover:h-1.5 transition-all outline-none"
            style={{
              background: `linear-gradient(to right, rgb(99,102,241) ${progressPct}%, rgba(255,255,255,0.2) ${progressPct}%)`,
            }}
          />
        </div>

        <span className="text-xs font-mono text-slate-300 select-none">
          {formatTime(duration)}
        </span>
      </div>

      {/* ── Button Row ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">

        {/* Left side */}
        <div className="flex items-center gap-4">
          {/* Play / Pause */}
          <button
            onClick={onTogglePlay}
            className="text-slate-300 hover:text-white hover:scale-105 transition-all mr-2"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying
              ? <Pause className="w-5 h-5 fill-current" />
              : <Play className="w-5 h-5 fill-current" />}
          </button>

          {/* Skip buttons */}
          <div className="flex items-center gap-1.5 mr-2">
            {[-30, -10, 10, 30].map(s => (
              <button
                key={s}
                onClick={() => onSkip(s)}
                className="text-[10px] font-bold text-slate-400 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/10 px-2 py-1 rounded transition-colors"
                title={`${s > 0 ? 'Forward' : 'Rewind'} ${Math.abs(s)}s`}
              >
                {s > 0 ? `+${s}s` : `${s}s`}
              </button>
            ))}
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 group/volume">
            <button
              onClick={onToggleMute}
              className="text-slate-300 hover:text-white transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0
                ? <VolumeX className="w-5 h-5" />
                : <Volume2 className="w-5 h-5" />}
            </button>

            <input
              type="range"
              min={0}
              max={100}
              value={volumePct}
              onChange={onVolumeChange}
              className="w-16 h-1 bg-white/25 rounded-lg appearance-none cursor-pointer accent-primary-500 outline-none"
              style={{
                background: `linear-gradient(to right, rgb(99,102,241) ${volumePct}%, rgba(255,255,255,0.2) ${volumePct}%)`,
              }}
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* CC */}
          <button
            onClick={onToggleCc}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
              isCcActive
                ? 'bg-primary-500 border-primary-400 text-white'
                : 'border-slate-500 text-slate-300 hover:text-white hover:border-white'
            }`}
            title="Toggle Subtitles"
          >
            CC
          </button>

          {/* Quality dropup */}
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
                {availableQualities.map(q => (
                  <button
                    key={q}
                    onClick={() => onQualityChange(q)}
                    className={`w-full block text-left px-3 py-1.5 text-xs transition-colors ${
                      currentQuality === q
                        ? 'bg-primary-500 text-white font-bold'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {formatQualityLabel(q)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Speed dropup */}
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
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                  <button
                    key={rate}
                    onClick={() => onSpeedChange(rate)}
                    className={`w-full block text-left px-3 py-1.5 text-xs transition-colors ${
                      playbackSpeed === rate
                        ? 'bg-primary-500 text-white font-bold'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={onFullscreen}
            className="text-slate-300 hover:text-white hover:scale-105 transition-all"
            title="Fullscreen"
          >
            {isFullscreen
              ? <Minimize className="w-5 h-5" />
              : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
