import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Upload, Volume2, Maximize, RefreshCw, Layers, AlertCircle } from 'lucide-react';
import { CaptionSegment, StyleConfig, FONT_PRESETS, FontPreset } from '../types';
import { convertToLegacySafe } from '../utils/legacyConverter';
import { drawCaptionFrame } from '../utils/canvasRenderer';

interface VideoPlayerProps {
  videoUrl: string | null;
  segments: CaptionSegment[];
  styleConfig: StyleConfig;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  onVideoUpload: (file: File) => void;
  isTranscribing: boolean;
  transcribeMode: 'sinhala-direct' | 'english-to-sinhala' | 'english-direct';
  onTranscribeModeChange: (mode: 'sinhala-direct' | 'english-to-sinhala' | 'english-direct') => void;
  fonts?: FontPreset[];
  onChangeStyle?: (partial: Partial<StyleConfig>) => void;
  duration?: number;
  setDuration?: (duration: number) => void;
}

// Fast cache for legacy font conversion
const conversionCache = new Map<string, string>();

export default function VideoPlayer({
  videoUrl,
  segments,
  styleConfig,
  currentTime,
  setCurrentTime,
  onVideoUpload,
  isTranscribing,
  transcribeMode,
  onTranscribeModeChange,
  fonts,
  onChangeStyle,
  duration: propsDuration,
  setDuration: propsSetDuration
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const captionRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [localDuration, setLocalDuration] = useState(0);

  const duration = propsDuration !== undefined ? propsDuration : localDuration;
  const setDuration = (val: number) => {
    setLocalDuration(val);
    if (propsSetDuration) {
      propsSetDuration(val);
    }
  };
  const [volume, setVolume] = useState(0.8);
  const [activeSegment, setActiveSegment] = useState<CaptionSegment | null>(null);
  const [prevSegment, setPrevSegment] = useState<CaptionSegment | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Layout sizing states for precise auto-scaling & dragging
  const [videoRenderedWidth, setVideoRenderedWidth] = useState<number>(0);
  const [videoRenderedHeight, setVideoRenderedHeight] = useState<number>(0);
  const [autoScale, setAutoScale] = useState<number>(1);
  
  // Font checking & dragging states
  const [fontLoadError, setFontLoadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isAudioFile = !!videoUrl?.match(/\.(mp3|wav|m4a|aac|ogg|flac|mpeg)(?:\?|$)/i);
  
  const allFonts = fonts || FONT_PRESETS;
  const selectedFont = allFonts.find(f => f.family === styleConfig.fontFamily);
  const isLegacy = selectedFont?.fontType === 'legacy';

  const formatText = (text: string) => {
    if (isLegacy) {
      const cacheKey = `${styleConfig.fontFamily}_${text}`;
      if (conversionCache.has(cacheKey)) {
        return conversionCache.get(cacheKey)!;
      }
      try {
        const converted = convertToLegacySafe(text, styleConfig.fontFamily);
        conversionCache.set(cacheKey, converted);
        return converted;
      } catch (err) {
        console.warn('Unicode to Legacy translation failed in preview:', err);
        return text;
      }
    }
    return text;
  };

  const renderHighlightedSegmentText = (seg: CaptionSegment) => {
    const text = seg.text;
    
    // Support bypassing highlight effect completely separate from color
    if (styleConfig.highlightEnabled === false) {
      return formatText(text);
    }

    const words = text.trim().split(/\s+/);
    if (words.length <= 1) {
      return formatText(text);
    }

    const duration = seg.end - seg.start;
    const elapsed = (currentTime * 1000) - seg.start;
    const activeWordIndex = Math.min(
      words.length - 1,
      Math.max(0, Math.floor((elapsed / duration) * words.length))
    );

    return (
      <span className="inline-flex flex-wrap justify-center gap-x-[0.25em]">
        {words.map((word, idx) => {
          const isHighlighted = idx === activeWordIndex;
          const wordStyle: React.CSSProperties = {};
          if (isHighlighted) {
            if (styleConfig.gradientEnabled) {
              wordStyle.backgroundImage = 'none';
              wordStyle.WebkitBackgroundClip = 'unset';
              wordStyle.WebkitTextFillColor = styleConfig.highlightColor || '#facc15';
            } else {
              wordStyle.color = styleConfig.highlightColor || '#facc15';
            }
          }
          return (
            <span
              key={idx}
              style={wordStyle}
              className="inline-block transition-colors duration-100"
            >
              {formatText(word)}
            </span>
          );
        })}
      </span>
    );
  };

  // Font verification listener (FontFace API)
  useEffect(() => {
    let active = true;
    setFontLoadError(null);
    const family = styleConfig.fontFamily;
    if (!family || family === 'Inter' || family === 'sans-serif') return;

    const fontDesc = `12px "${family}"`;
    const checkFontLoad = () => {
      try {
        const isLoaded = document.fonts.check(fontDesc);
        if (isLoaded) {
          if (active) setFontLoadError(null);
        } else {
          document.fonts.ready.then(() => {
            if (!active) return;
            if (document.fonts.check(fontDesc)) {
              setFontLoadError(null);
            } else {
              setFontLoadError(`Font "${family}" failed to load on this browser. Raw Latin characters may show up instead of Sinhala shapes. Try uploading a custom .ttf file.`);
            }
          }).catch((err) => {
            console.error("FontFace ready check error:", err);
          });
        }
      } catch (err) {
        console.warn("document.fonts API is not supported in this browser:", err);
      }
    };

    checkFontLoad();
    return () => {
      active = false;
    };
  }, [styleConfig.fontFamily]);

  // Handle active word/segment selection & play state with high-resolution frame ticks
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId: number;
    const updateTimeLoop = () => {
      if (video) {
        const t = video.currentTime;
        setCurrentTime(t);

        const currentMs = t * 1000;
        const active = segments.find(seg => currentMs >= seg.start && currentMs <= seg.end);
        
        const activeTextChanged = active?.text !== activeSegment?.text;
        const activeIdChanged = active?.id !== activeSegment?.id;
        const activeTimingChanged = active?.start !== activeSegment?.start || active?.end !== activeSegment?.end;

        if (active && (activeIdChanged || activeTextChanged || activeTimingChanged)) {
          setPrevSegment(activeSegment);
          setActiveSegment(active);
        } else if (!active && activeSegment) {
          setPrevSegment(activeSegment);
          setActiveSegment(null);
        }

        // Real-time canvas rendering matching export
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (active) {
              drawCaptionFrame(ctx, active, styleConfig, currentMs, isLegacy);
            }
          }
        }
      }
      rafId = requestAnimationFrame(updateTimeLoop);
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(updateTimeLoop);
    } else {
      // Direct update when paused
      const t = video.currentTime;
      const currentMs = t * 1000;
      const active = segments.find(seg => currentMs >= seg.start && currentMs <= seg.end);
      if (active) {
        setActiveSegment(active);
      } else {
        setActiveSegment(null);
      }

      // Draw once on pause
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (active) {
            drawCaptionFrame(ctx, active, styleConfig, currentMs, isLegacy);
          }
        }
      }
    }

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isPlaying, segments, activeSegment, setCurrentTime, styleConfig, isLegacy]);

  // Redraw helper for static property adjustments
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentMs = video.currentTime * 1000;
    const active = segments.find(seg => currentMs >= seg.start && currentMs <= seg.end);
    if (active) {
      drawCaptionFrame(ctx, active, styleConfig, currentMs, isLegacy);
    }
  };

  // Keep canvas in sync with non-playing updates (e.g. style change or manual seek)
  useEffect(() => {
    redrawCanvas();
  }, [currentTime, styleConfig, videoRenderedWidth, videoRenderedHeight, isLegacy, segments]);

  // Synchronize playback basic details
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoUrl]);

  // Explicitly sync volume, un-mute, and play-state audio
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = false;
    }
  }, [volume, videoUrl, isPlaying]);

  // Dynamic Video bounds checking for letterbox exclusions
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateRenderedSize = () => {
      const { videoWidth, videoHeight, clientWidth, clientHeight } = video;
      if (!videoWidth || !videoHeight || !clientWidth || !clientHeight) return;

      const containerRatio = clientWidth / clientHeight;
      const videoRatio = videoWidth / videoHeight;

      let renderedW = clientWidth;
      let renderedH = clientHeight;

      if (videoRatio > containerRatio) {
        renderedH = clientWidth / videoRatio;
      } else {
        renderedW = clientHeight * videoRatio;
      }

      setVideoRenderedWidth(renderedW);
      setVideoRenderedHeight(renderedH);
    };

    const observer = new ResizeObserver(updateRenderedSize);
    observer.observe(video);
    video.addEventListener('loadedmetadata', updateRenderedSize);

    return () => {
      observer.disconnect();
      video.removeEventListener('loadedmetadata', updateRenderedSize);
    };
  }, [videoUrl]);

  // Auto-fit dynamic text scaling to prevent screen overflows
  useEffect(() => {
    const captionEl = captionRef.current;
    if (!captionEl) return;

    setAutoScale(1);

    const frameId = requestAnimationFrame(() => {
      const parentWidth = videoRenderedWidth || captionEl.parentElement?.clientWidth || 500;
      const maxWidth = parentWidth * 0.9; // 90% of video width safe area
      const currentWidth = captionEl.scrollWidth;

      if (currentWidth > maxWidth) {
        const ratio = maxWidth / currentWidth;
        setAutoScale(Math.max(0.4, ratio)); // floor at 40% font scaling
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [activeSegment, styleConfig.fontSize, styleConfig.fontFamily, videoRenderedWidth]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(e => console.error("Error playing video:", e));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const seekTime = parseFloat(e.target.value);
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const vol = parseFloat(e.target.value);
    video.volume = vol;
    setVolume(vol);
  };

  const toggleFullscreen = () => {
    const videoContainer = videoRef.current?.parentElement;
    if (!videoContainer) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoContainer.requestFullscreen();
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        onVideoUpload(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        onVideoUpload(file);
      }
    }
  };

  const getSubtitleStyle = () => {
    const baseWidth = 1920;
    const currentWidth = videoRenderedWidth || 1280;
    const scaleRatio = currentWidth / baseWidth;
    const minFontSize = Math.max(14, 24 * scaleRatio);
    const finalFontSize = Math.max(minFontSize, styleConfig.fontSize * autoScale);
    const sizeScale = finalFontSize / styleConfig.fontSize;

    const segmentDuration = activeSegment ? (activeSegment.end - activeSegment.start) : 1000;
    const animDuration = Math.min(250, Math.max(60, segmentDuration * 0.45));

    const styles: React.CSSProperties = {
      fontFamily: styleConfig.fontFamily,
      fontSize: `${finalFontSize}px`,
      WebkitTextStroke: `${styleConfig.strokeWidth * sizeScale}px ${styleConfig.strokeColor}`,
      textShadow: styleConfig.shadowBlur > 0 ? `0 0 ${styleConfig.shadowBlur * sizeScale}px ${styleConfig.shadowColor}` : 'none',
      animationDuration: `${animDuration}ms`,
    };

    if (styleConfig.gradientEnabled) {
      styles.backgroundImage = `linear-gradient(to right, ${styleConfig.gradientStart}, ${styleConfig.gradientEnd})`;
      styles.WebkitBackgroundClip = 'text';
      styles.WebkitTextFillColor = 'transparent';
    } else {
      styles.color = styleConfig.textColor;
    }

    // Traceable debug logging for preview
    console.debug("[සිCaps Preview Render Log] Styled Segment:", {
      fontFamily: styleConfig.fontFamily,
      fontSize: styleConfig.fontSize,
      calculatedFinalFontSize: finalFontSize,
      textColor: styleConfig.textColor,
      strokeColor: styleConfig.strokeColor,
      strokeWidth: styleConfig.strokeWidth,
      shadowColor: styleConfig.shadowColor,
      shadowBlur: styleConfig.shadowBlur,
      positionX: styleConfig.positionX,
      positionY: styleConfig.positionY,
      gradientEnabled: styleConfig.gradientEnabled,
      gradientStart: styleConfig.gradientStart,
      gradientEnd: styleConfig.gradientEnd,
      highlightEnabled: styleConfig.highlightEnabled,
      highlightColor: styleConfig.highlightColor,
      activeSegmentText: activeSegment?.text
    });

    return styles;
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  // Pointer position drag mapping
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Left pointer button only
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !onChangeStyle) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;

    // Constrain inside safe margins
    x = Math.max(5, Math.min(95, x));
    y = Math.max(5, Math.min(95, y));

    onChangeStyle({
      positionX: Math.round(x),
      positionY: Math.round(y)
    });
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Safe percentage boundaries for captions
  const posX = styleConfig.positionX !== undefined ? styleConfig.positionX : 50;
  const posY = styleConfig.positionY !== undefined ? styleConfig.positionY : 80;

  return (
    <div className="flex flex-col w-full bg-[#090d16] border border-slate-800 rounded-2xl p-4 md:p-6 shadow-2xl relative select-none">
      {/* Visual Header / Indicator for the Video Stage */}
      <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-400 font-sans uppercase tracking-widest px-1">
        <span className="flex items-center gap-1.5 text-violet-400">
          <Layers className="h-3.5 w-3.5 animate-pulse" />
          සිCaps Stage Preview
        </span>
        <span className="text-[10px] bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-500 font-mono">
          {isAudioFile ? "Audio Visualizer" : "Video Display 1080p"}
        </span>
      </div>

      {/* Aspect Container */}
      <div 
        className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-900 bg-black flex items-center justify-center shadow-inner"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {videoUrl ? (
          <div className="relative w-full h-full group" ref={containerRef}>
            {/* HTML5 Video */}
            <video
              ref={videoRef}
              src={videoUrl}
              className={isAudioFile ? "w-0 h-0 opacity-0 absolute pointer-events-none" : "w-full h-full object-contain bg-black"}
              onClick={togglePlay}
            />

            {/* Font load status warning banner */}
            {fontLoadError && (
              <div className="absolute top-4 left-4 right-4 bg-red-950/90 border border-red-500/30 rounded-lg px-3 py-2 flex items-center gap-2 text-red-200 text-xs pointer-events-auto shadow-lg backdrop-blur-sm z-30 animate-fade-in">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span className="flex-1 font-sans">{fontLoadError}</span>
              </div>
            )}

            {/* Audio Waveform visualizer if it is an audio file */}
            {isAudioFile && (
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 cursor-pointer select-none"
                onClick={togglePlay}
              >
                <div className="flex items-center gap-1.5 h-16 justify-center">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-12 bg-gradient-to-t from-violet-600 to-fuchsia-400 rounded-full origin-bottom"
                      style={{
                        transform: isPlaying ? 'none' : 'scaleY(0.15)',
                        animation: isPlaying ? `audioWaveBounce ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate` : 'none',
                        animationDelay: `${i * 0.05}s`
                      }}
                    />
                  ))}
                </div>
                <span className="font-sans text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-4">
                  Audio Track Playback Visualizer
                </span>
              </div>
            )}

            {/* Subtitle Overlay Canvas Container */}
            <div 
              className="absolute pointer-events-none select-none z-20 overflow-hidden"
              style={{
                left: `${videoRef.current ? (videoRef.current.clientWidth - videoRenderedWidth) / 2 : 0}px`,
                top: `${videoRef.current ? (videoRef.current.clientHeight - videoRenderedHeight) / 2 : 0}px`,
                width: `${videoRenderedWidth || '100%'}px`,
                height: `${videoRenderedHeight || '100%'}px`,
              }}
            >
              <canvas
                ref={canvasRef}
                width={videoRenderedWidth || 1280}
                height={videoRenderedHeight || 720}
                style={{
                  width: `${videoRenderedWidth || '100%'}px`,
                  height: `${videoRenderedHeight || '100%'}px`,
                  pointerEvents: 'auto',
                  cursor: isDragging ? 'grabbing' : 'grab',
                }}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
              />
            </div>

          </div>
        ) : (
          /* Empty Drag/Upload Workspace */
          <label className="flex flex-col items-center justify-center p-12 text-center cursor-pointer w-full h-full hover:bg-slate-900/40 transition-colors">
            <input 
              type="file" 
              accept="video/mp4,video/webm,audio/mp3,audio/wav,audio/mpeg,audio/m4a,audio/x-m4a" 
              onChange={handleFileInput} 
              className="hidden" 
              disabled={isTranscribing}
            />
            {isTranscribing ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full border-4 border-violet-900/50 border-t-violet-500 animate-spin"></div>
                  <Layers className="h-6 w-6 text-violet-400 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-semibold text-white animate-pulse">
                    Gemini AI Transcribing Subtitles...
                  </h3>
                  <p className="font-sans text-xs text-slate-400 mt-1 max-w-sm">
                    Uploading file to Gemini. Flash model is scanning audio tracks and generating Sinhala & English Unicode timings. Please wait...
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className={`p-4 rounded-full border border-dashed transition-colors ${dragActive ? 'border-violet-500 bg-violet-950/20 text-violet-400 scale-105' : 'border-slate-700 text-slate-500'}`}>
                  <Upload className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-semibold text-white">
                    Upload Your Video or Audio
                  </h3>
                  <p className="font-sans text-xs text-slate-400 mt-1">
                    Drag & Drop or click to browse (MP4, WebM, MP3, WAV, M4A)
                  </p>
                </div>

                {/* AI Captioning Mode Segmented Control */}
                <div className="mt-2.5 flex flex-col items-center gap-2 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                  <span className="font-sans text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    AI Subtitle Generation Mode
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 w-full">
                    <button
                      type="button"
                      onClick={() => onTranscribeModeChange('sinhala-direct')}
                      className={`py-2 px-1.5 rounded-lg font-sans text-[11px] font-semibold transition-all cursor-pointer text-center ${
                        transcribeMode === 'sinhala-direct'
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      🗣️ Sinhala ➔ Sinhala
                    </button>
                    <button
                      type="button"
                      onClick={() => onTranscribeModeChange('english-to-sinhala')}
                      className={`py-2 px-1.5 rounded-lg font-sans text-[11px] font-semibold transition-all cursor-pointer text-center ${
                        transcribeMode === 'english-to-sinhala'
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      🇬🇧 English ➔ Sinhala
                    </button>
                    <button
                      type="button"
                      onClick={() => onTranscribeModeChange('english-direct')}
                      className={`py-2 px-1.5 rounded-lg font-sans text-[11px] font-semibold transition-all cursor-pointer text-center ${
                        transcribeMode === 'english-direct'
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      🇬🇧 English ➔ English
                    </button>
                  </div>
                </div>

                <div className="mt-1 rounded bg-slate-950/40 px-3 py-1 text-[10px] font-mono text-slate-500 border border-slate-800/40">
                  Sinhala Unicode & English Optimized
                </div>
              </div>
            )}
          </label>
        )}
      </div>

      {/* Persistent Transport Bar directly under the stage */}
      {videoUrl && (
        <div className="mt-4 flex flex-col gap-3 bg-slate-950/85 border border-slate-800/80 rounded-xl p-3.5 shadow-md">
          {/* Progress Slider (Scrubber) */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-400 min-w-[50px] text-right">
              {formatSeconds(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-violet-500 hover:accent-violet-400 focus:outline-none transition-all"
            />
            <span className="font-mono text-xs text-slate-400 min-w-[50px]">
              {formatSeconds(duration)}
            </span>
          </div>

          {/* Controls bar */}
          <div className="flex items-center justify-between gap-4">
            {/* Play/Pause & Volume controls */}
            <div className="flex items-center gap-3">
              <button 
                onClick={togglePlay}
                className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white cursor-pointer shadow-md shadow-violet-900/10 transition-all flex items-center justify-center border border-violet-500/30"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 fill-current" />}
              </button>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                <Volume2 className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 rounded bg-slate-700 accent-violet-500 appearance-none cursor-pointer"
                  title="Volume"
                />
              </div>
            </div>

            {/* Scale/Status and Fullscreen */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900/50 px-2 py-1 rounded border border-slate-800/30">
                {Math.round(autoScale * 100)}% scale
              </span>
              <button 
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer border border-slate-800 transition-all"
                title="Toggle Fullscreen"
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
