import { Play } from 'lucide-react';

interface VideoThumbnailCoverProps {
  videoId: string;
  onPlay: () => void;
}

/**
 * Shown before the video has started playing.
 * Renders the YouTube thumbnail with a centered play button overlay.
 */
export default function VideoThumbnailCover({ videoId, onPlay }: VideoThumbnailCoverProps) {
  return (
    <div
      onClick={onPlay}
      className="absolute inset-0 z-40 cursor-pointer bg-black flex items-center justify-center"
    >
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        alt="Video Thumbnail"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-45">
        <div className="h-16 w-16 rounded-full bg-primary-500/25 border border-primary-500/40 flex items-center justify-center text-primary-300 hover:scale-110 hover:bg-primary-500/45 hover:text-white transition-all duration-300 shadow-glow">
          <Play className="w-8 h-8 fill-current ml-1" />
        </div>
      </div>
    </div>
  );
}
