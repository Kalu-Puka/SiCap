import { useState, useEffect, useRef } from 'react';
import { Sparkles, HelpCircle, X, Check, FileVideo, Cpu, Undo2, Redo2, Download, Play, Loader2 } from 'lucide-react';
import Header from './components/Header';
import MediaBin from './components/MediaBin';
import EditorPreview from './components/EditorPreview';
import PropertiesPanel from './components/PropertiesPanel';
import TimelineEditor from './components/TimelineEditor';
import { ProjectState, TimelineClip, MediaAsset } from './core/types';
import { VideoEngine } from './core/video/videoEngine';
import { AudioEngine } from './core/audio/audioEngine';
import { GraphicsEngine } from './core/graphics/graphicsEngine';
import { TextEngine } from './core/text/textEngine';
import { ExportEngine } from './core/export/exportEngine';
import { ProjectStore } from './core/storage/projectStore';

export default function App() {
  const [projectState, setProjectState] = useState<ProjectState>(ProjectStore.createDefaultState());
  const [history, setHistory] = useState<{ past: ProjectState[]; future: ProjectState[] }>({ past: [], future: [] });
  const [selectedClip, setSelectedClip] = useState<TimelineClip | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);

  // Asset URL mapping
  const [assetUrlMap, setAssetUrlMap] = useState<Map<string, string>>(new Map());

  // Engine refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoEngine = useRef<VideoEngine | null>(null);
  const textEngine = useRef<TextEngine | null>(null);
  const exportEngine = useRef<ExportEngine | null>(null);
  const audioEngine = useRef<AudioEngine | null>(null);

  // Initialize engines on mount
  useEffect(() => {
    videoEngine.current = new VideoEngine();
    textEngine.current = new TextEngine();
    exportEngine.current = new ExportEngine();
    audioEngine.current = new AudioEngine();

    // Load project from local storage if available
    const saved = ProjectStore.loadProject();
    if (saved) {
      setProjectState(saved);
      // Sync asset URL mapping
      const newMap = new Map<string, string>();
      saved.assets.forEach(asset => {
        newMap.set(asset.id, asset.url);
      });
      setAssetUrlMap(newMap);
    }

    return () => {
      videoEngine.current?.destroy();
      audioEngine.current?.destroy();
    };
  }, []);

  // Update loop for real-time play/pause and frames rendering
  useEffect(() => {
    if (!isPlaying) {
      // Draw static frame when playhead moves or properties change
      if (videoEngine.current) {
        videoEngine.current.updatePlayback(projectState, false, assetUrlMap);
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            videoEngine.current.renderFrame(ctx, projectState, assetUrlMap);
            // Render text clips
            projectState.tracks.forEach(track => {
              if (track.type === 'text') {
                track.clips.forEach(clip => {
                  if (projectState.currentTime >= clip.start && projectState.currentTime <= clip.start + clip.duration) {
                    textEngine.current?.drawTextClip(ctx, clip, projectState.currentTime * 1000, false);
                  }
                });
              }
            });
          }
        }
      }
      return;
    }

    let lastTime = performance.now();
    let animationFrameId: number;

    const loop = (now: number) => {
      const elapsed = (now - lastTime) / 1000;
      lastTime = now;

      setProjectState(prev => {
        let nextTime = prev.currentTime + elapsed;
        if (nextTime >= prev.duration) {
          nextTime = 0;
          setIsPlaying(false);
          return { ...prev, currentTime: 0 };
        }

        const nextState = { ...prev, currentTime: nextTime };

        if (videoEngine.current) {
          videoEngine.current.updatePlayback(nextState, true, assetUrlMap);
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              videoEngine.current.renderFrame(ctx, nextState, assetUrlMap);
              // Render text clips
              nextState.tracks.forEach(track => {
                if (track.type === 'text') {
                  track.clips.forEach(clip => {
                    if (nextTime >= clip.start && nextTime <= clip.start + clip.duration) {
                      textEngine.current?.drawTextClip(ctx, clip, nextTime * 1000, false);
                    }
                  });
                }
              });
            }
          }
        }

        return nextState;
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, projectState, assetUrlMap]);

  // Project State Updater with History Past/Future mapping
  const updateProjectState = (
    updater: ProjectState | ((prev: ProjectState) => ProjectState),
    skipHistory = false
  ) => {
    setProjectState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!skipHistory) {
        setHistory(h => ({
          past: [...h.past.slice(-20), prev],
          future: [],
        }));
      }
      ProjectStore.saveProject(next);
      return next;
    });
  };

  const handleUndo = () => {
    if (history.past.length === 0) return;
    setHistory(h => {
      const previous = h.past[h.past.length - 1];
      const newPast = h.past.slice(0, -1);
      setProjectState(present => {
        ProjectStore.saveProject(previous);
        return previous;
      });
      return {
        past: newPast,
        future: [projectState, ...h.future],
      };
    });
  };

  const handleRedo = () => {
    if (history.future.length === 0) return;
    setHistory(h => {
      const next = h.future[0];
      const newFuture = h.future.slice(1);
      setProjectState(present => {
        ProjectStore.saveProject(next);
        return next;
      });
      return {
        past: [...h.past, projectState],
        future: newFuture,
      };
    });
  };

  // Asset Actions
  const handleAddAsset = (asset: MediaAsset) => {
    updateProjectState(prev => {
      const assets = [...prev.assets, asset];
      setAssetUrlMap(map => {
        const newMap = new Map(map);
        newMap.set(asset.id, asset.url);
        return newMap;
      });
      return { ...prev, assets };
    });
  };

  const handleDeleteAsset = (id: string) => {
    updateProjectState(prev => {
      const assets = prev.assets.filter(a => a.id !== id);
      const tracks = prev.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(c => c.assetId !== id),
      }));
      return { ...prev, assets, tracks };
    });
  };

  const handleAddClipToTimeline = (assetId: string) => {
    const asset = projectState.assets.find(a => a.id === assetId);
    if (!asset) return;

    updateProjectState(prev => {
      const clipId = `clip_${Date.now()}_${Math.round(Math.random() * 1000)}`;
      const newClip: TimelineClip = {
        id: clipId,
        assetId,
        type: asset.type === 'audio' ? 'audio' : 'video',
        start: prev.currentTime,
        duration: Math.min(5, asset.duration),
        trimStart: 0,
        volume: 1.0,
        transform: { x: 0, y: 0, scale: 1.0, opacity: 1.0 },
      };

      const tracks = prev.tracks.map(track => {
        if (track.type === newClip.type) {
          return {
            ...track,
            clips: [...track.clips, newClip],
          };
         }
         return track;
      });

      // Sync caches
      setTimeout(() => {
        videoEngine.current?.syncCache(
          tracks.flatMap(t => t.clips),
          assetUrlMap
        );
      }, 0);

      const clipEnd = newClip.start + newClip.duration;
      const duration = Math.max(prev.duration, clipEnd + 2);

      return { ...prev, tracks, duration };
    });
  };

  // Add Empty Text Clip Helper
  const handleAddTextClip = () => {
    updateProjectState(prev => {
      const clipId = `clip_text_${Date.now()}`;
      const newClip: TimelineClip = {
        id: clipId,
        type: 'text',
        start: prev.currentTime,
        duration: 3.0,
        trimStart: 0,
        volume: 1.0,
        transform: { x: 0, y: 0, scale: 1.0, opacity: 1.0 },
        textProperties: {
          text: 'පෙළ සිරස්තලය (Text Subtitle)',
          fontSize: 48,
          fontFamily: 'Inter',
          textColor: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.6)',
          strokeColor: '#000000',
          strokeWidth: 2,
          shadowColor: '#000000',
          shadowBlur: 4,
          gradientEnabled: false,
          gradientStart: '#ffffff',
          gradientEnd: '#ffffff',
          animationPreset: 'fade-in',
          highlightEnabled: false,
          highlightColor: '#eab308',
          backgroundCardEnabled: false,
        },
      };

      const tracks = prev.tracks.map(track => {
        if (track.type === 'text') {
          return {
            ...track,
            clips: [...track.clips, newClip],
          };
        }
        return track;
      });

      return { ...prev, tracks };
    });
  };

  // Clip actions
  const handleUpdateClip = (clipId: string, updatedFields: Partial<TimelineClip>) => {
    updateProjectState(prev => {
      const tracks = prev.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => {
          if (clip.id === clipId) {
            const updated = { ...clip, ...updatedFields };
            if (selectedClip?.id === clipId) {
              setSelectedClip(updated);
            }
            return updated;
          }
          return clip;
        }),
      }));
      return { ...prev, tracks };
    });
  };

  const handleDeleteClip = (clipId: string) => {
    updateProjectState(prev => {
      const tracks = prev.tracks.map(track => ({
        ...track,
        clips: track.clips.filter(c => c.id !== clipId),
      }));
      if (selectedClip?.id === clipId) {
        setSelectedClip(null);
      }
      return { ...prev, tracks };
    });
  };

  const handleSplitClip = (clipId: string) => {
    updateProjectState(prev => {
      const playhead = prev.currentTime;
      let clipToSplit: TimelineClip | null = null;
      let parentTrackId = '';

      for (const track of prev.tracks) {
        const found = track.clips.find(c => c.id === clipId);
        if (found) {
          clipToSplit = found;
          parentTrackId = track.id;
          break;
        }
      }

      if (!clipToSplit) return prev;

      const isInside = playhead > clipToSplit.start && playhead < clipToSplit.start + clipToSplit.duration;
      if (!isInside) {
        setErrorMessage("Cannot split: Playhead is outside the selected clip's bounds.");
        return prev;
      }

      const relativeSplitTime = playhead - clipToSplit.start;

      const leftClip: TimelineClip = {
        ...clipToSplit,
        id: `clip_${Date.now()}_left_${Math.round(Math.random() * 1000)}`,
        duration: relativeSplitTime,
      };

      const rightClip: TimelineClip = {
        ...clipToSplit,
        id: `clip_${Date.now()}_right_${Math.round(Math.random() * 1000)}`,
        start: playhead,
        duration: clipToSplit.duration - relativeSplitTime,
        trimStart: clipToSplit.trimStart + relativeSplitTime,
      };

      const tracks = prev.tracks.map(track => {
        if (track.id === parentTrackId) {
          const filtered = track.clips.filter(c => c.id !== clipId);
          return {
            ...track,
            clips: [...filtered, leftClip, rightClip],
          };
        }
        return track;
      });

      setSelectedClip(null);
      return { ...prev, tracks };
    });
  };

  // Export handling
  const handleRunClientExport = async () => {
    if (!videoEngine.current || !textEngine.current || !exportEngine.current) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      const blob = await exportEngine.current.exportTimeline(
        projectState,
        videoEngine.current,
        textEngine.current,
        assetUrlMap,
        (progress) => setExportProgress(progress)
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectState.projectName.toLowerCase().replace(/\s+/g, '_')}_export.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed:', err);
      setErrorMessage(`Export failed: ${err.message || 'Check WebCodecs support in your browser'}`);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handleSeek = (time: number) => {
    updateProjectState(prev => ({ ...prev, currentTime: time }), true);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioEngine.current?.setMute(next);
  };

  const handleChangeAspectRatio = (ratio: '16:9' | '9:16' | '1:1') => {
    updateProjectState(prev => ({ ...prev, aspectRatio: ratio }));
  };

  return (
    <div className="min-h-screen bg-[#040815] text-slate-200 flex flex-col selection:bg-violet-500/30 selection:text-violet-200 overflow-hidden">
      {/* App Header (layout toolbar) */}
      <header className="border-b border-slate-800 bg-[#060a18]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 shadow-[0_0_15px_rgba(124,58,237,0.5)] font-bold text-white text-sm">
            සි
          </div>
          <div>
            <h1 className="font-sans text-sm font-bold tracking-tight text-white flex items-center gap-2">
              සි<span>Caps Studio Editor</span>
            </h1>
            <input
              type="text"
              value={projectState.projectName}
              onChange={(e) => updateProjectState(prev => ({ ...prev, projectName: e.target.value }), true)}
              className="bg-transparent border-none text-[11px] text-slate-400 font-medium focus:ring-1 focus:ring-violet-500/40 px-1 py-0.5 rounded -ml-1 mt-0.5 w-48 font-sans"
            />
          </div>
        </div>

        {/* Center: Undo/Redo */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={history.past.length === 0}
            className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={history.future.length === 0}
            className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        {/* Right side: Export Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTutorialOpen(true)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <HelpCircle className="h-4 w-4" />
            <span>How it Works</span>
          </button>

          <button
            onClick={handleRunClientExport}
            disabled={isExporting || projectState.tracks.flatMap(t => t.clips).length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 cursor-pointer shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-45"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Exporting ({exportProgress}%)</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Export video</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Visible Error Banner */}
      {errorMessage && (
        <div className="mx-6 mt-4">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-rose-400 font-bold shrink-0 text-sm">⚠️</span>
              <span className="font-sans leading-relaxed">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Studio Editor grid workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Side: Media Bin Library */}
        <MediaBin
          assets={projectState.assets}
          onAddAsset={handleAddAsset}
          onDeleteAsset={handleDeleteAsset}
          onAddClipToTimeline={handleAddClipToTimeline}
        />

        {/* Center: Canvas Live Preview Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorPreview
            state={projectState}
            isPlaying={isPlaying}
            onPlayToggle={() => setIsPlaying(!isPlaying)}
            onStop={() => {
              setIsPlaying(false);
              handleSeek(0);
            }}
            onSeek={handleSeek}
            onChangeAspectRatio={handleChangeAspectRatio}
            canvasRef={canvasRef}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        </div>

        {/* Right Side: Context Properties Panel */}
        <PropertiesPanel
          selectedClip={selectedClip}
          onUpdateClipProperties={handleUpdateClip}
          onSplitClip={handleSplitClip}
          onDeleteClip={handleDeleteClip}
        />

      </div>

      {/* Bottom Area: Multi-Track Professional Editor Timeline */}
      <div className="shrink-0">
        <TimelineEditor
          state={projectState}
          selectedClip={selectedClip}
          onSelectClip={setSelectedClip}
          onUpdateClip={handleUpdateClip}
          onDeleteClip={handleDeleteClip}
          onSplitClip={handleSplitClip}
          onSeek={handleSeek}
          onAddTextClip={handleAddTextClip}
        />
      </div>

      {/* Tutorial modal info */}
      {tutorialOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 relative shadow-2xl">
            <button
              onClick={() => setTutorialOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-violet-400" />
              <h3 className="font-sans text-base font-bold text-white">
                How Studio Editor Works
              </h3>
            </div>

            <div className="space-y-4 font-sans text-xs text-slate-300 leading-relaxed">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-950 font-mono text-xs font-semibold text-violet-300 border border-violet-800/30">
                  1
                </span>
                <div>
                  <h4 className="font-semibold text-slate-100">Upload video & audio files</h4>
                  <p className="text-slate-400 mt-1">
                    Use the Media Library tab on the left. Click on the upload icon to load media files into your library locally.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-950 font-mono text-xs font-semibold text-violet-300 border border-violet-800/30">
                  2
                </span>
                <div>
                  <h4 className="font-semibold text-slate-100">Add Clips & Trim On Timeline</h4>
                  <p className="text-slate-400 mt-1">
                    Click "Add to Timeline" to place clips on Video/Audio tracks. Drag handles on left/right edges to adjust trim or drag clips to reposition them on the tracks.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-950 font-mono text-xs font-semibold text-violet-300 border border-violet-800/30">
                  3
                </span>
                <div>
                  <h4 className="font-semibold text-slate-100">Customize scale & volume properties</h4>
                  <p className="text-slate-400 mt-1">
                    Select a clip to open its properties panel. Adjust volume, scale multipliers, position offsets, or slice clips at any location with the Split tool.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-950 font-mono text-xs font-semibold text-violet-300 border border-violet-800/30">
                  4
                </span>
                <div>
                  <h4 className="font-semibold text-slate-100">Client-Side WebM Export</h4>
                  <p className="text-slate-400 mt-1">
                    Click "Export video" to compile the timeline frame-by-frame instantly using WebCodecs and download it without any watermarks.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setTutorialOpen(false)}
              className="w-full mt-6 rounded-xl bg-violet-600 hover:bg-violet-500 py-2.5 text-xs text-white font-semibold transition-colors cursor-pointer"
            >
              Start Creating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
