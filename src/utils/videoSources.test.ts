import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessVideoWebReadiness,
  buildInquiriesCsv,
  buildStaticManifestJson,
  encodeVideoAssetPath,
  filterVideosByGenre,
  formatFileSize,
  formatTimecode,
  formatTitleFromFileName,
  getMediaErrorMessage,
  getVideoMimeType,
  inferGenreFromName,
  isSafePortraitSrc,
  isSupportedVideoFileName,
  isValidContactNumber,
  isValidPublicPosterUrl,
  isValidPublicVideoUrl,
  isValidVideoGenre,
  normalizeVideoPlaybackUrl,
  sanitizeCsvCell,
  validateContactForm,
  validateLocalVideoFile,
  validatePublishedVideoInput,
  VERCEL_RECOMMENDED_VIDEO_BYTES,
} from './videoSources.ts';
import type { VideoWork } from '../types/portfolio.ts';

test('isSupportedVideoFileName and validateLocalVideoFile validate local uploads', () => {
  assert.equal(isSupportedVideoFileName('valorant-edit.mp4'), true);
  assert.equal(isSupportedVideoFileName('standup_set.MOV'), true);
  assert.equal(isSupportedVideoFileName('vlog.webm'), true);
  assert.equal(isSupportedVideoFileName('resume.pdf'), false);

  assert.equal(
    validateLocalVideoFile({ name: 'clip.mp4', type: 'video/mp4', size: 1024 * 1024 }).valid,
    true,
  );
  assert.equal(
    validateLocalVideoFile({ name: 'notes.txt', type: 'text/plain', size: 120 }).valid,
    false,
  );
  assert.equal(
    validateLocalVideoFile({ name: 'huge.mp4', type: 'video/mp4', size: 300 * 1024 * 1024 }).valid,
    false,
  );
});

test('formatTitleFromFileName and inferGenreFromName handle messy names', () => {
  assert.equal(formatTitleFromFileName('late_night-horror_story.mp4'), 'Late Night Horror Story');
  assert.equal(formatTitleFromFileName('   .mp4'), 'Untitled Reel');
  assert.equal(inferGenreFromName('midnight-ghost-story.mp4'), 'Horror');
  assert.equal(inferGenreFromName('standup_roast_clip.mp4'), 'Comedy');
  assert.equal(inferGenreFromName('valorant-clutch-montage.mp4'), 'Gaming');
  assert.equal(inferGenreFromName('delhi-street-food-vlog.mp4'), 'Vlogs & Events');
});

test('URL encoding, MIME detection, and public video URL validation work across edge cases', () => {
  assert.equal(getVideoMimeType('clip.mp4'), 'video/mp4');
  assert.equal(getVideoMimeType('clip.webm?v=2'), 'video/webm');
  assert.equal(getVideoMimeType('iphone-clip.MOV'), 'video/quicktime');

  assert.equal(
    encodeVideoAssetPath('Stand Up Clip (Live) #1.mp4'),
    '/assets/videos/Stand%20Up%20Clip%20(Live)%20%231.mp4',
  );

  assert.equal(
    normalizeVideoPlaybackUrl('/assets/videos/Valorant Edit Final.mp4'),
    '/assets/videos/Valorant%20Edit%20Final.mp4',
  );
  assert.equal(
    normalizeVideoPlaybackUrl('/assets/videos/Valorant%20Edit%20Final.mp4'),
    '/assets/videos/Valorant%20Edit%20Final.mp4',
  );
  assert.equal(
    normalizeVideoPlaybackUrl('blob:http://localhost:3000/abc-123'),
    'blob:http://localhost:3000/abc-123',
  );

  assert.equal(isValidPublicVideoUrl('https://demo.public.blob.vercel-storage.com/reel.mp4'), true);
  assert.equal(isValidPublicVideoUrl('/assets/videos/reel.mp4'), true);
  assert.equal(isValidPublicVideoUrl('/assets/videos/../secret.txt'), false);
  assert.equal(isValidPublicVideoUrl('http://insecure.example.com/reel.mp4'), false);
  assert.equal(isValidPublicVideoUrl('javascript:alert(1)'), false);
  assert.equal(isValidPublicVideoUrl('not a url'), false);

  // Security: block unsafe schemes, protocol-relative URLs, and path traversal
  assert.equal(normalizeVideoPlaybackUrl('javascript:alert(1)'), '');
  assert.equal(normalizeVideoPlaybackUrl('vbscript:msgbox(1)'), '');
  assert.equal(normalizeVideoPlaybackUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(normalizeVideoPlaybackUrl('//evil.example/payload.mp4'), '');
  assert.equal(normalizeVideoPlaybackUrl('/assets/videos/../../etc/passwd'), '');
  assert.equal(normalizeVideoPlaybackUrl('/other/path.mp4'), '');

  // Security: portrait source accepts only /assets/ or safe raster data URLs (blocks SVG XSS)
  assert.equal(isSafePortraitSrc('/assets/portrait.jpg'), true);
  assert.equal(isSafePortraitSrc('data:image/jpeg;base64,/9j/4AAQ'), true);
  assert.equal(isSafePortraitSrc('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(isSafePortraitSrc('javascript:alert(1)'), false);
  assert.equal(isSafePortraitSrc('/assets/../secret.jpg'), false);
});

test('assessVideoWebReadiness detects Vercel 25MB static recommendation and MOV compatibility risks', () => {
  const ready = assessVideoWebReadiness({
    name: 'horror-story.mp4',
    type: 'video/mp4',
    size: 12 * 1024 * 1024,
  });
  assert.equal(ready.status, 'ready');
  assert.equal(ready.issues.length, 0);
  assert.equal(ready.exceedsRecommendedStaticLimit, false);
  assert.equal(ready.needsTranscode, false);

  const movAndLarge = assessVideoWebReadiness({
    name: 'Standup Clip.mov',
    type: 'video/quicktime',
    size: VERCEL_RECOMMENDED_VIDEO_BYTES + 2 * 1024 * 1024,
  });
  assert.equal(movAndLarge.status, 'warning');
  assert.equal(movAndLarge.needsTranscode, true);
  assert.equal(movAndLarge.exceedsRecommendedStaticLimit, true);
  assert.equal(movAndLarge.issues.length, 2);
  assert.ok(movAndLarge.ffmpegCommand.includes('-movflags +faststart'));

  // Vercel Blob / HTTPS CDN URL clears the static size recommendation warning
  const cdnOverride = assessVideoWebReadiness({
    name: 'big-montage.mp4',
    type: 'video/mp4',
    size: 48 * 1024 * 1024,
    publicVideoUrl: 'https://demo.public.blob.vercel-storage.com/big-montage.mp4',
  });
  assert.equal(cdnOverride.status, 'ready');
  assert.equal(cdnOverride.exceedsRecommendedStaticLimit, false);
});

test('getMediaErrorMessage maps HTMLMediaElement error codes cleanly', () => {
  assert.match(getMediaErrorMessage(2), /Network/i);
  assert.match(getMediaErrorMessage(3), /decode/i);
  assert.match(getMediaErrorMessage(4), /unsupported|reached/i);
  assert.match(getMediaErrorMessage(undefined), /Retry/i);
});

test('filterVideosByGenre, formatTimecode, and formatFileSize work deterministically', () => {
  const sample: VideoWork[] = [
    {
      id: '1',
      title: 'A',
      genre: 'Horror',
      role: 'VO',
      duration: '01:00',
      year: '2026',
      summary: 's',
      sourceKind: 'local-upload',
      videoUrl: 'blob:1',
      artworkTheme: 'horror',
    },
    {
      id: '2',
      title: 'B',
      genre: 'Gaming',
      role: 'Editor',
      duration: '02:00',
      year: '2026',
      summary: 's',
      sourceKind: 'local-upload',
      videoUrl: 'blob:2',
      artworkTheme: 'gaming',
    },
  ];
  assert.equal(filterVideosByGenre(sample, 'All').length, 2);
  assert.equal(filterVideosByGenre(sample, 'Horror').length, 1);
  assert.equal(formatTimecode(125), '02:05');
  assert.equal(formatTimecode(-5), '00:00');
  assert.equal(formatFileSize(5 * 1024 * 1024), '5.0 MB');
  assert.equal(formatFileSize(512 * 1024), '512 KB');
});

test('validateContactForm catches invalid input including contactNumber and accepts valid inquiries', () => {
  assert.equal(isValidContactNumber('+91 98765 43210'), true);
  assert.equal(isValidContactNumber('(555) 123-4567'), true);
  assert.equal(isValidContactNumber('12345'), false);
  assert.equal(isValidContactNumber('abc-123-4567'), false);

  const bad = validateContactForm({
    name: 'A',
    email: 'invalid-email',
    contactNumber: '123',
    projectType: '',
    message: 'short',
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.name);
  assert.ok(bad.errors.email);
  assert.ok(bad.errors.contactNumber);
  assert.ok(bad.errors.projectType);
  assert.ok(bad.errors.message);

  const ok = validateContactForm({
    name: 'Riya Verma',
    email: 'riya@agency.in',
    contactNumber: '+91 98765 43210',
    projectType: 'Voiceover & Horror Narration',
    message: 'Would love to collaborate on a 5-episode horror voiceover mini-series.',
  });
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.errors, {});
});

test('sanitizeCsvCell and buildInquiriesCsv neutralize spreadsheet formulas and quote commas', () => {
  assert.equal(sanitizeCsvCell('=HYPERLINK("http://evil")'), '"\'=HYPERLINK(""http://evil"")"');
  assert.equal(sanitizeCsvCell('+91 98765 43210'), '"\'+91 98765 43210"');
  assert.equal(sanitizeCsvCell('Normal, Name'), '"Normal, Name"');

  const csv = buildInquiriesCsv([
    {
      id: 7,
      name: 'Riya Verma',
      email: 'riya@agency.in',
      contactNumber: '+91 98765 43210',
      projectType: 'Stand-Up Comedy',
      message: 'Need a 20-min set, Delhi',
      status: 'new',
      createdAt: '2026-11-25T10:00:00.000Z',
    },
  ]);
  assert.ok(csv.includes('"Contact Number"'));
  assert.ok(csv.includes('"\'+91 98765 43210"'));
  assert.ok(csv.includes('"Need a 20-min set, Delhi"'));
});

test('buildStaticManifestJson encodes local filenames and respects publicVideoUrl overrides', () => {
  const json = buildStaticManifestJson([
    {
      id: 'local-1',
      title: 'Comedy Clip',
      genre: 'Comedy',
      role: 'Stand-Up Comedian',
      duration: '01:12',
      year: '2026',
      summary: 'Live clip',
      sourceKind: 'local-upload',
      videoUrl: 'blob:http://localhost:3000/123',
      fileName: 'Stand Up Clip.mp4',
      artworkTheme: 'comedy',
      featured: true,
    },
    {
      id: 'local-2',
      title: 'Full Vlog',
      genre: 'Vlogs & Events',
      role: 'Creator',
      duration: '06:40',
      year: '2026',
      summary: 'Long vlog on Vercel Blob',
      sourceKind: 'local-upload',
      videoUrl: 'blob:http://localhost:3000/456',
      fileName: 'delhi-vlog.mp4',
      publicVideoUrl: 'https://demo.public.blob.vercel-storage.com/delhi-vlog.mp4',
      artworkTheme: 'events',
      featured: false,
    },
  ]);

  const parsed = JSON.parse(json);
  assert.equal(parsed.folderPath, 'public/assets/videos');
  assert.equal(parsed.videos[0].sourceKind, 'manifest');
  assert.equal(parsed.videos[0].videoUrl, '/assets/videos/Stand%20Up%20Clip.mp4');
  assert.equal(parsed.videos[0].mimeType, 'video/mp4');
  assert.equal(parsed.videos[1].videoUrl, 'https://demo.public.blob.vercel-storage.com/delhi-vlog.mp4');
});

test('validatePublishedVideoInput enforces safe video/poster URLs and genre allowlist', () => {
  assert.equal(isValidVideoGenre('Horror'), true);
  assert.equal(isValidVideoGenre('All'), false);
  assert.equal(isValidVideoGenre('Invalid'), false);

  assert.equal(isValidPublicPosterUrl(''), true);
  assert.equal(isValidPublicPosterUrl('/assets/videos/thumb.jpg'), true);
  assert.equal(isValidPublicPosterUrl('https://cdn.example.com/thumb.webp'), true);
  assert.equal(isValidPublicPosterUrl('javascript:alert(1)'), false);
  assert.equal(isValidPublicPosterUrl('/assets/../secret.jpg'), false);
  assert.equal(isValidPublicPosterUrl('http://insecure.example.com/a.jpg'), false);

  const invalid = validatePublishedVideoInput({
    title: 'A',
    genre: 'Unknown',
    role: 'X',
    duration: '01:00',
    year: '26',
    summary: 'short',
    videoUrl: 'javascript:alert(1)',
    posterUrl: 'data:text/html,<script>',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.genre);
  assert.ok(invalid.errors.role);
  assert.ok(invalid.errors.year);
  assert.ok(invalid.errors.summary);
  assert.ok(invalid.errors.videoUrl);
  assert.ok(invalid.errors.posterUrl);

  const valid = validatePublishedVideoInput({
    title: 'Midnight Corridor — Horror Voiceover',
    genre: 'Horror',
    role: 'Voiceover Artist & Editor',
    duration: '01:45',
    year: '2026',
    summary: 'Atmospheric late-night horror storytelling cut with custom foley.',
    videoUrl: 'https://demo.public.blob.vercel-storage.com/midnight-corridor.mp4',
    posterUrl: '/assets/videos/midnight-thumb.jpg',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});
