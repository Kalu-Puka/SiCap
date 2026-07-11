import { Sparkles, Video, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onShowTutorial: () => void;
  apiConnected: boolean;
}

export default function Header({ onShowTutorial, apiConnected }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-[#020617] px-6 py-4 backdrop-blur-md z-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 shadow-[0_0_15px_rgba(124,58,237,0.5)] font-bold text-white text-sm">
            Si
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans text-lg font-semibold tracking-tight text-white">
              Si<span className="text-violet-400">Caps</span>
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={onShowTutorial}
            className="flex items-center gap-1.5 rounded-full bg-slate-800 hover:bg-slate-700 px-4 py-1.5 border border-slate-700 text-xs text-slate-200 hover:text-white transition-colors cursor-pointer"
            id="tutorial-btn"
          >
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            <span>How it Works</span>
          </button>
        </div>
      </div>
    </header>
  );
}
