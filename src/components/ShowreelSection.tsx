import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Film, Loader2, Play } from 'lucide-react';
import type { VideoGenre, VideoWork } from '../types/portfolio';
import {
  filterVideosByGenre,
  getVideoMimeType,
  normalizeVideoPlaybackUrl,
} from '../utils/videoSources';
import { InteractiveCard } from './InteractiveCard';
import { ScrollReveal } from './ScrollReveal';

interface ShowreelSectionProps {
  videos: VideoWork[];
  loading?: boolean;
  activeGenre: VideoGenre;
  onGenreChange: (genre: VideoGenre) => void;
  onSelectVideo: (video: VideoWork) => void;
}

const GENRE_FILTERS: VideoGenre[] = [
  'All',
  'Horror',
  'Comedy',
  'Gaming',
  'Vlogs & Events',
];

function VideoPreviewCard({
  video,
  isHeroCard,
  onSelect,
}: {
  video: VideoWork;
  isHeroCard: boolean;
  onSelect: () => void;
}) {
  const cardMediaRef = useRef<HTMLDivElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHoverPreviewing, setIsHoverPreviewing] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  const normalizedUrl = normalizeVideoPlaybackUrl(video.videoUrl);
  const mimeType = getVideoMimeType(video.fileName || normalizedUrl, video.mimeType);

  useEffect(() => {
    const node = cardMediaRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleMouseEnter = () => {
    setIsVisible(true);
    const el = previewVideoRef.current;
    if (!el || previewFailed) return;
    setIsHoverPreviewing(true);
    el.play().catch(() => {
      // Ignore autoplay blocks on hover
    });
  };

  const handleMouseLeave = () => {
    const el = previewVideoRef.current;
    setIsHoverPreviewing(false);
    if (!el) return;
    el.pause();
    if (Number.isFinite(el.duration) && el.duration > 0.5) {
      try {
        el.currentTime = 0.5;
      } catch {
        // Ignore seek errors on unbuffered streams
      }
    }
  };

  return (
    <InteractiveCard
      as="article"
      maxTilt={3.5}
      className={`group rounded-2xl overflow-hidden border border-white/10 bg-[#131317] hover:border-white/25 transition-colors duration-200 flex flex-col ${
        isHeroCard ? 'md:col-span-2 lg:col-span-2' : ''
      }`}
    >
      {/* Interactive Hover-to-Preview Video Frame */}
      <div
        ref={cardMediaRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full overflow-hidden bg-[#0A0A0D] ${
          isHeroCard ? 'aspect-[16/9]' : 'aspect-[16/10]'
        }`}
      >
        {video.posterUrl && (
          <img
            src={video.posterUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] ${
              isHoverPreviewing && !previewFailed ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}

        {isVisible && !previewFailed ? (
          <video
            ref={previewVideoRef}
            muted
            loop
            playsInline
            preload={video.posterUrl ? 'none' : 'metadata'}
            poster={video.posterUrl}
            onError={() => setPreviewFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          >
            <source src={normalizedUrl} type={mimeType} />
          </video>
        ) : (
          !video.posterUrl && (
            <div className="w-full h-full bg-gradient-to-br from-[#1A1215] via-[#101015] to-[#0A0A0D]" />
          )
        )}

        {/* Measured bottom contrast scrim */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Play Trigger Overlay */}
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Play ${video.title}`}
          className="absolute inset-0 z-10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] focus-visible:ring-inset"
        >
          <span
            className={`inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#0B0B0D]/80 border border-white/20 text-[#F4F2EC] transition-all duration-200 ease-out group-hover:scale-110 group-hover:bg-[#E53935] group-hover:border-[#E53935] ${
              isHoverPreviewing ? 'opacity-85 scale-95' : 'opacity-100'
            }`}
          >
            <Play className="w-5 h-5 ml-0.5 fill-current" aria-hidden="true" />
          </span>
        </button>

        {/* Bottom-right duration readout */}
        <span className="pointer-events-none absolute bottom-3.5 right-4 z-10 text-xs font-mono tabular-nums text-[#F4F2EC]/90">
          {isHoverPreviewing && !previewFailed ? 'Previewing' : video.duration}
        </span>
      </div>

      {/* Clean Editorial Metadata Body */}
      <div className="relative z-20 p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#A6A4AE] mb-2 min-w-0">
            <span className="text-[#E53935] font-medium whitespace-nowrap shrink-0">
              {video.genre}
            </span>
            <span aria-hidden="true" className="shrink-0">
              ·
            </span>
            <span className="truncate">{video.role}</span>
            {video.featured && (
              <>
                <span aria-hidden="true" className="shrink-0">
                  ·
                </span>
                <span className="text-[#F4F2EC] font-medium whitespace-nowrap shrink-0">
                  Featured
                </span>
              </>
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-[#F4F2EC] leading-snug mb-2">
            <button
              type="button"
              onClick={onSelect}
              className="text-left hover:text-[#E53935] transition-colors focus-visible:outline-none focus-visible:underline"
            >
              {video.title}
            </button>
          </h3>

          <p className="text-sm text-[#A6A4AE] leading-relaxed line-clamp-2">
            {video.summary}
          </p>
        </div>

        <div className="pt-3 border-t border-white/8 flex items-center justify-between text-xs">
          <span className="font-mono tabular-nums text-[#8C8A94]">{video.year}</span>
          <button
            type="button"
            onClick={onSelect}
            className="font-medium text-[#F4F2EC] hover:text-[#E53935] transition-colors whitespace-nowrap"
          >
            Watch Full Reel
          </button>
        </div>
      </div>
    </InteractiveCard>
  );
}

export function ShowreelSection({
  videos,
  loading = false,
  activeGenre,
  onGenreChange,
  onSelectVideo,
}: ShowreelSectionProps) {
  const sortedVideos = [...videos].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
  );
  const filteredVideos = filterVideosByGenre(sortedVideos, activeGenre);

  return (
    <section
      id="showreel"
      className="py-20 sm:py-28 border-t border-white/8"
      aria-labelledby="showreel-heading"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        {/* Clean Editorial Section Header */}
        <ScrollReveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#E53935] mb-2">
              02. Selected Work &amp; Video Showreel
            </p>
            <h2
              id="showreel-heading"
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2EC] text-balance"
            >
              Selected reels across horror narration, stand-up, gaming, and vlogs.
            </h2>
          </div>

          <p className="text-sm text-[#A6A4AE] max-w-sm leading-relaxed">
            Hover any reel to preview in motion, or click to open the full-screen showreel player.
          </p>
        </ScrollReveal>

        {/* Genre Filter Tabs (shown when published videos exist) */}
        {videos.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div
              role="tablist"
              aria-label="Filter showreel by genre"
              className="flex items-center gap-1 p-1 rounded-xl bg-[#131317] border border-white/8 overflow-x-auto"
            >
              {GENRE_FILTERS.map((genre) => {
                const isSelected = activeGenre === genre;
                const count = filterVideosByGenre(videos, genre).length;
                return (
                  <button
                    key={genre}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => onGenreChange(genre)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#F4F2EC] text-[#0B0B0D]'
                        : 'text-[#A6A4AE] hover:text-[#F4F2EC]'
                    }`}
                  >
                    {genre}{' '}
                    <span className="tabular-nums opacity-70 ml-1">{count}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-[#8C8A94] tabular-nums">
              Showing {filteredVideos.length} of {videos.length}{' '}
              {videos.length === 1 ? 'reel' : 'reels'}
            </p>
          </div>
        )}

        {/* Loading / Visitor Showcase Empty State / Published Bento Video Grid */}
        {loading && videos.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#121216] py-16 px-6 flex flex-col items-center justify-center gap-3 text-sm text-[#8C8A94]">
            <Loader2 className="w-6 h-6 animate-spin text-[#E53935]" aria-hidden="true" />
            <span>Loading published reels...</span>
          </div>
        ) : videos.length === 0 ? (
          <ScrollReveal yOffset={20}>
            <div
              data-testid="showreel-empty-showcase"
              className="rounded-2xl border border-white/10 bg-[#121216] p-10 sm:p-16 text-center"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E53935]/12 border border-[#E53935]/25 text-[#E53935] mb-5">
                <Film className="w-6 h-6" aria-hidden="true" />
              </div>

              <h3 className="text-xl sm:text-2xl font-semibold text-[#F4F2EC] tracking-tight mb-2">
                New Showreel Clips Publishing Soon
              </h3>
              <p className="text-sm text-[#A6A4AE] max-w-lg mx-auto leading-relaxed mb-7">
                Fresh edits from Bhuvi’s horror voiceover stories, live stand-up sets, and gaming highlights are being curated for this reel. Need a private screener for a brand or event booking?
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 whitespace-nowrap"
                >
                  Request Private Screener
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>

                <a
                  href="#experience"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/14 bg-[#18181D] hover:border-white/30 text-sm font-medium text-[#F4F2EC] transition-transform duration-150 hover:-translate-y-0.5 whitespace-nowrap"
                >
                  Explore Creative Credits
                </a>
              </div>
            </div>
          </ScrollReveal>
        ) : filteredVideos.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#131317] p-12 text-center">
            <p className="text-base font-medium text-[#F4F2EC] mb-2">
              No reels in {activeGenre} yet
            </p>
            <p className="text-sm text-[#A6A4AE] max-w-md mx-auto mb-6">
              Switch back to All to browse every published reel in Bhuvi’s showreel.
            </p>
            <button
              type="button"
              onClick={() => onGenreChange('All')}
              className="px-4 py-2.5 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] text-xs font-semibold text-white transition-colors"
            >
              Show All Reels
            </button>
          </div>
        ) : (
          <div
            data-testid="showreel-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredVideos.map((video, index) => {
              const isHero =
                activeGenre === 'All' && index === 0 && filteredVideos.length > 1;
              return (
                <ScrollReveal
                  key={video.id}
                  delay={Math.min(index * 0.06, 0.24)}
                  yOffset={24}
                  hoverLift
                  className={isHero ? 'md:col-span-2 lg:col-span-2' : ''}
                >
                  <VideoPreviewCard
                    video={video}
                    isHeroCard={isHero}
                    onSelect={() => onSelectVideo(video)}
                  />
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
