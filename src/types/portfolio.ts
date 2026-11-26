export type VideoGenre =
  | 'All'
  | 'Horror'
  | 'Comedy'
  | 'Gaming'
  | 'Vlogs & Events';

export type VideoSourceKind = 'published' | 'manifest' | 'local-upload';

export interface VideoWork {
  id: string;
  dbId?: number;
  title: string;
  genre: Exclude<VideoGenre, 'All'>;
  role: string;
  duration: string;
  year: string;
  summary: string;
  sourceKind: VideoSourceKind;
  videoUrl: string;
  posterUrl?: string;
  artworkTheme: 'horror' | 'comedy' | 'gaming' | 'events' | 'food';
  featured?: boolean;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  publicVideoUrl?: string;
  createdAt?: number;
}

export type StudioFocusPreset =
  | 'overview'
  | 'voice-comedy'
  | 'video-editing'
  | 'horror-storytelling';

export type StudioLightingMood = 'warm-stage' | 'horror-noir' | 'edit-suite';

export interface ExperienceItem {
  id: string;
  index: string;
  role: string;
  organization: string;
  category: string;
  summary: string;
  highlights: string[];
  deliverables: string[];
}

export interface SkillGroup {
  name: string;
  level: string;
  description: string;
  formats: string;
}

export interface ContentFormatSpec {
  id: string;
  title: string;
  genre: Exclude<VideoGenre, 'All'>;
  description: string;
  focusPreset: StudioFocusPreset;
  lightingMood: StudioLightingMood;
  vocalStyle: string;
  editingTempo: string;
  signatureElement: string;
}

export interface ContactFormValues {
  name: string;
  email: string;
  contactNumber: string;
  projectType: string;
  message: string;
}

export interface ContactValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof ContactFormValues, string>>;
}

export type InquiryStatus = 'new' | 'contacted' | 'booked' | 'archived';

export interface InquiryRecord {
  id: number;
  name: string;
  email: string;
  contactNumber: string;
  projectType: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt?: string;
}
