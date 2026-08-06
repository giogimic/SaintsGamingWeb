'use client';

import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../editor-store';
import { Plus, Save, Trash2, Search, Link2 } from 'lucide-react';
import {
  listItemTemplates,
  getItemTemplate,
  upsertItemTemplate,
  deleteItemTemplate,
  getItemDependencies,
  type ItemTemplateInput,
} from '@/app/actions/item-templates';
import type { ItemTemplate } from '@prisma/client';

export const ItemEditorPanel: React.FC = () => {
  const isOpen = useEditorStore((s) => s.panels.items.isOpen);
  const activePanel = useEditorStore((s) => s.activePanel);
  const isFocused = activePanel === 'items';

  const [items, setItems] = useState<ItemTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<ItemTemplateInput>({
    slug: '',
    name: '',
    description: '',
    category: 'WEAPON',
    subCategory: '',
    tier: 1,
    baseDurability: 100,
    baseStats: '',
    stackable: false,
  });
  const [dependencies, setDependencies] = useState<{ type: string; id: string; name: string }[]>([]);

  const loadList = async (q = search) => {
    setLoading(true);
    const res = await listItemTemplates(q);
    if (res.success && res.data) {
      setItems(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadList();
    }
  }, [isOpen, search]);

  const handleSelect = async (slug: string) => {
    setActiveSlug(slug);
    const res = await getItemTemplate(slug);
    if (res.success && res.data) {
      setFormData({
        slug: res.data.slug,
        name: res.data.name,
        description: res.data.description || '',
        category: res.data.category,
        subCategory: res.data.subCategory || '',
        tier: res.data.tier,
        baseDurability: res.data.baseDurability ?? undefined,
        baseStats: res.data.baseStats || '',
        stackable: res.data.stackable,
      });
      // Load dependencies
      const deps = await getItemDependencies(slug);
      if (deps.success && deps.data) {
        setDependencies(deps.data);
      }
    }
  };

  const handleCreateNew = () => {
    setActiveSlug(null);
    setFormData({
      slug: '',
      name: 'New Item',
      description: '',
      category: 'WEAPON',
      subCategory: '',
      tier: 1,
      baseDurability: undefined,
      baseStats: '{\n  "attackPower": 10\n}',
      stackable: false,
    });
    setDependencies([]);
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.name) return alert('Slug and Name are required');
    setSaving(true);
    
    // Validate JSON stats if provided
    if (formData.baseStats) {
      try {
        JSON.parse(formData.baseStats);
      } catch (e) {
        alert("Invalid JSON in Base Stats.");
        setSaving(false);
        return;
      }
    }

    const res = await upsertItemTemplate(formData);
    if (res.success && res.data) {
      setActiveSlug(res.data.slug);
      loadList();
      alert('Saved successfully!');
    } else {
      alert(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!activeSlug) return;
    if (!confirm('Are you sure you want to delete this item?')) return;
    setSaving(true);
    const res = await deleteItemTemplate(activeSlug);
    if (res.success) {
      setActiveSlug(null);
      loadList();
    } else {
      alert(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`flex h-full w-full pointer-events-auto bg-black/80 backdrop-blur-md text-white border transition-colors ${
        isFocused ? 'border-amber-500/50' : 'border-white/10'
      }`}
    >
        {/* LEFT SIDEBAR - List */}
        <div className="w-1/3 border-r border-white/10 flex flex-col h-full bg-black/40">
          <div className="p-3 border-b border-white/10 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1.5 h-4 w-4 text-white/50" />
              <input
                className="w-full bg-black/50 border border-white/10 rounded px-8 py-1 text-sm outline-none focus:border-amber-500/50"
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={handleCreateNew}
              className="bg-amber-600 hover:bg-amber-500 p-1 rounded transition-colors text-white"
              title="New Item"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="text-white/50 text-sm text-center py-4">Loading...</div>
            ) : items.length === 0 ? (
              <div className="text-white/50 text-sm text-center py-4">No items found.</div>
            ) : (
              items.map((it) => (
                <button
                  key={it.slug}
                  onClick={() => handleSelect(it.slug)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex justify-between items-center ${
                    activeSlug === it.slug
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'hover:bg-white/5 text-white/80 border border-transparent'
                  }`}
                >
                  <span className="truncate">{it.name}</span>
                  <span className="text-[10px] bg-black/50 px-1.5 py-0.5 rounded text-white/50">
                    {it.category}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT CONTENT - Form */}
        <div className="w-2/3 flex flex-col h-full bg-black/20">
          {!formData.slug && !activeSlug && formData.name === '' ? (
            <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
              Select or create an item
            </div>
          ) : (
            <>
              {/* Form Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-white/50 mb-1 uppercase tracking-wider">
                      Item Name
                    </label>
                    <input
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm outline-none focus:border-amber-500/50 text-amber-50"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-white/50 mb-1 uppercase tracking-wider">
                      Slug (ID)
                    </label>
                    <input
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm outline-none focus:border-amber-500/50 font-mono text-amber-50"
                      value={formData.slug}
                      disabled={!!activeSlug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm outline-none focus:border-amber-500/50 resize-none h-16 text-amber-50"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-white/50 mb-1 uppercase tracking-wider">
                      Category
                    </label>
                    <select
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm outline-none focus:border-amber-500/50 text-amber-50"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="WEAPON">Weapon</option>
                      <option value="ARMOR">Armor</option>
                      <option value="RESOURCE">Resource</option>
                      <option value="TOOL">Tool</option>
                      <option value="CONSUMABLE">Consumable</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-white/50 mb-1 uppercase tracking-wider">
                      Sub-Category
                    </label>
                    <input
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm outline-none focus:border-amber-500/50 text-amber-50"
                      value={formData.subCategory}
                      placeholder="e.g. SWORD"
                      onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-semibold text-white/50 mb-1 uppercase tracking-wider">
                      Tier
                    </label>
                    <input
                      type="number"
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm outline-none focus:border-amber-500/50 text-amber-50"
                      value={formData.tier}
                      onChange={(e) => setFormData({ ...formData, tier: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.stackable}
                      onChange={(e) => setFormData({ ...formData, stackable: e.target.checked })}
                      className="rounded bg-black/50 border-white/10 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-900"
                    />
                    Stackable Item
                  </label>

                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-white/50 mb-1 uppercase tracking-wider">
                      Base Durability (Null = Unbreakable)
                    </label>
                    <input
                      type="number"
                      placeholder="Indestructible"
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm outline-none focus:border-amber-500/50 text-amber-50"
                      value={formData.baseDurability || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          baseDurability: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1 uppercase tracking-wider">
                    Base Stats (JSON format)
                  </label>
                  <textarea
                    className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-amber-500/50 resize-none h-32 font-mono text-amber-100"
                    value={formData.baseStats}
                    onChange={(e) => setFormData({ ...formData, baseStats: e.target.value })}
                    placeholder={`{\n  "attackPower": 10,\n  "gatherSpeed": 1.5\n}`}
                  />
                </div>

                {/* Dependency Viewer */}
                {activeSlug && (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> Dependencies
                    </label>
                    {dependencies.length === 0 ? (
                      <div className="text-white/30 text-xs bg-black/30 p-2 rounded">
                        Not currently used in any Loot Tables or Crafting Recipes.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {dependencies.map((dep, idx) => (
                          <span
                            key={idx}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/70 flex items-center gap-1"
                          >
                            <span className="text-amber-500 font-semibold">[{dep.type}]</span> {dep.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="p-3 border-t border-white/10 bg-black/40 flex justify-between items-center">
                <button
                  onClick={handleDelete}
                  disabled={!activeSlug || saving}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                    !activeSlug
                      ? 'opacity-30 cursor-not-allowed text-white/50 bg-black/50'
                      : 'text-red-400 hover:bg-red-500/20 bg-white/5'
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
  );
};
