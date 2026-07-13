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
  highlightColor: string;
  backgroundCardEnabled: boolean;
  highlightEnabled: boolean;
  positionX: number; // percentage (0-100)
  positionY: number; // percentage (0-100)
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

import { EMBEDDED_FONTS } from './utils/embeddedFonts';

export interface FontPreset {
  id: string;
  name: string;
  family: string;
  url: string;
  isLocal: boolean;
  fontType: 'unicode' | 'legacy';
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

export const FONT_PRESETS: FontPreset[] = EMBEDDED_FONTS
  .filter(font => font.id !== 'un-ganganee')
  .map(font => ({
    id: font.id,
    name: font.name,
    family: font.family,
    url: `data:font/ttf;base64,${font.base64Data}`,
    isLocal: true,
    fontType: font.fontType
  }));
