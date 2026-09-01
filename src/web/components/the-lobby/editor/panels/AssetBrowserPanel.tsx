'use client';

import React from 'react';
import SpriteBrowser from '../SpriteBrowser';
import { Layers, ArrowUpRight, FolderOpen, RefreshCw } from 'lucide-react';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import type { GameAssetItem } from '@/engine/assets/AssetManager';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';

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
    <div className="flex flex-col h-full overflow-hidden bg-[#050b14]/90 font-mono -m-3 mb-0">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Assets"
          items={[
            {
              label: 'Open Full Asset Studio',
              onClick: () => setStudioMode('assets'),
            },
            {
              label: 'Sprite Slicer Tool',
              onClick: () => setStudioMode('assets'),
            },
          ]}
        />
        <WindowMenuDivider />
        <WindowMenuButton
          label="Asset Studio"
          icon={ArrowUpRight}
          onClick={() => setStudioMode('assets')}
          title="Switch to full Asset Management Studio (Upload, Slicer, Packs)"
        />
        <div className="flex-1" />
        <span className="text-[9px] text-muted-foreground font-mono">
          {studioMode === 'npc' ? 'Character Sprites' : 'Global Asset Library'}
        </span>
      </WindowMenuBar>

      {/* Main Sprite Browser */}
      <div className="flex-1 min-h-0 overflow-hidden p-2">
        <SpriteBrowser
          filterTags={studioMode === 'npc' ? ['npc'] : []}
          filterType={studioMode === 'npc' ? 'CHARACTER' : undefined}
          onSelect={handleSpriteSelect}
        />
      </div>
    </div>
  );
};
