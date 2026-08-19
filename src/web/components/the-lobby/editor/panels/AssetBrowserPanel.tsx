'use client';

import React from 'react';
import SpriteBrowser from '../SpriteBrowser';
import { Layers, ArrowUpRight } from 'lucide-react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import type { GameAssetItem } from '@/engine/assets/AssetManager';

function spriteKeyFromAsset(asset: GameAssetItem): string {
  const src = asset.source || '';
  const m = src.match(/\/game-assets\/npc\/([^/]+?)(?:\.png)?(?:$|\?)/i);
  if (m?.[1]) return m[1].replace(/-ow$/i, '');
  const base = src.split('/').pop() || src;
  return base.replace(/\.png$/i, '');
}

export const AssetBrowserPanel: React.FC = () => {
  const studioMode = useEditorStore((s) => s.studioMode);
  const setStudioMode = useEditorStore((s) => s.setStudioMode);
  const showToast = useGameStore((s) => s.showToast);

  const handleSpriteSelect = (assets: GameAssetItem[]) => {
    const asset = assets[0];
    if (!asset) return;
    const key = spriteKeyFromAsset(asset);
    window.dispatchEvent(new CustomEvent('studio_sprite_picked', { detail: { key, source: asset.source } }));
    showToast(`Sprite selected: ${key}`);
    try {
      void navigator.clipboard?.writeText(key);
    } catch {
      /* clipboard optional */
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#050b14]/90 font-mono">
      {/* Top Header / Quick Action */}
      <div className="flex items-center justify-between bg-[#0b1320] border-b border-amber-500/20 px-3 py-1.5 text-xs shrink-0">
        <span className="text-[10px] font-black tracking-wider uppercase text-amber-400">
          Sprite Picker
        </span>
        <button
          type="button"
          onClick={() => setStudioMode('assets')}
          className="flex items-center gap-1 text-[10px] text-amber-400/80 hover:text-amber-300 font-bold cursor-pointer"
          title="Switch to full Asset Management Studio (Upload, Slicer, Packs)"
        >
          <span>Asset Studio</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      {/* Main Sprite Browser */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <SpriteBrowser
          filterTags={studioMode === 'npc' ? ['npc'] : []}
          filterType={studioMode === 'npc' ? 'CHARACTER' : undefined}
          onSelect={handleSpriteSelect}
        />
      </div>
    </div>
  );
};
