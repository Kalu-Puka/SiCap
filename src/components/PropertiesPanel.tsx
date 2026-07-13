import React from 'react';
import { Settings2, Volume2, Move, Percent, Sliders, Trash2, Scissors } from 'lucide-react';
import { TimelineClip } from '../core/types';

interface PropertiesPanelProps {
  selectedClip: TimelineClip | null;
  onUpdateClipProperties: (clipId: string, updatedFields: Partial<TimelineClip>) => void;
  onSplitClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
}

export default function PropertiesPanel({
  selectedClip,
  onUpdateClipProperties,
  onSplitClip,
  onDeleteClip,
}: PropertiesPanelProps) {
  if (!selectedClip) {
    return (
      <div className="bg-slate-900 border-l border-slate-800 w-72 flex flex-col h-full select-none p-5 text-center justify-center">
        <Sliders className="h-10 w-10 text-slate-700 mx-auto mb-3" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          No Clip Selected
        </h3>
        <p className="text-[11px] font-sans text-slate-500 mt-2 leading-relaxed">
          Click on any video, audio, or text clip on the timeline below to customize its volume, position, scale, and properties.
        </p>
      </div>
    );
  }

  const handleTransformChange = (field: 'x' | 'y' | 'scale' | 'opacity', val: number) => {
    onUpdateClipProperties(selectedClip.id, {
      transform: {
        ...selectedClip.transform,
        [field]: val,
      },
    });
  };

  return (
    <div className="bg-slate-900 border-l border-slate-800 w-72 flex flex-col h-full select-none">
      {/* Properties Header */}
      <div className="border-b border-slate-800 p-4 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-violet-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Clip Properties
        </h3>
      </div>

      <div className="flex-1 p-5 space-y-6 overflow-y-auto">
        {/* Clip Type badge */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
            Type: {selectedClip.type}
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            ID: {selectedClip.id.slice(-6)}
          </span>
        </div>

        {/* 1. Scale & Positioning Adjustments */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-slate-400 font-sans text-xs font-semibold">
            <Move className="h-3.5 w-3.5" />
            <span>Transform & Layout</span>
          </div>

          {/* Scale Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Scale</span>
              <span className="font-mono text-slate-400">{(selectedClip.transform.scale * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.05"
              value={selectedClip.transform.scale}
              onChange={(e) => handleTransformChange('scale', parseFloat(e.target.value))}
              className="w-full accent-violet-600 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Opacity Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Opacity</span>
              <span className="font-mono text-slate-400">{(selectedClip.transform.opacity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={selectedClip.transform.opacity}
              onChange={(e) => handleTransformChange('opacity', parseFloat(e.target.value))}
              className="w-full accent-violet-600 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Position X Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Offset X</span>
              <span className="font-mono text-slate-400">{selectedClip.transform.x.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={selectedClip.transform.x}
              onChange={(e) => handleTransformChange('x', parseInt(e.target.value))}
              className="w-full accent-violet-600 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Position Y Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Offset Y</span>
              <span className="font-mono text-slate-400">{selectedClip.transform.y.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={selectedClip.transform.y}
              onChange={(e) => handleTransformChange('y', parseInt(e.target.value))}
              className="w-full accent-violet-600 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* 2. Audio Level Adjustments */}
        {(selectedClip.type === 'video' || selectedClip.type === 'audio') && (
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 font-sans text-xs font-semibold">
              <Volume2 className="h-3.5 w-3.5" />
              <span>Audio Level</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Volume</span>
                <span className="font-mono text-slate-400">{(selectedClip.volume * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={selectedClip.volume}
                onChange={(e) => onUpdateClipProperties(selectedClip.id, { volume: parseFloat(e.target.value) })}
                className="w-full accent-violet-600 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 3. Fast Edit Actions */}
        <div className="space-y-3 pt-6 border-t border-slate-800">
          <button
            onClick={() => onSplitClip(selectedClip.id)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 py-2.5 font-sans text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors"
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>Split Clip</span>
          </button>

          <button
            onClick={() => onDeleteClip(selectedClip.id)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-950/20 border border-red-900/30 hover:border-red-500/50 hover:bg-red-950/40 py-2.5 font-sans text-xs font-semibold text-red-400 hover:text-red-300 cursor-pointer transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Clip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
