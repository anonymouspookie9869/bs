import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import {
  CONTENT_FORMATS,
  CREATIVE_STRENGTHS,
  EXPERIENCE_ITEMS,
  SKILLS_IN_PRACTICE,
} from '../data/portfolioData';
import type {
  StudioFocusPreset,
  StudioLightingMood,
  VideoGenre,
} from '../types/portfolio';
import { InteractiveCard } from './InteractiveCard';
import { ScrollReveal } from './ScrollReveal';

interface ExperienceAndSkillsProps {
  onSelectFormat: (
    genre: VideoGenre,
    preset: StudioFocusPreset,
    mood: StudioLightingMood,
  ) => void;
}

export function ExperienceAndSkills({ onSelectFormat }: ExperienceAndSkillsProps) {
  const [expandedExpId, setExpandedExpId] = useState<string>(EXPERIENCE_ITEMS[0].id);
  const [activeFormatId, setActiveFormatId] = useState<string>(CONTENT_FORMATS[0].id);

  const selectedFormat =
    CONTENT_FORMATS.find((f) => f.id === activeFormatId) || CONTENT_FORMATS[0];

  return (
    <section
      id="experience"
      className="py-20 sm:py-28 border-t border-white/8"
      aria-labelledby="experience-heading"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 space-y-24">
        {/* Interactive Expandable Experience Dossiers */}
        <div>
          <ScrollReveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-[#E53935] mb-2">
                03. Experience &amp; Live Conventions
              </p>
              <h2
                id="experience-heading"
                className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#F4F2EC] text-balance"
              >
                From voiceover booths and editing timelines to live comedy stages and conventions.
              </h2>
            </div>
            <p className="text-xs text-[#8C8A94] max-w-xs">
              Select any role to inspect full responsibilities and deliverables.
            </p>
          </ScrollReveal>

          <div className="divide-y divide-white/10 border-y border-white/10">
            {EXPERIENCE_ITEMS.map((item, idx) => {
              const isOpen = expandedExpId === item.id;
              return (
                <ScrollReveal
                  key={item.id}
                  delay={idx * 0.04}
                  yOffset={18}
                  className="transition-colors duration-200 hover:bg-white/[0.025]"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedExpId(isOpen ? '' : item.id)}
                    aria-expanded={isOpen}
                    className="w-full text-left py-7 sm:py-8 px-2 sm:px-4 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] rounded-xl"
                  >
                    <div className="lg:col-span-4 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[#A6A4AE]">
                        <span className="font-mono tabular-nums text-[#E53935]">
                          {item.index}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.category}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F4F2EC]">
                        {item.role}
                      </h3>
                      <p className="text-sm font-medium text-[#B8B6C0]">
                        {item.organization}
                      </p>
                    </div>

                    <div className="lg:col-span-7">
                      <p className="text-sm sm:text-base text-[#D0CEC8] leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    <div className="lg:col-span-1 flex lg:justify-end">
                      <span
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 text-[#A6A4AE] transition-transform duration-200 ${
                          isOpen ? 'rotate-180 bg-[#E53935]/15 border-[#E53935]/40 text-[#F4F2EC]' : ''
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" aria-hidden="true" />
                      </span>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="pb-8 px-2 sm:px-4 lg:grid lg:grid-cols-12 lg:gap-8"
                      >
                        <div className="lg:col-span-4 mb-4 lg:mb-0">
                          <p className="text-xs font-medium text-[#8C8A94] mb-2">
                            Key Deliverables
                          </p>
                          <p className="text-xs text-[#D0CEC8] leading-relaxed">
                            {item.deliverables.join(' · ')}
                          </p>
                        </div>

                        <div className="lg:col-span-8">
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-[#A6A4AE]">
                            {item.highlights.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                                <span
                                  aria-hidden="true"
                                  className="mt-2 w-1.5 h-1.5 rounded-full bg-[#E53935]/80 shrink-0"
                                />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        {/* Interactive Genre Adaptation Explorer */}
        <div>
          <ScrollReveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-medium text-[#E53935] mb-2">
                Interactive Content Formats
              </p>
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F4F2EC]">
                Four lanes, one adaptable voice.
              </h3>
            </div>
            <p className="text-xs text-[#8C8A94] max-w-xs">
              Click a genre below to inspect Bhuvi’s vocal &amp; editing approach, or sync the 3D studio.
            </p>
          </ScrollReveal>

          <div
            role="tablist"
            aria-label="Inspect content format styles"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            {CONTENT_FORMATS.map((fmt, idx) => {
              const isSelected = fmt.id === selectedFormat.id;
              return (
                <ScrollReveal key={fmt.id} delay={idx * 0.05} yOffset={20} hoverLift>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveFormatId(fmt.id)}
                    className={`w-full h-full group text-left rounded-2xl border p-5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] ${
                      isSelected
                        ? 'border-[#E53935] bg-[#181417]'
                        : 'border-white/10 bg-[#131317] hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-medium text-[#E53935]">{fmt.genre}</span>
                      <ArrowUpRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isSelected
                            ? 'text-[#E53935] translate-x-0.5 -translate-y-0.5'
                            : 'text-[#8C8A94] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#F4F2EC]'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <h4 className="text-lg font-semibold text-[#F4F2EC] mb-1.5">
                      {fmt.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-[#A6A4AE] leading-relaxed">
                      {fmt.description}
                    </p>
                  </button>
                </ScrollReveal>
              );
            })}
          </div>

          {/* Live Selected Format Production Breakdown Panel */}
          <ScrollReveal yOffset={18}>
            <div
              data-testid="format-breakdown-panel"
              className="rounded-2xl border border-white/10 bg-[#131317] p-6 sm:p-8"
            >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/8 mb-6">
              <div>
                <p className="text-xs font-medium text-[#E53935] mb-1">
                  Production Profile · {selectedFormat.genre}
                </p>
                <h4 className="text-xl sm:text-2xl font-semibold text-[#F4F2EC]">
                  {selectedFormat.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() =>
                  onSelectFormat(
                    selectedFormat.genre,
                    selectedFormat.focusPreset,
                    selectedFormat.lightingMood,
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] text-xs font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 whitespace-nowrap shrink-0 self-start md:self-auto"
              >
                Focus 3D Studio on {selectedFormat.genre}
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-medium text-[#8C8A94] mb-1.5">Vocal Delivery</p>
                <p className="text-sm text-[#D0CEC8] leading-relaxed">
                  {selectedFormat.vocalStyle}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#8C8A94] mb-1.5">Editing Tempo</p>
                <p className="text-sm text-[#D0CEC8] leading-relaxed">
                  {selectedFormat.editingTempo}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#8C8A94] mb-1.5">Signature Edge</p>
                <p className="text-sm text-[#D0CEC8] leading-relaxed">
                  {selectedFormat.signatureElement}
                </p>
              </div>
            </div>
          </div>
          </ScrollReveal>
        </div>

        {/* Skills in Practice (3D Tilt Hover Cards) & Creative Strengths */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-4">
          <div className="lg:col-span-8">
            <ScrollReveal>
              <p className="text-xs font-medium text-[#E53935] mb-2">
                Skills in Practice
              </p>
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F4F2EC] mb-8">
                Hands-on production capabilities.
              </h3>
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {SKILLS_IN_PRACTICE.map((skill, idx) => (
                <ScrollReveal
                  key={skill.name}
                  delay={(idx % 2) * 0.06}
                  yOffset={20}
                  hoverLift
                >
                  <InteractiveCard
                    maxTilt={4}
                    className="h-full rounded-2xl border border-white/10 bg-[#131317] p-6 hover:border-white/25 transition-colors duration-200"
                  >
                    <div className="relative z-20">
                      <div className="flex items-baseline justify-between gap-2 mb-2">
                        <h4 className="text-base font-semibold text-[#F4F2EC]">
                          {skill.name}
                        </h4>
                        <span className="text-xs text-[#E53935] whitespace-nowrap shrink-0">
                          {skill.level}
                        </span>
                      </div>
                      <p className="text-sm text-[#A6A4AE] leading-relaxed mb-4">
                        {skill.description}
                      </p>
                      <p className="text-xs text-[#8C8A94] pt-3 border-t border-white/8">
                        {skill.formats}
                      </p>
                    </div>
                  </InteractiveCard>
                </ScrollReveal>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4">
            <ScrollReveal>
              <p className="text-xs font-medium text-[#E53935] mb-2">
                Creative Strengths
              </p>
              <h3 className="text-2xl font-semibold tracking-tight text-[#F4F2EC] mb-8">
                What holds it together.
              </h3>
            </ScrollReveal>

            <div className="divide-y divide-white/10 border-y border-white/10">
              {CREATIVE_STRENGTHS.map((strength, idx) => (
                <ScrollReveal
                  key={strength.title}
                  delay={idx * 0.05}
                  yOffset={16}
                  className="py-5 transition-transform duration-200 hover:translate-x-1.5"
                >
                  <div className="flex items-baseline gap-2.5 mb-1.5">
                    <span className="text-xs font-mono tabular-nums text-[#8C8A94]">
                      0{idx + 1}
                    </span>
                    <h4 className="text-base font-semibold text-[#F4F2EC]">
                      {strength.title}
                    </h4>
                  </div>
                  <p className="text-sm text-[#A6A4AE] leading-relaxed pl-6">
                    {strength.detail}
                  </p>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
