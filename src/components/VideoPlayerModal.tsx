import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { VideoWork } from '../types/portfolio';
import {
  formatTimecode,
  getMediaErrorMessage,
  getVideoMimeType,
  isValidPublicVideoUrl,
  normalizeVideoPlaybackUrl,
} from '../utils/videoSources';

interface VideoPlayerModalProps {
  video: VideoWork | null;
  allVideos: VideoWork[];
  onClose: () => void;
  onSelectVideo: (video: VideoWork) => void;
}

interface SafariVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const MAX_AUTO_RETRIES = 2;

export function VideoPlayerModal({
  video,
  allVideos,
  onClose,
  onSelectVideo,
}: VideoPlayerModalProps) {
  const videoElRef = useRef<SafariVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const retryTimerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mutedAutoplayNotice, setMutedAutoplayNotice] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [autoRetryCount, setAutoRetryCount] = useState(0);

  useEffect(() => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setIsPlaying(false);
    setIsMuted(false);
    setMutedAutoplayNotice(false);
    setCurrentTime(0);
    setDuration(0);
    setBufferedEnd(0);
    setIsBuffering(Boolean(video));
    setLoadError(null);
    setPlaybackRate(1);
    setAutoRetryCount(0);
  }, [video?.id, retryKey]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // Attempt smooth autoplay when the user clicks a video card, falling back to muted autoplay if browser policies require it
  useEffect(() => {
    if (!video || loadError) return;
    const el = videoElRef.current;
    if (!el) return;

    let cancelled = false;
    el.muted = false;

    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        if (cancelled || !videoElRef.current) return;
        videoElRef.current.muted = true;
        setIsMuted(true);
        videoElRef.current
          .play()
          .then(() => {
            if (!cancelled) setMutedAutoplayNotice(true);
          })
          .catch(() => {
            if (!cancelled) setIsBuffering(false);
          });
      });
    }

    return () => {
      cancelled = true;
    };
  }, [video?.id, retryKey, loadError]);

  useEffect(() => {
    if (!video) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const el = videoElRef.current;
      if (!el) return;

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        if (el.paused) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        el.currentTime = Math.max(0, el.currentTime - 5);
      } else if (e.key.toLowerCase() === 'm') {
        el.muted = !el.muted;
        setIsMuted(el.muted);
        if (!el.muted) setMutedAutoplayNotice(false);
      } else if (e.key.toLowerCase() === 'f') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else if (playerContainerRef.current?.requestFullscreen) {
          playerContainerRef.current.requestFullscreen().catch(() => {
            el.webkitEnterFullscreen?.();
          });
        } else {
          el.webkitEnterFullscreen?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [video, onClose]);

  if (!video) return null;

  const playbackUrl = normalizeVideoPlaybackUrl(video.videoUrl);
  const mimeType = getVideoMimeType(video.fileName || playbackUrl, video.mimeType);
  const isDirectPublicUrl = isValidPublicVideoUrl(playbackUrl);

  const currentIdx = allVideos.findIndex((item) => item.id === video.id);
  const prevVideo = currentIdx > 0 ? allVideos[currentIdx - 1] : null;
  const nextVideo =
    currentIdx >= 0 && currentIdx < allVideos.length - 1
      ? allVideos[currentIdx + 1]
      : null;

  const updateBuffered = (el: HTMLVideoElement) => {
    if (el.buffered.length > 0) {
      setBufferedEnd(el.buffered.end(el.buffered.length - 1));
    }
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const code = e.currentTarget.error?.code;
    // Automatically recover from transient mobile/internet network glitches before surfacing an error
    if ((code === 2 || code === 1) && autoRetryCount < MAX_AUTO_RETRIES) {
      const nextTry = autoRetryCount + 1;
      setAutoRetryCount(nextTry);
      setIsBuffering(true);
      retryTimerRef.current = window.setTimeout(() => {
        const el = videoElRef.current;
        if (!el) return;
        const resumeAt = el.currentTime;
        el.load();
        if (resumeAt > 0) {
          el.currentTime = resumeAt;
        }
        el.play().catch(() => {});
      }, 900 * nextTry);
      return;
    }

    setIsBuffering(false);
    setLoadError(getMediaErrorMessage(code));
  };

  const togglePlay = () => {
    const el = videoElRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {
        setLoadError(getMediaErrorMessage(el.error?.code));
      });
    } else {
      el.pause();
    }
  };

  const toggleMute = () => {
    const el = videoElRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setIsMuted(el.muted);
    if (!el.muted) setMutedAutoplayNotice(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = videoElRef.current;
    const nextTime = Number(e.target.value);
    setCurrentTime(nextTime);
    if (el) {
      el.currentTime = nextTime;
    }
  };

  const cycleSpeed = () => {
    const idx = SPEED_OPTIONS.indexOf(playbackRate);
    const nextRate = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setPlaybackRate(nextRate);
    if (videoElRef.current) {
      videoElRef.current.playbackRate = nextRate;
    }
  };

  const toggleFullscreen = () => {
    const el = videoElRef.current;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (playerContainerRef.current?.requestFullscreen) {
      playerContainerRef.current.requestFullscreen().catch(() => {
        el?.webkitEnterFullscreen?.();
      });
    } else {
      el?.webkitEnterFullscreen?.();
    }
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-video-title"
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl rounded-2xl border border-white/12 bg-[#111115] overflow-hidden my-auto">
        {/* Top Modal Bar */}
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 py-4 border-b border-white/8">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-[#A6A4AE] mb-0.5">
              <span className="text-[#E53935] font-medium">{video.genre}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{video.role}</span>
            </div>
            <h2
              id="lightbox-video-title"
              className="text-base sm:text-lg font-semibold text-[#F4F2EC] truncate"
            >
              {video.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {prevVideo && (
              <button
                type="button"
                onClick={() => onSelectVideo(prevVideo)}
                aria-label={`Previous video: ${prevVideo.title}`}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 text-[#C2C0CA] hover:text-white hover:border-white/25 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            {nextVideo && (
              <button
                type="button"
                onClick={() => onSelectVideo(nextVideo)}
                aria-label={`Next video: ${nextVideo.title}`}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 text-[#C2C0CA] hover:text-white hover:border-white/25 transition-colors"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close video player"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/12 bg-white/5 text-[#F4F2EC] hover:bg-[#E53935] hover:border-[#E53935] transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Video Stage */}
        <div
          ref={playerContainerRef}
          className="relative w-full aspect-video bg-[#08080A] flex items-center justify-center"
        >
          {loadError ? (
            <div
              role="alert"
              className="p-8 text-center max-w-md flex flex-col items-center"
            >
              <AlertCircle className="w-10 h-10 text-[#E53935] mb-3" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-[#F4F2EC] mb-2">
                Could not play this video
              </h3>
              <p className="text-sm text-[#A6A4AE] leading-relaxed mb-6">
                {loadError}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] text-xs font-medium text-white transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Retry Playback
                </button>
                {isDirectPublicUrl && (
                  <a
                    href={playbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-xs font-medium text-[#F4F2EC] hover:border-white/35 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    Open Video Directly
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <video
                key={`${video.id}-${retryKey}`}
                ref={videoElRef}
                poster={video.posterUrl}
                playsInline
                preload="auto"
                controlsList="nodownload"
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPlaying={() => {
                  setIsPlaying(true);
                  setIsBuffering(false);
                }}
                onPause={() => setIsPlaying(false)}
                onWaiting={() => setIsBuffering(true)}
                onStalled={() => setIsBuffering(true)}
                onCanPlay={() => setIsBuffering(false)}
                onCanPlayThrough={() => setIsBuffering(false)}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (Number.isFinite(v.duration) && v.duration > 0) {
                    setDuration(v.duration);
                  }
                  v.playbackRate = playbackRate;
                  updateBuffered(v);
                }}
                onDurationChange={(e) => {
                  const v = e.currentTarget;
                  if (Number.isFinite(v.duration) && v.duration > 0) {
                    setDuration(v.duration);
                  }
                }}
                onProgress={(e) => updateBuffered(e.currentTarget)}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  setCurrentTime(v.currentTime);
                  updateBuffered(v);
                }}
                onError={handleVideoError}
                className="w-full h-full object-contain bg-black cursor-pointer"
              >
                <source src={playbackUrl} type={mimeType} />
              </video>

              {mutedAutoplayNotice && isMuted && (
                <button
                  type="button"
                  onClick={toggleMute}
                  className="absolute top-4 right-4 z-20 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0B0B0D]/90 border border-white/20 hover:border-[#E53935] text-xs font-medium text-[#F4F2EC] transition-colors"
                >
                  <VolumeX className="w-3.5 h-3.5 text-[#E53935]" aria-hidden="true" />
                  Tap to Unmute
                </button>
              )}

              {isBuffering && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                  <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-black/85 border border-white/10 text-xs font-mono text-[#F4F2EC]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E53935]" aria-hidden="true" />
                    Buffering...
                  </span>
                </div>
              )}

              {/* Seamless Transport Control Bar */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-8 pb-3 px-4 sm:px-5">
                <div className="relative flex items-center h-5 mb-2">
                  <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-white/35 transition-all duration-150"
                      style={{ width: `${bufferedPct}%` }}
                    />
                  </div>
                  <div
                    className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-[#E53935]"
                    style={{ width: `${progressPct}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    aria-label="Seek video timeline"
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Pause video' : 'Play video'}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 hover:bg-[#E53935] text-white transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" aria-hidden="true" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5 fill-current" aria-hidden="true" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#D0CEC8] hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>

                    <span className="text-xs font-mono tabular-nums text-[#D0CEC8]">
                      {formatTimecode(currentTime)} / {formatTimecode(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={cycleSpeed}
                      aria-label={`Playback speed ${playbackRate}x`}
                      className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/18 text-xs font-mono tabular-nums text-[#F4F2EC] transition-colors"
                    >
                      {playbackRate}x
                    </button>

                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      aria-label="Toggle fullscreen"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[#D0CEC8] hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Maximize className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Description */}
        <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141418]">
          <p className="text-sm text-[#B8B6C0] leading-relaxed max-w-2xl">
            {video.summary}
          </p>
          <span className="text-xs font-mono text-[#8C8A94] whitespace-nowrap shrink-0">
            Keys: Space · ←/→ · M · F · Esc
          </span>
        </div>
      </div>
    </div>
  );
}
