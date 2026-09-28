'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { WorldModelValue } from '@/web/components/the-lobby/editor/components/WorldModelSelector';
import type { ModelWardrobeItem } from '@/shared/game/modelWardrobe';
import { getModelWardrobeItemLabel, getModelWardrobeSlotId } from '@/shared/game/modelWardrobe';
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
  group: 'head_face' | 'clothing' | 'gear';
}

const SLOTS: SlotDefinition[] = [
  // Head & Face Group (Left Column)
  { id: 'face', label: 'Face / Features', group: 'head_face' },
  { id: 'beard', label: 'Facial Hair / Beard', group: 'head_face' },
  { id: 'head_accessory', label: 'Glasses / Eyewear', group: 'head_face' },
  { id: 'mask', label: 'Face Mask / Bandana', group: 'head_face' },
  { id: 'hair', label: 'Hair / Style', group: 'head_face' },
  { id: 'hat', label: 'Hat / Headwear', group: 'head_face' },

  // Clothing Group (Right Column)
  { id: 'shirt', label: 'Shirt / Torso', group: 'clothing' },
  { id: 'jacket', label: 'Jacket / Outerwear', group: 'clothing' },
  { id: 'clothing', label: 'Outfit / Clothing', group: 'clothing' },
  { id: 'pants', label: 'Legs / Pants', group: 'clothing' },
  { id: 'shoes', label: 'Shoes / Footwear', group: 'clothing' },

  // Gear & Accessories (Right Column)
  { id: 'belt', label: 'Belt / Waist', group: 'gear' },
  { id: 'gloves', label: 'Gloves / Hands', group: 'gear' },
  { id: 'back', label: 'Cape / Back Item', group: 'gear' },
  { id: 'weapon_main', label: 'Main Weapon / Tool', group: 'gear' },
  { id: 'weapon_off', label: 'Offhand / Shield', group: 'gear' },
  { id: 'accessory', label: 'Accessories', group: 'gear' },
];

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
  const sortedItems = [...items].sort((a, b) => {
    const aDef = a.defaultVisible !== false ? 0 : 1;
    const bDef = b.defaultVisible !== false ? 0 : 1;
    if (aDef !== bDef) return aDef - bDef;
    return getModelWardrobeItemLabel(a).localeCompare(getModelWardrobeItemLabel(b));
  });

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

      {sortedItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/40 px-2 py-3 text-center text-[9px] text-muted-foreground">
          No options in this slot
        </p>
      ) : (
        <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
          {sortedItems.map((item) => {
            const selected = selectedIds.has(item.assetId);
            return (
              <button
                key={item.assetId}
                type="button"
                aria-pressed={selected}
                onClick={() => onChoose(slot.id, selected ? '' : item.assetId)}
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
    const slotId = getModelWardrobeSlotId(item);
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

  const headFaceSlots = SLOTS.filter((s) => s.group === 'head_face' && (groupedItems.get(s.id)?.length || 0) > 0);
  const clothingSlots = SLOTS.filter((s) => s.group === 'clothing' && (groupedItems.get(s.id)?.length || 0) > 0);
  const gearSlots = SLOTS.filter((s) => s.group === 'gear' && (groupedItems.get(s.id)?.length || 0) > 0);

  const knownSlotIds = new Set(SLOTS.map((s) => s.id));
  const extraItems: ModelWardrobeItem[] = [];
  groupedItems.forEach((items, slotId) => {
    if (!knownSlotIds.has(slotId)) {
      extraItems.push(...items);
    }
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-black uppercase tracking-wider text-foreground">Choose clothing by slot</h2>
          <p className="mt-1 text-xs text-muted-foreground">Select your appearance and gear. Each slot updates the 3D model in real time.</p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedWardrobeAssetIds(wardrobeOptions.filter((item) => item.defaultVisible !== false).map((item) => item.assetId))}
          className="rounded-lg border border-border/50 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary"
        >
          Reset to default outfit
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(250px,1.1fr)_minmax(380px,1.5fr)_minmax(250px,1.1fr)]">
        {/* Left Column: Head & Appearance */}
        <div className="order-2 space-y-3 xl:order-1">
          <div className="flex items-center gap-1.5 px-1 text-[11px] font-black uppercase tracking-wider text-primary">
            <span>Head & Appearance</span>
          </div>
          {headFaceSlots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/40 p-4 text-center text-[10px] text-muted-foreground">
              No head or face options configured for this archetype.
            </p>
          ) : (
            headFaceSlots.map((slot) => (
              <WardrobeSlot
                key={slot.id}
                slot={slot}
                items={groupedItems.get(slot.id) || []}
                selectedIds={selectedIds}
                onChoose={chooseItem}
              />
            ))
          )}
        </div>

        {/* Center Column: 3D Model Viewport */}
        <div className="order-1 min-w-0 xl:order-2 space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2">
            <div className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-primary">Body / Base</span>
              <span className="block truncate text-xs font-bold text-foreground">{name || 'Character'} · {classId}</span>
            </div>
            <span className="shrink-0 text-[9px] text-muted-foreground font-mono">Base model</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-primary/50 bg-[#050b14] shadow-[0_0_28px_rgba(234,179,8,0.18)]">
            <ArchetypeModelPreview3D
              key={modelAssetId}
              baseAssetId={modelAssetId}
              modularAttachments={wardrobePreviewAttachments}
              modelScale={modelScale}
              className="h-[440px]"
            />
          </div>
        </div>

        {/* Right Column: Clothing & Gear */}
        <div className="order-3 space-y-3">
          <div className="flex items-center gap-1.5 px-1 text-[11px] font-black uppercase tracking-wider text-primary">
            <span>Clothing & Gear</span>
          </div>
          {clothingSlots.length === 0 && gearSlots.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/40 p-4 text-center text-[10px] text-muted-foreground">
              No clothing or gear options configured for this archetype.
            </p>
          ) : (
            <>
              {clothingSlots.map((slot) => (
                <WardrobeSlot
                  key={slot.id}
                  slot={slot}
                  items={groupedItems.get(slot.id) || []}
                  selectedIds={selectedIds}
                  onChoose={chooseItem}
                />
              ))}
              {gearSlots.map((slot) => (
                <WardrobeSlot
                  key={slot.id}
                  slot={slot}
                  items={groupedItems.get(slot.id) || []}
                  selectedIds={selectedIds}
                  onChoose={chooseItem}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {extraItems.length > 0 && (
        <div className="pt-2">
          <div className="mb-2 px-1 text-[11px] font-black uppercase tracking-wider text-primary">
            <span>Additional Items</span>
          </div>
          <WardrobeSlot
            slot={{ id: 'other', label: 'Other Items', group: 'gear' }}
            items={extraItems}
            selectedIds={selectedIds}
            onChoose={chooseItem}
          />
        </div>
      )}

      {wardrobeOptions.length === 0 && (
        <p className="rounded-xl border border-dashed border-border/50 p-5 text-center text-xs text-muted-foreground">
          No clothing slots are offered for this archetype yet. Add clothing options in Archetype Studio.
        </p>
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
