'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useEditorStore } from '../editor-store';
import { Link2 } from 'lucide-react';
import {
  listItemTemplates,
  getItemTemplate,
  upsertItemTemplate,
  deleteItemTemplate,
  getItemDependencies,
  type ItemTemplateInput,
} from '@/app/actions/game/item-templates';
import type { ItemTemplate } from '@prisma/client';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { useDefinitionFormHistory } from '../hooks/useDefinitionFormHistory';

function itemResourceKey(form: ItemTemplateInput, activeSlug: string | null): string {
  if (!activeSlug || !form.slug) return 'item:new';
  return `item:${form.slug}`;
}

export const ItemEditorPanel: React.FC = () => {
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  const [items, setItems] = useState<ItemTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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
    iconAssetId: '',
  });
  const [dependencies, setDependencies] = useState<{ type: string; id: string; name: string }[]>([]);

  const resourceKey = itemResourceKey(formData, activeSlug);
  const {
    canUndoDefinition,
    canRedoDefinition,
    syncFormRef,
    onFieldFocus,
    onFieldBlur,
    commitStructural,
    applyHistory,
    clearDefinitionStackFor,
  } = useDefinitionFormHistory<ItemTemplateInput>(resourceKey);

  syncFormRef(formData);

  // Find original item to check for dirty state
  const originalItem = useMemo(() => items.find(i => i.slug === activeSlug), [items, activeSlug]);

  const isDirty = useMemo(() => {
    if (!activeSlug) return true; // new item is dirty
    if (!originalItem) return false;
    return (
      formData.name !== originalItem.name ||
      formData.description !== (originalItem.description || '') ||
      formData.category !== originalItem.category ||
      formData.subCategory !== (originalItem.subCategory || '') ||
      formData.tier !== originalItem.tier ||
      formData.baseDurability !== (originalItem.baseDurability ?? undefined) ||
      formData.baseStats !== (originalItem.baseStats || '') ||
      formData.stackable !== originalItem.stackable ||
      formData.iconAssetId !== (originalItem.iconAssetId || '')
    );
  }, [formData, originalItem, activeSlug]);

  const loadList = async (q = search) => {
    setLoading(true);
    const res = await listItemTemplates(q);
    if (res.success && res.data) {
      setItems(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadList();
  }, [search, dataVersion]);

  useEffect(() => {
    const handleFocus = async (e: Event) => {
      const customEv = e as CustomEvent<{ itemSlug: string }>;
      const targetSlug = customEv.detail?.itemSlug;
      if (!targetSlug) return;
      setActiveSlug(targetSlug);
      const res = await getItemTemplate(targetSlug);
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
          iconAssetId: res.data.iconAssetId || '',
        });
        const deps = await getItemDependencies(targetSlug);
        if (deps.success && deps.data) {
          setDependencies(deps.data);
        }
      }
    };
    window.addEventListener('studio_focus_item', handleFocus);
    return () => window.removeEventListener('studio_focus_item', handleFocus);
  }, []);

  const handleSelect = async (slug: string) => {
    if (isDirty && activeSlug) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setActiveSlug(slug);
    setValidationError(null);
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
        iconAssetId: res.data.iconAssetId || '',
      });
      // Load dependencies
      const deps = await getItemDependencies(slug);
      if (deps.success && deps.data) {
        setDependencies(deps.data);
      }
    }
  };

  const handleCreateNew = () => {
    if (isDirty && activeSlug) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setActiveSlug(null);
    setValidationError(null);
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
      iconAssetId: '',
    });
    setDependencies([]);
  };

  const handleSave = async () => {
    setValidationError(null);
    if (!formData.slug || !formData.name) {
      setValidationError('Slug and Name are required');
      return;
    }
    if (formData.baseStats) {
      try {
        JSON.parse(formData.baseStats);
      } catch (e) {
        setValidationError("Invalid JSON in Base Stats.");
        return;
      }
    }

    setSaving(true);
    const res = await upsertItemTemplate(formData);
    if (res.success && res.data) {
      setActiveSlug(res.data.slug);
      incrementDataVersion();
      await loadList();
    } else {
      setValidationError(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const handleRevert = () => {
    if (activeSlug) {
      handleSelect(activeSlug);
    }
  };

  const handleDelete = async () => {
    if (!activeSlug) return;
    if (dependencies.length > 0) {
      setValidationError("Cannot delete item with active dependencies.");
      return;
    }
    if (!confirm('Are you sure you want to delete this item?')) return;
    setSaving(true);
    const res = await deleteItemTemplate(activeSlug);
    if (res.success) {
      incrementDataVersion();
      setActiveSlug(null);
      await loadList();
    } else {
      setValidationError(`Error: ${res.error}`);
    }
    setSaving(false);
  };

  const filteredItems = items.filter(it => it.name.toLowerCase().includes(search.toLowerCase()) || it.slug.toLowerCase().includes(search.toLowerCase()));

  return (
    <CatalogEditorShell<ItemTemplate>
      title="Item Templates"
      items={filteredItems}
      activeId={activeSlug}
      getItemId={(it) => it.slug}
      getItemName={(it) => it.name}
      isDirty={(it) => (it.slug === activeSlug ? isDirty : false)}
      search={search}
      onSearchChange={setSearch}
      onSelect={handleSelect}
      onCreateNew={handleCreateNew}
      onSave={handleSave}
      onRevert={handleRevert}
      onDelete={handleDelete}
      saving={saving}
      validationError={validationError}
      canUndoDefinition={canUndoDefinition}
      canRedoDefinition={canRedoDefinition}
      onUndoDefinition={() => applyHistory('undo', setFormData)}
      onRedoDefinition={() => applyHistory('redo', setFormData)}
    >
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
              Item Name
            </label>
            <input
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3]"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
              Slug (ID)
            </label>
            <input
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] font-mono text-[#e2d5b3]"
              value={formData.slug}
              disabled={!!activeSlug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
            Description
          </label>
          <textarea
            className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] resize-none h-16 text-[#e2d5b3]"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
              Category
            </label>
            <select
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3]"
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
            <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
              Sub-Category
            </label>
            <input
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3]"
              value={formData.subCategory}
              placeholder="e.g. SWORD"
              onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
            />
          </div>
          <div className="w-24">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Tier / Rank</label>
            <input
              type="number"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3]"
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Icon Asset ID</label>
            <input
              type="text"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3]"
              placeholder="e.g. icon_sword_01"
              value={formData.iconAssetId || ''}
              onChange={(e) => setFormData({ ...formData, iconAssetId: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 text-[#a59981] cursor-pointer hover:text-[#cbb26a] transition-colors">
            <input
              type="checkbox"
              checked={formData.stackable}
              onChange={(e) => setFormData({ ...formData, stackable: e.target.checked })}
              className="rounded bg-[#111a2a] border-[#806f47]/40 text-[#cbb26a] focus:ring-[#cbb26a]"
            />
            Stackable Item
          </label>

          <div className="flex-1">
            <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
              Base Durability (Null = Unbreakable)
            </label>
            <input
              type="number"
              placeholder="Indestructible"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3]"
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
          <label className="block text-[10px] font-bold text-[#806f47] mb-1 uppercase tracking-wider">
            Base Stats (JSON format)
          </label>
          <textarea
            className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-2 outline-none focus:border-[#cbb26a] resize-none h-32 font-mono text-[#e5c07b]"
            value={formData.baseStats}
            onChange={(e) => setFormData({ ...formData, baseStats: e.target.value })}
            placeholder={`{\n  "attackPower": 10,\n  "gatherSpeed": 1.5\n}`}
          />
        </div>

        {/* Dependency Viewer */}
        {activeSlug && (
          <div className="mt-4 border-t border-[#806f47]/20 pt-4">
            <label className="block text-[10px] font-bold text-[#806f47] mb-2 uppercase tracking-wider flex items-center gap-1">
              <Link2 className="h-3 w-3" /> Used By
            </label>
            {dependencies.length === 0 ? (
              <div className="text-[#a59981] text-xs bg-[#050b14] p-2 rounded italic opacity-70">
                Not currently used in any Loot Tables or Crafting Recipes.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {dependencies.map((dep, idx) => (
                  <span
                    key={idx}
                    className="bg-[#111a2a] border border-[#806f47]/30 rounded px-2 py-1 text-xs text-[#a59981] flex items-center gap-1.5"
                  >
                    <span className="text-[#cbb26a] font-bold">[{dep.type}]</span> {dep.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </CatalogEditorShell>
  );
};
