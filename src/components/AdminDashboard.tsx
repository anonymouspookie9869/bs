import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  Film,
  Inbox,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase';
import { PROFILE } from '../data/portfolioData';
import type { InquiryRecord, InquiryStatus, VideoWork } from '../types/portfolio';
import { buildInquiriesCsv } from '../utils/videoSources';
import { AdminVideosPanel } from './AdminVideosPanel';

interface AdminDashboardProps {
  onNavigateHome: () => void;
}

const STATUS_OPTIONS: Array<{ value: InquiryStatus; label: string; style: string }> = [
  {
    value: 'new',
    label: 'New',
    style: 'text-[#FCA5A5] bg-[#E53935]/15 border-[#E53935]/35',
  },
  {
    value: 'contacted',
    label: 'Contacted',
    style: 'text-amber-300 bg-amber-500/12 border-amber-500/30',
  },
  {
    value: 'booked',
    label: 'Booked',
    style: 'text-emerald-300 bg-emerald-500/12 border-emerald-500/30',
  },
  {
    value: 'archived',
    label: 'Archived',
    style: 'text-[#A6A4AE] bg-white/5 border-white/15',
  },
];

function formatSubmittedDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function AdminDashboard({ onNavigateHome }: AdminDashboardProps) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'inquiries' | 'videos'>('inquiries');
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [publishedVideos, setPublishedVideos] = useState<VideoWork[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | InquiryStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<number | null>(null);

  const fetchAdminData = useCallback(async (user: User) => {
    setLoadingData(true);
    setDataError(null);
    setAuthError(null);

    try {
      const token = await user.getIdToken();
      const meRes = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meRes.ok) {
        const body = await meRes.json().catch(() => ({}));
        const msg =
          typeof body.error === 'string'
            ? body.error
            : 'Unable to verify administrator session.';
        if (meRes.status === 403) {
          setIsAdmin(false);
        } else {
          setIsAdmin(null);
        }
        setAuthError(msg);
        return;
      }

      const meData = await meRes.json();
      if (!meData.user?.isAdmin) {
        setIsAdmin(false);
        setInquiries([]);
        return;
      }

      setIsAdmin(true);

      const [listRes, videosRes] = await Promise.all([
        fetch('/api/admin/inquiries', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/videos', { cache: 'no-store' }),
      ]);

      const listData = await listRes.json().catch(() => ({}));
      if (!listRes.ok) {
        setDataError(
          typeof listData.error === 'string'
            ? listData.error
            : 'Could not load inquiries.',
        );
        return;
      }

      setInquiries(Array.isArray(listData.inquiries) ? listData.inquiries : []);

      if (videosRes.ok) {
        const videosData = await videosRes.json().catch(() => ({}));
        setPublishedVideos(
          Array.isArray(videosData.videos) ? videosData.videos : [],
        );
      }
    } catch {
      setDataError('Network error while loading admin data. Please try refreshing.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        void fetchAdminData(user);
      } else {
        setIsAdmin(null);
        setInquiries([]);
        setPublishedVideos([]);
      }
    });
    return () => {
      unsubscribe();
      setInquiries([]);
      setPublishedVideos([]);
    };
  }, [fetchAdminData]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in window was closed before completing login.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Please allow pop-ups in your browser to sign in with Google.');
      } else {
        setAuthError('Could not complete Google sign-in. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    setInquiries([]);
    setPublishedVideos([]);
    setIsAdmin(null);
    await signOut(auth);
  };

  const handleStatusChange = async (id: number, status: InquiryStatus) => {
    if (!firebaseUser) return;
    setUpdatingId(id);
    setDataError(null);

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDataError(
          typeof data.error === 'string'
            ? data.error
            : 'Could not update inquiry status.',
        );
        return;
      }

      setInquiries((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: data.inquiry?.status ?? status } : item,
        ),
      );
    } catch {
      setDataError('Network error while updating status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!firebaseUser) return;
    setUpdatingId(id);
    setDataError(null);

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDataError(
          typeof data.error === 'string' ? data.error : 'Could not delete inquiry.',
        );
        return;
      }

      setInquiries((prev) => prev.filter((item) => item.id !== id));
      setConfirmDeleteId(null);
    } catch {
      setDataError('Network error while deleting inquiry.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyPhone = async (id: number, phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhoneId(id);
      window.setTimeout(() => setCopiedPhoneId(null), 1800);
    } catch {
      // Fallback ignored gracefully
    }
  };

  const handleExportCsv = () => {
    const csv = buildInquiriesCsv(filteredInquiries);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bhuvi-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const counts = useMemo(() => {
    const summary = { total: inquiries.length, new: 0, contacted: 0, booked: 0, archived: 0 };
    for (const item of inquiries) {
      if (item.status in summary) {
        summary[item.status] += 1;
      }
    }
    return summary;
  }, [inquiries]);

  const filteredInquiries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inquiries.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.contactNumber.toLowerCase().includes(q) ||
        item.projectType.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q)
      );
    });
  }, [inquiries, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#F4F2EC]">
      {/* Sticky Admin Header */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0B0B0D]/95">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A6A4AE] hover:text-[#F4F2EC] transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to Portfolio
            </button>
            <span className="text-white/20" aria-hidden="true">
              /
            </span>
            <span className="text-sm sm:text-base font-semibold tracking-tight text-[#F4F2EC] truncate font-[var(--font-display)]">
              {PROFILE.name} · Admin
            </span>
          </div>

          {firebaseUser && (
            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden sm:inline text-xs text-[#8C8A94] truncate max-w-[220px]">
                {firebaseUser.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/12 text-xs font-medium text-[#D0CEC8] hover:text-white hover:border-white/30 transition-colors whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {!authReady ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-sm text-[#8C8A94]">
            <Loader2 className="w-6 h-6 animate-spin text-[#E53935]" aria-hidden="true" />
            <span>Checking admin session...</span>
          </div>
        ) : !firebaseUser ? (
          /* Sign-In Gate */
          <div className="max-w-md mx-auto py-12">
            <div className="rounded-2xl border border-white/10 bg-[#131317] p-7 sm:p-8 space-y-6">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#E53935]/15 text-[#E53935]">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-[#E53935]">Protected Portal</p>
                <h1 className="text-2xl font-semibold tracking-tight text-[#F4F2EC]">
                  Portfolio Admin Dashboard
                </h1>
                <p className="text-sm text-[#A6A4AE] leading-relaxed">
                  Sign in with an authorized administrator Google account to manage collaboration inquiries and publish showreel videos.
                </p>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-[#E53935]/35 bg-[#E53935]/10 px-4 py-3 text-xs text-[#FCA5A5]"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] disabled:opacity-60 text-sm font-semibold text-white transition-colors"
              >
                {signingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Signing in...
                  </>
                ) : (
                  'Sign in with Google'
                )}
              </button>
            </div>
          </div>
        ) : isAdmin === null && authError ? (
          /* Session or Server Verification Error Notice */
          <div className="max-w-md mx-auto py-12">
            <div className="rounded-2xl border border-white/10 bg-[#131317] p-7 sm:p-8 space-y-5">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#E53935]/15 text-[#E53935]">
                <AlertCircle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-[#F4F2EC]">
                  Session Verification Needed
                </h1>
                <p className="text-sm text-[#A6A4AE] leading-relaxed">
                  {authError}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => firebaseUser && void fetchAdminData(firebaseUser)}
                  className="px-4 py-2.5 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] text-xs font-semibold text-white transition-colors"
                >
                  Retry Verification
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-4 py-2.5 rounded-lg border border-white/12 text-xs font-medium text-[#D0CEC8] hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : isAdmin === false ? (
          /* Signed-in Non-Admin Access Notice */
          <div className="max-w-md mx-auto py-12">
            <div className="rounded-2xl border border-white/10 bg-[#131317] p-7 sm:p-8 space-y-5">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-500/15 text-amber-300">
                <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-[#F4F2EC]">
                  Admin Access Required
                </h1>
                <p className="text-sm text-[#A6A4AE] leading-relaxed">
                  You are signed in as{' '}
                  <span className="text-[#F4F2EC] font-medium">{firebaseUser.email}</span>, which does not have administrator permissions for this portfolio.
                </p>
                {authError && (
                  <p className="text-xs text-[#FCA5A5]">{authError}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-4 py-2.5 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] text-xs font-semibold text-white transition-colors"
                >
                  Sign Out &amp; Switch Account
                </button>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="px-4 py-2.5 rounded-lg border border-white/12 text-xs font-medium text-[#D0CEC8] hover:text-white transition-colors"
                >
                  Return to Portfolio
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Admin Workspace */
          <div className="space-y-8">
            {/* Heading & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#E53935] mb-1.5">
                  Admin · {activeTab === 'inquiries' ? 'Collaboration Leads' : 'Published Showreel'}
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2EC]">
                  {activeTab === 'inquiries' ? 'Stored Inquiries' : 'Showreel Videos'}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => firebaseUser && void fetchAdminData(firebaseUser)}
                  disabled={loadingData}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/12 bg-[#131317] hover:border-white/30 text-xs font-medium text-[#D0CEC8] hover:text-white transition-colors disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  Refresh
                </button>

                {activeTab === 'inquiries' && (
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={filteredInquiries.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] disabled:opacity-40 text-xs font-semibold text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Export CSV
                  </button>
                )}
              </div>
            </div>

            {/* Primary Workspace Switcher: Inquiries | Showreel Videos */}
            <div
              role="tablist"
              aria-label="Admin workspace sections"
              className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#131317] border border-white/10"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'inquiries'}
                onClick={() => setActiveTab('inquiries')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'inquiries'
                    ? 'bg-[#F4F2EC] text-[#0B0B0D]'
                    : 'text-[#A6A4AE] hover:text-[#F4F2EC]'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" aria-hidden="true" />
                Inquiries ({counts.total})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'videos'}
                onClick={() => setActiveTab('videos')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'videos'
                    ? 'bg-[#F4F2EC] text-[#0B0B0D]'
                    : 'text-[#A6A4AE] hover:text-[#F4F2EC]'
                }`}
              >
                <Film className="w-3.5 h-3.5" aria-hidden="true" />
                Showreel Videos ({publishedVideos.length})
              </button>
            </div>

            {activeTab === 'videos' ? (
              <AdminVideosPanel
                firebaseUser={firebaseUser}
                videos={publishedVideos}
                loading={loadingData}
                onVideosChange={setPublishedVideos}
              />
            ) : (
            <div className="space-y-8">

            {/* 4-Column KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Inquiries', value: counts.total, accent: 'text-[#F4F2EC]' },
                { label: 'New Leads', value: counts.new, accent: 'text-[#E53935]' },
                { label: 'Contacted', value: counts.contacted, accent: 'text-amber-300' },
                { label: 'Booked', value: counts.booked, accent: 'text-emerald-400' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/10 bg-[#131317] p-5"
                >
                  <p className="text-xs text-[#8C8A94] mb-1.5">{stat.label}</p>
                  <p
                    className={`text-2xl sm:text-3xl font-semibold tabular-nums font-[var(--font-display)] ${stat.accent}`}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Error Banner */}
            {dataError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-[#E53935]/35 bg-[#E53935]/10 px-4 py-3 text-xs text-[#FCA5A5]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{dataError}</span>
              </div>
            )}

            {/* Filter Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter inquiries by status">
                {(
                  [
                    { key: 'all', label: `All (${counts.total})` },
                    { key: 'new', label: `New (${counts.new})` },
                    { key: 'contacted', label: `Contacted (${counts.contacted})` },
                    { key: 'booked', label: `Booked (${counts.booked})` },
                    { key: 'archived', label: `Archived (${counts.archived})` },
                  ] as const
                ).map((tab) => {
                  const active = statusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#E53935] text-white'
                          : 'text-[#A6A4AE] hover:text-[#F4F2EC] hover:bg-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full md:w-72">
                <Search
                  className="w-4 h-4 text-[#666470] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, phone, email..."
                  aria-label="Search inquiries"
                  className="w-full rounded-lg bg-[#131317] border border-white/12 pl-9 pr-3.5 py-2 text-xs text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935]"
                />
              </div>
            </div>

            {/* Inquiries List */}
            {loadingData && inquiries.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-sm text-[#8C8A94]">
                <Loader2 className="w-6 h-6 animate-spin text-[#E53935]" aria-hidden="true" />
                <span>Loading stored inquiries...</span>
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#131317] py-16 px-6 text-center space-y-3">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 text-[#8C8A94]">
                  <Inbox className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="text-base font-semibold text-[#F4F2EC]">
                  {inquiries.length === 0 ? 'No inquiries submitted yet' : 'No matching inquiries'}
                </h2>
                <p className="text-xs text-[#8C8A94] max-w-sm mx-auto leading-relaxed">
                  {inquiries.length === 0
                    ? 'Every collaboration inquiry filled out on the portfolio contact form will appear here automatically.'
                    : 'Try clearing your search or selecting another status filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInquiries.map((item) => {
                  const statusMeta =
                    STATUS_OPTIONS.find((opt) => opt.value === item.status) ??
                    STATUS_OPTIONS[0];
                  const isBusy = updatingId === item.id;
                  const isConfirmingDelete = confirmDeleteId === item.id;

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-white/10 hover:border-white/20 bg-[#131317] p-5 sm:p-6 transition-colors space-y-4"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h2 className="text-base sm:text-lg font-semibold text-[#F4F2EC]">
                              {item.name}
                            </h2>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${statusMeta.style}`}
                            >
                              {statusMeta.label}
                            </span>
                            <span className="text-xs text-[#8C8A94]">
                              {item.projectType}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#B8B6C0]">
                            <a
                              href={`mailto:${encodeURIComponent(item.email)}`}
                              className="inline-flex items-center gap-1.5 hover:text-[#E53935] transition-colors break-all"
                            >
                              <Mail className="w-3.5 h-3.5 text-[#8C8A94] shrink-0" aria-hidden="true" />
                              {item.email}
                            </a>

                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-[#8C8A94] shrink-0" aria-hidden="true" />
                              <a
                                href={`tel:${item.contactNumber.replace(/[^\d+]/g, '')}`}
                                className="font-mono tabular-nums text-[#F4F2EC] hover:text-[#E53935] transition-colors"
                              >
                                {item.contactNumber}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(item.id, item.contactNumber)}
                                aria-label={`Copy contact number for ${item.name}`}
                                className="inline-flex items-center text-[#8C8A94] hover:text-[#F4F2EC] transition-colors ml-0.5"
                              >
                                {copiedPhoneId === item.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                              </button>
                            </span>

                            <span className="text-[#6E6C78] font-mono tabular-nums">
                              {formatSubmittedDate(item.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Status Selector & Delete Controls */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <label htmlFor={`status-${item.id}`} className="sr-only">
                            Status for {item.name}
                          </label>
                          <select
                            id={`status-${item.id}`}
                            value={item.status}
                            disabled={isBusy}
                            onChange={(e) =>
                              handleStatusChange(item.id, e.target.value as InquiryStatus)
                            }
                            className="rounded-lg bg-[#0B0B0D] border border-white/14 px-2.5 py-1.5 text-xs text-[#F4F2EC] focus:outline-none focus:border-[#E53935] disabled:opacity-50"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          {isConfirmingDelete ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDelete(item.id)}
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
                              onClick={() => setConfirmDeleteId(item.id)}
                              aria-label={`Delete inquiry from ${item.name}`}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-white/12 text-[#8C8A94] hover:text-[#FCA5A5] hover:border-[#E53935]/40 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#0B0B0D] border border-white/8 p-4 text-sm text-[#D0CEC8] leading-relaxed whitespace-pre-wrap">
                        {item.message}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
