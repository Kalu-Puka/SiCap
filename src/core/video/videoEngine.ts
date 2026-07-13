import { ProjectState, TimelineClip } from '../types';

/**
 * Core Video Engine
 * Manages video element caching, preloading, seeking, synchronization, and Canvas composition.
 */
export class VideoEngine {
  private videoCache: Map<string, HTMLVideoElement> = new Map();
  private playing = false;

  constructor() {
    console.log('[Core Video Engine] Initialized');
  }

  /**
   * Get or create a video element for a timeline clip
   */
  public getVideoElement(clip: TimelineClip, url: string): HTMLVideoElement {
    if (!clip.id) throw new Error('Clip ID is required');
    
    let video = this.videoCache.get(clip.id);
    if (!video) {
      video = document.createElement('video');
      video.src = url;
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.playsInline = true;
      video.muted = true; // Always keep muted, audio is played via separate audio node / controls
      
      // Load event helpers
      video.addEventListener('error', (e) => {
        console.error(`[VideoEngine] Error loading video for clip ${clip.id}:`, e);
      });
      
      this.videoCache.set(clip.id, video);
    }
    return video;
  }

  /**
   * Cleanup resources for clip IDs that are no longer present
   */
  public syncCache(clips: TimelineClip[], urlMap: Map<string, string>) {
    const activeIds = new Set(clips.map(c => c.id));
    for (const [id, video] of this.videoCache.entries()) {
      if (!activeIds.has(id)) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        this.videoCache.delete(id);
      }
    }

    // Preload remaining clips
    clips.forEach(clip => {
      if (clip.assetId) {
        const url = urlMap.get(clip.assetId);
        if (url) {
          this.getVideoElement(clip, url);
        }
      }
    });
  }

  /**
   * Update video elements' playback rates and current playhead positions
   */
  public updatePlayback(state: ProjectState, isPlaying: boolean, urlMap: Map<string, string>) {
    this.playing = isPlaying;
    const { currentTime, tracks } = state;

    tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.type !== 'video' || !clip.assetId) return;
        const url = urlMap.get(clip.assetId);
        if (!url) return;

        const video = this.getVideoElement(clip, url);
        const relativeTime = currentTime - clip.start;
        const clipEnd = clip.start + clip.duration;

        const isActive = currentTime >= clip.start && currentTime <= clipEnd;

        if (isActive) {
          const targetMediaTime = clip.trimStart + relativeTime;
          
          // Seek if out of sync
          const delta = Math.abs(video.currentTime - targetMediaTime);
          if (delta > 0.15) {
            video.currentTime = targetMediaTime;
          }

          // Handle Play/Pause
          if (isPlaying) {
            if (video.paused && video.readyState >= 2) {
              video.play().catch(err => {
                console.warn(`[VideoEngine] Play failed for clip ${clip.id}:`, err);
              });
            }
          } else {
            if (!video.paused) {
              video.pause();
            }
          }
        } else {
          // Pause if clip is not active
          if (!video.paused) {
            video.pause();
          }
        }
      });
    });
  }

  /**
   * Render all active video clips onto the Canvas Context
   */
  public renderFrame(
    ctx: CanvasRenderingContext2D,
    state: ProjectState,
    urlMap: Map<string, string>
  ) {
    const { currentTime, tracks, aspectRatio } = state;
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    // 1. Draw solid dark background color for canvas
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Filter video tracks
    const videoTracks = tracks.filter(t => t.type === 'video');

    // 3. Render from bottom to top tracks
    videoTracks.forEach(track => {
      if (track.isMuted) return;

      track.clips.forEach(clip => {
        const clipEnd = clip.start + clip.duration;
        const isActive = currentTime >= clip.start && currentTime <= clipEnd;

        if (isActive && clip.assetId) {
          const url = urlMap.get(clip.assetId);
          if (!url) return;

          const video = this.getVideoElement(clip, url);
          
          // Apply transformation properties
          ctx.save();
          ctx.globalAlpha = clip.transform.opacity;

          // Compute canvas position with scaling and offset adjustments
          const scale = clip.transform.scale;
          const dx = (clip.transform.x / 100) * canvasWidth;
          const dy = (clip.transform.y / 100) * canvasHeight;

          // Draw the video frame centering it in the canvas viewport
          ctx.translate(canvasWidth / 2 + dx, canvasHeight / 2 + dy);
          ctx.scale(scale, scale);

          // Render video frame maintains correct aspect ratio inside bounds
          try {
            if (video.readyState >= 2) {
              const videoRatio = video.videoWidth / video.videoHeight;
              let drawW = canvasWidth;
              let drawH = canvasWidth / videoRatio;

              if (drawH > canvasHeight) {
                drawH = canvasHeight;
                drawW = canvasHeight * videoRatio;
              }

              ctx.drawImage(
                video,
                -drawW / 2,
                -drawH / 2,
                drawW,
                drawH
              );
            } else {
              // Frame loading placeholder
              ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
              ctx.fillRect(-canvasWidth / 4, -canvasHeight / 4, canvasWidth / 2, canvasHeight / 2);
              
              ctx.fillStyle = '#94a3b8';
              ctx.font = '16px "Inter", sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('Loading frame...', 0, 0);
            }
          } catch (e) {
            console.error('[VideoEngine] Failed to draw frame:', e);
          }

          ctx.restore();
        }
      });
    });
  }

  /**
   * Completely stop and clear cache
   */
  public destroy() {
    this.videoCache.forEach(video => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    });
    this.videoCache.clear();
  }
}
