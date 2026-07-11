import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Upload, Volume2, Maximize, RefreshCw, Layers } from 'lucide-react';
import { CaptionSegment, StyleConfig, FONT_PRESETS, FontPreset } from '../types';
import { unicodeToDlManel } from 'sinhala-unicode-coverter';

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
}

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
  fonts
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [activeSegment, setActiveSegment] = useState<CaptionSegment | null>(null);
  const [prevSegment, setPrevSegment] = useState<CaptionSegment | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const isAudioFile = !!videoUrl?.match(/\.(mp3|wav|m4a|aac|ogg|flac|mpeg)(?:\?|$)/i);
  
  const allFonts = fonts || FONT_PRESETS;
  const selectedFont = allFonts.find(f => f.family === styleConfig.fontFamily);
  const isLegacy = selectedFont?.fontType === 'legacy';

  const formatText = (text: string) => {
    if (isLegacy) {
      try {
        return unicodeToDlManel(text);
      } catch (err) {
        console.warn('Unicode to Legacy translation failed in preview:', err);
        return text;
      }
    }
    return text;
  };

  const renderHighlightedSegmentText = (seg: CaptionSegment) => {
    const text = seg.text;
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

  // Synchronize playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoUrl, setCurrentTime]);

  // Handle active word/segment selection for kinetic overlay
  useEffect(() => {
    const currentMs = currentTime * 1000;
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
  }, [currentTime, segments, activeSegment]);

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

  // Drag-and-drop file upload handlers
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

  // Build the dynamic CSS styles for subtitle captions
  const getSubtitleStyle = () => {
    const selectedFont = allFonts.find(f => f.family === styleConfig.fontFamily);
    const styles: React.CSSProperties = {
      fontFamily: styleConfig.fontFamily,
      fontSize: `${styleConfig.fontSize}px`,
      WebkitTextStroke: `${styleConfig.strokeWidth}px ${styleConfig.strokeColor}`,
      textShadow: styleConfig.shadowBlur > 0 ? `0 0 ${styleConfig.shadowBlur}px ${styleConfig.shadowColor}` : 'none',
    };

    if (styleConfig.gradientEnabled) {
      styles.backgroundImage = `linear-gradient(to right, ${styleConfig.gradientStart}, ${styleConfig.gradientEnd})`;
      styles.WebkitBackgroundClip = 'text';
      styles.WebkitTextFillColor = 'transparent';
    } else {
      styles.color = styleConfig.textColor;
    }

    return styles;
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Aspect Container */}
      <div 
        className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-[#020617] flex items-center justify-center shadow-2xl"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {videoUrl ? (
          <div className="relative w-full h-full group">
            {/* HTML5 Video */}
            <video
              ref={videoRef}
              src={videoUrl}
              className={isAudioFile ? "w-0 h-0 opacity-0 absolute pointer-events-none" : "w-full h-full object-contain bg-black"}
              onClick={togglePlay}
            />

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

            {/* Subtitle Overlay Container */}
            <div className="absolute inset-x-0 bottom-12 top-0 pointer-events-none flex items-center justify-center p-6 select-none">
              
              {/* Normal caption background card if needed */}
              <div 
                className="transition-all duration-200 rounded-lg px-4 py-2 text-center max-w-[85%]"
                style={{ 
                  backgroundColor: activeSegment ? styleConfig.backgroundColor : 'transparent' 
                }}
              >
                {/* Dual-state render: active and previous caption words */}
                {styleConfig.animationPreset === 'apple-keynote' ? (
                  <div className="relative flex flex-col items-center justify-center">
                    {/* Previous Fade Out Word */}
                    {prevSegment && !activeSegment && (
                      <span 
                        className="absolute text-slate-600/40 transform scale-75 opacity-0 transition-all duration-150 line-clamp-1"
                        style={{ fontFamily: styleConfig.fontFamily, fontSize: `${styleConfig.fontSize * 0.8}px` }}
                      >
                        {formatText(prevSegment.text)}
                      </span>
                    )}
                    {/* Active Pop-Up Kinetic Word */}
                    {activeSegment && (
                      <span 
                        key={activeSegment.id}
                        className="animate-apple-keynote inline-block transform"
                        style={getSubtitleStyle()}
                      >
                        {renderHighlightedSegmentText(activeSegment)}
                      </span>
                    )}
                  </div>
                ) : (
                  // Other 9 customized animation transitions
                  activeSegment && (
                    <span
                      key={activeSegment.id}
                      className={`inline-block font-bold tracking-wide ${
                        styleConfig.animationPreset === 'bounce' ? 'animate-caption-bounce' :
                        styleConfig.animationPreset === 'fade-in' ? 'animate-caption-fade' :
                        styleConfig.animationPreset === 'pop' ? 'animate-caption-pop' :
                        styleConfig.animationPreset === 'slide-up' ? 'animate-caption-slide' :
                        styleConfig.animationPreset === 'kinetic-zoom' ? 'animate-caption-zoom' :
                        styleConfig.animationPreset === 'shake' ? 'animate-caption-shake' :
                        styleConfig.animationPreset === 'neon-glow' ? 'animate-caption-neon' :
                        styleConfig.animationPreset === 'karaoke-fill' ? 'animate-caption-karaoke' :
                        styleConfig.animationPreset === 'glitch' ? 'animate-caption-glitch' : ''
                      }`}
                      style={getSubtitleStyle()}
                    >
                      {renderHighlightedSegmentText(activeSegment)}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Custom Control Bar overlay on hover */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
              {/* Progress Slider */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-slate-300">
                  {formatSeconds(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.01}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-violet-500 focus:outline-none"
                />
                <span className="font-mono text-[10px] text-slate-300">
                  {formatSeconds(duration)}
                </span>
              </div>

              {/* Main Control Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg bg-slate-900/80 text-slate-200 hover:text-white cursor-pointer border border-slate-800"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>

                  <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                    <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 rounded bg-slate-700 accent-violet-500 appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg bg-slate-900/80 text-slate-200 hover:text-white cursor-pointer border border-slate-800"
                  >
                    <Maximize className="h-4 w-4" />
                  </button>
                </div>
              </div>
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
    </div>
  );
}
