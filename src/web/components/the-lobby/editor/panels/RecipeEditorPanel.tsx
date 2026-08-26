'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useEditorStore } from '../editor-store';
import {
  listCraftingRecipes,
  getCraftingRecipe,
  upsertCraftingRecipe,
  deleteCraftingRecipe,
  type CraftingRecipeInput,
} from '@/app/actions/recipes';
import type { CraftingRecipe } from '@prisma/client';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { useDefinitionFormHistory } from '../hooks/useDefinitionFormHistory';

function recipeResourceKey(form: CraftingRecipeInput, activeSlug: string | null): string {
  if (!activeSlug || !form.slug) return 'recipe:new';
  return `recipe:${form.slug}`;
}

export const RecipeEditorPanel: React.FC = () => {
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  const [recipes, setRecipes] = useState<CraftingRecipe[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<CraftingRecipeInput>({
    slug: '',
    outputItemSlug: '',
    outputQuantity: 1,
    skillSlug: '',
    levelReq: 1,
    xpReward: 10,
    ingredients: '[]',
    timeMs: 3000,
  });

  const resourceKey = recipeResourceKey(formData, activeSlug);
  const {
    canUndoDefinition,
    canRedoDefinition,
    syncFormRef,
    onFieldFocus,
    onFieldBlur,
    commitStructural,
    applyHistory,
  } = useDefinitionFormHistory<CraftingRecipeInput>(resourceKey);

  syncFormRef(formData);

  const originalRecipe = useMemo(() => recipes.find(p => p.slug === activeSlug), [recipes, activeSlug]);

  const isDirty = useMemo(() => {
    if (!activeSlug) return true;
    if (!originalRecipe) return false;
    return (
      formData.outputItemSlug !== originalRecipe.outputItemSlug ||
      formData.outputQuantity !== originalRecipe.outputQuantity ||
      formData.skillSlug !== originalRecipe.skillSlug ||
      formData.levelReq !== originalRecipe.levelReq ||
      formData.xpReward !== originalRecipe.xpReward ||
      formData.ingredients !== originalRecipe.ingredients ||
      formData.timeMs !== originalRecipe.timeMs
    );
  }, [formData, originalRecipe, activeSlug]);

  const loadList = async (q = search) => {
    setLoading(true);
    const res = await listCraftingRecipes(q);
    if (res.success && res.data) setRecipes(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadList();
  }, [search, dataVersion]);

  const handleSelect = async (slug: string) => {
    if (isDirty && activeSlug) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setActiveSlug(slug);
    setValidationError(null);
    const res = await getCraftingRecipe(slug);
    if (res.success && res.data) {
      setFormData({
        slug: res.data.slug,
        outputItemSlug: res.data.outputItemSlug,
        outputQuantity: res.data.outputQuantity,
        skillSlug: res.data.skillSlug,
        levelReq: res.data.levelReq,
        xpReward: res.data.xpReward,
        ingredients: res.data.ingredients,
        timeMs: res.data.timeMs,
      });
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
      outputItemSlug: '',
      outputQuantity: 1,
      skillSlug: '',
      levelReq: 1,
      xpReward: 10,
      ingredients: '[]',
      timeMs: 3000,
    });
  };

  const handleSave = async () => {
    setValidationError(null);
    if (!formData.slug || !formData.outputItemSlug || !formData.skillSlug) {
      setValidationError('Slug, Output Item, and Skill are required');
      return;
    }

    try {
      JSON.parse(formData.ingredients);
    } catch (e) {
      setValidationError('Ingredients must be valid JSON.');
      return;
    }

    setSaving(true);
    const res = await upsertCraftingRecipe(formData);
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
    if (activeSlug) handleSelect(activeSlug);
  };

  const handleDelete = async () => {
    if (!activeSlug) return;
    if (!confirm(`Delete recipe ${activeSlug}? This cannot be undone.`)) return;
    const res = await deleteCraftingRecipe(activeSlug);
    if (res.success) {
      setActiveSlug(null);
      incrementDataVersion();
      await loadList();
    } else {
      setValidationError(`Error deleting: ${res.error}`);
    }
  };

  const handleUndo = () => {
    applyHistory('undo', setFormData);
  };

  const handleRedo = () => {
    applyHistory('redo', setFormData);
  };

  return (
    <CatalogEditorShell<CraftingRecipe>
      title="Recipe Studio"
      items={recipes}
      activeId={activeSlug}
      getItemId={(it) => it.slug}
      getItemName={(it) => it.slug}
      isDirty={(it) => it.slug === activeSlug ? isDirty : false}
      search={search}
      onSearchChange={setSearch}
      onSelect={handleSelect}
      onCreateNew={handleCreateNew}
      onSave={handleSave}
      onRevert={handleRevert}
      onDelete={handleDelete}
      onUndoDefinition={handleUndo}
      onRedoDefinition={handleRedo}
      canUndoDefinition={canUndoDefinition}
      canRedoDefinition={canRedoDefinition}
      saving={saving}
      validationError={validationError}
    >
      <div className="space-y-4 max-w-3xl">
        <div className="flex-1">
          <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Recipe Slug</label>
          <input
            type="text"
            className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
            value={formData.slug}
            disabled={!!activeSlug}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
            placeholder="e.g. smelt_copper_bar"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Output Item Slug</label>
            <input
              type="text"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.outputItemSlug}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, outputItemSlug: e.target.value })}
              placeholder="e.g. copper_bar"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Output Quantity</label>
            <input
              type="number"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.outputQuantity}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, outputQuantity: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Profession / Skill Slug</label>
            <input
              type="text"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.skillSlug}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, skillSlug: e.target.value })}
              placeholder="e.g. smithing"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Level Required</label>
            <input
              type="number"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.levelReq}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, levelReq: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">XP Reward</label>
            <input
              type="number"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.xpReward}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, xpReward: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Time (ms)</label>
            <input
              type="number"
              className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1"
              value={formData.timeMs}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
              onChange={(e) => setFormData({ ...formData, timeMs: parseInt(e.target.value) || 3000 })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-blue-300 uppercase tracking-widest font-semibold">Ingredients (JSON)</label>
          <textarea
            className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 min-h-[120px] font-mono text-sm"
            value={formData.ingredients}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
            onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
            placeholder='[{"itemSlug": "copper_ore", "qty": 1}]'
          />
        </div>
      </div>
    </CatalogEditorShell>
  );
};
