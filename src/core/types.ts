export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'audio' | 'image';
  duration: number; // in seconds
  width?: number;
  height?: number;
  fileSize?: number;
}

export interface TimelineClip {
  id: string;
  assetId?: string; // empty if it's a generator like text
  type: 'video' | 'audio' | 'text' | 'overlay';
  start: number; // on the timeline in seconds
  duration: number; // on the timeline in seconds
  trimStart: number; // media trim start in seconds
  volume: number; // volume multiplier (0.0 to 1.0)
  
  // Visual transformations and properties
  transform: {
    x: number; // percentage offset -50 to 50
    y: number; // percentage offset -50 to 50
    scale: number; // multiplier e.g. 1.0
    opacity: number; // 0.0 to 1.0
  };

  // Text specific properties (Phase 2 & 3 support)
  textProperties?: {
    text: string;
    fontSize: number;
    fontFamily: string;
    textColor: string;
    backgroundColor: string;
    strokeColor: string;
    strokeWidth: number;
    shadowColor: string;
    shadowBlur: number;
    gradientEnabled: boolean;
    gradientStart: string;
    gradientEnd: string;
    animationPreset: string;
    highlightEnabled: boolean;
    highlightColor: string;
    backgroundCardEnabled: boolean;
  };
}

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'text' | 'overlay';
  name: string;
  clips: TimelineClip[];
  isMuted?: boolean;
  isLocked?: boolean;
}

export interface ProjectState {
  projectName: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  currentTime: number; // playhead in seconds
  duration: number; // timeline length in seconds
  tracks: TimelineTrack[];
  assets: MediaAsset[];
}

export interface HistoryState {
  past: ProjectState[];
  present: ProjectState;
  future: ProjectState[];
}
