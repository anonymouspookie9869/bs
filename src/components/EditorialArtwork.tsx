import React, { useRef, useState } from 'react';
import { Camera, RotateCcw, Upload } from 'lucide-react';
import { isSafePortraitSrc } from '../utils/videoSources';
import { InteractiveCard } from './InteractiveCard';

interface HeadshotPortraitProps {
  portraitSrc: string | null;
  onUploadPortrait: (dataUrl: string) => void;
  onResetPortrait: () => void;
  isCustomPortrait: boolean;
}

/**
 * High-quality editorial headshot frame for Bhuvi Chauhan on the landing page.
 * Supports dropping `/public/assets/portrait.jpg` for Vercel or uploading
 * a headshot directly in the browser with instant persistence and subtle 3D hover tilt.
 */
export function HeadshotPortraitFrame({
  portraitSrc,
  onUploadPortrait,
  onResetPortrait,
  isCustomPortrait,
}: HeadshotPortraitProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(file.type)) {
      setUploadError('Please select a JPG, PNG, or WebP portrait image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image must be under 8 MB for smooth browser performance.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && isSafePortraitSrc(reader.result)) {
        setImgFailed(false);
        onUploadPortrait(reader.result);
      } else {
        setUploadError('Unsupported image format. Please use JPG, PNG, or WebP.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const hasVisibleImage = Boolean(isSafePortraitSrc(portraitSrc) && !imgFailed);

  return (
    <InteractiveCard
      maxTilt={3.5}
      className="w-full h-full min-h-[420px] lg:min-h-[520px] rounded-2xl overflow-hidden border border-white/10 hover:border-white/24 transition-colors bg-[#131317] group"
    >
      {hasVisibleImage ? (
        <img
          src={portraitSrc!}
          alt="Bhuvi Chauhan — Editorial Studio Headshot"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div className="relative w-full h-full flex flex-col justify-between p-6 sm:p-8 bg-[#121216]">
          <svg
            viewBox="0 0 480 600"
            className="absolute inset-0 w-full h-full object-cover"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="studioKeyLight" cx="50%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#E53935" stopOpacity="0.22" />
                <stop offset="45%" stopColor="#26242C" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0E0E12" stopOpacity="1" />
              </radialGradient>
              <linearGradient id="rimStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F4F2EC" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#E53935" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#F4F2EC" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect width="480" height="600" fill="#101014" />
            <rect width="480" height="600" fill="url(#studioKeyLight)" />

            <rect
              x="26"
              y="26"
              width="428"
              height="548"
              rx="14"
              fill="none"
              stroke="#F4F2EC"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            <circle
              cx="240"
              cy="228"
              r="116"
              fill="none"
              stroke="url(#rimStroke)"
              strokeWidth="1.25"
            />

            <g transform="translate(240, 232)">
              <circle
                cx="0"
                cy="-26"
                r="50"
                fill="#1B1A20"
                stroke="#F4F2EC"
                strokeOpacity="0.22"
                strokeWidth="1.4"
              />
              <path
                d="M -98 134 C -94 64, -52 38, 0 38 C 52 38, 94 64, 98 134"
                fill="#18171D"
                stroke="#F4F2EC"
                strokeOpacity="0.22"
                strokeWidth="1.4"
              />
              <text
                x="0"
                y="-15"
                textAnchor="middle"
                fill="#F4F2EC"
                fillOpacity="0.86"
                fontFamily="Bricolage Grotesque, sans-serif"
                fontSize="30"
                fontWeight="600"
                letterSpacing="2"
              >
                BC
              </text>
            </g>

            <g stroke="#F4F2EC" strokeOpacity="0.25" strokeWidth="1.2">
              <line x1="226" y1="100" x2="254" y2="100" />
              <line x1="240" y1="86" x2="240" y2="114" />
            </g>
          </svg>

          <div className="relative z-10 flex items-center justify-between text-xs text-[#A6A4AE]">
            <span>Studio Portrait</span>
            <span className="font-mono tabular-nums text-[#8C8A94]">3:4 Frame</span>
          </div>

          <div className="relative z-10 mt-auto pb-20 sm:pb-22">
            <p className="text-sm font-medium text-[#F4F2EC] mb-1">
              Ready for Bhuvi’s Headshot
            </p>
            <p className="text-xs text-[#A6A4AE] leading-relaxed max-w-[260px]">
              Upload her high-resolution photo below, or commit{' '}
              <code className="font-mono text-[#F4F2EC]/90">public/assets/portrait.jpg</code>{' '}
              to GitHub for Vercel.
            </p>
          </div>
        </div>
      )}

      {/* Subtle bottom scrim for readable action controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

      {/* Caption & Headshot Swap Controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#F4F2EC] truncate">Bhuvi Chauhan</p>
          <p className="text-xs text-[#D0CEC8] truncate">
            Voiceover · Editing · Stand-Up
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCustomPortrait && (
            <button
              type="button"
              onClick={onResetPortrait}
              aria-label="Reset headshot portrait"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-black/75 border border-white/15 text-[#F4F2EC] hover:border-white/35 transition-colors"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#18181D]/90 hover:bg-[#E53935] border border-white/15 hover:border-[#E53935] text-xs font-medium text-[#F4F2EC] transition-colors whitespace-nowrap shrink-0"
          >
            {hasVisibleImage ? (
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {hasVisibleImage ? 'Swap Photo' : 'Upload Headshot'}
          </button>
        </div>
      </div>

      {uploadError && (
        <div
          role="alert"
          className="absolute top-4 inset-x-4 z-30 rounded-lg bg-[#2A1114] border border-[#E53935]/50 px-3.5 py-2 text-xs text-[#FCA5A5]"
        >
          {uploadError}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        aria-label="Upload headshot image"
        className="hidden"
      />
    </InteractiveCard>
  );
}
