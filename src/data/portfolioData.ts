import type {
  ContentFormatSpec,
  ExperienceItem,
  SkillGroup,
} from '../types/portfolio';

export const PROFILE = {
  name: 'Bhuvi Chauhan',
  roles: 'Content Creator · Video Editor · Stand-Up Comedian',
  headline: 'Stories that chill, timing that lands, edits that hold attention.',
  lead:
    'Emerging content creator working across voiceover-led horror storytelling, stand-up comedy, Minecraft & Valorant gaming edits, and conversational food and convention vlogs. Combining expressive delivery with hands-on video editing across recorded and live formats.',
  phone: '+91 85952 18085',
  phoneHref: 'tel:+918595218085',
  email: 'bhuvichauhan01@gmail.com',
  emailHref: 'mailto:bhuvichauhan01@gmail.com',
  cvPdfPath: '/assets/aistudio/Bhuvi_Chauhan_CV__2__957bacb5.pdf',
  defaultPortraitPath: '/assets/portrait.jpg',
};

export const HERO_HIGHLIGHTS = [
  {
    value: '05 Formats',
    label: 'Horror, Comedy, Gaming, Vlogs & Events',
  },
  {
    value: 'Intermediate',
    label: 'Video Editing for Gaming & Vlogs',
  },
  {
    value: 'Live Stage',
    label: 'Stand-Up Comedy & Audience Delivery',
  },
  {
    value: '2 Conventions',
    label: 'Horror Con & Comic Con On-Ground',
  },
];

export const EXPERIENCE_ITEMS: ExperienceItem[] = [
  {
    id: 'exp-independent',
    index: '01',
    role: 'Independent Content Creator',
    organization: 'Personal Content Projects',
    category: 'Content Creation & Editing',
    summary:
      'End-to-end ideation, voiceover performance, on-camera hosting, and intermediate video editing across five distinct content formats.',
    highlights: [
      'Create voiceover-led horror-story content, using narration to build atmosphere and bring stories to life.',
      'Develop funny and comedy-focused content, using humour and an expressive style to make videos entertaining.',
      'Produce gaming edits and stream-related content featuring Minecraft and Valorant.',
      'Create food vlogs and personal vlogs, presenting experiences in a conversational and relatable way.',
      'Apply intermediate video-editing skills across gaming and vlog projects to shape and refine videos for sharing.',
      'Explore multiple content genres, adapting presentation style to suit storytelling, gaming, and lifestyle audiences.',
    ],
    deliverables: [
      'Narrated Horror Episodes',
      'Comedic Short Videos',
      'Valorant & Minecraft Cuts',
      'Food & Personal Vlogs',
    ],
  },
  {
    id: 'exp-standup',
    index: '02',
    role: 'Stand-Up Comedian',
    organization: 'Live Performance & Communication',
    category: 'Stage & Audience Delivery',
    summary:
      'Translating live comedy timing and stage confidence directly into narrated videos, streams, and host-led content.',
    highlights: [
      'Use humour, verbal expression, and performance skills as part of stand-up comedy sets.',
      'Bring confident communication to content presentation, voiceovers, vlogging, and audience-facing interactions.',
    ],
    deliverables: [
      'Live Stand-Up Sets',
      'Audience Crowd Interaction',
      'Expressive Vocal Delivery',
    ],
  },
  {
    id: 'exp-comiccon',
    index: '03',
    role: 'Volunteer & Content Creator',
    organization: 'Comic Con',
    category: 'Convention & On-Ground Coverage',
    summary:
      'Dual on-ground role supporting live convention operations while capturing authentic event content.',
    highlights: [
      'Volunteer at Comic Con while actively creating content related to the event.',
      'Combine on-ground event participation with content creation to capture and share the Comic Con experience.',
    ],
    deliverables: [
      'Event Floor Volunteering',
      'Comic Con Content Reels',
      'Attendee Storytelling',
    ],
  },
  {
    id: 'exp-horrorcon',
    index: '04',
    role: 'Event Volunteer',
    organization: 'Horror Con',
    category: 'Event Operations & Discipline',
    summary:
      'Hands-on live crowd coordination helping maintain a smooth, well-organised convention environment.',
    highlights: [
      'Assist with discipline management during the event, helping maintain order and an organised environment.',
      'Support the event experience by upholding discipline and guiding attendees to follow event instructions.',
    ],
    deliverables: [
      'Crowd & Discipline Management',
      'Live Event Coordination',
      'Attendee Guidance',
    ],
  },
];

export const SKILLS_IN_PRACTICE: SkillGroup[] = [
  {
    name: 'Video Editing',
    level: 'Intermediate',
    description:
      'Shaping raw gaming captures and vlog footage into tight, share-ready edits with pacing tailored to each format.',
    formats: 'Gaming Montages · Vlogs · Short Reels',
  },
  {
    name: 'Voiceovers & Narration',
    level: 'Core Specialty',
    description:
      'Vocal pacing, atmospheric tension, and expressive character delivery for story-led horror pieces and comedic scripts.',
    formats: 'Horror Stories · Comedic Narration',
  },
  {
    name: 'Gaming Content',
    level: 'Active Creator',
    description:
      'Producing entertaining gaming edits and stream-style content built around Minecraft and Valorant.',
    formats: 'Minecraft · Valorant · Stream Highlights',
  },
  {
    name: 'Vlogging & Hosting',
    level: 'On-Camera',
    description:
      'Conversational, relatable storytelling for food trails, everyday lifestyle diaries, and convention floor coverage.',
    formats: 'Food Vlogs · Personal Vlogs · Comic Con',
  },
  {
    name: 'Communication & Comedy',
    level: 'Live & Recorded',
    description:
      'Clear verbal expression, stand-up stage presence, and engaging delivery across audiences and formats.',
    formats: 'Stand-Up Sets · Audience Interaction',
  },
  {
    name: 'Event & Team Support',
    level: 'Convention Tested',
    description:
      'Reliable on-ground coordination, discipline management, and collaborative volunteering in live convention environments.',
    formats: 'Horror Con · Comic Con',
  },
];

export const CONTENT_FORMATS: ContentFormatSpec[] = [
  {
    id: 'fmt-horror',
    title: 'Horror Storytelling',
    genre: 'Horror',
    description: 'Story-led videos and atmospheric voiceover narration that build suspense.',
    focusPreset: 'horror-storytelling',
    lightingMood: 'horror-noir',
    vocalStyle: 'Measured whispers, controlled suspense pauses, and immersive tone shifts.',
    editingTempo: 'Slow-burn visual tension punctuated by sharp audio cues.',
    signatureElement: 'Voiceover-led storytelling that turns minimal visuals into gripping atmosphere.',
  },
  {
    id: 'fmt-comedy',
    title: 'Comedy & Stand-Up',
    genre: 'Comedy',
    description: 'Funny scripted videos, expressive commentary, and live stand-up sets.',
    focusPreset: 'voice-comedy',
    lightingMood: 'warm-stage',
    vocalStyle: 'Expressive punchlines, conversational warmth, and natural comedic timing.',
    editingTempo: 'Snappy reaction cuts synced tightly to beats and punchlines.',
    signatureElement: 'Stage-tested stand-up confidence carried straight into camera presence.',
  },
  {
    id: 'fmt-gaming',
    title: 'Gaming Edits',
    genre: 'Gaming',
    description: 'Minecraft and Valorant streams, highlights, and rhythmic edits.',
    focusPreset: 'video-editing',
    lightingMood: 'edit-suite',
    vocalStyle: 'High-energy callouts, deadpan humour, and spontaneous stream banter.',
    editingTempo: 'Tight highlight trims, punchy transitions, and momentum-driven pacing.',
    signatureElement: 'Balancing competitive Valorant clutches with chaotic Minecraft moments.',
  },
  {
    id: 'fmt-vlogs',
    title: 'Food, Lifestyle & Events',
    genre: 'Vlogs & Events',
    description: 'Conversational food vlogs, personal diaries, and Comic Con coverage.',
    focusPreset: 'overview',
    lightingMood: 'warm-stage',
    vocalStyle: 'Friendly, relatable, unscripted storytelling that feels like hanging out.',
    editingTempo: 'Rhythmic B-roll weaves keeping food trails and convention floors lively.',
    signatureElement: 'On-ground event fluency backed by real Comic Con & Horror Con experience.',
  },
];

export const CREATIVE_STRENGTHS = [
  {
    title: 'Genre Versatility',
    detail: 'Comfortable moving naturally across horror, humour, gaming, and lifestyle content.',
  },
  {
    title: 'Storytelling',
    detail: 'Uses voiceovers and structured narration to communicate ideas and build mood.',
  },
  {
    title: 'Expressive Delivery',
    detail: 'Combines humour, clear verbal expression, and live performance confidence.',
  },
  {
    title: 'Adaptability',
    detail: 'Shifts cleanly between recorded edits, gaming streams, vlogs, and live stages.',
  },
];
