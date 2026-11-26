import type {
  ContactFormValues,
  ContactValidationResult,
  VideoGenre,
  VideoWork,
} from '../types/portfolio';

export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'];
export const VERCEL_RECOMMENDED_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MiB recommended per-file static size for fast Vercel CDN delivery

export interface VideoWebReadiness {
  status: 'ready' | 'warning';
  issues: string[];
  exceedsRecommendedStaticLimit: boolean;
  needsTranscode: boolean;
  ffmpegCommand: string;
}

export function isSupportedVideoFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return SUPPORTED_VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function getVideoMimeType(fileNameOrUrl: string, fallbackType?: string): string {
  if (fallbackType && fallbackType.startsWith('video/')) {
    return fallbackType;
  }
  const clean = fileNameOrUrl.split(/[?#]/)[0].toLowerCase();
  if (clean.endsWith('.webm')) return 'video/webm';
  if (clean.endsWith('.mov')) return 'video/quicktime';
  return 'video/mp4';
}

export function encodeVideoAssetPath(fileName: string): string {
  const trimmed = fileName.trim().replace(/^\/+/, '');
  return `/assets/videos/${encodeURIComponent(trimmed)}`;
}

/**
 * Normalizes and validates a video playback URL so filenames with spaces or special
 * characters play reliably across browsers while strictly blocking unsafe schemes
 * (javascript:, data:, vbscript:, file:, protocol-relative //).
 */
export function normalizeVideoPlaybackUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Block protocol-relative URLs and control characters
  if (trimmed.startsWith('//') || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return '';
  }

  // Allow browser-local blob URLs created from user uploads
  if (trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Explicitly allow only https: (or http: for localhost dev)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:') {
        return parsed.href;
      }
      if (
        parsed.protocol === 'http:' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
      ) {
        return parsed.href;
      }
      return '';
    } catch {
      return '';
    }
  }

  // Only allow safe root-relative /assets/ paths (blocking path traversal ..)
  if (!trimmed.startsWith('/assets/')) {
    return '';
  }

  const match = trimmed.match(/^([^?#]+)(.*)$/);
  const basePath = match ? match[1] : trimmed;
  const suffix = match ? match[2] : '';

  const segments = basePath.split('/');
  if (segments.some((seg) => seg === '..')) {
    return '';
  }

  const encodedPath = segments
    .map((segment) => {
      if (!segment) return '';
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');

  return `${encodedPath}${suffix}`;
}

export function isValidPublicVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('//') || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return false;
  }
  if (trimmed.startsWith('/assets/videos/') && !trimmed.includes('..')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafePortraitSrc(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes('..')) return false;
  if (trimmed.startsWith('/assets/')) return true;
  return /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed);
}

export const ALLOWED_VIDEO_GENRES = [
  'Horror',
  'Comedy',
  'Gaming',
  'Vlogs & Events',
] as const;

export type PublishedVideoGenre = (typeof ALLOWED_VIDEO_GENRES)[number];

export function isValidVideoGenre(value: string): value is PublishedVideoGenre {
  return (ALLOWED_VIDEO_GENRES as readonly string[]).includes(value);
}

export function isValidPublicPosterUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true; // Optional poster URL
  if (trimmed.startsWith('//') || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return false;
  }
  if (trimmed.startsWith('/assets/') && !trimmed.includes('..')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface PublishVideoFormValues {
  title: string;
  genre: string;
  role: string;
  duration: string;
  year: string;
  summary: string;
  videoUrl: string;
  posterUrl?: string;
}

export function validatePublishedVideoInput(values: PublishVideoFormValues): {
  valid: boolean;
  errors: Partial<Record<keyof PublishVideoFormValues, string>>;
} {
  const errors: Partial<Record<keyof PublishVideoFormValues, string>> = {};

  const title = values.title.trim();
  if (title.length < 2 || title.length > 120) {
    errors.title = 'Enter a video title (2–120 characters).';
  }

  if (!isValidVideoGenre(values.genre.trim())) {
    errors.genre = 'Choose a valid genre (Horror, Comedy, Gaming, or Vlogs & Events).';
  }

  const role = values.role.trim();
  if (role.length < 2 || role.length > 100) {
    errors.role = 'Enter a role or credit (2–100 characters).';
  }

  const duration = values.duration.trim();
  if (duration.length > 20) {
    errors.duration = 'Duration must be 20 characters or less (e.g. 01:45).';
  }

  const year = values.year.trim();
  if (year && !/^\d{4}$/.test(year)) {
    errors.year = 'Enter a 4-digit year (e.g. 2026).';
  }

  const summary = values.summary.trim();
  if (summary.length < 6 || summary.length > 500) {
    errors.summary = 'Enter a short description (6–500 characters).';
  }

  const videoUrl = values.videoUrl.trim();
  if (!videoUrl || videoUrl.length > 2000 || !isValidPublicVideoUrl(videoUrl)) {
    errors.videoUrl =
      'Enter a direct HTTPS video URL (e.g. Vercel Blob .mp4/.webm) or /assets/videos/your-reel.mp4.';
  }

  const posterUrl = (values.posterUrl || '').trim();
  if (posterUrl && (posterUrl.length > 2000 || !isValidPublicPosterUrl(posterUrl))) {
    errors.posterUrl =
      'Poster URL must be an HTTPS image URL or a /assets/... path.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateLocalVideoFile(file: {
  name: string;
  type: string;
  size: number;
}): { valid: boolean; error?: string } {
  const hasValidType = file.type.startsWith('video/');
  const hasValidExt = isSupportedVideoFileName(file.name);

  if (!hasValidType && !hasValidExt) {
    return {
      valid: false,
      error: `Unsupported file "${file.name}". Please upload an MP4, WebM, MOV, or M4V video.`,
    };
  }

  // Soft cap at 250 MB so browser IndexedDB/memory stays responsive
  if (file.size > 250 * 1024 * 1024) {
    return {
      valid: false,
      error: `"${file.name}" exceeds 250 MB. Compress the clip for fast web playback.`,
    };
  }

  return { valid: true };
}

/**
 * Checks whether a video will play reliably for everyone on the live internet
 * across iOS Safari, Android Chrome, and desktop browsers when hosted on Vercel.
 */
export function assessVideoWebReadiness(input: {
  name: string;
  type?: string;
  size?: number;
  publicVideoUrl?: string;
}): VideoWebReadiness {
  const issues: string[] = [];
  const lower = input.name.toLowerCase();
  const hasPublicOverride = Boolean(
    input.publicVideoUrl && isValidPublicVideoUrl(input.publicVideoUrl),
  );
  const needsTranscode =
    lower.endsWith('.mov') || input.type === 'video/quicktime';
  const exceedsRecommendedStaticLimit =
    !hasPublicOverride &&
    typeof input.size === 'number' &&
    input.size > VERCEL_RECOMMENDED_VIDEO_BYTES;

  if (needsTranscode) {
    issues.push(
      'MOV files often fail on Android Chrome and Windows browsers. Convert to H.264 MP4 before deploying on Vercel.',
    );
  }

  if (exceedsRecommendedStaticLimit) {
    issues.push(
      `Large static clip (${formatFileSize(input.size || 0)}). For fast global playback on Vercel, compress under 25 MB or link a Vercel Blob / HTTPS CDN URL.`,
    );
  }

  const baseName = input.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-');
  const safeOutName = `${baseName || 'reel'}-web.mp4`;
  const ffmpegCommand = `ffmpeg -i "${input.name}" -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart -c:a aac -b:a 128k "${safeOutName}"`;

  return {
    status: issues.length === 0 ? 'ready' : 'warning',
    issues,
    exceedsRecommendedStaticLimit,
    needsTranscode,
    ffmpegCommand,
  };
}

/**
 * Maps native HTMLMediaElement error codes into clear visitor-friendly messages.
 */
export function getMediaErrorMessage(errorCode?: number): string {
  switch (errorCode) {
    case 1:
      return 'Video loading was interrupted. Tap Retry to resume playback.';
    case 2:
      return 'Network hiccup while streaming this video. Check your connection and tap Retry.';
    case 3:
      return 'This browser could not decode the video stream. Try opening the direct video file or use an H.264 MP4 export.';
    case 4:
      return 'This video file could not be reached or uses an unsupported format. Ensure the H.264 MP4 file is published in public/assets/videos/.';
    default:
      return 'Could not start playback on this device. Tap Retry or open the video directly.';
  }
}

/**
 * Converts a filename like "valorant_clutch_edit_01.mp4" into "Valorant Clutch Edit 01".
 */
export function formatTitleFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, '');
  const cleaned = withoutExt.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Untitled Reel';
  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Infers a portfolio genre from a video filename or title.
 */
export function inferGenreFromName(name: string): Exclude<VideoGenre, 'All'> {
  const lower = name.toLowerCase();
  if (/(horror|ghost|scary|creep|haunt|nightmare|thriller|dark)/.test(lower)) {
    return 'Horror';
  }
  if (/(comedy|standup|stand-up|funny|joke|roast|laugh|skit|mic)/.test(lower)) {
    return 'Comedy';
  }
  if (/(valorant|minecraft|gaming|game|stream|clutch|montage|fps|edit)/.test(lower)) {
    return 'Gaming';
  }
  return 'Vlogs & Events';
}

export function genreToArtworkTheme(
  genre: Exclude<VideoGenre, 'All'>,
): VideoWork['artworkTheme'] {
  switch (genre) {
    case 'Horror':
      return 'horror';
    case 'Comedy':
      return 'comedy';
    case 'Gaming':
      return 'gaming';
    case 'Vlogs & Events':
      return 'events';
  }
}

export function filterVideosByGenre(
  videos: VideoWork[],
  genre: VideoGenre,
): VideoWork[] {
  if (genre === 'All') return videos;
  return videos.filter((video) => video.genre === genre);
}

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Local Clip';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${Math.round(kb)} KB`;
}

export function isValidContactNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 30) return false;
  if (!/^[+\d()\s.-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function validateContactForm(
  values: ContactFormValues,
): ContactValidationResult {
  const errors: Partial<Record<keyof ContactFormValues, string>> = {};

  if (!values.name.trim() || values.name.trim().length < 2) {
    errors.name = 'Please enter your name (at least 2 characters).';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!values.email.trim() || !emailRegex.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!isValidContactNumber(values.contactNumber)) {
    errors.contactNumber = 'Please enter a valid contact number (7–15 digits).';
  }

  if (!values.projectType.trim()) {
    errors.projectType = 'Please choose a collaboration or inquiry type.';
  }

  if (!values.message.trim() || values.message.trim().length < 10) {
    errors.message = 'Please share a brief note (at least 10 characters).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function sanitizeCsvCell(value: string): string {
  const str = String(value ?? '');
  const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function buildInquiriesCsv(
  records: Array<{
    id: number;
    name: string;
    email: string;
    contactNumber: string;
    projectType: string;
    message: string;
    status: string;
    createdAt: string;
  }>,
): string {
  const header = [
    'ID',
    'Name',
    'Email',
    'Contact Number',
    'Collaboration Type',
    'Status',
    'Project Details',
    'Submitted At',
  ];

  const rows = records.map((r) =>
    [
      String(r.id),
      r.name,
      r.email,
      r.contactNumber,
      r.projectType,
      r.status,
      r.message,
      r.createdAt,
    ]
      .map(sanitizeCsvCell)
      .join(','),
  );

  return [header.map(sanitizeCsvCell).join(','), ...rows].join('\n');
}

export function buildStaticManifestJson(videos: VideoWork[]): string {
  const exportable = videos.map((v) => {
    const resolvedUrl =
      v.publicVideoUrl && isValidPublicVideoUrl(v.publicVideoUrl)
        ? v.publicVideoUrl.trim()
        : v.sourceKind === 'local-upload' && v.fileName
          ? encodeVideoAssetPath(v.fileName)
          : normalizeVideoPlaybackUrl(v.videoUrl);

    return {
      id: v.id,
      title: v.title,
      genre: v.genre,
      role: v.role,
      duration: v.duration,
      year: v.year,
      summary: v.summary,
      sourceKind: 'manifest' as const,
      videoUrl: resolvedUrl,
      mimeType: getVideoMimeType(v.fileName || resolvedUrl, v.mimeType),
      ...(v.posterUrl && !v.posterUrl.startsWith('blob:')
        ? { posterUrl: v.posterUrl }
        : {}),
      ...(v.width && v.height ? { width: v.width, height: v.height } : {}),
      artworkTheme: v.artworkTheme,
      featured: Boolean(v.featured),
    };
  });

  return JSON.stringify(
    {
      folderPath: 'public/assets/videos',
      videos: exportable,
    },
    null,
    2,
  );
}
