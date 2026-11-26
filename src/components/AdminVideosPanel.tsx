import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  Film,
  Loader2,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import type { VideoWork } from '../types/portfolio';
import {
  ALLOWED_VIDEO_GENRES,
  buildStaticManifestJson,
  validatePublishedVideoInput,
  type PublishVideoFormValues,
} from '../utils/videoSources';

interface AdminVideosPanelProps {
  firebaseUser: User;
  videos: VideoWork[];
  loading: boolean;
  onVideosChange: React.Dispatch<React.SetStateAction<VideoWork[]>>;
}

const INITIAL_FORM: PublishVideoFormValues & { featured: boolean } = {
  title: '',
  genre: 'Horror',
  role: 'Content Creator & Video Editor',
  duration: '01:30',
  year: String(new Date().getFullYear()),
  summary: '',
  videoUrl: '',
  posterUrl: '',
  featured: false,
};

export function AdminVideosPanel({
  firebaseUser,
  videos,
  loading,
  onVideosChange,
}: AdminVideosPanelProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof PublishVideoFormValues, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busyVideoId, setBusyVideoId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMessage(null);

    const validation = validatePublishedVideoInput(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          genre: form.genre.trim(),
          role: form.role.trim(),
          duration: form.duration.trim() || '01:00',
          year: form.year.trim() || String(new Date().getFullYear()),
          summary: form.summary.trim(),
          videoUrl: form.videoUrl.trim(),
          posterUrl: (form.posterUrl || '').trim(),
          featured: form.featured,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fieldErrors && typeof data.fieldErrors === 'object') {
          setFieldErrors(data.fieldErrors);
        }
        setActionError(
          typeof data.error === 'string'
            ? data.error
            : 'Could not publish video right now.',
        );
        return;
      }

      if (data.video) {
        onVideosChange((prev) => [data.video as VideoWork, ...prev]);
      }
      setForm(INITIAL_FORM);
      setSuccessMessage(
        'Reel published live. All visitors will now see it directly in the showreel section.',
      );
    } catch {
      setActionError('Network error while publishing video. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFeatured = async (video: VideoWork) => {
    if (!video.dbId) return;
    setBusyVideoId(video.dbId);
    setActionError(null);

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/admin/videos/${video.dbId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ featured: !video.featured }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(
          typeof data.error === 'string'
            ? data.error
            : 'Could not update featured status.',
        );
        return;
      }

      onVideosChange((prev) =>
        prev.map((item) =>
          item.dbId === video.dbId
            ? { ...item, featured: Boolean(data.video?.featured ?? !video.featured) }
            : item,
        ),
      );
    } catch {
      setActionError('Network error while updating video.');
    } finally {
      setBusyVideoId(null);
    }
  };

  const handleDeleteVideo = async (dbId: number) => {
    setBusyVideoId(dbId);
    setActionError(null);

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/admin/videos/${dbId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(
          typeof data.error === 'string'
            ? data.error
            : 'Could not delete video.',
        );
        return;
      }

      onVideosChange((prev) => prev.filter((item) => item.dbId !== dbId));
      setConfirmDeleteId(null);
    } catch {
      setActionError('Network error while deleting video.');
    } finally {
      setBusyVideoId(null);
    }
  };

  const handleExportManifest = () => {
    const manifest = buildStaticManifestJson(videos);
    const blob = new Blob([manifest], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'manifest.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Publish New Showreel Video Form */}
      <form
        onSubmit={handlePublish}
        noValidate
        className="rounded-2xl border border-white/10 bg-[#131317] p-6 sm:p-7 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#F4F2EC]">
              Publish Showreel Video
            </h2>
            <p className="text-xs text-[#8C8A94] mt-0.5">
              Publish once here using an HTTPS video URL (Vercel Blob / CDN) or a committed{' '}
              <code className="font-mono text-[#D0CEC8]">/assets/videos/clip.mp4</code> path. Visitors will see the video directly on the homepage with zero upload controls.
            </p>
          </div>
          {videos.length > 0 && (
            <button
              type="button"
              onClick={handleExportManifest}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/12 text-xs font-medium text-[#D0CEC8] hover:text-white hover:border-white/30 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export manifest.json
            </button>
          )}
        </div>

        {actionError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-[#E53935]/35 bg-[#E53935]/10 px-4 py-3 text-xs text-[#FCA5A5]"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{actionError}</span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="video-title" className="block text-xs font-medium text-[#D0CEC8]">
              Reel Title
            </label>
            <input
              id="video-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Midnight Corridor — Horror Voiceover"
              className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3.5 py-2.5 text-sm text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935]"
            />
            {fieldErrors.title && (
              <p className="text-xs text-[#FCA5A5]">{fieldErrors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="video-genre" className="block text-xs font-medium text-[#D0CEC8]">
                Genre
              </label>
              <select
                id="video-genre"
                value={form.genre}
                onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3 py-2.5 text-sm text-[#F4F2EC] focus:outline-none focus:border-[#E53935]"
              >
                {ALLOWED_VIDEO_GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {fieldErrors.genre && (
                <p className="text-xs text-[#FCA5A5]">{fieldErrors.genre}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="video-duration" className="block text-xs font-medium text-[#D0CEC8]">
                Duration
              </label>
              <input
                id="video-duration"
                type="text"
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                placeholder="01:30"
                className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3 py-2.5 text-sm text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935]"
              />
              {fieldErrors.duration && (
                <p className="text-xs text-[#FCA5A5]">{fieldErrors.duration}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="video-url" className="block text-xs font-medium text-[#D0CEC8]">
              Direct Video URL (.mp4 or .webm)
            </label>
            <input
              id="video-url"
              type="text"
              value={form.videoUrl}
              onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
              placeholder="https://...blob.vercel-storage.com/reel.mp4 or /assets/videos/reel.mp4"
              className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3.5 py-2.5 text-sm text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935]"
            />
            {fieldErrors.videoUrl && (
              <p className="text-xs text-[#FCA5A5]">{fieldErrors.videoUrl}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="video-poster" className="block text-xs font-medium text-[#D0CEC8]">
              Thumbnail / Poster URL (Optional)
            </label>
            <input
              id="video-poster"
              type="text"
              value={form.posterUrl || ''}
              onChange={(e) => setForm((f) => ({ ...f, posterUrl: e.target.value }))}
              placeholder="https://... or /assets/videos/thumb.jpg"
              className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3.5 py-2.5 text-sm text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935]"
            />
            {fieldErrors.posterUrl && (
              <p className="text-xs text-[#FCA5A5]">{fieldErrors.posterUrl}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="video-role" className="block text-xs font-medium text-[#D0CEC8]">
              Role / Credit
            </label>
            <input
              id="video-role"
              type="text"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="Voiceover Artist & Editor"
              className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3.5 py-2.5 text-sm text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935]"
            />
            {fieldErrors.role && (
              <p className="text-xs text-[#FCA5A5]">{fieldErrors.role}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="video-year" className="block text-xs font-medium text-[#D0CEC8]">
              Year
            </label>
            <input
              id="video-year"
              type="text"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              placeholder="2026"
              className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3.5 py-2.5 text-sm text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935]"
            />
            {fieldErrors.year && (
              <p className="text-xs text-[#FCA5A5]">{fieldErrors.year}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="video-summary" className="block text-xs font-medium text-[#D0CEC8]">
            Short Description
          </label>
          <textarea
            id="video-summary"
            rows={2}
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            placeholder="Brief editorial note shown under the reel card..."
            className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3.5 py-2.5 text-sm text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935]"
          />
          {fieldErrors.summary && (
            <p className="text-xs text-[#FCA5A5]">{fieldErrors.summary}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <label className="inline-flex items-center gap-2.5 text-xs text-[#D0CEC8] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              className="rounded border-white/20 bg-[#0B0B0D] text-[#E53935] focus:ring-[#E53935]"
            />
            Feature as the primary wide reel at the top of the showreel
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] disabled:opacity-60 text-xs font-semibold text-white transition-colors whitespace-nowrap"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Publishing...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" aria-hidden="true" />
                Publish Video Live
              </>
            )}
          </button>
        </div>
      </form>

      {/* Published Showreel Library */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#F4F2EC]">
            Published Showreel Videos ({videos.length})
          </h2>
        </div>

        {loading && videos.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-sm text-[#8C8A94]">
            <Loader2 className="w-6 h-6 animate-spin text-[#E53935]" aria-hidden="true" />
            <span>Loading published videos...</span>
          </div>
        ) : videos.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#131317] py-14 px-6 text-center space-y-2.5">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 text-[#8C8A94]">
              <Film className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-[#F4F2EC]">
              No showreel videos published yet
            </h3>
            <p className="text-xs text-[#8C8A94] max-w-sm mx-auto leading-relaxed">
              Publish your first video above and it will appear live for every visitor on the portfolio homepage.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video) => {
              const isBusy = video.dbId !== undefined && busyVideoId === video.dbId;
              const isConfirming =
                video.dbId !== undefined && confirmDeleteId === video.dbId;

              return (
                <article
                  key={video.id}
                  className="rounded-2xl border border-white/10 bg-[#131317] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[#E53935] font-medium">{video.genre}</span>
                      <span className="text-white/20" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#A6A4AE]">{video.role}</span>
                      <span className="text-white/20" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-[#8C8A94] tabular-nums">
                        {video.duration} · {video.year}
                      </span>
                      {video.featured && (
                        <span className="px-2 py-0.5 rounded-md bg-[#E53935]/15 border border-[#E53935]/35 text-[#FCA5A5] text-[11px] font-medium">
                          Featured
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-[#F4F2EC]">
                      {video.title}
                    </h3>

                    <p className="text-xs text-[#A6A4AE] line-clamp-2">
                      {video.summary}
                    </p>

                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#8C8A94] hover:text-[#F4F2EC] break-all transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                      {video.videoUrl}
                    </a>
                  </div>

                  {video.dbId !== undefined && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleFeatured(video)}
                        aria-label={
                          video.featured
                            ? `Unfeature ${video.title}`
                            : `Feature ${video.title}`
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${
                          video.featured
                            ? 'bg-[#E53935] border-[#E53935] text-white'
                            : 'border-white/12 text-[#D0CEC8] hover:border-white/30 hover:text-white'
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${video.featured ? 'fill-current' : ''}`}
                          aria-hidden="true"
                        />
                        {video.featured ? 'Featured' : 'Feature'}
                      </button>

                      {isConfirming ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteVideo(video.dbId!)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] text-xs font-medium text-white transition-colors disabled:opacity-50"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1.5 rounded-lg border border-white/12 text-xs text-[#A6A4AE] hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(video.dbId!)}
                          aria-label={`Delete ${video.title}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/12 text-[#8C8A94] hover:text-[#FCA5A5] hover:border-[#E53935]/40 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
