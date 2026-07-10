import { Type, Sparkles, Sliders, Palette, Play } from 'lucide-react';
import { StyleConfig, FontPreset, FONT_PRESETS, ANIMATION_PRESETS } from '../types';

interface StylePanelProps {
  styleConfig: StyleConfig;
  onChangeStyle: (style: Partial<StyleConfig>) => void;
  onRunExport: () => void;
  canExport: boolean;
  isExporting: boolean;
}

export default function StylePanel({
  styleConfig,
  onChangeStyle,
  onRunExport,
  canExport,
  isExporting
}: StylePanelProps) {
  
  // Quick presets to easily style captions
  const applyPresetProfile = (profile: string) => {
    switch (profile) {
      case 'apple':
        onChangeStyle({
          fontFamily: 'Inter',
          fontSize: 48,
          textColor: '#ffffff',
          backgroundColor: 'transparent',
          strokeColor: '#000000',
          strokeWidth: 2,
          shadowColor: '#000000',
          shadowBlur: 10,
          gradientEnabled: false,
          animationPreset: 'apple-keynote'
        });
        break;
      case 'shorts':
        onChangeStyle({
          fontFamily: 'Space Grotesk',
          fontSize: 52,
          textColor: '#facc15', // yellow-400
          backgroundColor: '#000000',
          strokeColor: '#000000',
          strokeWidth: 3,
          shadowColor: '#facc15',
          shadowBlur: 12,
          gradientEnabled: true,
          gradientStart: '#facc15',
          gradientEnd: '#f97316', // orange-500
          animationPreset: 'bounce'
        });
        break;
      case 'neon':
        onChangeStyle({
          fontFamily: 'FMYaso',
          fontSize: 44,
          textColor: '#06b6d4', // cyan-500
          backgroundColor: 'transparent',
          strokeColor: '#0891b2',
          strokeWidth: 1.5,
          shadowColor: '#06b6d4',
          shadowBlur: 20,
          gradientEnabled: false,
          animationPreset: 'neon-glow'
        });
        break;
      case 'classic-srt':
        onChangeStyle({
          fontFamily: 'Abhaya Libre',
          fontSize: 32,
          textColor: '#ffffff',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          strokeColor: 'transparent',
          strokeWidth: 0,
          shadowColor: 'transparent',
          shadowBlur: 0,
          gradientEnabled: false,
          animationPreset: 'fade-in'
        });
        break;
      case 'cyberpunk':
        onChangeStyle({
          fontFamily: 'FMMalithi',
          fontSize: 48,
          textColor: '#ec4899', // pink-500
          backgroundColor: 'transparent',
          strokeColor: '#000000',
          strokeWidth: 2,
          shadowColor: '#ec4899',
          shadowBlur: 15,
          gradientEnabled: true,
          gradientStart: '#ec4899',
          gradientEnd: '#a855f7', // purple-500
          animationPreset: 'glitch'
        });
        break;
    }
  };

  return (
    <aside className="w-full xl:w-[380px] bg-[#0f172a] border-l border-slate-800 px-6 py-5 flex flex-col gap-6 overflow-y-auto h-full text-slate-200">
      {/* Preset Quick Actions */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
            Captions Preset
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => applyPresetProfile('apple')}
            className={`px-3 py-2 text-left rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              styleConfig.animationPreset === 'apple-keynote'
                ? 'border-violet-500 bg-violet-500/10 text-violet-300 ring-1 ring-violet-500'
                : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
             Apple Event
          </button>
          <button
            onClick={() => applyPresetProfile('shorts')}
            className={`px-3 py-2 text-left rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              styleConfig.animationPreset === 'bounce'
                ? 'border-violet-500 bg-violet-500/10 text-violet-300 ring-1 ring-violet-500'
                : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            ⚡ Viral Shorts
          </button>
          <button
            onClick={() => applyPresetProfile('neon')}
            className={`px-3 py-2 text-left rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              styleConfig.animationPreset === 'neon-glow'
                ? 'border-violet-500 bg-violet-500/10 text-violet-300 ring-1 ring-violet-500'
                : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            🔮 Neon Cyber
          </button>
          <button
            onClick={() => applyPresetProfile('classic-srt')}
            className={`px-3 py-2 text-left rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              styleConfig.animationPreset === 'fade-in'
                ? 'border-violet-500 bg-violet-500/10 text-violet-300 ring-1 ring-violet-500'
                : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            📺 Classic Movie
          </button>
          <button
            onClick={() => applyPresetProfile('cyberpunk')}
            className={`col-span-2 px-3 py-2 text-center rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              styleConfig.animationPreset === 'glitch'
                ? 'border-violet-500 bg-violet-500/10 text-violet-300 ring-1 ring-violet-500'
                : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            🤖 Cyberpunk Glitch (FM Font)
          </button>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Typography Configuration */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-slate-300">
          <Type className="h-4 w-4 text-violet-400" />
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
            Typography
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] text-slate-400">Select Typeface</label>
          <select
            value={styleConfig.fontFamily}
            onChange={(e) => onChangeStyle({ fontFamily: e.target.value })}
            className="w-full bg-slate-950 text-slate-200 rounded-md px-3 py-2 text-sm border border-slate-700 focus:outline-none focus:border-violet-500 text-xs cursor-pointer"
          >
            {FONT_PRESETS.map((font) => (
              <option key={font.id} value={font.family}>
                {font.name} {font.isLocal ? '(Local .TTF)' : ''}
              </option>
            ))}
          </select>
          {styleConfig.fontFamily.startsWith('FM') && (
            <p className="text-[10px] text-slate-500 font-sans mt-0.5 leading-relaxed bg-slate-950/30 px-2 py-1 rounded border border-slate-800/30">
              💡 <strong>FM Custom Font Active:</strong> Perfect for traditional stylized print Sinhala designs. Uses local TrueType config!
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">Font Size</span>
            <span className="text-slate-200 font-mono">{styleConfig.fontSize}px</span>
          </div>
          <input
            type="range"
            min={18}
            max={96}
            value={styleConfig.fontSize}
            onChange={(e) => onChangeStyle({ fontSize: parseInt(e.target.value) })}
            className="w-full h-1 bg-slate-800 accent-violet-500 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Palette Color Customizations */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-slate-300">
          <Palette className="h-4 w-4 text-violet-400" />
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
            Visual Effects
          </h2>
        </div>

        {/* Gradient Check */}
        <div className="flex items-center justify-between rounded-md bg-slate-950 p-2.5 border border-slate-800">
          <span className="text-[11px] text-slate-300 font-medium">Enable Text Gradient</span>
          <input
            type="checkbox"
            checked={styleConfig.gradientEnabled}
            onChange={(e) => onChangeStyle({ gradientEnabled: e.target.checked })}
            className="h-4 w-4 rounded bg-slate-800 text-violet-600 accent-violet-500 border-slate-700 cursor-pointer"
          />
        </div>

        {styleConfig.gradientEnabled ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400">Gradient Start</label>
              <div className="flex items-center gap-2 bg-slate-950 rounded-md px-2.5 py-1.5 border border-slate-700">
                <input
                  type="color"
                  value={styleConfig.gradientStart}
                  onChange={(e) => onChangeStyle({ gradientStart: e.target.value })}
                  className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
                />
                <span className="font-mono text-[10px] text-slate-300 uppercase">{styleConfig.gradientStart}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400">Gradient End</label>
              <div className="flex items-center gap-2 bg-slate-950 rounded-md px-2.5 py-1.5 border border-slate-700">
                <input
                  type="color"
                  value={styleConfig.gradientEnd}
                  onChange={(e) => onChangeStyle({ gradientEnd: e.target.value })}
                  className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
                />
                <span className="font-mono text-[10px] text-slate-300 uppercase">{styleConfig.gradientEnd}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-400">Text Color</label>
            <div className="flex items-center gap-2 bg-slate-950 rounded-md px-3 py-2 border border-slate-700">
              <input
                type="color"
                value={styleConfig.textColor}
                onChange={(e) => onChangeStyle({ textColor: e.target.value })}
                className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
              />
              <span className="font-mono text-xs text-slate-300 uppercase">{styleConfig.textColor}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-400">Outline Color</label>
            <div className="flex items-center gap-2 bg-slate-950 rounded-md px-2.5 py-1.5 border border-slate-700">
              <input
                type="color"
                value={styleConfig.strokeColor}
                onChange={(e) => onChangeStyle({ strokeColor: e.target.value })}
                className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
              />
              <span className="font-mono text-[10px] text-slate-300 uppercase">{styleConfig.strokeColor}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-400">Background Card</label>
            <div className="flex items-center gap-2 bg-slate-950 rounded-md px-2.5 py-1.5 border border-slate-700">
              <input
                type="color"
                value={styleConfig.backgroundColor.startsWith('rgba') ? '#000000' : styleConfig.backgroundColor}
                onChange={(e) => onChangeStyle({ backgroundColor: e.target.value })}
                className="w-6 h-6 rounded bg-transparent border-none cursor-pointer"
              />
              <span className="font-mono text-[10px] text-slate-300 uppercase">
                {styleConfig.backgroundColor.startsWith('rgba') ? 'Transparent' : styleConfig.backgroundColor}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Outline Size</span>
              <span className="text-slate-200 font-mono">{styleConfig.strokeWidth}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              value={styleConfig.strokeWidth}
              onChange={(e) => onChangeStyle({ strokeWidth: parseFloat(e.target.value) })}
              className="w-full h-1 bg-slate-800 accent-violet-500 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Shadow Blur</span>
              <span className="text-slate-200 font-mono">{styleConfig.shadowBlur}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={styleConfig.shadowBlur}
              onChange={(e) => onChangeStyle({ shadowBlur: parseInt(e.target.value) })}
              className="w-full h-1 bg-slate-800 accent-violet-500 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-800" />

      {/* Kinetic Subtitle Animation presets */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-slate-300">
          <Sliders className="h-4 w-4 text-violet-400" />
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
            Kinetic Animations
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] text-slate-400">Transition Style</label>
          <select
            value={styleConfig.animationPreset}
            onChange={(e) => onChangeStyle({ animationPreset: e.target.value })}
            className="w-full bg-slate-950 text-slate-200 rounded-md px-3.5 py-2.5 border border-slate-700 focus:outline-none focus:border-violet-500 text-xs cursor-pointer"
          >
            {ANIMATION_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {styleConfig.animationPreset === 'apple-keynote' && (
          <div className="rounded-md bg-violet-950/20 border border-violet-900/50 p-3 mt-1">
            <p className="text-[10px] text-violet-300 leading-relaxed font-sans">
              🌟 <strong>Apple Keynote Style Active:</strong> Uses snappy, zero-eased keyframe animations. Each active word pops up into scale while preceding phrases fade away instantly.
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-800">
        <button
          onClick={onRunExport}
          disabled={!canExport || isExporting}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white font-sans text-sm font-medium py-2.5 transition-all shadow-lg shadow-violet-900/20 cursor-pointer disabled:cursor-not-allowed"
          id="export-btn"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Queueing Export Job...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              <span>Export Video</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
