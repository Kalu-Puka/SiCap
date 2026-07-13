import React, { useRef, useState, useEffect } from 'react';
import { Clock, ZoomIn, ZoomOut, Scissors, Trash2, Layers, Move, ArrowLeft, ArrowRight } from 'lucide-react';
import { ProjectState, TimelineClip, TimelineTrack } from '../core/types';

interface TimelineEditorProps {
  state: ProjectState;
  selectedClip: TimelineClip | null;
  onSelectClip: (clip: TimelineClip | null) => void;
  onUpdateClip: (clipId: string, updatedFields: Partial<TimelineClip>) => void;
  onDeleteClip: (clipId: string) => void;
  onSplitClip: (clipId: string) => void;
  onSeek: (time: number) => void;
  onAddTextClip: () => void;
}

export default function TimelineEditor({
  state,
  selectedClip,
  onSelectClip,
  onUpdateClip,
  onDeleteClip,
  onSplitClip,
  onSeek,
  onAddTextClip,
}: TimelineEditorProps) {
  const [zoom, setZoom] = useState(30); // pixels per second
  const timelineTracksRef = useRef<HTMLDivElement>(null);

  // Drag states
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'trim-start' | 'trim-end' | null>(null);
  const [dragStartMouseX, setDragStartMouseX] = useState(0);
  const [dragStartClipStart, setDragStartClipStart] = useState(0);
  const [dragStartClipDuration, setDragStartClipDuration] = useState(0);
  const [dragStartClipTrim, setDragStartClipTrim] = useState(0);

  const duration = state.duration || 10;
  const tracks = state.tracks;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Seek to playhead position
    if (!timelineTracksRef.current) return;
    const rect = timelineTracksRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineTracksRef.current.scrollLeft;
    const targetTime = Math.max(0, Math.min(duration, x / zoom));
    
    // Ignore clicks on clips for seek
    const clickedElement = e.target as HTMLElement;
    if (clickedElement.closest('.timeline-clip')) return;

    onSeek(targetTime);
  };

  const handleClipPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    clip: TimelineClip,
    type: 'move' | 'trim-start' | 'trim-end'
  ) => {
    e.stopPropagation();
    onSelectClip(clip);
    
    setDraggingClipId(clip.id);
    setDragType(type);
    setDragStartMouseX(e.clientX);
    setDragStartClipStart(clip.start);
    setDragStartClipDuration(clip.duration);
    setDragStartClipTrim(clip.trimStart);

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleClipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingClipId || !dragType) return;
    e.stopPropagation();

    const clip = tracks
      .flatMap(t => t.clips)
      .find(c => c.id === draggingClipId);
    if (!clip) return;

    const deltaX = e.clientX - dragStartMouseX;
    const deltaSeconds = deltaX / zoom;

    if (dragType === 'move') {
      const newStart = Math.max(0, Math.min(duration - clip.duration, dragStartClipStart + deltaSeconds));
      onUpdateClip(clip.id, { start: newStart });
    } else if (dragType === 'trim-start') {
      // Shifting trim-start moves both the start position and duration
      const maxDeltaSeconds = dragStartClipDuration - 0.2; // minimum duration of 0.2s
      const actualDelta = Math.max(-dragStartClipTrim, Math.min(maxDeltaSeconds, deltaSeconds));
      
      onUpdateClip(clip.id, {
        start: dragStartClipStart + actualDelta,
        duration: dragStartClipDuration - actualDelta,
        trimStart: dragStartClipTrim + actualDelta,
      });
    } else if (dragType === 'trim-end') {
      const newDuration = Math.max(0.2, dragStartClipDuration + deltaSeconds);
      onUpdateClip(clip.id, { duration: newDuration });
    }
  };

  const handleClipPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setDraggingClipId(null);
    setDragType(null);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Build ticks / time numbers
  const renderTimeRuler = () => {
    const ticks = [];
    const step = zoom < 15 ? 10 : zoom < 40 ? 5 : 2; // grid resolution based on zoom
    for (let sec = 0; sec <= duration; sec += step) {
      ticks.push(
        <div
          key={sec}
          className="absolute border-l border-slate-800 h-4 flex flex-col justify-between"
          style={{ left: `${sec * zoom}px` }}
        >
          <span className="text-[9px] font-mono text-slate-500 pl-1 mt-0.5">
            {sec}s
          </span>
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="bg-[#090d16] border-t border-slate-800 flex flex-col h-72 select-none">
      {/* Timeline Controls / Header */}
      <div className="border-b border-slate-800 px-5 py-3.5 flex items-center justify-between bg-[#0b101c]/60">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-violet-400" />
            <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-slate-300">
              Multi-Track Editor Timeline
            </h4>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => selectedClip && onSplitClip(selectedClip.id)}
              disabled={!selectedClip}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 disabled:opacity-40 cursor-pointer transition-all"
              title="Split selected clip at current playhead position"
            >
              <Scissors className="h-3 w-3" />
              <span>Split</span>
            </button>

            <button
              onClick={() => selectedClip && onDeleteClip(selectedClip.id)}
              disabled={!selectedClip}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-900 disabled:opacity-40 cursor-pointer transition-all"
              title="Delete selected clip"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Zoom adjustment tools */}
        <div className="flex items-center gap-3">
          <ZoomOut className="h-3.5 w-3.5 text-slate-500" />
          <input
            type="range"
            min="10"
            max="120"
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
            className="w-24 accent-violet-600 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
          />
          <ZoomIn className="h-3.5 w-3.5 text-slate-500" />
        </div>
      </div>

      {/* Tracks Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Track Names Column */}
        <div className="w-32 bg-slate-950 border-r border-slate-800 flex flex-col justify-start flex-shrink-0 pt-6">
          {tracks.map(track => (
            <div
              key={track.id}
              className="h-14 border-b border-slate-800/60 px-4 flex flex-col justify-center bg-[#090d16]/40"
            >
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                {track.name}
              </span>
              <span className="text-[9px] font-mono text-slate-600 mt-0.5">
                {track.clips.length} clips
              </span>
            </div>
          ))}
        </div>

        {/* Scrolling Tracks Content Area */}
        <div
          ref={timelineTracksRef}
          onClick={handleTimelineClick}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-slate-950 flex flex-col pt-6 cursor-crosshair"
          style={{ contentVisibility: 'auto' }}
        >
          {/* 1. Time Ruler Top Panel */}
          <div className="absolute top-0 left-0 right-0 h-6 bg-[#0a0f1a] border-b border-slate-800 z-10">
            {renderTimeRuler()}
          </div>

          {/* 2. Vertically Traversing Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 shadow-[0_0_8px_rgba(239,68,68,0.8)] pointer-events-none"
            style={{ left: `${state.currentTime * zoom}px` }}
          />

          {/* 3. Tracks Content Grid */}
          <div className="relative flex-1" style={{ width: `${duration * zoom}px` }}>
            {tracks.map(track => (
              <div
                key={track.id}
                className="h-14 border-b border-slate-800/60 relative flex items-center bg-[#090d16]/10"
              >
                {track.clips.map(clip => {
                  const isSelected = selectedClip?.id === clip.id;
                  const left = clip.start * zoom;
                  const width = clip.duration * zoom;

                  return (
                    <div
                      key={clip.id}
                      onPointerDown={(e) => handleClipPointerDown(e, clip, 'move')}
                      onPointerMove={handleClipPointerMove}
                      onPointerUp={handleClipPointerUp}
                      className={`timeline-clip absolute top-1.5 bottom-1.5 rounded-lg flex items-center justify-between overflow-hidden px-2 border cursor-grab select-none active:cursor-grabbing transition-all ${
                        isSelected
                          ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-900/30'
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300'
                      }`}
                      style={{ left: `${left}px`, width: `${width}px` }}
                    >
                      {/* Left Trim Handle */}
                      <div
                        onPointerDown={(e) => handleClipPointerDown(e, clip, 'trim-start')}
                        className="w-1.5 h-full hover:bg-white/40 cursor-col-resize absolute left-0 top-0 bottom-0 flex items-center justify-center text-white/50"
                        title="Drag to trim start"
                      >
                        <ArrowLeft className="h-1.5 w-1.5" />
                      </div>

                      {/* Clip Name/Label Content */}
                      <div className="mx-2 truncate text-[10px] font-sans font-medium flex-1 text-center">
                        {clip.type === 'video' ? '🎬 Video Clip' : clip.type === 'audio' ? '🎵 Audio Clip' : '📝 Text Clip'}
                      </div>

                      {/* Right Trim Handle */}
                      <div
                        onPointerDown={(e) => handleClipPointerDown(e, clip, 'trim-end')}
                        className="w-1.5 h-full hover:bg-white/40 cursor-col-resize absolute right-0 top-0 bottom-0 flex items-center justify-center text-white/50"
                        title="Drag to trim end"
                      >
                        <ArrowRight className="h-1.5 w-1.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
