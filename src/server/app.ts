import express, { type NextFunction, type Request, type Response } from 'express';
import {
  createInquiry,
  deleteInquiry,
  isValidInquiryStatus,
  listInquiries,
  updateInquiryStatus,
} from '../db/inquiries.ts';
import {
  createPublishedVideo,
  deletePublishedVideo,
  listPublishedVideos,
  updatePublishedVideoFeatured,
} from '../db/videos.ts';
import type { VideoRow } from '../db/schema.ts';
import {
  requireAdmin,
  requireAuth,
  type AuthRequest,
} from '../middleware/auth.ts';
import {
  genreToArtworkTheme,
  getVideoMimeType,
  isValidPublicPosterUrl,
  isValidVideoGenre,
  normalizeVideoPlaybackUrl,
  validateContactForm,
  validatePublishedVideoInput,
} from '../utils/videoSources.ts';

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_REQUESTS = 15;
const MAX_RATE_BUCKETS = 2000;

// Bounded in-memory sliding-window rate limiter per client IP
const inquiryRateBuckets = new Map<string, number[]>();

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();

  if (inquiryRateBuckets.size > MAX_RATE_BUCKETS) {
    for (const [key, list] of inquiryRateBuckets.entries()) {
      const fresh = list.filter((ts) => now - ts < RATE_WINDOW_MS);
      if (fresh.length === 0) {
        inquiryRateBuckets.delete(key);
      } else {
        inquiryRateBuckets.set(key, fresh);
      }
    }
  }

  const timestamps = (inquiryRateBuckets.get(clientKey) || []).filter(
    (ts) => now - ts < RATE_WINDOW_MS,
  );
  if (timestamps.length >= RATE_MAX_REQUESTS) {
    inquiryRateBuckets.set(clientKey, timestamps);
    return true;
  }
  timestamps.push(now);
  inquiryRateBuckets.set(clientKey, timestamps);
  return false;
}

function parsePositiveId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function stripUnsafeControlChars(input: string, preserveNewlines = false): string {
  const pattern = preserveNewlines
    ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
    : /[\u0000-\u001F\u007F]/g;
  return input.replace(pattern, '').trim();
}

function serializePublishedVideo(row: VideoRow) {
  const safeVideoUrl = normalizeVideoPlaybackUrl(row.videoUrl);
  const safePosterUrl =
    row.posterUrl && isValidPublicPosterUrl(row.posterUrl)
      ? row.posterUrl.trim()
      : undefined;
  const genre = isValidVideoGenre(row.genre) ? row.genre : 'Vlogs & Events';

  return {
    id: `db-${row.id}`,
    dbId: row.id,
    title: row.title,
    genre,
    role: row.role,
    duration: row.duration,
    year: row.year,
    summary: row.summary,
    sourceKind: 'published' as const,
    videoUrl: safeVideoUrl,
    ...(safePosterUrl ? { posterUrl: safePosterUrl } : {}),
    mimeType: getVideoMimeType(safeVideoUrl, row.mimeType),
    artworkTheme: genreToArtworkTheme(genre),
    featured: Boolean(row.featured),
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.getTime()
        : new Date(row.createdAt).getTime(),
  };
}

function isSameOriginHeader(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;

  const allowedHosts = new Set<string>();
  const addHost = (raw: string | undefined) => {
    if (!raw) return;
    const first = raw.split(',')[0].trim().toLowerCase();
    if (first) allowedHosts.add(first);
  };

  const forwardedHost = req.headers['x-forwarded-host'];
  addHost(Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost);
  addHost(req.headers.host);

  for (const envUrl of [process.env.APP_URL, process.env.VERCEL_URL]) {
    if (!envUrl) continue;
    try {
      const normalized = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
      allowedHosts.add(new URL(normalized).host.toLowerCase());
    } catch {
      // Ignore invalid env URL
    }
  }

  if (allowedHosts.size === 0) return false;

  try {
    const parsedOrigin = new URL(origin);
    return allowedHosts.has(parsedOrigin.host.toLowerCase());
  } catch {
    return false;
  }
}

export function applySecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }

  next();
}

export function createApiRouter() {
  const router = express.Router();

  // Strictly prevent caching of any API payload (zero PII leakage in CDN/edge/browser caches)
  router.use((req, res, next) => {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Vary', 'Authorization, Origin');

    // Enforce same-origin when Origin header is present (zero wildcard CORS on API)
    if (!isSameOriginHeader(req)) {
      res.status(403).json({ error: 'Cross-origin API requests are not permitted.' });
      return;
    }

    // Require JSON content-type on state-changing API requests
    if (
      (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') &&
      !req.is('application/json')
    ) {
      res.status(415).json({ error: 'Content-Type must be application/json.' });
      return;
    }

    next();
  });

  // Public inquiry submission endpoint (strictly validated & rate-limited)
  router.post('/inquiries', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (isRateLimited(clientIp)) {
      res.status(429).json({
        error:
          'Too many inquiries submitted recently. Please wait a few minutes and try again.',
      });
      return;
    }

    const body = req.body ?? {};
    const payload = {
      name:
        typeof body.name === 'string'
          ? stripUnsafeControlChars(body.name)
          : '',
      email:
        typeof body.email === 'string'
          ? stripUnsafeControlChars(body.email)
          : '',
      contactNumber:
        typeof body.contactNumber === 'string'
          ? stripUnsafeControlChars(body.contactNumber)
          : '',
      projectType:
        typeof body.projectType === 'string'
          ? stripUnsafeControlChars(body.projectType)
          : '',
      message:
        typeof body.message === 'string'
          ? stripUnsafeControlChars(body.message, true)
          : '',
    };

    const validation = validateContactForm(payload);
    if (!validation.valid) {
      res.status(400).json({
        error: 'Please check the highlighted form fields.',
        fieldErrors: validation.errors,
      });
      return;
    }

    if (
      payload.name.length > 120 ||
      payload.email.length > 254 ||
      payload.contactNumber.length > 30 ||
      payload.projectType.length > 120 ||
      payload.message.length > 4000
    ) {
      res.status(400).json({
        error: 'One or more fields exceed the maximum allowed length.',
      });
      return;
    }

    try {
      const saved = await createInquiry(payload);
      // Minimize response payload — return only non-sensitive receipt metadata
      res.status(201).json({
        inquiry: {
          id: saved.id,
          status: saved.status,
          createdAt: saved.createdAt,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not save your inquiry right now.';
      res.status(500).json({ error: message });
    }
  });

  // Verify signed-in user and admin role
  router.get('/admin/me', requireAuth, (req: AuthRequest, res) => {
    res.json({
      user: {
        email: req.dbUser?.email,
        name: req.dbUser?.name,
        role: req.dbUser?.role,
        isAdmin: req.dbUser?.role === 'admin',
      },
    });
  });

  // Protected admin inquiry list
  router.get(
    '/admin/inquiries',
    requireAuth,
    requireAdmin,
    async (_req: AuthRequest, res) => {
      try {
        const rows = await listInquiries();
        res.json({ inquiries: rows });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Could not load inquiries right now.';
        res.status(500).json({ error: message });
      }
    },
  );

  // Protected admin inquiry status update
  router.patch(
    '/admin/inquiries/:id',
    requireAuth,
    requireAdmin,
    async (req: AuthRequest, res) => {
      const id = parsePositiveId(String(req.params.id || ''));
      if (!id) {
        res.status(400).json({ error: 'Invalid inquiry ID.' });
        return;
      }

      const nextStatus =
        typeof req.body?.status === 'string'
          ? stripUnsafeControlChars(req.body.status)
          : '';
      if (!isValidInquiryStatus(nextStatus)) {
        res.status(400).json({
          error:
            'Invalid status. Allowed values: new, contacted, booked, archived.',
        });
        return;
      }

      try {
        const updated = await updateInquiryStatus(id, nextStatus);
        if (!updated) {
          res.status(404).json({ error: 'Inquiry not found.' });
          return;
        }
        res.json({ inquiry: updated });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Could not update inquiry status.';
        res.status(500).json({ error: message });
      }
    },
  );

  // Protected admin inquiry delete
  router.delete(
    '/admin/inquiries/:id',
    requireAuth,
    requireAdmin,
    async (req: AuthRequest, res) => {
      const id = parsePositiveId(String(req.params.id || ''));
      if (!id) {
        res.status(400).json({ error: 'Invalid inquiry ID.' });
        return;
      }

      try {
        const deleted = await deleteInquiry(id);
        if (!deleted) {
          res.status(404).json({ error: 'Inquiry not found.' });
          return;
        }
        res.json({ deleted: true, id });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Could not delete inquiry.';
        res.status(500).json({ error: message });
      }
    },
  );

  // Public published showreel list (read-only; only admin-published videos)
  router.get('/videos', async (_req, res) => {
    try {
      const rows = await listPublishedVideos();
      const published = rows
        .map(serializePublishedVideo)
        .filter((v) => Boolean(v.videoUrl));
      res.json({ videos: published });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not load showreel videos right now.';
      res.status(500).json({ error: message });
    }
  });

  // Protected admin: publish a showreel video once so all visitors see it live
  router.post(
    '/admin/videos',
    requireAuth,
    requireAdmin,
    async (req: AuthRequest, res) => {
      const body = req.body ?? {};
      const payload = {
        title:
          typeof body.title === 'string'
            ? stripUnsafeControlChars(body.title)
            : '',
        genre:
          typeof body.genre === 'string'
            ? stripUnsafeControlChars(body.genre)
            : '',
        role:
          typeof body.role === 'string'
            ? stripUnsafeControlChars(body.role)
            : '',
        duration:
          typeof body.duration === 'string'
            ? stripUnsafeControlChars(body.duration)
            : '',
        year:
          typeof body.year === 'string'
            ? stripUnsafeControlChars(body.year)
            : '',
        summary:
          typeof body.summary === 'string'
            ? stripUnsafeControlChars(body.summary, true)
            : '',
        videoUrl:
          typeof body.videoUrl === 'string'
            ? stripUnsafeControlChars(body.videoUrl)
            : '',
        posterUrl:
          typeof body.posterUrl === 'string'
            ? stripUnsafeControlChars(body.posterUrl)
            : '',
      };

      const validation = validatePublishedVideoInput(payload);
      if (!validation.valid) {
        res.status(400).json({
          error: 'Please check the highlighted video details.',
          fieldErrors: validation.errors,
        });
        return;
      }

      const normalizedUrl = normalizeVideoPlaybackUrl(payload.videoUrl);
      if (!normalizedUrl) {
        res.status(400).json({
          error:
            'Video URL must be a valid HTTPS video link or a /assets/videos/... path.',
        });
        return;
      }

      const genre = isValidVideoGenre(payload.genre)
        ? payload.genre
        : 'Vlogs & Events';

      try {
        const saved = await createPublishedVideo({
          title: payload.title,
          genre,
          role: payload.role,
          duration: payload.duration || '01:00',
          year: payload.year || String(new Date().getFullYear()),
          summary: payload.summary,
          videoUrl: normalizedUrl,
          posterUrl: payload.posterUrl || null,
          mimeType: getVideoMimeType(normalizedUrl),
          artworkTheme: genreToArtworkTheme(genre),
          featured: Boolean(body.featured),
        });
        res.status(201).json({ video: serializePublishedVideo(saved) });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Could not publish video right now.';
        res.status(500).json({ error: message });
      }
    },
  );

  // Protected admin: toggle featured status on a published showreel video
  router.patch(
    '/admin/videos/:id',
    requireAuth,
    requireAdmin,
    async (req: AuthRequest, res) => {
      const id = parsePositiveId(String(req.params.id || ''));
      if (!id) {
        res.status(400).json({ error: 'Invalid video ID.' });
        return;
      }
      if (typeof req.body?.featured !== 'boolean') {
        res.status(400).json({ error: 'featured must be a boolean.' });
        return;
      }

      try {
        const updated = await updatePublishedVideoFeatured(
          id,
          req.body.featured,
        );
        if (!updated) {
          res.status(404).json({ error: 'Video not found.' });
          return;
        }
        res.json({ video: serializePublishedVideo(updated) });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Could not update video right now.';
        res.status(500).json({ error: message });
      }
    },
  );

  // Protected admin: remove a published showreel video
  router.delete(
    '/admin/videos/:id',
    requireAuth,
    requireAdmin,
    async (req: AuthRequest, res) => {
      const id = parsePositiveId(String(req.params.id || ''));
      if (!id) {
        res.status(400).json({ error: 'Invalid video ID.' });
        return;
      }

      try {
        const deleted = await deletePublishedVideo(id);
        if (!deleted) {
          res.status(404).json({ error: 'Video not found.' });
          return;
        }
        res.json({ deleted: true, id });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Could not delete video right now.';
        res.status(500).json({ error: message });
      }
    },
  );

  // Catch-all JSON 404 for unknown API paths
  router.all('*', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  return router;
}

export function createBaseExpressApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(applySecurityHeaders);
  app.use(express.json({ limit: '100kb', strict: true }));

  // Clean JSON parse error handler (prevents leaking stack traces on malformed payloads)
  app.use(
    (
      err: unknown,
      _req: Request,
      res: Response,
      next: NextFunction,
    ) => {
      if (err instanceof SyntaxError && 'status' in err) {
        res.status(400).json({ error: 'Invalid JSON request body.' });
        return;
      }
      next(err);
    },
  );

  app.use('/api', createApiRouter());

  return app;
}
