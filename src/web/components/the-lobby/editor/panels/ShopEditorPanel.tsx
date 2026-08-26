'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useEditorStore } from '../editor-store';
import {
  listShops,
  getShop,
  upsertShop,
  deleteShop,
  type ShopTemplateInput,
} from '@/app/actions/shops';
import type { ShopTemplate } from '@prisma/client';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { useDefinitionFormHistory } from '../hooks/useDefinitionFormHistory';
import { DefinitionRefBadge } from '../components/DefinitionRefBadge';

function shopResourceKey(form: ShopTemplateInput, activeSlug: string | null): string {
  if (!activeSlug || !form.slug) return 'shop:new';
  return `shop:${form.slug}`;
}

export const ShopEditorPanel: React.FC = () => {
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  const [shops, setShops] = useState<ShopTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShopTemplateInput>({
    slug: '',
    name: '',
    description: '',
    currency: 'gold',
    refreshInterval: 0,
    itemsSoldData: '[]',
  });

  const resourceKey = shopResourceKey(formData, activeSlug);
  const {
    canUndoDefinition,
    canRedoDefinition,
    syncFormRef,
    onFieldFocus,
    onFieldBlur,
    commitStructural,
    applyHistory,
  } = useDefinitionFormHistory<ShopTemplateInput>(resourceKey);

  syncFormRef(formData);

  const originalShop = useMemo(() => shops.find(s => s.slug === activeSlug), [shops, activeSlug]);

  const isDirty = useMemo(() => {
    if (!activeSlug) return true;
    if (!originalShop) return false;
    return (
      formData.name !== originalShop.name ||
      formData.description !== (originalShop.description || '') ||
      formData.currency !== originalShop.currency ||
      formData.refreshInterval !== (originalShop.refreshInterval || 0) ||
      formData.itemsSoldData !== originalShop.itemsSoldData
    );
  }, [formData, originalShop, activeSlug]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listShops(search).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        setShops(res.data);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [search, dataVersion]);

  const handleSelect = async (slug: string) => {
    setLoading(true);
    const res = await getShop(slug);
    setLoading(false);
    if (res.success && res.data) {
      setActiveSlug(res.data.slug);
      setFormData({
        slug: res.data.slug,
        name: res.data.name,
        description: res.data.description || '',
        currency: res.data.currency || 'gold',
        refreshInterval: res.data.refreshInterval || 0,
        itemsSoldData: res.data.itemsSoldData || '[]',
      });
      setValidationError(null);
    } else {
      setValidationError(res.error || 'Failed to load shop');
    }
  };

  const handleCreateNew = () => {
    setActiveSlug(null);
    setFormData({
      slug: '',
      name: '',
      description: '',
      currency: 'gold',
      refreshInterval: 0,
      itemsSoldData: '[]',
    });
    setValidationError(null);
  };

  const handleRevert = () => {
    if (activeSlug) {
      handleSelect(activeSlug);
    }
  };

  const handleDelete = async () => {
    if (!activeSlug) return;
    if (!confirm(`Delete shop ${activeSlug}?`)) return;
    setLoading(true);
    const res = await deleteShop(activeSlug);
    setLoading(false);
    if (res.success) {
      handleCreateNew();
      incrementDataVersion();
    } else {
      setValidationError(res.error || 'Failed to delete');
    }
  };

  const handleSave = async () => {
    if (!formData.slug.trim()) {
      setValidationError('Slug is required.');
      return;
    }
    setSaving(true);
    setValidationError(null);

    const input: ShopTemplateInput = {
      ...formData,
      slug: formData.slug.trim().toLowerCase(),
    };

    const res = await upsertShop(input);
    setSaving(false);
    if (res.success && res.data) {
      setActiveSlug(res.data.slug);
      incrementDataVersion();
    } else {
      setValidationError(res.error || 'Failed to save shop.');
    }
  };

  const handleChange = (field: keyof ShopTemplateInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const filteredShops = shops.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <CatalogEditorShell<ShopTemplate>
      title="Shop Studio"
      search={search}
      onSearchChange={setSearch}
      items={filteredShops}
      activeId={activeSlug}
      getItemId={(it) => it.slug}
      getItemName={(it) => it.name}
      onSelect={handleSelect}
      onCreateNew={handleCreateNew}
      onSave={handleSave}
      onRevert={handleRevert}
      onDelete={handleDelete}
      saving={saving}
      isDirty={(it) => it.slug === activeSlug ? isDirty : false}
      validationError={validationError}
      canUndoDefinition={canUndoDefinition}
      canRedoDefinition={canRedoDefinition}
      onUndoDefinition={() => applyHistory('undo', setFormData)}
      onRedoDefinition={() => applyHistory('redo', setFormData)}
    >
      <div className="flex h-full flex-col p-4 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500">Shop Configurations</span>
          <DefinitionRefBadge type="shop" slug={activeSlug || formData.slug} />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
            Slug (ID)
            <input
              type="text"
              disabled={!!activeSlug}
              value={formData.slug}
              onChange={(e) => handleChange('slug', e.target.value)}
              className="rounded bg-black/50 px-2 py-1.5 font-mono text-slate-200 border border-slate-800 disabled:opacity-50"
              placeholder="e.g. global_blacksmith"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
            Name
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="rounded bg-black/50 px-2 py-1.5 font-sans text-slate-200 border border-slate-800"
              placeholder="e.g. Town Blacksmith"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 mb-4 text-[11px] font-bold text-slate-400">
          Description
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            className="rounded bg-black/50 px-2 py-1.5 font-sans text-slate-200 border border-slate-800 min-h-[60px]"
          />
        </label>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
            Currency Override
            <input
              type="text"
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="rounded bg-black/50 px-2 py-1.5 font-mono text-slate-200 border border-slate-800"
              placeholder="gold"
            />
            <span className="text-[10px] text-slate-500 font-normal">Default: gold</span>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
            Refresh Interval (sec)
            <input
              type="number"
              value={formData.refreshInterval || 0}
              onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value) || 0)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="rounded bg-black/50 px-2 py-1.5 font-mono text-slate-200 border border-slate-800"
            />
            <span className="text-[10px] text-slate-500 font-normal">0 = Never respawns automatically</span>
          </label>
        </div>

        <div className="flex-1 mt-2">
          <label className="flex flex-col gap-1 h-full text-[11px] font-bold text-slate-400">
            Items Sold (JSON)
            <textarea
              value={formData.itemsSoldData}
              onChange={(e) => handleChange('itemsSoldData', e.target.value)}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              className="rounded bg-black/50 px-2 py-2 font-mono text-slate-200 border border-slate-800 h-full min-h-[250px] resize-none"
              placeholder={'[\n  { "itemId": "iron_sword", "price": 100, "stock": -1 }\n]'}
            />
            <span className="text-[10px] text-slate-500 font-normal">Array of objects: itemId, price, stock (-1 = infinite).</span>
          </label>
        </div>
      </div>
    </CatalogEditorShell>
  );
};
