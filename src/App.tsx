import { useState, useEffect } from 'react';
import { Sparkles, HelpCircle, X, Check, FileVideo, Cpu } from 'lucide-react';
import Header from './components/Header';
import VideoPlayer from './components/VideoPlayer';
import StylePanel from './components/StylePanel';
import Timeline from './components/Timeline';
import { CaptionSegment, StyleConfig, ExportJob, FontPreset, FONT_PRESETS } from './types';

export default function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [serverVideoUrl, setServerVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [apiConnected, setApiConnected] = useState(true);

  const [customFonts, setCustomFonts] = useState<FontPreset[]>(() => {
    try {
      const saved = localStorage.getItem('custom-fonts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync custom fonts to localStorage
  useEffect(() => {
    localStorage.setItem('custom-fonts', JSON.stringify(customFonts));
  }, [customFonts]);

  // Inject CSS @font-face rules dynamically for custom fonts
  useEffect(() => {
    customFonts.forEach(font => {
      const styleId = `style-custom-${font.family}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          @font-face {
            font-family: '${font.family}';
            src: url('${font.url}') format('truetype');
            font-weight: normal;
            font-style: normal;
          }
        `;
        document.head.appendChild(style);
      }
    });
  }, [customFonts]);

  const allFonts = [...FONT_PRESETS, ...customFonts];
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);
  const [transcribeMode, setTranscribeMode] = useState<'sinhala-direct' | 'english-to-sinhala' | 'english-direct'>('sinhala-direct');

  // Default elegant style configurations - locked to clean white text, black outline, no gradient/card/highlight as requested
  const [styleConfig, setStyleConfig] = useState<StyleConfig>({
    textColor: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    strokeColor: '#000000',
    strokeWidth: 3,
    shadowColor: '#000000',
    shadowBlur: 0,
    fontSize: 44,
    fontFamily: 'Abhaya Libre',
    gradientEnabled: false,
    gradientStart: '#ffffff',
    gradientEnd: '#ffffff',
    animationPreset: 'fade-in',
    highlightColor: '#ffffff',
    backgroundCardEnabled: false,
    highlightEnabled: false,
    positionX: 50,
    positionY: 80
  });

  // Pull export jobs and check API status on mount
  useEffect(() => {
    fetchJobs();
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const res = await fetch('/api/config-status');
      const data = await res.json();
      if (data.success) {
        setApiConnected(data.valid);
        if (!data.valid) {
          setFallbackWarning('Please configure your GEMINI_API_KEY1 or GEMINI_API_KEY2 in Settings -> Secrets panel to start auto-transcribing.');
        } else {
          setFallbackWarning(null);
        }
      }
    } catch (e) {
      console.error('Error checking API status:', e);
      setApiConnected(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/export/jobs');
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (e) {
      console.error('Error fetching export jobs:', e);
    }
  };

  const handleVideoUpload = async (file: File) => {
    setIsTranscribing(true);
    setErrorMessage(null);
    
    // Generate an instant local object URL so video previews and plays immediately!
    const localBlobUrl = URL.createObjectURL(file);
    setVideoUrl(localBlobUrl);
    setServerVideoUrl(null);
    
    setSegments([]);
    setCurrentTime(0);
    setFallbackWarning(null);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('transcribeMode', transcribeMode);

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `Server error (${res.status}): ${res.statusText}`;
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.error) errorMsg = parsed.error;
        } catch {
          if (res.status === 413) {
            errorMsg = "The video file is too large for the network proxy. Please try uploading a shorter, smaller video file (under 10-20MB) or configure your Gemini API Key in Settings.";
          } else if (res.status === 504 || res.status === 502) {
            errorMsg = "The connection timed out during transcription. Please try with a shorter video or verify your Gemini API key in settings.";
          } else if (text.includes("<!doctype") || text.includes("<html")) {
            errorMsg = `Received an HTML response instead of JSON. The server might have crashed, or the file size exceeded the proxy limits. Status: ${res.status}`;
          } else if (text.trim()) {
            errorMsg = text.slice(0, 200);
          }
        }
        throw new Error(errorMsg);
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Invalid response format from server (expected JSON, got ${contentType}).`);
      }

      const data = await res.json();
      if (data.success) {
        setServerVideoUrl(data.videoUrl);
        setSegments(data.segments);
        setApiConnected(true);
        setFallbackWarning(null);
      } else {
        setErrorMessage(data.error || 'Transcription failed. Please check your Gemini API key in settings/secrets.');
      }
    } catch (e: any) {
      console.error('Upload Error:', e);
      setErrorMessage(e.message || 'An error occurred during video upload or transcription. Make sure your Gemini API key is valid.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleUpdateSegment = (id: string, updatedFields: Partial<CaptionSegment>) => {
    setSegments(prev =>
      prev.map(seg => (seg.id === id ? { ...seg, ...updatedFields } : seg))
    );
  };

  const handlePolishSegment = async (id: string, text: string, mode: 'polish' | 'translate') => {
    try {
      const res = await fetch('/api/polish-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
      });
      const data = await res.json();
      if (data.success) {
        handleUpdateSegment(id, { text: data.polishedText });
        return data.polishedText;
      } else {
        setErrorMessage(data.error || 'Failed to polish text.');
      }
    } catch (e: any) {
      console.error('Error polishing segment:', e);
      setErrorMessage(e.message || 'Error occurred while contacting AI Assistant.');
    }
  };

  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1];
    const nextStart = lastSeg ? lastSeg.end + 100 : 0;
    const nextEnd = nextStart + 1500;

    const newSeg: CaptionSegment = {
      id: `seg_manual_${Date.now()}_${Math.round(Math.random() * 1000)}`,
      text: 'නව වචනය (New Word)',
      start: nextStart,
      end: nextEnd,
    };

    setSegments(prev => [...prev, newSeg].sort((a, b) => a.start - b.start));
  };

  const handleDeleteSegment = (id: string) => {
    setSegments(prev => prev.filter(seg => seg.id !== id));
  };

  const formatTimeSRT = (ms: number): string => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor(ms / 60000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    const mmm = Math.floor(ms % 1000);

    const pad = (num: number, size: number) => num.toString().padStart(size, '0');
    return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(mmm, 3)}`;
  };

  const handleExportSRT = () => {
    if (segments.length === 0) return;
    const srtContent = segments
      .map((seg, index) => {
        return `${index + 1}\n${formatTimeSRT(seg.start)} --> ${formatTimeSRT(seg.end)}\n${seg.text}\n`;
      })
      .join('\n');

    const blob = new Blob([srtContent], { type: 'text/srt;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sicaps_subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExport = async (jobId: string) => {
    try {
      const res = await fetch(`/api/export/${jobId}/file`);
      if (!res.ok) throw new Error('Export download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sicaps_${jobId}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMessage(`Failed to download burned video: ${err.message}`);
    }
  };

  const handleRunExport = async () => {
    const exportSrc = serverVideoUrl || videoUrl;
    if (!exportSrc || segments.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: exportSrc,
          styleConfig,
          segments,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `Server error (${res.status}): ${res.statusText}`;
        try {
          const parsed = JSON.parse(text);
          if (parsed && parsed.error) errorMsg = parsed.error;
        } catch {
          if (text.includes("<!doctype") || text.includes("<html")) {
            errorMsg = `Received an HTML page instead of JSON. Status: ${res.status}`;
          } else if (text.trim()) {
            errorMsg = text.slice(0, 200);
          }
        }
        throw new Error(errorMsg);
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Invalid response format from server (expected JSON, got ${contentType}).`);
      }

      const data = await res.json();
      if (data.success) {
        const jobId = data.jobId;
        // Start polling the job status inline
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/export/status/${jobId}`);
            if (!statusRes.ok) return;
            const statusData = await statusRes.json();
            if (statusData.success && statusData.job) {
              const job = statusData.job;
              setExportProgress(job.progress || 0);

              if (job.status === 'completed') {
                clearInterval(pollInterval);
                await downloadExport(jobId);
                setIsExporting(false);
                setExportProgress(null);
                fetchJobs(); // Update background list
              } else if (job.status === 'failed') {
                clearInterval(pollInterval);
                setIsExporting(false);
                setExportProgress(null);
                setErrorMessage(job.error || 'Video export rendering failed on server.');
              }
            }
          } catch (pollErr) {
            console.error('Error polling export job:', pollErr);
          }
        }, 1200);
      } else {
        setErrorMessage(data.error || 'Failed to queue rendering job.');
        setIsExporting(false);
        setExportProgress(null);
      }
    } catch (e: any) {
      console.error('Export Error:', e);
      setErrorMessage(e.message || 'Failed to connect to export server.');
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = time;
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col selection:bg-violet-500/30 selection:text-violet-200">
      {/* App Header */}
      <Header
        onShowTutorial={() => setTutorialOpen(true)}
        apiConnected={apiConnected}
      />

      {/* API Fallback warning banner */}
      {fallbackWarning && (
        <div className="mx-auto max-w-7xl w-full px-4 lg:px-6 mt-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 shadow-lg">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="font-sans leading-relaxed">{fallbackWarning}</span>
            </div>
            <button
              onClick={() => setFallbackWarning(null)}
              className="text-amber-400 hover:text-amber-200 p-1 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Visible Inline Error Banner (Iframe Safe - replaces window.alert) */}
      {errorMessage && (
        <div className="mx-auto max-w-7xl w-full px-4 lg:px-6 mt-4">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3.5 text-xs text-rose-200 shadow-lg">
            <div className="flex items-start gap-2.5">
              <span className="text-rose-400 font-bold shrink-0 text-sm leading-none mt-0.5">⚠️</span>
              <span className="font-sans leading-relaxed">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 p-1 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Studio Editor workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col gap-6">
        
        {/* Top row: Sticky Video Preview & Scrollable Style Settings sidebar */}
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          
          {/* Sticky Video Preview Stage */}
          <div className="w-full xl:w-[480px] 2xl:w-[560px] xl:sticky xl:top-6 shrink-0 z-30">
            <VideoPlayer
              videoUrl={videoUrl}
              segments={segments}
              styleConfig={styleConfig}
              currentTime={currentTime}
              setCurrentTime={setCurrentTime}
              onVideoUpload={handleVideoUpload}
              isTranscribing={isTranscribing}
              transcribeMode={transcribeMode}
              onTranscribeModeChange={setTranscribeMode}
              fonts={allFonts}
              onChangeStyle={(partial) => setStyleConfig(prev => {
                // Return a clean new object to prevent cross-talk
                return { ...prev, ...partial };
              })}
              duration={duration}
              setDuration={setDuration}
            />
          </div>

          {/* Style Controls Sidebar */}
          <div className="flex-1 w-full">
            <StylePanel
              styleConfig={styleConfig}
              onChangeStyle={(partial) => setStyleConfig(prev => {
                // Return a clean new object to prevent cross-talk
                return { ...prev, ...partial };
              })}
              onRunExport={handleRunExport}
              canExport={!!videoUrl && segments.length > 0}
              isExporting={isExporting}
              exportProgress={exportProgress}
              onExportSRT={handleExportSRT}
              fonts={allFonts}
              onAddCustomFont={(newFont) => setCustomFonts(prev => [...prev, newFont])}
            />
          </div>

        </div>

        {/* Bottom Section: Editing Timeline Track & Segment List */}
        <div className="w-full pt-4 border-t border-slate-900">
          <Timeline
            segments={segments}
            currentTime={currentTime}
            onSeek={handleSeek}
            onUpdateSegment={handleUpdateSegment}
            onAddSegment={handleAddSegment}
            onDeleteSegment={handleDeleteSegment}
            onPolishSegment={handlePolishSegment}
            isTranscribing={isTranscribing}
            duration={duration}
          />
        </div>
      </main>

      {/* Tutorial Guidelines Help Overlay Modal */}
      {tutorialOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
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
                How Sinhala Captions Works
              </h3>
            </div>

            <div className="space-y-4 font-sans text-xs text-slate-300 leading-relaxed">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-950 font-mono text-xs font-semibold text-violet-300 border border-violet-800/30">
                  1
                </span>
                <div>
                  <h4 className="font-semibold text-slate-100">Upload video & Extract Speech</h4>
                  <p className="text-slate-400 mt-1">
                    Drag and drop your MP4/WebM file. The backend uploads it to the <strong>Gemini Files API</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-950 font-mono text-xs font-semibold text-violet-300 border border-violet-800/30">
                  2
                </span>
                <div>
                  <h4 className="font-semibold text-zinc-100">Structured AI Transcription</h4>
                  <p className="text-slate-400 mt-1">
                    Gemini model <strong>gemini-3.5-flash</strong> transcribes audio using a structured JSON schema, matching speech with millisecond timings.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-950 font-mono text-xs font-semibold text-violet-300 border border-violet-800/30">
                  3
                </span>
                <div>
                  <h4 className="font-semibold text-zinc-100">Style & Correct Unicode</h4>
                  <p className="text-slate-400 mt-1">
                    Adjust font family (including custom local Sinhala TrueType FM fonts), text colors, gradients, stroke outlines, and active animations. Double-click any text bubble in the timeline to make quick manual spelling corrections.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-950 font-mono text-xs font-semibold text-violet-300 border border-violet-800/30">
                  4
                </span>
                <div>
                  <h4 className="font-semibold text-zinc-100">Background Video Rendering Queue</h4>
                  <p className="text-slate-400 mt-1">
                    Exporting submits a job to the background Express queue, generating subtitle styling configurations (ASS files) and command files for non-blocking rendering.
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
