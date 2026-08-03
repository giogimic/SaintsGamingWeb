'use client';

import React, { useEffect, useState } from 'react';
import AssetEditor from '../AssetEditor';
import SpriteBrowser from '../SpriteBrowser';
import { ImageIcon, Layers } from 'lucide-react';
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
  const showToast = useGameStore((s) => s.showToast);
  const [activeTab, setActiveTab] = useState<'manager' | 'sprites'>(
    studioMode === 'npc' ? 'sprites' : 'manager'
  );

  useEffect(() => {
    if (studioMode === 'npc') setActiveTab('sprites');
    else if (studioMode === 'build') setActiveTab('manager');
  }, [studioMode]);

  const handleSpriteSelect = (assets: GameAssetItem[]) => {
    const asset = assets[0];
    if (!asset) return;
    const key = spriteKeyFromAsset(asset);
    window.dispatchEvent(new CustomEvent('studio_sprite_picked', { detail: { key, source: asset.source } }));
    showToast(`Sprite key ready: ${key}`);
    try {
      void navigator.clipboard?.writeText(key);
    } catch {
      /* clipboard optional */
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex bg-[#050b14]/80 border-b border-slate-800/80 p-1 gap-1 text-xs font-medium shrink-0">
        <button
          onClick={() => setActiveTab('manager')}
          className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-all ${
            activeTab === 'manager'
              ? 'bg-gradient-to-r from-amber-600 to-amber-600 text-white shadow' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Layers className="w-3 h-3" /> Asset Manager
        </button>
        <button
          onClick={() => setActiveTab('sprites')}
          className={`flex-1 py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-all ${
            activeTab === 'sprites'
              ? 'bg-gradient-to-r from-amber-600 to-amber-600 text-white shadow' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <ImageIcon className="w-3 h-3" /> Sprite Browser
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
        {activeTab === 'manager' && (
          <AssetEditor
            /* Build mode: prefer tilesets when browsing manager from Build */
          />
        )}
        {activeTab === 'sprites' && (
          <SpriteBrowser
            filterTags={studioMode === 'npc' ? ['npc'] : []}
            filterType="SPRITE"
            onSelect={handleSpriteSelect}
          />
        )}
      </div>
    </div>
  );
};
