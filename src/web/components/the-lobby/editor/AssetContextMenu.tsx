'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Copy,
  Scissors,
  Edit2,
  Trash2,
  RefreshCw,
  Tag,
  Eye,
  Plus,
  Users,
  Check,
  CheckSquare,
  Square,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { GameAssetItem } from '@/engine/assets/AssetManager';
import { soundSynth } from '@/engine/sound-synth';
import { useGameStore } from '../store';
import { useEditorStore } from './editor-store';

export interface AssetContextMenuProps {
  x: number;
  y: number;
  asset: GameAssetItem;
  selectedAssetIds: Set<string>;
  allAssets: GameAssetItem[];
  onClose: () => void;
  onInspect: (asset: GameAssetItem) => void;
  onSelectInCanvas?: (asset: GameAssetItem) => void;
  onOpenSlicer?: (asset: { id: string; filename: string; storagePath: string }) => void;
  onReclassify: (assets: GameAssetItem[]) => void;
  onDelete: (assets: GameAssetItem[]) => void;
  onToggleFlag: (asset: GameAssetItem, flag: 'solid' | 'interactable' | 'decorative', val: boolean) => void;
  onAddTag: (asset: GameAssetItem, tag: string) => void;
}

export const AssetContextMenu: React.FC<AssetContextMenuProps> = ({
  x,
  y,
  asset,
  selectedAssetIds,
  allAssets,
  onClose,
  onInspect,
  onSelectInCanvas,
  onOpenSlicer,
  onReclassify,
  onDelete,
  onToggleFlag,
  onAddTag,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const showToast = useGameStore((s) => s.showToast);
  const [quickTagInput, setQuickTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isMultiSelected = selectedAssetIds.size > 1 && selectedAssetIds.has(asset.id);
  const targetAssets = isMultiSelected
    ? allAssets.filter((a) => selectedAssetIds.has(a.id))
    : [asset];

  // Close on outside click or Escape
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust menu position so it stays within viewport
  const menuWidth = 240;
  const menuHeight = 380;
  const clampedX = typeof window !== 'undefined' ? Math.min(x, window.innerWidth - menuWidth - 16) : x;
  const clampedY = typeof window !== 'undefined' ? Math.min(y, window.innerHeight - menuHeight - 16) : y;

  const handleAction = (action: () => void) => {
    soundSynth?.playUiClick?.();
    action();
    onClose();
  };

  const copyToClipboard = (text: string, label: string) => {
    soundSynth?.playActionSound?.();
    try {
      void navigator.clipboard?.writeText(text);
      setCopiedKey(label);
      showToast(`Copied ${label} to clipboard`);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      showToast(`Selected: ${text}`);
    }
  };

  const isCharacter =
    asset.type === 'CHARACTER' ||
    asset.type === 'SPRITE' ||
    asset.categories?.includes('character') ||
    asset.source.includes('/npc/');

  const isTileset =
    asset.type === 'TILESET' ||
    asset.type === 'TILE' ||
    asset.categories?.includes('tilesets') ||
    asset.source.includes('/tilesets/');

  const isSheet =
    asset.type === 'SHEET' ||
    asset.tags?.includes('sheet') ||
    asset.source.includes('-sheet') ||
    asset.source.includes('_sheet');

  const fileName = asset.source.split('/').pop() || asset.id;

  return (
    <div
      ref={menuRef}
      style={{ left: clampedX, top: clampedY }}
      className="fixed z-[300] w-60 bg-[#070e1a]/95 backdrop-blur-xl border border-amber-500/40 rounded-xl shadow-2xl p-1.5 font-mono text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header Item Details */}
      <div className="px-2 py-1.5 border-b border-slate-800/80 mb-1">
        <div className="text-[11px] font-bold text-amber-300 truncate">
          {isMultiSelected ? `${selectedAssetIds.size} Assets Selected` : fileName}
        </div>
        <div className="text-[9px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
          <span className="font-semibold text-slate-300">{asset.type}</span>
          <span>•</span>
          <span>{asset.source}</span>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {/* Inspect Asset */}
        <button
          onClick={() => handleAction(() => onInspect(asset))}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition text-left cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Inspect Details</span>
        </button>

        {/* Use in Canvas */}
        {onSelectInCanvas && (
          <button
            onClick={() => handleAction(() => onSelectInCanvas(asset))}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-500/20 hover:text-amber-300 transition text-left cursor-pointer font-semibold text-amber-400"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Use in Canvas</span>
          </button>
        )}

        {/* Make Starter Hero */}
        {isCharacter && (
          <button
            onClick={() =>
              handleAction(() => {
                window.dispatchEvent(
                  new CustomEvent('studio_make_starter_hero', {
                    detail: { asset },
                  })
                );
                const store = useEditorStore.getState();
                store.setStudioMode('develop');
                store.openPanel('characters');
                showToast(`Opening Starter Hero Editor for ${fileName}`);
              })
            }
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-emerald-500/20 hover:text-emerald-300 transition text-left cursor-pointer text-emerald-400"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Make Starter Hero</span>
          </button>
        )}

        {/* Use as Map Tileset */}
        {isTileset && (
          <button
            onClick={() =>
              handleAction(() => {
                window.dispatchEvent(
                  new CustomEvent('studio_add_tileset', {
                    detail: { source: asset.source },
                  })
                );
                showToast(`Added ${fileName} to map tilesets`);
              })
            }
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-500/20 hover:text-purple-300 transition text-left cursor-pointer text-purple-400"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Use as Map Tileset</span>
          </button>
        )}

        {/* Open in Slicer */}
        {onOpenSlicer && (
          <button
            onClick={() =>
              handleAction(() =>
                onOpenSlicer({
                  id: asset.id,
                  filename: fileName,
                  storagePath: asset.source,
                })
              )
            }
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition text-left cursor-pointer text-slate-300"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open in Slicer</span>
          </button>
        )}

        <div className="h-px bg-slate-800/80 my-1" />

        {/* Copy Path */}
        <button
          onClick={() => copyToClipboard(asset.source, 'File Path')}
          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Path</span>
          </span>
          {copiedKey === 'File Path' && <Check className="w-3 h-3 text-emerald-400" />}
        </button>

        {/* Copy Asset ID */}
        <button
          onClick={() => copyToClipboard(asset.id, 'Asset ID')}
          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition text-left cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>Copy Asset ID</span>
          </span>
          {copiedKey === 'Asset ID' && <Check className="w-3 h-3 text-emerald-400" />}
        </button>

        <div className="h-px bg-slate-800/80 my-1" />

        {/* Quick Gameplay Flags Toggle (Single asset mode) */}
        {!isMultiSelected && (
          <div className="px-2 py-1 flex flex-col gap-1 bg-black/40 rounded-lg border border-slate-800/80 my-0.5">
            <span className="text-[9px] uppercase font-bold text-slate-400">Gameplay Flags</span>
            <div className="flex flex-col gap-0.5 text-[11px]">
              {(['solid', 'interactable', 'decorative'] as const).map((flag) => {
                const isChecked = !!asset.metadata?.[flag];
                return (
                  <button
                    key={flag}
                    onClick={() => {
                      soundSynth?.playUiClick?.();
                      onToggleFlag(asset, flag, !isChecked);
                    }}
                    className="flex items-center justify-between py-0.5 text-left text-slate-300 hover:text-white cursor-pointer"
                  >
                    <span className="capitalize">{flag}</span>
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Tag Input */}
        {showTagInput ? (
          <div className="p-1 flex items-center gap-1 bg-black/60 rounded-lg border border-amber-500/30">
            <input
              type="text"
              placeholder="tag name..."
              value={quickTagInput}
              onChange={(e) => setQuickTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && quickTagInput.trim()) {
                  onAddTag(asset, quickTagInput.trim().toLowerCase());
                  setShowTagInput(false);
                  setQuickTagInput('');
                }
              }}
              autoFocus
              className="flex-1 bg-transparent text-[11px] text-slate-200 focus:outline-none px-1"
            />
            <button
              onClick={() => {
                if (quickTagInput.trim()) {
                  onAddTag(asset, quickTagInput.trim().toLowerCase());
                  setShowTagInput(false);
                  setQuickTagInput('');
                }
              }}
              className="px-2 py-0.5 bg-amber-500 text-black font-bold rounded text-[10px] cursor-pointer"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowTagInput(true)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition text-left cursor-pointer text-slate-300"
          >
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Tag...</span>
          </button>
        )}

        {/* Reclassify */}
        <button
          onClick={() => handleAction(() => onReclassify(targetAssets))}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-500/20 hover:text-purple-300 transition text-left cursor-pointer text-purple-400"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reclassify {isMultiSelected ? `(${selectedAssetIds.size})` : ''}</span>
        </button>

        {/* Delete / Archive */}
        <button
          onClick={() => handleAction(() => onDelete(targetAssets))}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-rose-500/20 hover:text-rose-300 transition text-left cursor-pointer text-rose-400 font-semibold"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Archive / Delete {isMultiSelected ? `(${selectedAssetIds.size})` : ''}</span>
        </button>
      </div>
    </div>
  );
};
