'use client';

import React, { useState } from 'react';
import { AssetManager, GameAssetItem } from '@/engine/assets/AssetManager';
import SpriteBrowser from '@/web/components/the-lobby/editor/SpriteBrowser';
import { AssetUploadView } from '@/web/components/the-lobby/editor/AssetUploadView';
import { SpritesheetSlicer } from '@/web/components/the-lobby/editor/SpritesheetSlicer';
import { X, Search, Upload, Scissors, Sparkles, Image as ImageIcon, Boxes } from 'lucide-react';
import { AssetImportProfileId } from '@/shared/game/assetImportProfiles';

export interface RoleAwareAssetPickerProps {
  entityType: 'CHARACTER' | 'CREATURE' | 'MONSTER';
  assetRole: string;
  onSelectAsset: (asset: GameAssetItem) => void;
  onCancel: () => void;
}

export function RoleAwareAssetPicker({ entityType, assetRole, onSelectAsset, onCancel }: RoleAwareAssetPickerProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'upload' | 'slicer'>('catalog');
  const [slicerSource, setSlicerSource] = useState<{ id: string; filename: string; storagePath: string } | undefined>();

  const profileTypeHint = entityType === 'CHARACTER' ? 'CHARACTER' : 'CREATURE';
  const importProfile: AssetImportProfileId = entityType === 'CHARACTER' ? 'character' : 'creature';

  const handleUploadComplete = (data: any) => {
    AssetManager.getInstance().broadcastRefresh();
    const asset = data?.gameAsset || data?.usableAsset || data?.asset || data;
    if (asset && (asset.id || asset.source || asset.storagePath)) {
      const formatted = (AssetManager.getInstance() as any).hydrate ? (AssetManager.getInstance() as any).hydrate(asset) : asset;
      onSelectAsset(formatted as GameAssetItem);
    }
  };

  const handleOpenSlicer = (source: { id: string; filename: string; storagePath: string }) => {
    setSlicerSource(source);
    setActiveTab('slicer');
  };

  const handleSlicerComplete = (assets: GameAssetItem[]) => {
    if (assets.length > 0) {
      const match = assets.find((a) => a.metadata?.slotRole === assetRole);
      if (match) {
        onSelectAsset(match);
      } else {
        // Fallback: Use the first sliced asset if they didn't map the exact role.
        onSelectAsset(assets[0]);
      }
    } else {
      setActiveTab('catalog');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md">
      {/* ─── OS WINDOW FRAME ─── */}
      <div className="bg-[#050b14]/95 border border-primary/40 rounded-2xl shadow-[0_0_32px_rgba(203,178,106,0.12),0_12px_40px_rgba(0,0,0,0.6)] flex flex-col w-full max-w-5xl h-[85vh] overflow-hidden backdrop-blur-2xl">
        
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/10 via-[#0a1628] to-[#050b14] border-b border-primary/20 select-none shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Traffic Lights */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-400/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-400/40" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-400/40" />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-mono text-xs font-bold tracking-widest uppercase sg-text-gradient truncate">
                Asset Picker — {entityType === 'CHARACTER' ? 'Character Sprite' : 'Creature Sheet'} {assetRole ? `(${assetRole.toUpperCase()})` : ''}
              </span>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-md transition cursor-pointer"
            title="Close Picker"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Menu Bar */}
        <div className="flex items-center px-4 py-1.5 border-b border-border/40 bg-[#08101e]/90 gap-1 text-xs font-mono shrink-0">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Catalog Library
          </button>
          <button
            onClick={() => {
              setActiveTab('upload');
              setSlicerSource(undefined);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Asset
          </button>
          {slicerSource && (
            <button
              onClick={() => setActiveTab('slicer')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'slicer'
                  ? 'bg-primary/20 text-primary border border-primary/50 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Spritesheet Slicer
            </button>
          )}
        </div>

        {/* Window Body */}
        <div className="flex-1 overflow-hidden relative bg-[#050b14]">
          {activeTab === 'catalog' && (
            <div className="absolute inset-0 overflow-y-auto">
              <SpriteBrowser
                filterType={profileTypeHint}
                filterRole={entityType === 'CREATURE' ? undefined : assetRole}
                filterProfile={importProfile}
                onSelect={(assets: GameAssetItem[]) => {
                  if (assets.length === 0) return;
                  const match = assets.find((a) => a.metadata?.slotRole === assetRole || a.metadata?.role === assetRole);
                  if (match) {
                    onSelectAsset(match);
                  } else {
                    // Fallback: If they manually clicked "Select Sprite", accept it regardless of strict role matching.
                    onSelectAsset(assets[0]);
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="absolute inset-0 overflow-y-auto p-4 custom-scrollbar">
              <AssetUploadView
                initialAssetType={profileTypeHint}
                initialImportProfile={importProfile}
                initialSlotRole={assetRole}
                onUploadComplete={handleUploadComplete}
                onOpenSlicer={handleOpenSlicer}
              />
            </div>
          )}

          {activeTab === 'slicer' && slicerSource && (
            <div className="absolute inset-0 flex flex-col">
              <div className="p-2 border-b border-border/40 bg-[#08101e] flex justify-end">
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-3 py-1 text-xs font-mono font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition"
                >
                  Cancel Slicing
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <SpritesheetSlicer
                  sourceAsset={slicerSource}
                  defaultImportProfile={importProfile}
                  onSliceComplete={handleSlicerComplete}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
