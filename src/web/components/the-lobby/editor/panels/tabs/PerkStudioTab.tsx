'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { getStarterPerks, upsertStarterPerk, deleteStarterPerk, StarterPerkData } from '@/app/actions/game/starter-perks';
import { toast } from 'sonner';

const AVAILABLE_ICONS = ['Zap', 'Feather', 'Shield', 'User', 'Sparkles'];

export const PerkStudioTab: React.FC = () => {
  const [perks, setPerks] = useState<StarterPerkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await getStarterPerks();
    if (res.success && res.data) {
      setPerks(res.data);
    }
    setLoading(false);
  }

  const handleAdd = () => {
    const newPerk: StarterPerkData = {
      slug: `new-perk-${Date.now()}`,
      name: 'New Perk',
      desc: 'Description goes here',
      icon: 'Zap',
      color: '#fbbf24',
      badge: 'UTILITY',
      isActive: true,
      sortOrder: perks.length + 1,
    };
    setPerks([...perks, newPerk]);
  };

  const handleUpdate = (index: number, field: keyof StarterPerkData, value: any) => {
    const next = [...perks];
    next[index] = { ...next[index], [field]: value };
    setPerks(next);
  };

  const handleDelete = async (index: number) => {
    const p = perks[index];
    if (p.id) {
      await deleteStarterPerk(p.slug);
    }
    const next = [...perks];
    next.splice(index, 1);
    setPerks(next);
    toast.success('Perk deleted');
  };

  const handleSave = async () => {
    setSaving(true);
    let successCount = 0;
    for (const p of perks) {
      const res = await upsertStarterPerk(p);
      if (res.success) successCount++;
    }
    setSaving(false);
    toast.success(`Saved ${successCount} perks!`);
    load();
  };

  if (loading) {
    return <div className="p-4 text-muted-foreground text-xs font-mono">Loading perks...</div>;
  }

  return (
    <div className="space-y-4 max-w-4xl pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-foreground">Starter Perks</h3>
          <p className="text-xs text-muted-foreground">Manage the passive bonuses players select during character creation.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 rounded hover:bg-primary/30 transition-colors text-xs font-bold"
          >
            <Plus size={14} /> Add Perk
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/40 rounded hover:bg-green-500/30 transition-colors text-xs font-bold"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {perks.length === 0 && (
          <div className="p-8 text-center border border-dashed border-border/50 rounded-xl">
            <p className="text-muted-foreground text-xs font-mono">No perks found.</p>
          </div>
        )}

        {perks.map((perk, i) => (
          <div key={perk.slug} className="p-4 rounded-xl border border-border/50 bg-[#060e1c] flex flex-col gap-3">
            <div className="flex items-start gap-4">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Name</label>
                  <input
                    type="text"
                    value={perk.name}
                    onChange={(e) => handleUpdate(i, 'name', e.target.value)}
                    className="w-full bg-[#0a1424] border border-border/30 rounded px-2 py-1.5 text-xs text-foreground focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Slug (Unique ID)</label>
                  <input
                    type="text"
                    value={perk.slug}
                    onChange={(e) => handleUpdate(i, 'slug', e.target.value)}
                    disabled={!!perk.id}
                    className="w-full bg-[#0a1424] border border-border/30 rounded px-2 py-1.5 text-xs text-foreground focus:border-primary outline-none disabled:opacity-50"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Description</label>
                  <input
                    type="text"
                    value={perk.desc}
                    onChange={(e) => handleUpdate(i, 'desc', e.target.value)}
                    className="w-full bg-[#0a1424] border border-border/30 rounded px-2 py-1.5 text-xs text-foreground focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={perk.badge}
                    onChange={(e) => handleUpdate(i, 'badge', e.target.value)}
                    className="w-full bg-[#0a1424] border border-border/30 rounded px-2 py-1.5 text-xs text-foreground focus:border-primary outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Color</label>
                    <input
                      type="color"
                      value={perk.color}
                      onChange={(e) => handleUpdate(i, 'color', e.target.value)}
                      className="w-full h-7 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Icon</label>
                    <select
                      value={perk.icon}
                      onChange={(e) => handleUpdate(i, 'icon', e.target.value)}
                      className="w-full bg-[#0a1424] border border-border/30 rounded px-2 py-1.5 text-xs text-foreground focus:border-primary outline-none"
                    >
                      {AVAILABLE_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-center justify-center pt-5">
                <button
                  onClick={() => handleDelete(i)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
                  title="Delete Perk"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
