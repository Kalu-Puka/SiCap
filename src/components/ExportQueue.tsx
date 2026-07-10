import { useState, useEffect } from 'react';
import { Layers, Terminal, Download, Cpu, Play, CheckCircle2, AlertTriangle, FileText, Code2 } from 'lucide-react';
import { ExportJob } from '../types';

interface ExportQueueProps {
  jobs: ExportJob[];
  onRefreshJobs: () => void;
}

export default function ExportQueue({ jobs, onRefreshJobs }: ExportQueueProps) {
  const [activeTab, setActiveTab] = useState<'jobs' | 'ffmpeg' | 'remotion'>('jobs');

  // Auto-refresh jobs while there are pending or processing jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(j => j.status === 'pending' || j.status === 'processing');
    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      onRefreshJobs();
    }, 2000);

    return () => clearInterval(interval);
  }, [jobs, onRefreshJobs]);

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full min-h-[360px]">
      {/* Panel Headers / Navigation */}
      <div className="border-b border-slate-800 bg-[#0f172a] px-5 pt-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-violet-400" />
            <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-slate-300">
              Rendering & Export Queue
            </h2>
          </div>
          <button
            onClick={onRefreshJobs}
            className="text-[10px] text-slate-500 hover:text-violet-400 font-mono transition-colors cursor-pointer"
          >
            ↻ Force Reload Queue
          </button>
        </div>

        {/* Tab triggers */}
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`pb-2 px-1 font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'jobs' ? 'border-violet-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setActiveTab('ffmpeg')}
            className={`pb-2 px-1 font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'ffmpeg' ? 'border-violet-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            FFmpeg Architecture
          </button>
          <button
            onClick={() => setActiveTab('remotion')}
            className={`pb-2 px-1 font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'remotion' ? 'border-violet-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Remotion Setup
          </button>
        </div>
      </div>

      {/* Main Panel Content Box */}
      <div className="flex-1 p-5 overflow-y-auto max-h-[400px]">
        {activeTab === 'jobs' && (
          <div className="flex flex-col gap-3">
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Layers className="h-8 w-8 text-slate-700 animate-pulse mb-2" />
                <p className="font-sans text-slate-500 text-xs">No export jobs queued.</p>
                <p className="font-sans text-slate-600 text-[11px] mt-0.5">Customize your captions style and click "Burn Subtitles & Export Video" to begin.</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-slate-500 font-medium">JOB ID: {job.id}</span>
                      <p className="font-sans text-xs font-semibold text-slate-200 mt-0.5">
                        Video: {job.videoUrl.split('/').pop()?.substring(0, 30)}...
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium border ${
                      job.status === 'completed' ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400' :
                      job.status === 'processing' ? 'bg-violet-950/30 border-violet-800 text-violet-400' :
                      job.status === 'failed' ? 'bg-red-950/30 border-red-900 text-red-400' :
                      'bg-slate-900 border-slate-800 text-slate-400 animate-pulse'
                    }`}>
                      {job.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                      {job.status === 'processing' && <Cpu className="h-3 w-3 animate-spin" />}
                      {job.status === 'failed' && <AlertTriangle className="h-3 w-3" />}
                      <span className="capitalize">{job.status}</span>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">Render Progress:</span>
                      <span className="text-violet-400 font-semibold">{job.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Job Output / Actions */}
                  {job.status === 'completed' && job.outputUrl && (
                    <div className="flex flex-col gap-2.5 border-t border-slate-800 pt-3 mt-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
                          🎉 Video rendered successfully with custom font!
                        </span>
                        <a
                          href={job.outputUrl}
                          download={`Burned_Captions_${job.id}.mp4`}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs text-white font-sans transition-colors cursor-pointer shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download Burned Video</span>
                        </a>
                      </div>

                      {/* Display underlying terminal commands */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <Terminal className="h-3 w-3" /> Under the Hood CLI Commands Scaffolded:
                        </span>
                        <div className="bg-slate-950 rounded-lg p-2.5 font-mono text-[10px] text-slate-400 border border-slate-800 break-all select-all">
                          <p className="text-violet-400 font-semibold mb-1"># Option A: Burn with FFmpeg & ASS filter</p>
                          <code>{job.ffmpegCommand}</code>
                          <p className="text-indigo-400 font-semibold mt-2.5 mb-1"># Option B: Headless Remotion rendering</p>
                          <code>{job.remotionCommand}</code>
                        </div>
                      </div>
                    </div>
                  )}

                  {job.status === 'failed' && (
                    <p className="text-[10px] text-red-400 font-sans mt-1">
                      🛑 Error: {job.error}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'ffmpeg' && (
          <div className="flex flex-col gap-4 text-xs font-sans text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 text-violet-400">
              <Code2 className="h-4 w-4" />
              <h3 className="font-semibold text-sm">FFmpeg Video Subtitles Burn Filter</h3>
            </div>
            <p>
              To burn styled Unicode Sinhala subtitles directly into a video with local TrueType fonts (.ttf), follow this dual-step approach:
            </p>
            
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-slate-100">Step 1: Write an ASS (Advanced Substation Alpha) file</span>
              <p className="text-slate-400">
                Unlike SRT, ASS files preserve custom color hexes, background highlights, borders sizes, margins, shadow scales, and font face mappings:
              </p>
              <pre className="bg-slate-950 rounded-lg p-3.5 font-mono text-[10px] text-slate-400 border border-slate-800 leading-normal overflow-x-auto">
{`[Script Info]
Title: Sinhala Captions
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, BackColour, Outline, Shadow, Alignment
Style: Default,FMYaso,48,&H00FFFFFF,&H80000000,2,15,2

[Events]
Format: Layer, Start, End, Text
Dialogue: 0,0:00:01.20,0:00:03.50,සිංහල Captions auto-generated!`}
              </pre>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <span className="font-semibold text-slate-100">Step 2: Run FFmpeg with subtitle filters</span>
              <p className="text-slate-400">
                Execute the FFmpeg command using the ASS file. Be sure to point to your custom fonts directory (`public/fonts/`) so Sinhala glyphs render accurately:
              </p>
              <pre className="bg-slate-950 rounded-lg p-3.5 font-mono text-[10px] text-slate-400 border border-slate-800 leading-normal overflow-x-auto">
{`ffmpeg -i input.mp4 -vf "subtitles=subs.ass:fontsdir=/workspace/public/fonts" -c:a copy output.mp4`}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'remotion' && (
          <div className="flex flex-col gap-4 text-xs font-sans text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 text-violet-400">
              <FileText className="h-4 w-4" />
              <h3 className="font-semibold text-sm">Remotion Programmatic Video Setup</h3>
            </div>
            <p>
              Remotion lets you use React components and standard animations directly inside a programmatic video render loop.
            </p>

            <div className="flex flex-col gap-2">
              <span className="font-semibold text-slate-100">1. Define the Subtitle Composition in React</span>
              <pre className="bg-slate-950 rounded-lg p-3.5 font-mono text-[10px] text-slate-400 border border-slate-800 leading-normal overflow-x-auto">
{`import { AbsoluteFill, Video, useCurrentFrame } from 'remotion';

export const SubtitleVideo = ({ videoUrl, segments, style }) => {
  const frame = useCurrentFrame();
  const timeMs = (frame / 30) * 1000; // Assuming 30fps

  const activeSegment = segments.find(
    s => timeMs >= s.start && timeMs <= s.end
  );

  return (
    <AbsoluteFill>
      <Video src={videoUrl} />
      {activeSegment && (
        <div style={{
          position: 'absolute',
          bottom: 100,
          width: '100%',
          textAlign: 'center',
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          color: style.textColor,
        }}>
          {activeSegment.text}
        </div>
      )}
    </AbsoluteFill>
  );
};`}
              </pre>
            </div>

            <div className="flex flex-col gap-2 mt-1">
              <span className="font-semibold text-slate-100">2. Headless CLI Node Compilation</span>
              <p className="text-slate-400">
                Execute headless rendering from your node process back-end job queue:
              </p>
              <pre className="bg-slate-950 rounded-lg p-3.5 font-mono text-[10px] text-slate-400 border border-slate-800 leading-normal overflow-x-auto">
{`npx remotion render src/remotion/Root.tsx --props=config.json output.mp4`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
