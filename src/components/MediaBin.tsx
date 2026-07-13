import React, { useRef } from 'react';
import { Upload, Plus, Film, Volume2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { MediaAsset } from '../core/types';

interface MediaBinProps {
  assets: MediaAsset[];
  onAddAsset: (asset: MediaAsset) => void;
  onDeleteAsset: (id: string) => void;
  onAddClipToTimeline: (assetId: string) => void;
}

export default function MediaBin({
  assets,
  onAddAsset,
  onDeleteAsset,
  onAddClipToTimeline,
}: MediaBinProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const url = URL.createObjectURL(file);
      
      // Attempt to inspect media length
      const tempElement = document.createElement(
        file.type.startsWith('audio/') ? 'audio' : 'video'
      );
      tempElement.src = url;
      tempElement.addEventListener('loadedmetadata', () => {
        const type = file.type.startsWith('audio/') ? 'audio' : 'video';
        
        onAddAsset({
          id: `asset_${Date.now()}_${Math.round(Math.random() * 1000)}`,
          name: file.name,
          url,
          type: type as any,
          duration: tempElement.duration || 5, // fallback to 5s if unknown
          fileSize: file.size,
        });
      });
    });
  };

  const getAssetIcon = (type: MediaAsset['type']) => {
    switch (type) {
      case 'audio':
        return <Volume2 className="h-5 w-5 text-indigo-400" />;
      case 'image':
        return <ImageIcon className="h-5 w-5 text-emerald-400" />;
      case 'video':
      default:
        return <Film className="h-5 w-5 text-violet-400" />;
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-slate-900 border-r border-slate-800 w-72 flex flex-col h-full select-none">
      {/* Tab Header */}
      <div className="border-b border-slate-800 p-4 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Media Library
        </h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white cursor-pointer transition-colors"
          title="Upload raw video/audio file"
        >
          <Upload className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Asset Grid list */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-800 rounded-xl p-4">
            <Film className="h-10 w-10 text-slate-700 mb-2.5" />
            <p className="text-xs font-sans text-slate-400 font-medium">No media uploaded yet</p>
            <p className="text-[11px] font-sans text-slate-500 mt-1">
              Click the upload button to import video or audio files.
            </p>
          </div>
        ) : (
          assets.map(asset => (
            <div
              key={asset.id}
              className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col gap-2.5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex-shrink-0">
                  {getAssetIcon(asset.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-medium text-slate-200 truncate" title={asset.name}>
                    {asset.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-slate-500">
                      {asset.duration.toFixed(1)}s
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-800" />
                    <span className="text-[10px] font-mono text-slate-500">
                      {formatSize(asset.fileSize)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between border-t border-slate-900 pt-2.5">
                <button
                  onClick={() => onAddClipToTimeline(asset.id)}
                  className="flex items-center gap-1 text-[11px] font-sans font-semibold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add to Timeline</span>
                </button>

                <button
                  onClick={() => onDeleteAsset(asset.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 hover:bg-slate-900 transition-all cursor-pointer"
                  title="Remove from project"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
