export interface CaptionSegment {
  text: string;
  start: number; // in milliseconds
  end: number;   // in milliseconds
  id?: string;   // optional unique ID for frontend react lists
}

export interface StyleConfig {
  textColor: string;
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number; // in pixels
  shadowColor: string;
  shadowBlur: number; // in pixels
  fontSize: number; // in pixels
  fontFamily: string;
  gradientEnabled: boolean;
  gradientStart: string;
  gradientEnd: string;
  animationPreset: string;
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl: string;
  styleConfig: StyleConfig;
  segments: CaptionSegment[];
  outputUrl?: string;
  createdAt: string;
  error?: string;
  ffmpegCommand?: string;
  remotionCommand?: string;
}

export interface FontPreset {
  id: string;
  name: string;
  family: string;
  url: string;
  isLocal: boolean;
}

export const ANIMATION_PRESETS = [
  { id: 'apple-keynote', name: 'Apple Event Kinetic' },
  { id: 'bounce', name: 'Bounce Pop' },
  { id: 'fade-in', name: 'Smooth Fade In' },
  { id: 'pop', name: 'Scale Pop' },
  { id: 'slide-up', name: 'Slide Up Reveal' },
  { id: 'kinetic-zoom', name: 'Kinetic Zoom Focus' },
  { id: 'shake', name: 'Energetic Shake' },
  { id: 'neon-glow', name: 'Neon Pulsing Glow' },
  { id: 'karaoke-fill', name: 'Karaoke Text Fill' },
  { id: 'glitch', name: 'Cyberpunk Glitch' }
];

export const FONT_PRESETS: FontPreset[] = [
  { id: 'inter', name: 'Inter (Sans-Serif)', family: 'Inter', url: '', isLocal: false },
  { id: 'fm-abhaya', name: 'Abhaya Libre (Sinhala Serif)', family: 'Abhaya Libre', url: 'https://fonts.gstatic.com/s/abhayalibre/v11/V780wz66DMyEHzK0--1idS9uS_8.woff2', isLocal: false },
  { id: 'yaso', name: 'FM Yaso (Sinhala Custom TTF)', family: 'FMYaso', url: '/fonts/FMYASO.ttf', isLocal: true },
  { id: 'malithi', name: 'FM Malithi (Sinhala Custom TTF)', family: 'FMMalithi', url: '/fonts/FMMALITHI.ttf', isLocal: true },
  { id: 'space-grotesk', name: 'Space Grotesk (Tech Mono)', family: 'Space Grotesk', url: '', isLocal: false }
];
