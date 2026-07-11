import { useState } from 'react';
import { Clock, Edit2, Plus, Trash2, Check, X, ChevronRight, HelpCircle, Sparkles, Keyboard, Languages, Loader2 } from 'lucide-react';
import { CaptionSegment } from '../types';
import { convertSinglishToSinhala } from '../utils/sinhalaConverter';

interface TimelineProps {
  segments: CaptionSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateSegment: (id: string, updatedFields: Partial<CaptionSegment>) => void;
  onAddSegment: () => void;
  onDeleteSegment: (id: string) => void;
  onPolishSegment?: (id: string, text: string, mode: 'polish' | 'translate') => Promise<string | undefined>;
  isTranscribing?: boolean;
}

export default function Timeline({
  segments,
  currentTime,
  onSeek,
  onUpdateSegment,
  onAddSegment,
  onDeleteSegment,
  onPolishSegment,
  isTranscribing = false
}: TimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');
  const [singlishEnabled, setSinglishEnabled] = useState(true);
  const [polishingId, setPolishingId] = useState<string | null>(null);

  const currentMs = currentTime * 1000;

  const startEditing = (seg: CaptionSegment) => {
    if (!seg.id) return;
    setEditingId(seg.id);
    setTempText(seg.text);
  };

  const handleTextChange = (val: string) => {
    if (singlishEnabled) {
      setTempText(convertSinglishToSinhala(val));
    } else {
      setTempText(val);
    }
  };

  const triggerPolish = async (id: string, mode: 'polish' | 'translate') => {
    if (!onPolishSegment) return;
    setPolishingId(id);
    try {
      const result = await onPolishSegment(id, tempText, mode);
      if (result !== undefined) {
        setTempText(result);
      }
    } finally {
      setPolishingId(null);
    }
  };

  const saveEditing = (id: string) => {
    onUpdateSegment(id, { text: tempText });
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleNudge = (id: string, field: 'start' | 'end', amountMs: number) => {
    const seg = segments.find(s => s.id === id);
    if (!seg) return;
    const currentVal = seg[field];
    const newVal = Math.max(0, currentVal + amountMs);
    onUpdateSegment(id, { [field]: newVal });
  };

  const formatMs = (ms: number) => {
    const totalSecs = ms / 1000;
    const m = Math.floor(totalSecs / 60);
    const s = Math.floor(totalSecs % 60);
    const cents = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cents).padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl flex flex-col h-full min-h-[280px]">
      {/* Panel Header */}
      <div className="border-b border-slate-800 px-5 py-3 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-violet-400" />
          <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-slate-300">
            Interactive Captions Timeline
          </h2>
          <span className="rounded bg-slate-950 border border-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-500">
            {segments.length} segments
          </span>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <HelpCircle className="h-3 w-3 text-slate-600" />
            Double-click a cell text to correct Sinhala Unicode manually.
          </p>
          <button
            onClick={onAddSegment}
            className="flex items-center gap-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-sans text-xs px-2.5 py-1 transition-colors cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Grid Timeline List */}
      <div className="flex-1 overflow-y-auto max-h-[300px] p-4">
        {isTranscribing ? (
          <div className="flex flex-col gap-3 py-4 animate-pulse">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
              <span className="flex items-center gap-1.5 font-semibold text-violet-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating captions with Gemini AI...
              </span>
              <span className="font-mono text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">EST: 10s</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-3.5 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="h-3.5 bg-slate-800/80 rounded w-1/3"></div>
                    <div className="h-3 bg-slate-800/50 rounded w-8"></div>
                  </div>
                  <div className="h-4 bg-slate-800/90 rounded w-3/4 my-1.5"></div>
                  <div className="flex justify-between border-t border-slate-800/40 pt-2.5">
                    <div className="h-2.5 bg-slate-800/60 rounded w-1/5"></div>
                    <div className="h-2.5 bg-slate-800/60 rounded w-1/5"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-sans text-slate-500 text-xs">No transcription segments generated yet.</p>
            <p className="font-sans text-slate-600 text-[11px] mt-1">Upload a video to automatically transcribe speech using Gemini AI.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {segments.map((seg, idx) => {
              const isActive = currentMs >= seg.start && currentMs <= seg.end;
              const isEditing = editingId === seg.id;

              return (
                <div
                  key={seg.id || idx}
                  className={`group relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-violet-950/20 border-violet-500/50 shadow-[0_0_12px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/30'
                      : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/80'
                  }`}
                >
                  {/* Top Bar: Timing info and quick actions */}
                  <div className="flex items-center justify-between gap-1 mb-2.5">
                    <button
                      onClick={() => onSeek(seg.start / 1000)}
                      className="font-mono text-[10px] text-slate-400 hover:text-violet-400 transition-colors flex items-center gap-1 select-none cursor-pointer"
                      title="Seek player here"
                    >
                      <Clock className="h-3 w-3 text-slate-600" />
                      <span>{formatMs(seg.start)}</span>
                      <ChevronRight className="h-2.5 w-2.5 text-slate-600" />
                      <span>{formatMs(seg.end)}</span>
                    </button>

                    <button
                      onClick={() => onDeleteSegment(seg.id!)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                      title="Delete segment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Text Container: Editable on Double Click */}
                  <div className="min-h-[44px] flex items-center mb-3">
                    {isEditing ? (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={tempText}
                            onChange={(e) => handleTextChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditing(seg.id!)}
                            className="flex-1 bg-slate-950 text-white rounded px-2.5 py-1.5 text-xs border border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 font-sans"
                            autoFocus
                            placeholder={singlishEnabled ? "Type in Singlish (e.g. oyaa)" : "Type here..."}
                          />
                          <button
                            onClick={() => saveEditing(seg.id!)}
                            className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer flex-shrink-0"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer flex-shrink-0"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Typing / AI Tool Ribbon */}
                        <div className="flex items-center justify-between gap-1">
                          {/* Left helper tools */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSinglishEnabled(!singlishEnabled)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border cursor-pointer transition-colors ${
                                singlishEnabled 
                                  ? 'bg-violet-950/40 text-violet-300 border-violet-800' 
                                  : 'bg-slate-900 text-slate-500 border-slate-800'
                              }`}
                              title="Convert Singlish letters to Sinhala Unicode as you type"
                            >
                              <Keyboard className="h-2.5 w-2.5" />
                              <span>Singlish: {singlishEnabled ? 'ON' : 'OFF'}</span>
                            </button>
                          </div>

                          {/* Right AI Assist tools */}
                          {onPolishSegment && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={polishingId !== null}
                                onClick={() => triggerPolish(seg.id!, 'polish')}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 hover:bg-violet-950/20 text-violet-400 hover:text-violet-300 border border-slate-800 hover:border-violet-800/50 text-[9px] font-medium cursor-pointer transition-colors disabled:opacity-50"
                                title="AI checks grammar & converts Singlish/text to correct Sinhala"
                              >
                                {polishingId === seg.id ? (
                                  <Loader2 className="h-2.5 w-2.5 animate-spin text-violet-400" />
                                ) : (
                                  <Sparkles className="h-2.5 w-2.5" />
                                )}
                                <span>AI Polish</span>
                              </button>
                              
                              <button
                                type="button"
                                disabled={polishingId !== null}
                                onClick={() => triggerPolish(seg.id!, 'translate')}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 hover:bg-indigo-950/20 text-indigo-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-800/50 text-[9px] font-medium cursor-pointer transition-colors disabled:opacity-50"
                                title="Translate English subtitle segment to Sinhala"
                              >
                                <Languages className="h-2.5 w-2.5" />
                                <span>AI Translate</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        onDoubleClick={() => startEditing(seg)}
                        className="w-full font-sans text-xs text-slate-100 hover:bg-slate-800/50 rounded px-1.5 py-1 -mx-1.5 cursor-pointer flex justify-between items-center group-hover:border-slate-700"
                        title="Double click to edit Sinhala text"
                      >
                        <span className="font-sans font-medium select-text line-clamp-2 leading-relaxed">
                          {seg.text}
                        </span>
                        <Edit2 className="h-3 w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0" />
                      </div>
                    )}
                  </div>

                  {/* Bottom Panel: Micro timing fine-tuning triggers */}
                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-2.5 mt-auto">
                    {/* Start Nudge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-slate-500 font-medium">Start:</span>
                      <div className="flex rounded bg-slate-950 overflow-hidden border border-slate-800 text-[10px]">
                        <button
                          onClick={() => handleNudge(seg.id!, 'start', -100)}
                          className="px-1.5 py-0.5 hover:bg-slate-900 text-slate-400 border-r border-slate-800 hover:text-white cursor-pointer"
                          title="-100ms"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleNudge(seg.id!, 'start', 100)}
                          className="px-1.5 py-0.5 hover:bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
                          title="+100ms"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* End Nudge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono text-slate-500 font-medium">End:</span>
                      <div className="flex rounded bg-slate-950 overflow-hidden border border-slate-800 text-[10px]">
                        <button
                          onClick={() => handleNudge(seg.id!, 'end', -100)}
                          className="px-1.5 py-0.5 hover:bg-slate-900 text-slate-400 border-r border-slate-800 hover:text-white cursor-pointer"
                          title="-100ms"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleNudge(seg.id!, 'end', 100)}
                          className="px-1.5 py-0.5 hover:bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
                          title="+100ms"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
