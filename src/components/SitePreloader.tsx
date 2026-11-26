import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PROFILE } from '../data/portfolioData';

interface SitePreloaderProps {
  onComplete?: () => void;
}

/**
 * Fast, studio-grade cinema slate preloader with smooth curtain reveal.
 * Skips immediately when `?autostart=1` is present or when reduced motion is preferred.
 */
export function SitePreloader({ onComplete }: SitePreloaderProps) {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible) {
      onComplete?.();
      return;
    }

    let rafId = 0;
    const start = performance.now();
    const duration = 760;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // Cubic ease-out sweep
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => {
          setVisible(false);
          onComplete?.();
        }, 140);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [visible, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="site-preloader"
          data-testid="site-preloader"
          initial={{ y: 0, opacity: 1 }}
          exit={{
            y: '-100%',
            transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed inset-0 z-[100] bg-[#09090B] flex flex-col justify-between p-6 sm:p-12 select-none"
        >
          {/* Top Slate Row */}
          <div className="flex items-center justify-between text-xs text-[#8C8A94]">
            <span>{PROFILE.name}</span>
            <span className="font-mono tabular-nums">24 FPS · PORTFOLIO REEL</span>
          </div>

          {/* Center Editorial Reveal */}
          <div className="max-w-xl mx-auto w-full space-y-6 text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-xs font-medium text-[#E53935]"
            >
              {PROFILE.roles}
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.06, ease: 'easeOut' }}
              className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#F4F2EC] font-[var(--font-display)]"
            >
              {PROFILE.name}
            </motion.h2>

            {/* Cinema Progress Track */}
            <div className="max-w-xs mx-auto pt-2 space-y-2">
              <div className="h-[2px] w-full bg-white/12 overflow-hidden rounded-full">
                <div
                  className="h-full bg-[#E53935] origin-left transition-transform duration-75"
                  style={{ transform: `scaleX(${progress / 100})` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-[#8C8A94]">
                <span>Loading Studio</span>
                <span>{String(progress).padStart(3, '0')}%</span>
              </div>
            </div>
          </div>

          {/* Bottom Hairline */}
          <div className="flex items-center justify-between text-[11px] text-[#666470]">
            <span>Horror · Comedy · Gaming · Vlogs</span>
            <button
              type="button"
              onClick={() => {
                setVisible(false);
                onComplete?.();
              }}
              className="text-[#A6A4AE] hover:text-[#F4F2EC] transition-colors"
            >
              Skip
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
