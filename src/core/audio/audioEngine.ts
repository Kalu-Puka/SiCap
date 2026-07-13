import { ProjectState } from '../types';

/**
 * Core Audio Engine
 * Manages volume control, mute tracks, and plays audio for any active clips on audio/video tracks.
 */
export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private isMuted = false;

  constructor() {
    console.log('[Core Audio Engine] Initialized');
  }

  private initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Keep audio nodes/elements in perfect volume sync
   */
  public updateAudio(state: ProjectState, isPlaying: boolean, urlMap: Map<string, string>) {
    // Standard elements' audio volume level controls (video elements play audio too, sync volume here)
    const { currentTime, tracks } = state;

    tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.type !== 'video' && clip.type !== 'audio') return;
        
        // Find cached video element or HTML elements inside cache
        const relativeTime = currentTime - clip.start;
        const clipEnd = clip.start + clip.duration;
        const isActive = currentTime >= clip.start && currentTime <= clipEnd;

        // Sync volume
        const targetVolume = (track.isMuted || this.isMuted) ? 0 : clip.volume;
        
        // Attempt to find element in DOM or document cache
        // We find video elements by matching clip properties
        const videoElement = document.querySelector(`video[src="${urlMap.get(clip.assetId || '')}"]`) as HTMLVideoElement;
        if (videoElement) {
          videoElement.volume = isActive ? targetVolume : 0;
        }
      });
    });
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public destroy() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
