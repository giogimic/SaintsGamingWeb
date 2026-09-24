'use client';

import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Shield, Sword, Box } from 'lucide-react';
import { listItemTemplates } from '@/app/actions/game/item-templates';
import { cn } from '@/shared/lib/utils';

interface InventoryPickerProps {
  value: string; // JSON string e.g. '{"patch_kit": 5}'
  onChange: (value: string) => void;
  label?: string;
  description?: string;
}

export function InventoryPicker({ 
  value, 
  onChange,
  label = "Assigned Initial Items",
  description = "Items granted immediately upon spawning."
}: InventoryPickerProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [selectedToAdd, setSelectedToAdd] = useState<string>('');

  useEffect(() => {
    async function load() {
      const res = await listItemTemplates();
      if (res.success && res.data) {
        setItems(res.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    try {
      if (value) {
        setInventory(JSON.parse(value));
      } else {
        setInventory({});
      }
    } catch {
      setInventory({});
    }
  }, [value]);

  const updateInventory = (newInv: Record<string, number>) => {
    setInventory(newInv);
    onChange(JSON.stringify(newInv));
  };

  const handleAdd = () => {
    if (!selectedToAdd) return;
    const newInv = { ...inventory, [selectedToAdd]: (inventory[selectedToAdd] || 0) + 1 };
    updateInventory(newInv);
    setSelectedToAdd('');
  };

  const handleUpdateQty = (slug: string, delta: number) => {
    const newInv = { ...inventory };
    const newQty = (newInv[slug] || 0) + delta;
    if (newQty <= 0) {
      delete newInv[slug];
    } else {
      newInv[slug] = newQty;
    }
    updateInventory(newInv);
  };

  const handleRemove = (slug: string) => {
    const newInv = { ...inventory };
    delete newInv[slug];
    updateInventory(newInv);
  };

  const getItemIcon = (category: string) => {
    switch (category) {
      case 'WEAPON': return <Sword className="w-3.5 h-3.5 text-rose-400" />;
      case 'ARMOR': return <Shield className="w-3.5 h-3.5 text-cyan-400" />;
      case 'CONSUMABLE': return <Package className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Box className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between border-b border-border/50 pb-1">
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {label}
          </div>
          <div className="text-[9px] text-muted-foreground">{description}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={selectedToAdd}
          onChange={(e) => setSelectedToAdd(e.target.value)}
          className="flex-1 bg-black/50 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 outline-none"
        >
          <option value="">Select item to add...</option>
          {items.map(item => (
            <option key={item.slug} value={item.slug}>
              {item.name} ({item.category})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedToAdd}
          className="px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/50 rounded flex items-center gap-1 disabled:opacity-50 transition-all text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      <div className="mt-2 space-y-1">
        {Object.entries(inventory).length === 0 ? (
          <div className="text-center p-3 text-[10px] text-slate-500 bg-black/20 rounded border border-white/5">
            No initial items assigned.
          </div>
        ) : (
          Object.entries(inventory).map(([slug, qty]) => {
            const itemDef = items.find(i => i.slug === slug);
            return (
              <div key={slug} className="flex items-center justify-between bg-black/40 border border-slate-800 rounded p-2 hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-black/50 rounded border border-white/5">
                    {getItemIcon(itemDef?.category || 'UNKNOWN')}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-200">
                      {itemDef?.name || slug}
                    </div>
                    {itemDef && (
                      <div className="text-[9px] text-slate-500 flex gap-1">
                        <span>{itemDef.category}</span>
                        {itemDef.tier && <span>• T{itemDef.tier}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-black/60 rounded border border-slate-800 p-0.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(slug, -1)}
                      className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded text-slate-400"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono w-6 text-center text-slate-200">{qty}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(slug, 1)}
                      className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded text-slate-400"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(slug)}
                    className="p-1 text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
