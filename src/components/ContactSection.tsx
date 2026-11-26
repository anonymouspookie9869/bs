import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  FileDown,
  Loader2,
  Mail,
  Phone,
  Send,
} from 'lucide-react';
import { PROFILE } from '../data/portfolioData';
import type { ContactFormValues } from '../types/portfolio';
import { validateContactForm } from '../utils/videoSources';
import { ScrollReveal } from './ScrollReveal';

const PROJECT_TYPES = [
  'Content Creation / Collaboration',
  'Video Editing (Gaming / Vlogs)',
  'Voiceover & Horror Narration',
  'Stand-Up Comedy / Live Hosting',
  'Event Coverage & Volunteering',
];

export function ContactSection() {
  const [form, setForm] = useState<ContactFormValues>({
    name: '',
    email: '',
    contactNumber: '',
    projectType: PROJECT_TYPES[0],
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormValues, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<
    (ContactFormValues & { id?: number }) | null
  >(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2200);
    } catch {
      window.location.href = PROFILE.emailHref;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateContactForm(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          contactNumber: form.contactNumber.trim(),
          projectType: form.projectType.trim(),
          message: form.message.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.fieldErrors && typeof data.fieldErrors === 'object') {
          setErrors(data.fieldErrors);
        }
        setSubmitError(
          typeof data.error === 'string'
            ? data.error
            : 'Could not submit your inquiry right now. Please try again.',
        );
        return;
      }

      setSubmittedRecord({
        name: form.name.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber.trim(),
        projectType: form.projectType.trim(),
        message: form.message.trim(),
        id: data.inquiry?.id,
      });
    } catch {
      setSubmitError(
        'Network error while sending your inquiry. Please check your connection and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedRecord(null);
    setSubmitError(null);
    setForm({
      name: '',
      email: '',
      contactNumber: '',
      projectType: PROJECT_TYPES[0],
      message: '',
    });
    setErrors({});
  };

  return (
    <section
      id="contact"
      className="py-20 sm:py-28 border-t border-white/8"
      aria-labelledby="contact-heading"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Direct Info & CV Column */}
          <ScrollReveal className="lg:col-span-5 space-y-8" yOffset={20}>
            <div>
              <p className="text-xs font-medium text-[#E53935] mb-2">
                04. Bookings & Collaborations
              </p>
              <h2
                id="contact-heading"
                className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2EC] text-balance mb-4"
              >
                Let’s make something people actually watch to the end.
              </h2>
              <p className="text-sm sm:text-base text-[#A6A4AE] leading-relaxed">
                Open to creator collaborations, voiceover projects, gaming and vlog video editing roles, stand-up bookings, and live convention coverage.
              </p>
            </div>

            <div className="divide-y divide-white/10 border-y border-white/10">
              <div className="py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-[#8C8A94] mb-0.5">Email</p>
                  <a
                    href={PROFILE.emailHref}
                    className="text-sm sm:text-base font-medium text-[#F4F2EC] hover:text-[#E53935] transition-colors break-all"
                  >
                    {PROFILE.email}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  aria-label="Copy email to clipboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/12 text-xs text-[#D0CEC8] hover:text-white hover:border-white/30 transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[#8C8A94] mb-0.5">Phone</p>
                  <a
                    href={PROFILE.phoneHref}
                    className="text-sm sm:text-base font-medium font-mono tabular-nums text-[#F4F2EC] hover:text-[#E53935] transition-colors"
                  >
                    {PROFILE.phone}
                  </a>
                </div>
                <Phone className="w-4 h-4 text-[#8C8A94] shrink-0" aria-hidden="true" />
              </div>

              <div className="py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[#8C8A94] mb-0.5">Curriculum Vitae</p>
                  <p className="text-sm text-[#D0CEC8]">Bhuvi Chauhan — Official PDF Resume</p>
                </div>
                <a
                  href={PROFILE.cvPdfPath}
                  download="Bhuvi_Chauhan_CV.pdf"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/8 hover:bg-[#E53935] text-xs font-medium text-[#F4F2EC] transition-colors whitespace-nowrap shrink-0"
                >
                  <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                  Download CV
                </a>
              </div>
            </div>
          </ScrollReveal>

          {/* Right Validated & Persisted Inquiry Form */}
          <ScrollReveal className="lg:col-span-7" delay={0.08} yOffset={24}>
            <div className="rounded-2xl border border-white/10 hover:border-white/20 transition-colors bg-[#131317] p-6 sm:p-8">
              {submittedRecord ? (
                <div className="py-6 space-y-5" role="status">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Check className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#F4F2EC] mb-1.5">
                      Inquiry received by Bhuvi Chauhan
                    </h3>
                    <p className="text-sm text-[#A6A4AE] leading-relaxed">
                      Thanks, {submittedRecord.name}. Your inquiry for{' '}
                      <span className="text-[#F4F2EC]">{submittedRecord.projectType}</span> has been recorded. Bhuvi will get back to you via email or phone soon.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#0B0B0D] p-4 text-xs text-[#B8B6C0] space-y-1.5">
                    <div>
                      <span className="text-[#8C8A94]">From:</span> {submittedRecord.name} ({submittedRecord.email})
                    </div>
                    <div>
                      <span className="text-[#8C8A94]">Contact Number:</span>{' '}
                      <span className="font-mono tabular-nums text-[#F4F2EC]">
                        {submittedRecord.contactNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8C8A94]">Topic:</span> {submittedRecord.projectType}
                    </div>
                    <div className="pt-1 text-[#D0CEC8] whitespace-pre-wrap">
                      {submittedRecord.message}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] text-xs font-medium text-white transition-colors"
                    >
                      Send Another Inquiry
                    </button>
                    <a
                      href={`mailto:${PROFILE.email}?subject=${encodeURIComponent(
                        `${submittedRecord.projectType} — ${submittedRecord.name}`,
                      )}&body=${encodeURIComponent(
                        `Hi Bhuvi,\n\n${submittedRecord.message}\n\nBest,\n${submittedRecord.name}\nEmail: ${submittedRecord.email}\nPhone: ${submittedRecord.contactNumber}`,
                      )}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/12 text-xs font-medium text-[#D0CEC8] hover:text-white hover:border-white/30 transition-colors"
                    >
                      <Mail className="w-4 h-4" aria-hidden="true" />
                      Also Open in Email App
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {submitError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl border border-[#E53935]/35 bg-[#E53935]/10 px-4 py-3 text-xs text-[#FCA5A5]"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="block text-xs font-medium text-[#D0CEC8] mb-1.5"
                      >
                        Your Name
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, name: e.target.value }));
                          if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                        placeholder="Aarav Sharma"
                        aria-invalid={Boolean(errors.name)}
                        className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3.5 py-2.5 text-sm text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935]"
                      />
                      {errors.name && (
                        <p role="alert" className="text-xs text-[#FCA5A5] mt-1.5">
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-xs font-medium text-[#D0CEC8] mb-1.5"
                      >
                        Email Address
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, email: e.target.value }));
                          if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        placeholder="you@studio.com"
                        aria-invalid={Boolean(errors.email)}
                        className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3.5 py-2.5 text-sm text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935]"
                      />
                      {errors.email && (
                        <p role="alert" className="text-xs text-[#FCA5A5] mt-1.5">
                          {errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label
                        htmlFor="contact-phone"
                        className="block text-xs font-medium text-[#D0CEC8] mb-1.5"
                      >
                        Contact Number
                      </label>
                      <input
                        id="contact-phone"
                        name="contactNumber"
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        value={form.contactNumber}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, contactNumber: e.target.value }));
                          if (errors.contactNumber) {
                            setErrors((prev) => ({ ...prev, contactNumber: undefined }));
                          }
                        }}
                        placeholder="+91 98765 43210"
                        aria-invalid={Boolean(errors.contactNumber)}
                        className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3.5 py-2.5 text-sm text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935]"
                      />
                      {errors.contactNumber && (
                        <p role="alert" className="text-xs text-[#FCA5A5] mt-1.5">
                          {errors.contactNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="contact-project-type"
                        className="block text-xs font-medium text-[#D0CEC8] mb-1.5"
                      >
                        Collaboration Type
                      </label>
                      <select
                        id="contact-project-type"
                        name="projectType"
                        value={form.projectType}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, projectType: e.target.value }))
                        }
                        className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3.5 py-2.5 text-sm text-[#F4F2EC] focus:outline-none focus:border-[#E53935]"
                      >
                        {PROJECT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-xs font-medium text-[#D0CEC8] mb-1.5"
                    >
                      Project Details
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={4}
                      value={form.message}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, message: e.target.value }));
                        if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }));
                      }}
                      placeholder="Share your format, timeline, or event dates..."
                      aria-invalid={Boolean(errors.message)}
                      className="w-full rounded-lg bg-[#0B0B0D] border border-white/12 px-3.5 py-2.5 text-sm text-[#F4F2EC] placeholder:text-[#666470] focus:outline-none focus:border-[#E53935] resize-none"
                    />
                    {errors.message && (
                      <p role="alert" className="text-xs text-[#FCA5A5] mt-1.5">
                        {errors.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium text-white transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Sending Inquiry...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" aria-hidden="true" />
                        Send Collaboration Inquiry
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
