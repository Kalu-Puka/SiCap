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

export const FONT_PRESETS: FontPreset[] = [
  { id: 'inter', name: 'Inter', family: 'Inter', url: '', isLocal: false, fontType: 'unicode' },
  { id: 'fm-abhaya', name: 'Abhaya Libre', family: 'Abhaya Libre', url: 'https://fonts.gstatic.com/s/abhayalibre/v11/V780wz66DMyEHzK0--1idS9uS_8.woff2', isLocal: false, fontType: 'unicode' },
  { id: 'space-grotesk', name: 'Space Grotesk', family: 'Space Grotesk', url: '', isLocal: false, fontType: 'unicode' },
  // Local Sinhala Unicode Fonts
  { id: 'sinhala-sangam-mn', name: 'Sinhala Sangam MN', family: 'Sinhala Sangam MN', url: '/fonts/Sinhala Sangam MN.ttf', isLocal: true, fontType: 'unicode' },
  { id: 'sinhala-sangam-mn-bold', name: 'Sinhala Sangam MN Bold', family: 'Sinhala Sangam MN Bold', url: '/fonts/sinhala-sangam-mn-bold.ttf', isLocal: true, fontType: 'unicode' },
  { id: 'sinhala-mn', name: 'Sinhala MN Regular', family: 'Sinhala MN', url: '/fonts/sinhala-mn-regular.ttf', isLocal: true, fontType: 'unicode' },
  { id: 'nirmala-ui', name: 'Nirmala UI', family: 'Nirmala UI', url: '/fonts/nirmala-ui.ttf', isLocal: true, fontType: 'unicode' },
  { id: 'nirmala-ui-bold', name: 'Nirmala UI Bold', family: 'Nirmala UI Bold', url: '/fonts/nirmala-ui-bold.ttf', isLocal: true, fontType: 'unicode' },
  { id: 'yaldevi', name: 'Yaldevi SemiBold', family: 'Yaldevi', url: '/fonts/Yaldevi-SemiBold.ttf', isLocal: true, fontType: 'unicode' },
  // Local Sinhala Legacy (FM-Style) Fonts
  { id: 'un-emanee', name: 'UN-Emanee', family: 'UN-Emanee', url: '/fonts/un-emanee.TTF', isLocal: true, fontType: 'legacy' },
  { id: 'un-ganganee', name: 'UN-Ganganee', family: 'UN-Ganganee', url: '/fonts/un-ganganee.TTF', isLocal: true, fontType: 'legacy' },
  { id: 'un-gemunu', name: 'UN-Gemunu', family: 'UN-Gemunu', url: '/fonts/un-gemunu.TTF', isLocal: true, fontType: 'legacy' },
  { id: 'isidavas', name: 'ISIDAVAS', family: 'ISIDAVAS', url: '/fonts/ISIDAVAS.TTF', isLocal: true, fontType: 'legacy' },
  { id: 'yaso', name: 'FM Yaso', family: 'FMYaso', url: '/fonts/FMYASO.ttf', isLocal: true, fontType: 'legacy' },
  { id: 'malithi', name: 'FM Malithi', family: 'FMMalithi', url: '/fonts/FMMALITHI.ttf', isLocal: true, fontType: 'legacy' }
];
