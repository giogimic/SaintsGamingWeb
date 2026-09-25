import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box, Image as ImageIcon, BoxSelect, Cuboid, MoreHorizontal } from 'lucide-react';
import { CharacterSpritePreview } from '@/client/ui/shared/CharacterSpritePreview';
import SpriteBrowser from '../SpriteBrowser';
import { cn } from '@/shared/lib/utils';
import { FloatingModal } from './FloatingModal';

export type WorldModelType = '2D Sprite' | '2D Box Sprite' | '3D Model' | 'Other';

export interface WorldModelValue {
  type: WorldModelType;
  assetId: string;
  /** Per-actor scale override; the shared asset remains unchanged. */
  scale?: number;
  isModular?: boolean;
  partOfSet?: string;
  skeletonConnectionPoints?: string;
}

interface WorldModelSelectorProps {
  value: WorldModelValue;
  onChange: (value: WorldModelValue) => void;
  label?: string;
  description?: string;
}

const MODEL_OPTIONS: { id: WorldModelType; label: string; icon: any; isImplemented: boolean }[] = [
  { id: '3D Model', label: '3D Model', icon: Cuboid, isImplemented: true },
  { id: '2D Sprite', label: '2D Sprite', icon: ImageIcon, isImplemented: true },
];

export function WorldModelSelector({ value, onChange, label = "World Model", description = "How this actor is represented in the physical game world." }: WorldModelSelectorProps) {
  const [showCatalogBrowser, setShowCatalogBrowser] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scaleInput, setScaleInput] = useState(String(value.scale ?? 1));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setScaleInput(String(value.scale ?? 1));
  }, [value.scale]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-1">
        <div className="text-[9px] font-black text-cyan-500/60 uppercase tracking-[0.2em]">
          {label}
        </div>
        
        {/* Compact Type Selector */}
        <div className="flex gap-1">
          {MODEL_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = value.type === opt.id;
            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => onChange({ ...value, type: opt.id })}
                title={opt.label}
                className={cn(
                  "p-1.5 rounded transition-all border cursor-pointer flex items-center justify-center",
                  isActive
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                    : "bg-transparent border-transparent text-slate-600 hover:text-slate-400 hover:bg-white/5"
                )}
              >
                <Icon size={12} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset Picker / Preview */}
      <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-border/50">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-white/5 border border-white/10">
          {value.type === '2D Sprite' ? (
            value.assetId ? (
              <CharacterSpritePreview assetProfileId={value.assetId} size={24} scale={1.5} />
            ) : (
              <ImageIcon className="w-4 h-4 text-slate-600" />
            )
          ) : value.type === '3D Model' ? (
            value.assetId ? (
               <Cuboid className="w-5 h-5 text-cyan-400" />
            ) : (
               <Box className="w-4 h-4 text-slate-600" />
            )
          ) : (
            <span className="text-[8px] text-slate-500 font-bold uppercase rotate-[-15deg]">WIP</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {value.type === '2D Sprite' ? (
            <button
              type="button"
              onClick={() => setShowCatalogBrowser(true)}
              className="w-full flex items-center justify-between p-2 bg-[#050b14] border border-cyan-500/30 hover:border-cyan-400 rounded-lg transition text-left cursor-pointer"
            >
              <div className="flex flex-col min-w-0 mr-2">
                <span className="text-[11px] font-bold text-foreground truncate">
                  {value.assetId || 'Select Asset...'}
                </span>
                <span className="text-[9px] text-muted-foreground mt-0.5 truncate">
                  {description}
                </span>
              </div>
              <ImageIcon className="w-3 h-3 text-cyan-400 shrink-0" />
            </button>
          ) : value.type === '3D Model' ? (
            <div className="w-full flex flex-col gap-2 p-3 bg-[#050b14] border border-cyan-500/30 rounded-lg transition text-left">
              
              {/* Added native AssetId selector like 2D Sprite */}
              <button
                type="button"
                onClick={() => setShowCatalogBrowser(true)}
                className="w-full flex items-center justify-between p-2 bg-black/40 border border-slate-700 hover:border-cyan-400 rounded-lg transition text-left cursor-pointer mb-2"
              >
                <div className="flex flex-col min-w-0 mr-2">
                  <span className="text-[11px] font-bold text-cyan-300 truncate">
                    {value.assetId || 'Select 3D Model Asset...'}
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 truncate">
                    Uploaded GLB model file to use
                  </span>
                </div>
                <Cuboid className="w-3 h-3 text-cyan-400 shrink-0" />
              </button>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Model scale</label>
                  <p className="text-[9px] text-slate-500 mt-0.5">Applies to this archetype or entity only.</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={scaleInput}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      setScaleInput(rawValue);
                      const nextScale = Number(rawValue);
                      if (rawValue && Number.isFinite(nextScale) && nextScale > 0 && nextScale <= 100) {
                        onChange({ ...value, scale: nextScale });
                      }
                    }}
                    onBlur={() => {
                      const parsedScale = Number(scaleInput);
                      const nextScale = Number.isFinite(parsedScale) && parsedScale > 0
                        ? Math.max(0.01, Math.min(100, parsedScale))
                        : value.scale ?? 1;
                      setScaleInput(String(nextScale));
                      onChange({ ...value, scale: nextScale });
                    }}
                    aria-label="This actor's model scale"
                    className="w-24 bg-black/40 border border-slate-700 rounded px-2 py-1.5 text-right text-[11px] text-white font-mono focus:border-cyan-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">×</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full p-2 bg-rose-950/20 border border-rose-500/30 rounded-lg flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-300">Asset Workflow WIP</span>
            </div>
          )}
        </div>
      </div>

      {/* Sprite / Model Browser Modal */}
      {mounted && showCatalogBrowser && (
        <FloatingModal
          title={`Select World ${value.type} Asset`}
          icon={value.type === '3D Model' ? <Cuboid /> : <ImageIcon />}
          onClose={() => setShowCatalogBrowser(false)}
          defaultWidth={700}
          defaultHeight={600}
        >
          <SpriteBrowser
            filterType={value.type === '3D Model' ? 'MODEL' : 'CHARACTER'}
            onSelect={(selectedAssets) => {
              const asset = selectedAssets[0];
              if (asset) {
                let id = asset.source;
                if (value.type === '3D Model') {
                   // Keep full source (URL) for models so resolveEntitySpriteUrl can load them
                   id = asset.source;
                } else if (id.includes('sprites/characters/')) {
                   id = id.split('sprites/characters/')[1].replace('.png', '');
                }
                onChange({ ...value, assetId: id });
              }
              setShowCatalogBrowser(false);
            }}
            onClose={() => setShowCatalogBrowser(false)}
          />
        </FloatingModal>
      )}
    </section>
  );
}
