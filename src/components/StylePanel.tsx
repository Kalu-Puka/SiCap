import { Type, Sparkles, Sliders, Palette, Play, Upload } from 'lucide-react';
import { StyleConfig, FontPreset, ANIMATION_PRESETS } from '../types';
import React from 'react';
import { saveFont } from '../utils/fontDb';

interface StylePanelProps {
  styleConfig: StyleConfig;
  onChangeStyle: (style: Partial<StyleConfig>) => void;
  onRunExport: () => void;
  canExport: boolean;
  isExporting: boolean;
  exportProgress: number | null;
  onExportSRT: () => void;
  fonts: FontPreset[];
  onAddCustomFont: (font: FontPreset) => void;
}

export default function StylePanel({
  styleConfig,
  onChangeStyle,
  onRunExport,
  canExport,
  isExporting,
  exportProgress,
  onExportSRT,
  fonts,
  onAddCustomFont
}: StylePanelProps) {
  const [isUploadingFont, setIsUploadingFont] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'text' | 'style' | 'animation' | 'export'>('text');

  const handleCustomFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fontTypeSelect = document.getElementById('custom-font-type-select') as HTMLSelectElement;
    const fontType = (fontTypeSelect?.value as 'unicode' | 'legacy') || 'unicode';
    const customName = file.name.replace(/\.[^/.]+$/, "");

    // Sanitize to a clean font-family name
    const family = customName.replace(/[^a-zA-Z0-9-]/g, '') || `custom-font-${Date.now()}`;

    setIsUploadingFont(true);
    try {
      // 1. Read file as ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Failed to read font file.'));
        reader.readAsArrayBuffer(file);
      });

      // 2. Save in IndexedDB
      const savedFont = await saveFont(customName, family, fontType, arrayBuffer);

      // 3. Register with FontFace API
      if (typeof FontFace !== 'undefined') {
        const fontFace = new FontFace(family, savedFont.data);
        await fontFace.load();
        document.fonts.add(fontFace);
        console.log(`[සිCaps] Loaded and registered custom font client-side: ${family}`);
      }

      // 4. Create the preset descriptor
      const fontPreset: FontPreset = {
        id: savedFont.id,
        name: `${customName} (Custom)`,
        family: family,
        url: '', // Indicates stored in IndexedDB
        isLocal: true,
        fontType: fontType
      };

      onAddCustomFont(fontPreset);
      onChangeStyle({ fontFamily: family });
    } catch (err: any) {
      console.error('Error saving custom font:', err);
      alert(err.message || 'Error saving custom font to local database.');
    } finally {
      setIsUploadingFont(false);
    }
  };

  return (
    <aside className="w-full xl:w-[400px] bg-[#090d16] border border-slate-800 rounded-2xl flex flex-col text-slate-200 shadow-2xl backdrop-blur-sm overflow-hidden min-h-[500px]">
      {/* Sidebar Tabs Header */}
      <div className="flex border-b border-slate-800 bg-[#04060b] p-1.5 shrink-0 gap-1 select-none">
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
            activeTab === 'text'
              ? 'bg-violet-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Type className="h-4 w-4" />
          <span>Text</span>
        </button>
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
            activeTab === 'style'
              ? 'bg-violet-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>Style</span>
        </button>
        <button
          onClick={() => setActiveTab('animation')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
            activeTab === 'animation'
              ? 'bg-violet-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Motion</span>
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
            activeTab === 'export'
              ? 'bg-violet-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Play className="h-4 w-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Tab Contents Area */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-24 space-y-5 custom-scrollbar">
        
        {/* TEXT TAB */}
        {activeTab === 'text' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider font-sans">Select Typeface</label>
              <select
                value={styleConfig.fontFamily}
                onChange={(e) => onChangeStyle({ fontFamily: e.target.value })}
                className="w-full bg-slate-950 text-slate-200 rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-violet-500 text-xs cursor-pointer font-sans"
              >
                {fonts.map((font) => (
                  <option 
                    key={font.id} 
                    value={font.family} 
                    style={{ fontFamily: font.family }}
                    className="py-1 text-slate-200"
                  >
                    {font.name} {font.fontType === 'legacy' ? '🇱' : '🇺'}
                  </option>
                ))}
              </select>
              
              {/* Dynamic Font Guide warnings */}
              {(() => {
                const selected = fonts.find(f => f.family === styleConfig.fontFamily);
                if (!selected) return null;
                
                if (selected.fontType === 'legacy') {
                  return (
                    <div className="flex flex-col gap-1 text-[10px] mt-1.5 p-3 rounded-xl border leading-relaxed bg-amber-950/20 border-amber-900/30 text-amber-300 font-sans">
                      <p>
                        ⚠️ <strong>Legacy FM Font Active:</strong> Sinhala Unicode characters are automatically mapped to raw legacy DlManel code positions. Make sure you type in standard Unicode/Singlish!
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <p className="text-[10px] text-emerald-400 font-sans mt-1.5 leading-relaxed bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-900/30">
                      ✨ <strong>Sinhala Unicode Active:</strong> Crystal clear, pixel-perfect modern rendering with full native layout support.
                    </p>
                  );
                }
              })()}
            </div>

            {/* Upload Custom Font block */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-[#04060b] flex flex-col gap-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                Upload Custom TrueType Font
              </span>
              <div className="flex gap-2">
                <select
                  id="custom-font-type-select"
                  className="bg-slate-900 border border-slate-700 rounded text-[10px] px-1.5 py-1 text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="unicode">Unicode 🇺</option>
                  <option value="legacy">FM Legacy 🇱</option>
                </select>
                <label className="flex-1 flex items-center justify-center gap-1 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/40 text-violet-300 text-[10px] font-semibold rounded px-2.5 py-1.5 cursor-pointer transition-all">
                  <Upload className="h-3 w-3 animate-pulse" />
                  <span>{isUploadingFont ? 'Uploading...' : 'Choose File'}</span>
                  <input
                    type="file"
                    accept=".ttf,.otf"
                    className="hidden"
                    onChange={handleCustomFontUpload}
                    disabled={isUploadingFont}
                  />
                </label>
              </div>
            </div>

            {/* Font Size block */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-sans">
                <span>Font Size</span>
                <span className="text-violet-400 font-mono font-bold">{styleConfig.fontSize}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={96}
                value={styleConfig.fontSize}
                onChange={(e) => onChangeStyle({ fontSize: parseInt(e.target.value) })}
                className="w-full h-1 bg-slate-800 accent-violet-500 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* STYLE TAB */}
        {activeTab === 'style' && (
          <div className="space-y-4 animate-fade-in">
            {/* Gradient Check */}
            <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider font-sans">Enable Text Gradient</span>
              <input
                type="checkbox"
                checked={styleConfig.gradientEnabled}
                onChange={(e) => onChangeStyle({ gradientEnabled: e.target.checked })}
                className="h-4.5 w-4.5 rounded bg-slate-800 text-violet-600 accent-violet-500 border-slate-700 cursor-pointer"
              />
            </div>

            {/* Gradient colors or single text color */}
            {styleConfig.gradientEnabled ? (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 font-semibold font-sans uppercase">Start Color</label>
                  <div className="flex items-center gap-2 bg-slate-950 rounded-xl px-2.5 py-1.5 border border-slate-800">
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
                  <label className="text-[10px] text-slate-400 font-semibold font-sans uppercase">End Color</label>
                  <div className="flex items-center gap-2 bg-slate-950 rounded-xl px-2.5 py-1.5 border border-slate-800">
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
                <label className="text-[10px] text-slate-400 font-semibold font-sans uppercase">Text Color</label>
                <div className="flex items-center gap-2.5 bg-slate-950 rounded-xl px-3 py-2 border border-slate-800">
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

            {/* Outline & Background card */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-semibold font-sans uppercase">Outline Color</label>
                <div className="flex items-center gap-2.5 bg-slate-950 rounded-xl px-2.5 py-1.5 border border-slate-800">
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
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 font-semibold font-sans uppercase">Bg Card</label>
                  <input
                    type="checkbox"
                    checked={styleConfig.backgroundCardEnabled !== false}
                    onChange={(e) => onChangeStyle({ backgroundCardEnabled: e.target.checked })}
                    className="h-3.5 w-3.5 rounded bg-slate-800 text-violet-600 accent-violet-500 border-slate-700 cursor-pointer"
                  />
                </div>
                <div className={`flex items-center gap-2 bg-slate-950 rounded-xl px-2.5 py-1.5 border transition-all duration-200 ${(styleConfig.backgroundCardEnabled !== false) ? 'border-slate-800' : 'border-slate-900/40 opacity-40'}`}>
                  <input
                    type="color"
                    disabled={styleConfig.backgroundCardEnabled === false}
                    value={styleConfig.backgroundColor.startsWith('rgba') ? '#000000' : styleConfig.backgroundColor}
                    onChange={(e) => onChangeStyle({ backgroundColor: e.target.value })}
                    className="w-6 h-6 rounded bg-transparent border-none cursor-pointer disabled:cursor-not-allowed"
                  />
                  <span className="font-mono text-[10px] text-slate-300 uppercase">
                    {(styleConfig.backgroundCardEnabled !== false) ? (styleConfig.backgroundColor.startsWith('rgba') ? 'Default' : styleConfig.backgroundColor) : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Word Highlight */}
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-violet-950/10 border border-violet-900/30">
              <div className="flex justify-between items-center">
                <label className="text-[11px] text-violet-300 font-bold flex items-center gap-1.5 font-sans">
                  <Sparkles className="h-3 w-3 text-violet-400 animate-spin" />
                  Karaoke Word Highlight
                </label>
                <input
                  type="checkbox"
                  checked={styleConfig.highlightEnabled !== false}
                  onChange={(e) => onChangeStyle({ highlightEnabled: e.target.checked })}
                  className="h-3.5 w-3.5 rounded bg-slate-800 text-violet-600 accent-violet-500 border-slate-700 cursor-pointer"
                />
              </div>
              <div className={`flex items-center gap-2 bg-slate-950 rounded-xl px-2.5 py-1.5 border transition-all duration-200 ${(styleConfig.highlightEnabled !== false) ? 'border-slate-800' : 'border-slate-900/40 opacity-40'}`}>
                <input
                  type="color"
                  disabled={styleConfig.highlightEnabled === false}
                  value={styleConfig.highlightColor || '#facc15'}
                  onChange={(e) => onChangeStyle({ highlightColor: e.target.value })}
                  className="w-6 h-6 rounded bg-transparent border-none cursor-pointer disabled:cursor-not-allowed"
                />
                <span className="font-mono text-[10px] text-slate-300 uppercase">
                  {(styleConfig.highlightEnabled !== false) ? (styleConfig.highlightColor || '#facc15') : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Sliders for Outline Size & Shadow Blur */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">
                  <span>Outline Size</span>
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
                <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-sans">
                  <span>Shadow Blur</span>
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
        )}

        {/* ANIMATION TAB */}
        {activeTab === 'animation' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Transition Style</label>
              <select
                value={styleConfig.animationPreset}
                onChange={(e) => onChangeStyle({ animationPreset: e.target.value })}
                className="w-full bg-slate-950 text-slate-200 rounded-xl px-3.5 py-2.5 border border-slate-800 focus:outline-none focus:border-violet-500 text-xs cursor-pointer font-sans"
              >
                {ANIMATION_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Explanations for animation preset */}
            <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3.5 space-y-2 font-sans">
              <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">Active Motion Profile</span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {styleConfig.animationPreset === 'apple-keynote' && (
                  "🌟 Apple Event Kinetic: Subtitles enter with snappy scale pop transitions. Perfect for fast-paced promo edits."
                )}
                {styleConfig.animationPreset === 'fade-in' && (
                  "📺 Smooth Fade In: Traditional subtitles fading elegantly into view with no motion bounce."
                )}
                {styleConfig.animationPreset === 'bounce' && (
                  "⚡ Bounce Pop: Word pops with an active spring effect. Highly viral shorts look."
                )}
                {styleConfig.animationPreset === 'pop' && (
                  "✨ Scale Pop: Smooth rapid scaling pop-up effect."
                )}
                {styleConfig.animationPreset === 'slide-up' && (
                  "🚀 Slide Up: Slides into place smoothly from below."
                )}
                {!['apple-keynote', 'fade-in', 'bounce', 'pop', 'slide-up'].includes(styleConfig.animationPreset) && (
                  "🎭 Custom Preset: Special styled kinetic animation applied."
                )}
              </p>
            </div>
          </div>
        )}

        {/* EXPORT TAB */}
        {activeTab === 'export' && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-xl bg-[#04060b] border border-slate-800/80 p-4 space-y-3 font-sans">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Render Details</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-slate-500">Codec</span>
                <span className="text-slate-300 text-right font-mono">H.264 MP4</span>
                <span className="text-slate-500">Font Mode</span>
                <span className="text-slate-300 text-right font-mono font-bold text-violet-400">
                  {fonts.find(f => f.family === styleConfig.fontFamily)?.fontType === 'legacy' ? 'FM Legacy' : 'Unicode'}
                </span>
                <span className="text-slate-500">Status</span>
                <span className="text-slate-300 text-right">
                  {canExport ? (
                    <span className="text-emerald-400 font-bold">Ready to Export</span>
                  ) : (
                    <span className="text-slate-500">Upload video first</span>
                  )}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onExportSRT}
                disabled={!canExport || isExporting}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-950 text-slate-300 font-sans text-xs py-2.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                id="export-srt-btn"
              >
                <span>Export Standard SRT File</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Persistent Bottom UI Bar for Export Action */}
      <div className="shrink-0 p-4 bg-[#04060b] border-t border-slate-800">
        <button
          onClick={onRunExport}
          disabled={!canExport || isExporting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 text-white font-sans text-sm font-semibold py-3 transition-all shadow-lg shadow-violet-950/30 cursor-pointer disabled:cursor-not-allowed border border-violet-500/30"
          id="export-btn"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>
                {exportProgress !== null ? `Exporting ${exportProgress}%...` : 'Preparing Render...'}
              </span>
            </>
          ) : (
            <>
              <Play className="h-4.5 w-4.5 fill-current" />
              <span>Render & Export MP4</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
