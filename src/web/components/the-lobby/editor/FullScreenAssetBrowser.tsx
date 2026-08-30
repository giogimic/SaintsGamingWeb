'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Layers, ImageIcon, Upload, Scissors
} from 'lucide-react';
import AssetEditor from './AssetEditor';
import SpriteBrowser from './SpriteBrowser';
import { AssetUploadView } from './AssetUploadView';
import { SpritesheetSlicer } from './SpritesheetSlicer';
import { useGameStore } from '../store';
import type { GameAssetItem } from '@/engine/assets/AssetManager';

interface FullScreenAssetBrowserProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FullScreenAssetBrowser: React.FC<FullScreenAssetBrowserProps> = ({
  isOpen,
  onClose,
}) => {
  const showToast = useGameStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState<'catalog' | 'sprites' | 'upload' | 'slicer'>('catalog');
  const [slicerSource, setSlicerSource] = useState<{ id: string; filename: string; storagePath: string } | undefined>(undefined);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#02050b]/95 backdrop-blur-2xl text-slate-200 font-mono pointer-events-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/30 bg-[#050b14]/80">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-amber-400 flex items-center gap-2">
              MASTER ASSET REPOSITORY & SLICER
            </h1>
            <p className="text-xs text-slate-400">Browse sprites, manage catalog metadata, slice spritesheets, and upload textures.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-black/60 border border-amber-500/30 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Catalog
            </button>
            <button
              onClick={() => setActiveTab('sprites')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sprites'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Sprites
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
            <button
              onClick={() => setActiveTab('slicer')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'slicer'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" /> Slicer
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-2"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'catalog' && (
          <AssetEditor
            onAssetSelect={(asset) => {
              showToast(`Asset selected: ${asset.id || asset.source}`);
            }}
            onOpenSlicer={(asset) => {
              setSlicerSource(asset);
              setActiveTab('slicer');
            }}
          />
        )}
        {activeTab === 'sprites' && (
          <SpriteBrowser
            onSelect={(assets: GameAssetItem[]) => {
              const asset = assets[0];
              if (asset) {
                showToast(`Selected sprite: ${asset.source}`);
              }
            }}
          />
        )}
        {activeTab === 'upload' && (
          <AssetUploadView
            onUploadComplete={(result) => {
              if (result.sourceAsset) {
                setSlicerSource(result.sourceAsset);
                setActiveTab('slicer');
              } else {
                setActiveTab('catalog');
              }
            }}
            onOpenSlicer={(asset) => {
              setSlicerSource(asset);
              setActiveTab('slicer');
            }}
          />
        )}
        {activeTab === 'slicer' && (
          <SpritesheetSlicer
            sourceAsset={slicerSource}
            onSliceComplete={() => {
              setActiveTab('catalog');
            }}
          />
        )}
      </div>
    </div>
  );
};
