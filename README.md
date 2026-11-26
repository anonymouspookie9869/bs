# Bhuvi Chauhan — Creator, Video Editor & Stand-Up Portfolio

Interactive 3D portfolio website and protected inquiries admin dashboard for **Bhuvi Chauhan** (Content Creator · Video Editor · Stand-Up Comedian), built with React, Vite, Tailwind CSS, Motion, Three.js, Express, Drizzle ORM (PostgreSQL), and Firebase Auth. Configured exclusively for deployment on **Vercel**.

## Local Development

```bash
npm install
npm run dev
```

Build and verify for production:

```bash
npm run lint
npm run build
```

## Adding Bhuvi’s Headshot & Live Showreel Videos

1. **Headshot Portrait**: Place a high-resolution JPG, PNG, or WebP headshot at `public/assets/portrait.jpg`.
2. **Showreel Videos**:
   - Export videos as universal H.264 `.mp4` (`-movflags +faststart`) for fast playback across iOS Safari, Android Chrome, and desktop browsers.
   - Copy compact `.mp4` clips into `public/assets/videos/`.
   - Use the in-app **Upload Video** → **Publish & Go Live** tool to preview, verify browser compatibility, and export `manifest.json`, then replace `public/assets/videos/manifest.json` with it.
   - For large video files (over 25 MB), upload the `.mp4` to **Vercel Blob** (or any HTTPS CDN) and paste its direct `https://` URL inside **Publish & Go Live**.

## Deploying to Vercel via GitHub

1. Push this repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com/new).
3. In **Vercel Project Settings → Environment Variables**, configure your PostgreSQL credentials (never commit secrets to Git):
   - `SQL_HOST`
   - `SQL_DB_NAME`
   - `SQL_USER`
   - `SQL_PASSWORD`
   - `SQL_SSL="true"` (when connecting to a remote PostgreSQL host over TLS)
   - `ADMIN_EMAILS` (optional comma-separated list of additional admin emails)
4. In your Firebase Console (**Authentication → Settings → Authorized Domains**), add your production Vercel domain (e.g. `your-site.vercel.app`) so Google Sign-In works on `/admin`.
5. Deploy — `vercel.json` automatically builds the Vite frontend (`dist`), routes `/api/*` to the Serverless Function (`api/index.ts`) with `Cache-Control: no-store` and strict security headers, streams showreel videos with `Accept-Ranges: bytes`, and handles SPA routing including `/admin`.
