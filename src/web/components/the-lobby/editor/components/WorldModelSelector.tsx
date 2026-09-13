import React, { useState } from 'react';
import { Box, Image as ImageIcon, BoxSelect, Cuboid, MoreHorizontal } from 'lucide-react';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';
import SpriteBrowser from '../SpriteBrowser';
import { cn } from '@/shared/lib/utils';

export type WorldModelType = '2D Sprite' | '2D Box Sprite' | '3D Model' | 'Other';

export interface WorldModelValue {
  type: WorldModelType;
  assetId: string;
}

interface WorldModelSelectorProps {
  value: WorldModelValue;
  onChange: (value: WorldModelValue) => void;
  label?: string;
  description?: string;
}

const MODEL_OPTIONS: { id: WorldModelType; label: string; icon: any; isImplemented: boolean }[] = [
  { id: '2D Sprite', label: '2D Sprite', icon: ImageIcon, isImplemented: true },
  { id: '2D Box Sprite', label: '2D Box Sprite', icon: BoxSelect, isImplemented: false },
  { id: '3D Model', label: '3D Model', icon: Cuboid, isImplemented: false },
  { id: 'Other', label: 'Other', icon: MoreHorizontal, isImplemented: false },
];

export function WorldModelSelector({ value, onChange, label = "World Model", description = "How this actor is represented in the physical game world." }: WorldModelSelectorProps) {
  const [showCatalogBrowser, setShowCatalogBrowser] = useState(false);

  return (
    <section className="space-y-4">
      <div>
        <div
          className="text-[9px] font-black text-cyan-500/60 uppercase tracking-[0.2em] mb-1 pb-1"
          style={{ borderBottom: '1px solid rgba(6,182,212,0.1)' }}
        >
          {label}
        </div>
        <p className="text-[10px] text-slate-400">{description}</p>
      </div>

      {/* Model Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {MODEL_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = value.type === opt.id;
          return (
            <button
              type="button"
              key={opt.id}
              onClick={() => onChange({ ...value, type: opt.id })}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg transition-all border cursor-pointer",
                isActive
                  ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)] text-cyan-400"
                  : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
              )}
            >
              <Icon size={18} />
              <span className="text-[10px] font-bold tracking-wider uppercase">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Asset Picker / Preview */}
      <div className="flex items-center gap-3 bg-black/40 p-3 rounded-lg border border-border/50">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-white/5 border border-white/10"
        >
          {value.type === '2D Sprite' ? (
            value.assetId ? (
              <CharacterSpritePreview
                assetProfileId={value.assetId}
                size={32}
                scale={1.8}
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-slate-600" />
            )
          ) : (
            <span className="text-[10px] text-slate-500 font-bold uppercase rotate-[-15deg]">WIP</span>
          )}
        </div>

        <div className="flex-1">
          {value.type === '2D Sprite' ? (
            <button
              type="button"
              onClick={() => setShowCatalogBrowser(true)}
              className="w-full flex items-center justify-between p-3 bg-[#050b14] border border-cyan-500/30 hover:border-cyan-400 rounded-lg transition text-left cursor-pointer"
            >
              <div className="flex flex-col min-w-0 mr-2">
                <span className="text-xs font-bold text-foreground truncate">
                  {value.assetId || 'Select Asset...'}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  Click to open Asset Manager
                </span>
              </div>
              <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
            </button>
          ) : (
            <div className="w-full p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-rose-300">Asset Workflow Not Implemented</span>
                <span className="text-[10px] text-rose-400/60">Your model type choice is saved, but you cannot select {value.type} assets yet.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2D Sprite Browser Modal */}
      {showCatalogBrowser && value.type === '2D Sprite' && (
        <div
          className="pointer-events-auto fixed inset-0 z-[1000] p-4 flex items-center justify-center animate-in fade-in duration-200"
          style={{ background: 'rgba(5,0,15,0.96)', backdropFilter: 'blur(10px)' }}
        >
          <div className="w-full max-w-3xl h-[80vh] bg-[#0a051d] border border-cyan-500/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-cyan-500/30 bg-[#050b14]/80">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="font-black text-cyan-200 text-sm">Select World Model Asset</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogBrowser(false)}
                className="text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <SpriteBrowser
                filterType="CHARACTER"
                onSelect={(selectedAssets) => {
                  const asset = selectedAssets[0];
                  if (asset) {
                    // Extracting just the profile ID from the source path if it's a known character
                    let id = asset.source;
                    if (id.includes('sprites/characters/')) {
                      id = id.split('sprites/characters/')[1].replace('.png', '');
                    }
                    onChange({ ...value, assetId: id });
                  }
                  setShowCatalogBrowser(false);
                }}
                onClose={() => setShowCatalogBrowser(false)}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
