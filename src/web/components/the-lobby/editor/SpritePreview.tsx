'use client';

import React, { useState, useEffect } from 'react';
import { GameAssetItem, SpriteFrame } from '@/engine/assets/AssetManager';
import { AssetPathResolver } from '@/engine/assets/AssetPathResolver';
import { Eye, Play, Pause, Tag, X, Copy } from 'lucide-react';

export interface SpritePreviewProps {
  asset: GameAssetItem | null;
  onClose?: () => void;
  onSelect?: (asset: GameAssetItem) => void;
}

export const SpritePreview: React.FC<SpritePreviewProps> = ({ asset, onClose, onSelect }) => {
  const [direction, setDirection] = useState<'down' | 'up' | 'left' | 'right'>('down');
  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(4);
  const [copied, setCopied] = useState<boolean>(false);

  const walkSequence = [0, 1, 0, 2];
  const [sequenceIdx, setSequenceIdx] = useState<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      setFrameIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setSequenceIdx((prev) => {
        const serapht = (prev + 1) % walkSequence.length;
        setFrameIndex(walkSequence[serapht]);
        return serapht;
      });
    }, 150); // ~7 FPS
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!asset) {
    return (
      <div className="p-6 text-center text-slate-500 font-mono text-xs">
        No sprite selected for preview.
      </div>
    );
  }

  const frames = (asset.metadata?.frames as SpriteFrame[]) || [];
  const currentFrame = frames.find(
    (f) => (f.direction || 'down') === direction && (f.frameIndex ?? 0) === frameIndex
  );

  const atlasUrl = asset.atlasSource
    ? AssetPathResolver.resolve('atlases', asset.atlasSource)
    : asset.source;

  const handleCopyPath = () => {
    navigator.clipboard.writeText(asset.source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0b1320] border border-slate-800 rounded-lg p-4 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#cbb26a]" />
          <h3 className="font-bold text-slate-200 text-xs font-mono truncate max-w-[200px]" title={asset.source}>
            {asset.source.split('/').pop()}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Viewport */}
      <div className="relative flex flex-col items-center justify-center bg-[#050b14] border border-slate-800 rounded-lg p-6 min-h-[180px] overflow-hidden">
        {/* Checkerboard Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />

        {/* Display Sprite Frame */}
        <div
          className="relative z-10 flex items-center justify-center transition-all duration-150"
          style={{
            width: `${(currentFrame?.width || 16) * zoom}px`,
            height: `${(currentFrame?.height || 32) * zoom}px`,
          }}
        >
          {currentFrame ? (
            <div
              style={{
                width: `${currentFrame.width}px`,
                height: `${currentFrame.height}px`,
                backgroundImage: `url('${atlasUrl}')`,
                backgroundPosition: `-${currentFrame.x}px -${currentFrame.y}px`,
                imageRendering: 'pixelated',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            />
          ) : (
            <img
              src={asset.source}
              alt={asset.id}
              className="max-h-28 w-auto object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          )}
        </div>

        {/* Zoom & Play Controls Overlay */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-[#0b1320]/80 backdrop-blur border border-slate-800 rounded px-2 py-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1 rounded text-xs ${isPlaying ? 'text-green-400 hover:text-green-300' : 'text-slate-400 hover:text-slate-200'}`}
            title={isPlaying ? 'Pause Animation' : 'Play Walk Cycle'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <div className="h-3 w-[1px] bg-slate-700 mx-0.5" />
          {[2, 4, 8].map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-1.5 py-0.5 font-mono text-[10px] rounded ${zoom === z ? 'bg-[#806f47] text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {z}x
            </button>
          ))}
        </div>
      </div>

      {/* Direction Switcher */}
      <div className="flex items-center justify-between bg-[#050b14]/60 p-2 rounded border border-slate-800">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Facing Direction</span>
        <div className="flex items-center gap-1">
          {(['down', 'up', 'left', 'right'] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className={`px-2 py-1 text-[10px] font-mono capitalize rounded transition ${direction === dir ? 'bg-amber-700 text-white font-bold' : 'bg-[#0b1320] text-slate-400 hover:text-slate-200 border border-slate-800'}`}
            >
              {dir}
            </button>
          ))}
        </div>
      </div>

      {/* Metadata Panel */}
      <div className="space-y-2 text-[11px] font-mono">
        <div className="flex items-center justify-between text-slate-400">
          <span>Type:</span>
          <span className="text-[#cbb26a] font-bold">{asset.type}</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Dimensions:</span>
          <span className="text-slate-200">
            {currentFrame ? `${currentFrame.width}×${currentFrame.height}px per frame` : 'Whole Sheet'}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Walk Frames:</span>
          <span className="text-slate-200">{frames.length > 0 ? `${frames.length} frames (4 directions)` : '1 frame'}</span>
        </div>

        {/* Tags */}
        <div className="pt-2 border-t border-slate-800 space-y-1">
          <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase">
            <Tag className="w-3 h-3 text-[#cbb26a]" />
            <span>Tags</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(asset.tags || []).map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 bg-[#050b14] text-[#e2d5b3] border border-slate-800 rounded text-[10px]"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
        <button
          onClick={handleCopyPath}
          className="flex-1 py-1.5 bg-[#050b14] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-[11px] font-mono flex items-center justify-center gap-1 transition"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>{copied ? 'Copied!' : 'Copy File Path'}</span>
        </button>
        {onSelect && (
          <button
            onClick={() => onSelect(asset)}
            className="flex-1 py-1.5 bg-gradient-to-r from-amber-600 to-blue-600 hover:from-amber-500 hover:to-blue-500 text-white font-bold rounded text-[11px] font-mono flex items-center justify-center gap-1 shadow-lg transition"
          >
            <span>Select Sprite</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SpritePreview;
