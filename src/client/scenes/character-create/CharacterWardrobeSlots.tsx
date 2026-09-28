'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { WorldModelValue } from '@/web/components/the-lobby/editor/components/WorldModelSelector';
import type { ModelWardrobeItem } from '@/shared/game/modelWardrobe';
import { getModelWardrobeItemLabel } from '@/shared/game/modelWardrobe';
import { ArchetypeModelPreview3D } from '@/web/components/the-lobby/editor/hero-studio/ArchetypeModelPreview3D';

interface CharacterWardrobeSlotsProps {
  name: string;
  classId: string;
  modelAssetId: string;
  modelScale?: number;
  wardrobeOptions: ModelWardrobeItem[];
  selectedWardrobeAssetIds: string[];
  setSelectedWardrobeAssetIds: (assetIds: string[]) => void;
  wardrobePreviewAttachments: WorldModelValue[];
  onProceed: () => void;
}

interface SlotDefinition {
  id: string;
  label: string;
  matches: RegExp;
}

const SLOTS: SlotDefinition[] = [
  { id: 'headwear', label: 'Hat / Headwear', matches: /hat|helmet|headwear|head|cap|crown|hood/ },
  { id: 'eyewear', label: 'Glasses / Head Accessories', matches: /glasses|goggles|eyewear|head_accessory|headphone|earring/ },
  { id: 'hair', label: 'Hair', matches: /hair|beard|moustache|eyebrow/ },
  { id: 'face', label: 'Face', matches: /face|mask|nose/ },
  { id: 'upper-body', label: 'Torso / Clothing', matches: /body|torso|chest|shirt|jacket|coat|clothing|top|armor/ },
  { id: 'hands', label: 'Hands / Gloves', matches: /hands|glove|gauntlet|wrist/ },
  { id: 'legs', label: 'Legs', matches: /legs|pants|trousers|shorts|skirt/ },
  { id: 'feet', label: 'Footwear', matches: /feet|shoes|boots|sneaker|slipper|sock/ },
  { id: 'back', label: 'Back / Cape', matches: /back|cape|cloak|wing|quiver|backpack/ },
  { id: 'accessory', label: 'Accessories / Equipment', matches: /weapon|sword|bow|shield|accessory|jewelry|other/ },
];

function getSlotId(item: ModelWardrobeItem): string {
  const category = String(item.category || '').toLowerCase().replace(/[\s-]+/g, '_');
  const text = `${category} ${item.label || ''} ${item.assetId}`.toLowerCase();
  const eyewear = SLOTS.find((slot) => slot.id === 'eyewear');
  if (eyewear?.matches.test(text)) return eyewear.id;
  return SLOTS.find((slot) => slot.matches.test(text))?.id || 'other';
}

function WardrobeSlot({
  slot,
  items,
  selectedIds,
  onChoose,
}: {
  slot: SlotDefinition;
  items: ModelWardrobeItem[];
  selectedIds: Set<string>;
  onChoose: (slotId: string, itemId: string) => void;
}) {
  const selectedItems = items.filter((item) => selectedIds.has(item.assetId));

  return (
    <section className="rounded-xl border border-border/50 bg-[#07111c]/95 p-3 text-left shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[11px] font-black uppercase tracking-wider text-foreground">{slot.label}</h3>
          <p className="truncate text-[9px] text-muted-foreground">
            {selectedItems.length > 0 ? selectedItems.map(getModelWardrobeItemLabel).join(', ') : 'Nothing selected'}
          </p>
        </div>
        {selectedItems.length > 0 && (
          <button
            type="button"
            onClick={() => onChoose(slot.id, '')}
            className="shrink-0 rounded border border-border/60 px-2 py-1 text-[9px] font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/40 px-2 py-3 text-center text-[9px] text-muted-foreground">
          No options in this slot
        </p>
      ) : (
        <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
          {items.map((item) => {
            const selected = selectedIds.has(item.assetId);
            return (
              <button
                key={item.assetId}
                type="button"
                aria-pressed={selected}
                onClick={() => onChoose(slot.id, item.assetId)}
                className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  selected
                    ? 'border-primary/70 bg-primary/15 text-primary'
                    : 'border-border/40 bg-black/25 text-foreground hover:border-primary/40'
                }`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-500'}`}>
                  {selected ? '✓' : ''}
                </span>
                <span className="min-w-0 flex-1 truncate text-[10px] font-semibold">{getModelWardrobeItemLabel(item)}</span>
                {selected && <span className="text-[8px] font-bold uppercase">On</span>}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function CharacterWardrobeSlots({
  name,
  classId,
  modelAssetId,
  modelScale = 0.8,
  wardrobeOptions,
  selectedWardrobeAssetIds,
  setSelectedWardrobeAssetIds,
  wardrobePreviewAttachments,
  onProceed,
}: CharacterWardrobeSlotsProps) {
  const selectedIds = new Set(selectedWardrobeAssetIds);
  const groupedItems = new Map<string, ModelWardrobeItem[]>();
  for (const item of wardrobeOptions) {
    const slotId = getSlotId(item);
    const slotItems = groupedItems.get(slotId) || [];
    slotItems.push(item);
    groupedItems.set(slotId, slotItems);
  }

  const chooseItem = (slotId: string, itemId: string) => {
    const slotIds = new Set((groupedItems.get(slotId) || []).map((item) => item.assetId));
    const next = selectedWardrobeAssetIds.filter((selectedId) => !slotIds.has(selectedId));
    if (itemId) next.push(itemId);
    setSelectedWardrobeAssetIds(next);
  };

  const headwearSlot = SLOTS[0];
  const eyewearSlot = SLOTS[1];
  const otherSlots = SLOTS.slice(2).filter((slot) => (groupedItems.get(slot.id)?.length || 0) > 0);
  const extraItems = groupedItems.get('other') || [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-black uppercase tracking-wider text-foreground">Choose clothing by slot</h2>
          <p className="mt-1 text-xs text-muted-foreground">Choose one item in a slot. Your outfit updates on the model preview as you select.</p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedWardrobeAssetIds(wardrobeOptions.filter((item) => item.defaultVisible !== false).map((item) => item.assetId))}
          className="rounded-lg border border-border/50 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary"
        >
          Reset to default outfit
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(210px,1fr)_minmax(420px,1.7fr)_minmax(210px,1fr)]">
        <div className="order-2 space-y-3 xl:order-1">
          <WardrobeSlot slot={headwearSlot} items={groupedItems.get(headwearSlot.id) || []} selectedIds={selectedIds} onChoose={chooseItem} />
        </div>

        <div className="order-1 min-w-0 xl:order-2">
          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2">
            <div className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-primary">Body / Base</span>
              <span className="block truncate text-xs font-bold text-foreground">{name || 'Character'} · {classId}</span>
            </div>
            <span className="shrink-0 text-[9px] text-muted-foreground">Base model</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-primary/50 bg-[#050b14] shadow-[0_0_28px_rgba(234,179,8,0.18)]">
            <ArchetypeModelPreview3D
              key={`${modelAssetId}:${wardrobePreviewAttachments.map((item) => item.assetId).sort().join('|')}`}
              baseAssetId={modelAssetId}
              modularAttachments={wardrobePreviewAttachments}
              modelScale={modelScale}
              className="h-[420px]"
            />
          </div>
        </div>

        <div className="order-3 space-y-3">
          <WardrobeSlot slot={eyewearSlot} items={groupedItems.get(eyewearSlot.id) || []} selectedIds={selectedIds} onChoose={chooseItem} />
        </div>
      </div>

      {wardrobeOptions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/50 p-5 text-center text-xs text-muted-foreground">
          No clothing slots are offered for this archetype yet. Add clothing options in Archetype Studio.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {otherSlots.map((slot) => (
            <WardrobeSlot key={slot.id} slot={slot} items={groupedItems.get(slot.id) || []} selectedIds={selectedIds} onChoose={chooseItem} />
          ))}
          {extraItems.length > 0 && (
            <WardrobeSlot
              slot={{ id: 'other', label: 'Other Items', matches: /.*/ }}
              items={extraItems}
              selectedIds={selectedIds}
              onChoose={chooseItem}
            />
          )}
        </div>
      )}

      <div className="flex justify-end border-t border-border/40 pt-3">
        <button
          type="button"
          onClick={onProceed}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-[0_0_18px_rgba(234,179,8,0.2)] hover:bg-primary/90"
        >
          Confirm Appearance <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
