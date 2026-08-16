'use client';

import { useGameStore } from './store';
import { ITEM_DB } from './data/items';
import { useState, useMemo } from 'react';
import {
  Package,
  Shield,
  Sword,
  Heart,
  Sparkles,
  Trash2,
  Coins,
  Weight,
  Layers,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

const INVENTORY_CAPACITY = 28; // Standard 4x7 RuneScape grid

type CategoryFilter = 'ALL' | 'EQUIPMENT' | 'CONSUMABLE' | 'MATERIAL' | 'QUEST';
type SortOption = 'DEFAULT' | 'NAME' | 'RARITY' | 'QUANTITY';

const RARITY_ORDER: Record<string, number> = {
  LEGENDARY: 4,
  EPIC: 3,
  RARE: 2,
  UNCOMMON: 1,
  COMMON: 0,
};

function formatQuantity(qty: number): string {
  if (qty >= 10_000_000) return `${Math.floor(qty / 1_000_000)}M`;
  if (qty >= 100_000) return `${Math.floor(qty / 1_000)}k`;
  if (qty >= 10_000) return `${(qty / 1_000).toFixed(1)}k`;
  return qty.toString();
}

function getQuantityColor(qty: number): string {
  if (qty >= 10_000_000) return 'text-emerald-300 font-extrabold';
  if (qty >= 100_000) return 'text-yellow-300 font-bold';
  return 'text-cyan-100 font-semibold';
}

function getItemRarityStyle(item: any): string {
  const r = (item?.rarity || 'COMMON').toUpperCase();
  switch (r) {
    case 'LEGENDARY':
      return 'border-amber-400/80 shadow-[0_0_14px_rgba(251,191,36,0.4)] bg-amber-950/20';
    case 'EPIC':
      return 'border-fuchsia-400/80 shadow-[0_0_12px_rgba(217,70,239,0.35)] bg-fuchsia-950/20';
    case 'RARE':
      return 'border-cyan-400/80 shadow-[0_0_10px_rgba(34,211,238,0.3)] bg-cyan-950/20';
    case 'UNCOMMON':
      return 'border-emerald-400/70 shadow-[0_0_8px_rgba(52,211,153,0.25)] bg-emerald-950/15';
    default:
      return 'border-white/10 hover:border-cyan-400/40 bg-black/40';
  }
}

export default function InventoryOverlay() {
  const inventory = useGameStore((state) => state.player.inventory);
  const equipment = useGameStore((state) => state.player.equipment);
  const credits = useGameStore((state) => state.player.credits);
  const currency = useGameStore((state) => state.player.currency);
  const equipItem = useGameStore((state) => state.equipItem);
  const playerState = useGameStore((state) => state.player);

  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<CategoryFilter>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('DEFAULT');

  const handleItemClick = (itemId: string) => {
    soundSynth?.playSelectSound?.();
    setActiveItem(itemId === activeItem ? null : itemId);
  };

  const handleItemAction = (itemId: string, itemInfo: any) => {
    soundSynth?.playActionSound?.();
    const typeUpper = (itemInfo.type || '').toUpperCase();
    const equipSlots = ['HEAD', 'CHEST', 'LEGS', 'WEAPON', 'OFFHAND', 'GLOVES', 'BOOTS', 'RING', 'AMULET', 'CAPE'];

    if (equipSlots.includes(typeUpper)) {
      const slot = typeUpper.toLowerCase();
      if ((equipment as Record<string, string | null | undefined>)[slot] === itemId) {
        equipItem(slot as any, null);
        useGameStore.getState().showToast(`Unequipped ${itemInfo.name}`);
      } else {
        equipItem(slot as any, itemId);
        useGameStore.getState().showToast(`Equipped ${itemInfo.name}`);
      }
    } else if (typeUpper === 'FOOD' || typeUpper === 'CONSUMABLE') {
      if (itemInfo.stats?.hp) {
        useGameStore.getState().modifyHp(itemInfo.stats.hp);
        useGameStore.getState().modifyInventory(itemId, -1);
        useGameStore.getState().showToast(`Used ${itemInfo.name} (+${itemInfo.stats.hp} HP)`);
        if (inventory[itemId] === 1) setActiveItem(null);
      }
    }
  };

  const handleDrop = (itemId: string, itemInfo: any) => {
    soundSynth?.playUiClick?.();
    useGameStore.getState().modifyInventory(itemId, -1);
    useGameStore.getState().showToast(`Dropped ${itemInfo.name}`);
    if (inventory[itemId] <= 1) setActiveItem(null);
  };

  const maxWeight = playerState.maxWeight || (playerState.perk === 'PACK_MULE' ? 150 : 100);
  const currentWeight = Object.values(inventory).reduce((sum, qty) => sum + qty, 0);

  // Filter & sort entries
  const processedEntries = useMemo(() => {
    let entries = Object.entries(inventory).filter(([, qty]) => qty > 0);

    if (filterCategory !== 'ALL') {
      entries = entries.filter(([id]) => {
        const info = ITEM_DB[id];
        const type = (info?.type || 'MISC').toUpperCase();
        if (filterCategory === 'EQUIPMENT') {
          return ['HEAD', 'CHEST', 'LEGS', 'WEAPON', 'OFFHAND', 'GLOVES', 'BOOTS', 'RING', 'AMULET', 'CAPE'].includes(type);
        }
        if (filterCategory === 'CONSUMABLE') {
          return ['FOOD', 'CONSUMABLE', 'POTION'].includes(type);
        }
        if (filterCategory === 'MATERIAL') {
          return ['ORE', 'WOOD', 'HERB', 'FISH', 'BAR', 'MATERIAL'].includes(type);
        }
        if (filterCategory === 'QUEST') {
          return type === 'QUEST';
        }
        return true;
      });
    }

    if (sortOption === 'NAME') {
      entries.sort(([a], [b]) => (ITEM_DB[a]?.name || a).localeCompare(ITEM_DB[b]?.name || b));
    } else if (sortOption === 'RARITY') {
      entries.sort(([a], [b]) => {
        const rA = RARITY_ORDER[((ITEM_DB[a] as any)?.rarity || 'COMMON').toUpperCase()] || 0;
        const rB = RARITY_ORDER[((ITEM_DB[b] as any)?.rarity || 'COMMON').toUpperCase()] || 0;
        return rB - rA;
      });
    } else if (sortOption === 'QUANTITY') {
      entries.sort(([, qA], [, qB]) => qB - qA);
    }

    return entries;
  }, [inventory, filterCategory, sortOption]);

  // Build 28 slots list
  const slots = Array.from({ length: INVENTORY_CAPACITY }).map((_, idx) => {
    if (idx < processedEntries.length) {
      const [itemId, quantity] = processedEntries[idx];
      const itemInfo = ITEM_DB[itemId] || {
        name: itemId,
        description: 'Unknown artifact',
        type: 'MISC',
        spriteKey: 'unknown',
      };
      const isEquipped = Object.values(equipment).includes(itemId);
      const isSelected = activeItem === itemId;
      return { filled: true, itemId, quantity, itemInfo, isEquipped, isSelected };
    }
    return { filled: false, isSelected: false };
  });

  const selectedItemInfo = activeItem ? ITEM_DB[activeItem] : null;

  return (
    <div className="flex h-full w-full flex-col p-3 md:p-4 font-mono select-none animate-in fade-in">
      {/* HEADER: Currency & Weight Bar */}
      <div className="flex justify-between items-center bg-[#050b14]/90 p-2.5 rounded-lg border border-cyan-500/30 mb-2.5 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-cyan-200/70 text-[11px] font-bold">POUCH:</span>
          <span className="text-amber-400 font-extrabold text-xs drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]">
            {(currency?.gold ?? Math.floor(credits / 100)).toLocaleString()}g
          </span>
          <span className="text-slate-300 font-bold text-xs">
            {(currency?.silver ?? Math.floor((credits % 100) / 10)).toLocaleString()}s
          </span>
          <span className="text-amber-700 font-bold text-xs">
            {(currency?.copper ?? (credits % 10)).toLocaleString()}c
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Weight className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-200/70 text-[11px] font-bold">WEIGHT:</span>
          <span className={`font-extrabold text-xs ${currentWeight > maxWeight ? 'text-rose-400' : 'text-emerald-400'}`}>
            {currentWeight} / {maxWeight} kg
          </span>
        </div>
      </div>

      {/* FILTER & SORT STRIP */}
      <div className="flex items-center justify-between gap-1 mb-2.5 bg-black/40 p-1.5 rounded-lg border border-white/10 text-[10px]">
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['ALL', 'EQUIPMENT', 'CONSUMABLE', 'MATERIAL'] as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                soundSynth?.playSelectSound?.();
                setFilterCategory(cat);
              }}
              className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat === 'EQUIPMENT' ? 'Equip' : cat === 'CONSUMABLE' ? 'Food' : 'Mats'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            soundSynth?.playSelectSound?.();
            setSortOption((prev) =>
              prev === 'DEFAULT' ? 'NAME' : prev === 'NAME' ? 'RARITY' : prev === 'RARITY' ? 'QUANTITY' : 'DEFAULT'
            );
          }}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 shrink-0 cursor-pointer font-bold"
          title="Cycle sort mode"
        >
          <ArrowUpDown className="w-3 h-3" />
          <span>{sortOption}</span>
        </button>
      </div>

      {/* 28-SLOT RUNESCAPE-STYLE GRID */}
      <div className="flex-1 overflow-y-auto pr-1 pb-2 scrollbar-thin scrollbar-thumb-cyan-500/20">
        <div className="grid grid-cols-4 gap-2.5 max-w-[360px] mx-auto">
          {slots.map((slot, idx) => {
            if (!slot.filled) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="aspect-square rounded-md bg-[#070e1a]/60 border border-white/5 shadow-inner flex items-center justify-center transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-white/5" />
                </div>
              );
            }

            const { itemId, quantity, isEquipped, isSelected } = slot;
            const itemInfo = slot.itemInfo || {
              name: itemId || 'Item',
              description: '',
              type: 'MISC',
              spriteKey: 'unknown',
            };
            const rarityStyle = getItemRarityStyle(itemInfo);

            return (
              <button
                key={itemId}
                type="button"
                onClick={() => handleItemClick(itemId!)}
                onDoubleClick={() => handleItemAction(itemId!, itemInfo)}
                className={`relative aspect-square rounded-md border-2 transition-all flex flex-col items-center justify-center p-1.5 cursor-pointer text-left ${rarityStyle} ${
                  isSelected
                    ? 'border-cyan-400 ring-2 ring-cyan-400/50 scale-[1.03] z-10 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                    : isEquipped
                    ? 'border-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                    : ''
                }`}
                title={itemInfo.name}
              >
                {/* Item Icon Placeholder / Representation */}
                <div className="flex items-center justify-center w-full flex-1">
                  {itemInfo.type === 'WEAPON' ? (
                    <Sword className="w-6 h-6 text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                  ) : ['HEAD', 'CHEST', 'LEGS', 'OFFHAND', 'GLOVES', 'BOOTS', 'CAPE'].includes((itemInfo.type || '').toUpperCase()) ? (
                    <Shield className="w-6 h-6 text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                  ) : itemInfo.type === 'FOOD' || itemInfo.type === 'CONSUMABLE' ? (
                    <Heart className="w-6 h-6 text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
                  ) : (
                    <Package className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                {/* Item Name Short Label */}
                <span className="text-[9px] font-bold text-center leading-tight truncate w-full text-slate-300/90">
                  {itemInfo.name}
                </span>

                {/* Equipped Badge */}
                {isEquipped && (
                  <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                )}

                {/* RuneScape-style Quantity Badge */}
                {quantity! > 1 && (
                  <div className={`absolute bottom-0.5 right-1 text-[10px] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,1)] ${getQuantityColor(quantity!)}`}>
                    {formatQuantity(quantity!)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FOOTER: Selected Item Detail / Action Strip */}
      <div className="mt-2 min-h-24 bg-[#050b14]/95 rounded-lg border border-cyan-500/30 p-2.5 flex items-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.6)] backdrop-blur-md">
        {activeItem && selectedItemInfo && (inventory[activeItem] ?? 0) > 0 ? (
          <div className="flex w-full items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-black/60 border border-cyan-400/50 flex items-center justify-center shrink-0 shadow-inner">
              {selectedItemInfo.type === 'WEAPON' ? (
                <Sword className="w-6 h-6 text-cyan-400" />
              ) : ['HEAD', 'CHEST', 'LEGS', 'OFFHAND', 'GLOVES', 'BOOTS', 'CAPE'].includes((selectedItemInfo.type || '').toUpperCase()) ? (
                <Shield className="w-6 h-6 text-emerald-400" />
              ) : (
                <Package className="w-6 h-6 text-amber-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-cyan-100 font-extrabold text-xs truncate">
                  {selectedItemInfo.name}
                </h3>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                  {selectedItemInfo.type}
                </span>
              </div>
              <p className="text-[11px] text-slate-300/80 font-sans leading-snug line-clamp-2 mt-0.5">
                {selectedItemInfo.description || 'A valuable adventuring item.'}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleItemAction(activeItem, selectedItemInfo)}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold uppercase rounded border border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)] transition-all active:scale-95 cursor-pointer"
              >
                {['HEAD', 'CHEST', 'LEGS', 'WEAPON', 'OFFHAND', 'GLOVES', 'BOOTS', 'RING', 'AMULET', 'CAPE'].includes((selectedItemInfo.type || '').toUpperCase())
                  ? Object.values(equipment).includes(activeItem)
                    ? 'Unequip'
                    : 'Equip'
                  : 'Use'}
              </button>
              <button
                type="button"
                onClick={() => handleDrop(activeItem, selectedItemInfo)}
                className="px-3 py-0.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[10px] font-bold uppercase rounded border border-rose-500/30 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Drop
              </button>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-center text-center text-slate-500 text-xs italic">
            Select an item slot to inspect stats and actions
          </div>
        )}
      </div>
    </div>
  );
}
