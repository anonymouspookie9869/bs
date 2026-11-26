import React, { useEffect, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  FileDown,
  Menu,
  Play,
  X,
} from 'lucide-react';
import {
  HERO_HIGHLIGHTS,
  PROFILE,
} from './data/portfolioData';
import type {
  StudioFocusPreset,
  StudioLightingMood,
  VideoGenre,
  VideoWork,
} from './types/portfolio';
import {
  getVideoMimeType,
  isSafePortraitSrc,
  normalizeVideoPlaybackUrl,
} from './utils/videoSources';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SitePreloader } from './components/SitePreloader';
import { HeadshotPortraitFrame } from './components/EditorialArtwork';
import { CreatorStage3D } from './components/CreatorStage3D';
import { ShowreelSection } from './components/ShowreelSection';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { ScrollReveal } from './components/ScrollReveal';
import { ExperienceAndSkills } from './components/ExperienceAndSkills';
import { ContactSection } from './components/ContactSection';
import { AdminDashboard } from './components/AdminDashboard';

const STORAGE_PORTRAIT_KEY = 'bhuvi_portfolio_custom_portrait_v1';

const MARQUEE_PHRASES = [
  'Voiceover Horror Storytelling',
  'Stand-Up Comedy',
  'Minecraft & Valorant Gaming Edits',
  'Food & Personal Vlogs',
  'Comic Con Creator',
  'Horror Con Volunteer',
];

const NAV_SECTIONS = [
  { id: 'studio', label: '3D Studio' },
  { id: 'showreel', label: 'Showreel' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
] as const;

function PortfolioApp({ onOpenAdmin }: { onOpenAdmin: () => void }) {
  const [videos, setVideos] = useState<VideoWork[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [portraitSrc, setPortraitSrc] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PORTRAIT_KEY);
      return isSafePortraitSrc(saved) ? saved : PROFILE.defaultPortraitPath;
    } catch {
      return PROFILE.defaultPortraitPath;
    }
  });
  const [isCustomPortrait, setIsCustomPortrait] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PORTRAIT_KEY);
      return isSafePortraitSrc(saved);
    } catch {
      return false;
    }
  });

  const [activeGenre, setActiveGenre] = useState<VideoGenre>('All');
  const [studioPreset, setStudioPreset] = useState<StudioFocusPreset>('overview');
  const [lightingMood, setLightingMood] = useState<StudioLightingMood>('warm-stage');
  const [selectedVideo, setSelectedVideo] = useState<VideoWork | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeNavId, setActiveNavId] = useState<string>('studio');
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const smoothHeroY = useSpring(
    useTransform(scrollY, [0, 700], [0, prefersReducedMotion ? 0 : -24]),
    { stiffness: 120, damping: 24, mass: 0.4 },
  );

  // Hydrate published showreel videos from the PostgreSQL API and static manifest.json
  useEffect(() => {
    let cancelled = false;

    const sanitizeList = (
      items: unknown,
      sourceKind: 'published' | 'manifest',
    ): VideoWork[] => {
      if (!Array.isArray(items)) return [];
      return (items as VideoWork[])
        .map((v) => {
          const safeUrl =
            v && typeof v.videoUrl === 'string'
              ? normalizeVideoPlaybackUrl(v.videoUrl)
              : '';
          if (!safeUrl) return null;
          return {
            ...v,
            sourceKind,
            videoUrl: safeUrl,
            mimeType: getVideoMimeType(safeUrl, v.mimeType),
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);
    };

    async function hydrateVideos() {
      setLoadingVideos(true);
      try {
        const [apiVideos, manifestVideos] = await Promise.all([
          fetch('/api/videos', { cache: 'no-store' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => sanitizeList(data?.videos, 'published'))
            .catch(() => []),
          fetch('/assets/videos/manifest.json', { cache: 'no-cache' })
            .then((res) => (res.ok ? res.json() : null))
            .then((manifest) => sanitizeList(manifest?.videos, 'manifest'))
            .catch(() => []),
        ]);

        if (cancelled) return;

        const seenUrls = new Set(apiVideos.map((v) => v.videoUrl));
        const uniqueManifest = manifestVideos.filter(
          (v) => !seenUrls.has(v.videoUrl),
        );
        setVideos([...apiVideos, ...uniqueManifest]);
      } finally {
        if (!cancelled) setLoadingVideos(false);
      }
    }

    void hydrateVideos();
    return () => {
      cancelled = true;
    };
  }, []);

  // Smooth scroll progress bar & active navigation section spy
  useEffect(() => {
    let raf = 0;
    const updateScrollState = () => {
      raf = 0;
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      setScrollProgress(Math.min(1, Math.max(0, window.scrollY / maxScroll)));
      setShowBackToTop(window.scrollY > 420);

      const marker = window.scrollY + window.innerHeight * 0.35;
      let current: string = NAV_SECTIONS[0].id;
      for (const sec of NAV_SECTIONS) {
        const el = document.getElementById(sec.id);
        if (el && el.offsetTop <= marker) {
          current = sec.id;
        }
      }
      setActiveNavId(current);
    };

    const onScroll = () => {
      if (!raf) {
        raf = requestAnimationFrame(updateScrollState);
      }
    };

    updateScrollState();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);


  const handleUploadPortrait = (dataUrl: string) => {
    setPortraitSrc(dataUrl);
    setIsCustomPortrait(true);
    try {
      localStorage.setItem(STORAGE_PORTRAIT_KEY, dataUrl);
    } catch {
      // Keeps active in session even if storage quota is exceeded
    }
  };

  const handleResetPortrait = () => {
    setPortraitSrc(PROFILE.defaultPortraitPath);
    setIsCustomPortrait(false);
    try {
      localStorage.removeItem(STORAGE_PORTRAIT_KEY);
    } catch {
      // Ignore
    }
  };

  const handleJumpToGenre = (genre: VideoGenre) => {
    setActiveGenre(genre);
    document.getElementById('showreel')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectFormat = (
    genre: VideoGenre,
    preset: StudioFocusPreset,
    mood: StudioLightingMood,
  ) => {
    setStudioPreset(preset);
    setLightingMood(mood);
    setActiveGenre(genre);
    document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#F4F2EC] overflow-x-hidden">
      {/* Studio Loading Curtain Animation */}
      <SitePreloader />

      {/* Strict 3-Zone Top Bar Contract + Hairline Scroll Progress */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B0B0D]/92">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className="text-lg font-bold tracking-tight text-[#F4F2EC] hover:text-[#E53935] transition-colors whitespace-nowrap shrink-0 font-[var(--font-display)]"
          >
            {PROFILE.name}
          </a>

          {/* Zone 2: 4 Clean Single-Line Nav Links with Scroll-Spy Active Underline */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {NAV_SECTIONS.map((sec) => {
              const isActive = activeNavId === sec.id;
              return (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className={`relative py-1 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#F4F2EC]'
                      : 'text-[#A6A4AE] hover:text-[#F4F2EC]'
                  }`}
                >
                  {sec.label}
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 right-0 -bottom-0.5 h-[2px] bg-[#E53935] origin-left transition-transform duration-200 ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action (+ Mobile Menu Toggle) */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#contact"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] text-xs font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap shrink-0"
            >
              Book &amp; Connect
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-white/12 text-[#F4F2EC]"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Hairline Scroll Progress Track (compositor-only scaleX) */}
        <div
          aria-hidden="true"
          className="h-[2px] w-full bg-transparent overflow-hidden"
        >
          <div
            className="h-full bg-[#E53935] origin-left"
            style={{ transform: `scaleX(${scrollProgress})` }}
          />
        </div>

        {/* Clean Mobile Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-white/8 bg-[#101014] px-5 py-4 flex flex-col gap-3 text-sm font-medium"
          >
            {NAV_SECTIONS.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 ${
                  activeNavId === sec.id
                    ? 'text-[#E53935] font-semibold'
                    : 'text-[#D0CEC8] hover:text-white'
                }`}
              >
                {sec.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main id="top">
        {/* Balanced Editorial Split-Screen Hero */}
        <section className="pt-12 pb-16 sm:pt-16 sm:pb-24">
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              {/* Left Typographic Hierarchy */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-7 flex flex-col justify-between py-2"
              >
                <div className="space-y-6">
                  <p className="text-sm font-medium text-[#E53935]">
                    {PROFILE.roles}
                  </p>

                  <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold tracking-tight leading-[1.06] text-[#F4F2EC] text-balance">
                    {PROFILE.headline}
                  </h1>

                  <p className="text-base sm:text-lg text-[#B8B6C0] leading-relaxed max-w-xl">
                    {PROFILE.lead}
                  </p>
                </div>

                <div className="pt-10 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (videos[0]) {
                        setSelectedVideo(videos[0]);
                      } else {
                        document
                          .getElementById('showreel')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap shrink-0"
                  >
                    <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                    Watch Showreel
                  </button>

                  <a
                    href="#studio"
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-white/14 bg-[#141418] hover:border-white/35 text-sm font-medium text-[#F4F2EC] transition-transform duration-150 hover:-translate-y-0.5 whitespace-nowrap shrink-0"
                  >
                    Explore 3D Desk
                    <ArrowDown className="w-4 h-4" aria-hidden="true" />
                  </a>

                  <a
                    href={PROFILE.cvPdfPath}
                    download="Bhuvi_Chauhan_CV.pdf"
                    className="inline-flex items-center gap-2 px-4 py-3.5 text-sm font-medium text-[#A6A4AE] hover:text-[#F4F2EC] transition-colors whitespace-nowrap shrink-0"
                  >
                    <FileDown className="w-4 h-4" aria-hidden="true" />
                    Download CV
                  </a>
                </div>
              </motion.div>

              {/* Right High-Quality Headshot Portrait Frame with Scroll-Linked Float */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ y: smoothHeroY }}
                transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-5"
              >
                <HeadshotPortraitFrame
                  portraitSrc={portraitSrc}
                  onUploadPortrait={handleUploadPortrait}
                  onResetPortrait={handleResetPortrait}
                  isCustomPortrait={isCustomPortrait}
                />
              </motion.div>
            </div>

            {/* Full-Width 4-Column Highlights Strip Below Hero Split */}
            <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {HERO_HIGHLIGHTS.map((item, idx) => (
                <ScrollReveal
                  key={item.value}
                  delay={idx * 0.05}
                  yOffset={16}
                  hoverLift
                  className="space-y-1 cursor-default"
                >
                  <p className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F4F2EC] tabular-nums font-[var(--font-display)]">
                    {item.value}
                  </p>
                  <p className="text-xs sm:text-sm text-[#8C8A94] leading-snug">
                    {item.label}
                  </p>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Subtle Editorial Marquee Divider Ribbon */}
        <div
          aria-hidden="true"
          className="border-y border-white/8 bg-[#101014] py-3.5 overflow-hidden select-none"
        >
          <div className="flex w-max animate-marquee gap-8 text-xs font-medium text-[#8C8A94]">
            {[...MARQUEE_PHRASES, ...MARQUEE_PHRASES].map((phrase, idx) => (
              <span key={idx} className="inline-flex items-center gap-8 whitespace-nowrap">
                <span>{phrase}</span>
                <span className="text-[#E53935]">·</span>
              </span>
            ))}
          </div>
        </div>

        {/* Interactive 3D Creator Studio Stage */}
        <section
          id="studio"
          className="py-20 sm:py-28"
          aria-labelledby="studio-heading"
        >
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
            <ScrollReveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
              <div className="max-w-2xl">
                <p className="text-xs font-medium text-[#E53935] mb-2">
                  01. Interactive 3D Creator Studio
                </p>
                <h2
                  id="studio-heading"
                  className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2EC] text-balance"
                >
                  Step inside the desk behind the voice, cuts, and live sets.
                </h2>
              </div>
              <p className="text-sm text-[#A6A4AE] max-w-sm leading-relaxed">
                Orbit freely in 3D, switch studio lighting moods, snap the clapperboard, or click the mic and editing rig.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.06} yOffset={24}>
              <CreatorStage3D
                activePreset={studioPreset}
                lightingMood={lightingMood}
                onPresetChange={setStudioPreset}
                onLightingMoodChange={setLightingMood}
                onJumpToGenre={handleJumpToGenre}
              />
            </ScrollReveal>
          </div>
        </section>

        {/* Published Video Showreel Section */}
        <ShowreelSection
          videos={videos}
          loading={loadingVideos}
          activeGenre={activeGenre}
          onGenreChange={setActiveGenre}
          onSelectVideo={setSelectedVideo}
        />

        {/* Interactive CV Experience, Genre Explorer & Skills */}
        <ExperienceAndSkills onSelectFormat={handleSelectFormat} />

        {/* Booking, Direct Contact & Official CV */}
        <ContactSection />
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-white/8 py-10">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8C8A94]">
          <p>
            © {new Date().getFullYear()} {PROFILE.name}. Content Creator · Video Editor · Stand-Up Comedian.
          </p>
          <div className="flex items-center gap-6">
            <a
              href={PROFILE.cvPdfPath}
              download="Bhuvi_Chauhan_CV.pdf"
              className="hover:text-[#F4F2EC] transition-colors"
            >
              Download CV
            </a>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                onOpenAdmin();
              }}
              className="hover:text-[#F4F2EC] transition-colors"
            >
              Admin
            </a>
            <a
              href="#top"
              className="hover:text-[#F4F2EC] transition-colors"
            >
              Back to top
            </a>
          </div>
        </div>
      </footer>

      {/* Seamless Lightbox Video Player */}
      <VideoPlayerModal
        video={selectedVideo}
        allVideos={videos}
        onClose={() => setSelectedVideo(null)}
        onSelectVideo={setSelectedVideo}
      />

      {/* Scroll-Reactive Floating Back-to-Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll back to top"
            className="fixed bottom-6 right-6 z-30 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#15151B]/95 border border-white/15 hover:border-[#E53935] hover:bg-[#E53935] text-[#F4F2EC] transition-colors shadow-lg"
          >
            <ArrowUp className="w-4 h-4" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export default function App() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (nextPath: string) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setPathname(nextPath);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <ErrorBoundary>
      {isAdminRoute(pathname) ? (
        <AdminDashboard onNavigateHome={() => navigate('/')} />
      ) : (
        <PortfolioApp onOpenAdmin={() => navigate('/admin')} />
      )}
    </ErrorBoundary>
  );
}
