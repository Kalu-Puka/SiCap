import { ProjectState } from '../types';
import { VideoEngine } from '../video/videoEngine';
import { TextEngine } from '../text/textEngine';
import { Muxer, ArrayBufferTarget } from 'webm-muxer';

/**
 * Core Export Engine
 * Encodes the active multi-track timeline canvas into a client-side WebM file using WebCodecs and webm-muxer.
 */
export class ExportEngine {
  private muxer: any = null;
  private encoder: VideoEncoder | null = null;
  private isExporting = false;

  constructor() {
    console.log('[Core Export Engine] Initialized');
  }

  /**
   * Export the timeline state into a WebM video in-browser
   */
  public async exportTimeline(
    state: ProjectState,
    videoEngine: VideoEngine,
    textEngine: TextEngine,
    urlMap: Map<string, string>,
    onProgress: (progress: number) => void
  ): Promise<Blob> {
    if (this.isExporting) throw new Error('Export is already in progress');
    this.isExporting = true;

    try {
      // 1. Create a hidden render canvas
      const canvas = document.createElement('canvas');
      canvas.width = state.aspectRatio === '9:16' ? 720 : state.aspectRatio === '1:1' ? 1080 : 1280;
      canvas.height = state.aspectRatio === '9:16' ? 1280 : state.aspectRatio === '1:1' ? 1080 : 720;
      const ctx = canvas.getContext('2d')!;

      const fps = 30;
      const frameDurationSec = 1 / fps;
      const totalDurationSec = state.duration || 5;
      const totalFrames = Math.ceil(totalDurationSec * fps);

      // 2. Setup WebM Muxer
      this.muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: 'V_VP9',
          width: canvas.width,
          height: canvas.height,
        }
      });

      // 3. Setup WebCodecs VideoEncoder
      let framesEncoded = 0;
      let resolveBlob: (blob: Blob) => void;
      let rejectError: (err: any) => void;
      const promise = new Promise<Blob>((res, rej) => {
        resolveBlob = res;
        rejectError = rej;
      });

      this.encoder = new VideoEncoder({
        output: (chunk, metadata) => {
          this.muxer.addVideoChunk(chunk, metadata);
          framesEncoded++;
          onProgress(Math.min(100, Math.floor((framesEncoded / totalFrames) * 100)));

          if (framesEncoded >= totalFrames) {
            this.muxer.finalize();
            const { buffer } = this.muxer.target;
            const blob = new Blob([buffer], { type: 'video/webm' });
            resolveBlob(blob);
          }
        },
        error: (e) => {
          console.error('[ExportEngine] WebCodecs encoder error:', e);
          rejectError(e);
        }
      });

      this.encoder.configure({
        codec: 'vp09.00.10.08', // VP9 Profile 0, level 1.0, 8-bit
        width: canvas.width,
        height: canvas.height,
        bitrate: 2_500_000, // 2.5 Mbps
        framerate: fps,
      });

      // 4. Temporarily override project current time to export frames
      const originalTime = state.currentTime;

      // 5. Render and encode each frame sequentially
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        const currentFrameTime = frameIndex * frameDurationSec;
        const projectFrameState: ProjectState = {
          ...state,
          currentTime: currentFrameTime,
        };

        // Render visual tracks using the video engine
        videoEngine.renderFrame(ctx, projectFrameState, urlMap);

        // Render subtitle/text tracks using text engine
        projectFrameState.tracks.forEach(track => {
          if (track.type === 'text') {
            track.clips.forEach(clip => {
              if (currentFrameTime >= clip.start && currentFrameTime <= clip.start + clip.duration) {
                textEngine.drawTextClip(ctx, clip, currentFrameTime * 1000, false);
              }
            });
          }
        });

        // Capture frame as VideoFrame and encode
        const videoFrame = new VideoFrame(canvas, {
          timestamp: Math.round(currentFrameTime * 1_000_000), // in microseconds
          duration: Math.round(frameDurationSec * 1_000_000),
        });

        const keyFrame = frameIndex % 30 === 0; // Keyframe every 1s
        this.encoder.encode(videoFrame, { keyFrame });
        videoFrame.close();

        // Yield execution to allow UI refresh / avoid freezing main thread
        await new Promise(r => setTimeout(r, 4));
      }

      await this.encoder.flush();

      // Restore original timeline playhead
      state.currentTime = originalTime;

      return promise;
    } catch (e) {
      console.error('[ExportEngine] Export failed:', e);
      throw e;
    } finally {
      this.isExporting = false;
      this.encoder = null;
      this.muxer = null;
    }
  }
}
