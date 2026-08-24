'use client';

import React, { useState } from 'react';
import { AssetManager, GameAssetItem } from '@/engine/assets/AssetManager';
import SpriteBrowser from '../../the-lobby/editor/SpriteBrowser';
import { AssetUploadView } from '../../the-lobby/editor/AssetUploadView';
import { SpritesheetSlicer } from '../../the-lobby/editor/SpritesheetSlicer';
import { X, Search, Upload, Scissors, Sparkles, Image as ImageIcon } from 'lucide-react';
import { AssetImportProfileId } from '@/shared/game/assetImportProfiles';

interface SetupAssetPickerProps {
  entityType: 'CHARACTER' | 'CREATURE';
  assetRole?: string; // 'walk', 'idle', 'front', 'back', etc.
  onSelectAsset: (asset: GameAssetItem) => void;
  onCancel: () => void;
}

export function SetupAssetPicker({ entityType, assetRole, onSelectAsset, onCancel }: SetupAssetPickerProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'upload' | 'slicer'>('catalog');
  const [slicerSource, setSlicerSource] = useState<{ id: string; filename: string; storagePath: string } | undefined>();

  const profileTypeHint = entityType === 'CHARACTER' ? 'CHARACTER' : 'CREATURE';
  const importProfile: AssetImportProfileId = entityType === 'CHARACTER' ? 'character' : 'creature';

  const handleUploadComplete = (asset: any) => {
    // If it's a full usable asset
    if (asset.id && asset.source) {
      onSelectAsset(asset as GameAssetItem);
    }
  };

  const handleOpenSlicer = (source: { id: string; filename: string; storagePath: string }) => {
    setSlicerSource(source);
    setActiveTab('slicer');
  };

  const handleSlicerComplete = (assets: GameAssetItem[]) => {
    if (assets.length > 0) {
      // Pick the first sliced asset that matches the requested role if possible, or just the first one
      const match = assets.find(a => a.metadata?.slotRole === assetRole) || assets[0];
      onSelectAsset(match);
    } else {
      setActiveTab('catalog');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-8 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col w-full max-w-5xl h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
              Select Asset for {entityType === 'CHARACTER' ? 'Character' : 'Creature'} 
              {assetRole ? ` - ${assetRole.toUpperCase()}` : ''}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Choose an existing asset or upload a new one to the canonical asset manager.
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pt-2 border-b border-slate-800 bg-slate-900">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'catalog' 
                ? 'border-indigo-500 text-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Search className="w-4 h-4" />
            Existing Assets
          </button>
          <button
            onClick={() => { setActiveTab('upload'); setSlicerSource(undefined); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'upload' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload New
          </button>
          {slicerSource && (
            <button
              onClick={() => setActiveTab('slicer')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'slicer' 
                  ? 'border-amber-500 text-amber-400' 
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Scissors className="w-4 h-4" />
              Slicer
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-slate-950">
          {activeTab === 'catalog' && (
            <div className="absolute inset-0 overflow-y-auto">
              <SpriteBrowser 
                filterType={profileTypeHint}
                onSelect={(assets) => {
                  if (assets.length > 0) onSelectAsset(assets[0]);
                }} 
              />
            </div>
          )}
          
          {activeTab === 'upload' && (
            <div className="absolute inset-0 overflow-y-auto p-4">
              <AssetUploadView
                initialAssetType={profileTypeHint}
                initialImportProfile={importProfile}
                onUploadComplete={handleUploadComplete}
                onOpenSlicer={handleOpenSlicer}
              />
            </div>
          )}

          {activeTab === 'slicer' && slicerSource && (
            <div className="absolute inset-0 flex flex-col">
              <div className="p-2 border-b border-slate-800 bg-slate-900 flex justify-end">
                <button 
                  onClick={() => setActiveTab('upload')}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Cancel Slicing
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
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
