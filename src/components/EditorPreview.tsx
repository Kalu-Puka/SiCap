import React, { useRef, useEffect } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { ProjectState } from '../core/types';

interface EditorPreviewProps {
  state: ProjectState;
  isPlaying: boolean;
  onPlayToggle: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onChangeAspectRatio: (ratio: '16:9' | '9:16' | '1:1') => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function EditorPreview({
  state,
  isPlaying,
  onPlayToggle,
  onStop,
  onSeek,
  onChangeAspectRatio,
  canvasRef,
  isMuted,
  onToggleMute,
}: EditorPreviewProps) {
  
  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  const handleStep = (amount: number) => {
    onSeek(Math.min(state.duration, Math.max(0, state.currentTime + amount)));
  };

  // Determine aspect container styling
  const getAspectRatioClass = () => {
    switch (state.aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] h-[340px] md:h-[400px]';
      case '1:1':
        return 'aspect-square h-[340px] md:h-[400px]';
      case '16:9':
      default:
        return 'aspect-video w-full max-w-[560px]';
    }
  };

  return (
    <div className="flex-1 bg-[#0b0f19] flex flex-col items-center justify-center p-6 select-none relative">
      {/* Top Controls: Aspect Ratio and Metadata */}
      <div className="w-full max-w-[560px] flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-slate-500" />
          <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-400">
            Preview Settings
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-sans text-slate-500 mr-1">Aspect:</span>
          {(['16:9', '9:16', '1:1'] as const).map(ratio => (
            <button
              key={ratio}
              onClick={() => onChangeAspectRatio(ratio)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-colors ${
                state.aspectRatio === ratio
                  ? 'bg-violet-600/20 text-violet-400 border-violet-500/50'
                  : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas Frame Container */}
      <div className="relative flex items-center justify-center bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden mb-6">
        <div className={getAspectRatioClass()}>
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>
      </div>

      {/* Player transport/controls bar */}
      <div className="w-full max-w-[560px] bg-slate-900 border border-slate-800 rounded-xl px-5 py-3.5 flex flex-col gap-3">
        {/* Playback progress seek bar */}
        <div className="relative group w-full h-1 bg-slate-950 rounded cursor-pointer">
          <input
            type="range"
            min={0}
            max={state.duration || 10}
            step={0.01}
            value={state.currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div 
            className="absolute top-0 left-0 bottom-0 bg-violet-500 rounded group-hover:bg-violet-400"
            style={{ width: `${(state.currentTime / (state.duration || 10)) * 100}%` }}
          />
        </div>

        {/* Action button triggers */}
        <div className="flex items-center justify-between">
          {/* Leftside current time indicators */}
          <div className="font-mono text-xs text-slate-400 select-text">
            <span className="text-violet-400">{formatTimecode(state.currentTime)}</span>
            <span className="text-slate-600"> / </span>
            <span className="text-slate-500">{formatTimecode(state.duration)}</span>
          </div>

          {/* Center Transport Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleStep(-1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer transition-colors"
              title="Backward 1 second"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={onPlayToggle}
              className="p-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>

            <button
              onClick={onStop}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer transition-colors"
              title="Stop and reset to start"
            >
              <Square className="h-4 w-4" />
            </button>

            <button
              onClick={() => handleStep(1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer transition-colors"
              title="Forward 1 second"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Right Utility Buttons (Mute controls) */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
