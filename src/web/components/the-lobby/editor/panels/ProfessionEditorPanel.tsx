'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useEditorStore } from '../editor-store';
import {
  listProfessionTemplates,
  getProfessionTemplate,
  upsertProfessionTemplate,
  deleteProfessionTemplate,
  type ProfessionTemplateInput,
} from '@/app/actions/professions';
import type { ProfessionTemplate } from '@prisma/client';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import { useDefinitionFormHistory } from '../hooks/useDefinitionFormHistory';
import {
  Sword,
  Shield,
  Heart,
  Crosshair,
  Wind,
  Eye,
  BookOpen,
  Cpu,
  Pickaxe,
  Axe,
  Fish,
  Sprout,
  Target,
  Anvil,
  UtensilsCrossed,
  Hammer,
  FlaskConical,
  Feather,
  Flame,
  Sparkle,
  Home,
  Key,
  Wand2,
  Sun,
  Sparkles,
  Skull,
  Zap,
  Plus,
  Trash2,
  Layers,
  Award,
  BookMarked,
  Trophy,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Sword,
  Shield,
  Heart,
  Crosshair,
  Wind,
  Eye,
  BookOpen,
  Cpu,
  Pickaxe,
  Axe,
  Fish,
  Sprout,
  Target,
  Anvil,
  UtensilsCrossed,
  Hammer,
  FlaskConical,
  Feather,
  Flame,
  Sparkle,
  Home,
  Key,
  Wand2,
  Sun,
  Sparkles,
  Skull,
  Zap,
};

function renderSkillIcon(iconName: string, className = 'w-4 h-4') {
  const IconComponent = ICON_MAP[iconName] || Zap;
  return <IconComponent className={className} />;
}

export type ProfessionUnlockMilestone = {
  level: number;
  title: string;
  description: string;
  type: 'EQUIPMENT' | 'ABILITY' | 'RECIPE' | 'GATHER' | 'PASSIVE' | 'ZONE' | 'CREATURE';
  iconName?: string;
};

export type ProfessionBattlepassTier = {
  tier: number;
  level: number;
  rewardName: string;
  rewardType: 'TITLE' | 'COSMETIC' | 'EMOTE' | 'AURA' | 'BANNER' | 'CAPE';
  description: string;
  iconName: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
};

function professionResourceKey(form: ProfessionTemplateInput, activeSlug: string | null): string {
  if (!activeSlug || !form.slug) return 'profession:new';
  return `profession:${form.slug}`;
}

export const ProfessionEditorPanel: React.FC = () => {
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);
  const dataVersion = useEditorStore((s) => s.dataVersion);

  const [professions, setProfessions] = useState<ProfessionTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STATIONS' | 'MILESTONES' | 'BATTLEPASS'>('OVERVIEW');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfessionTemplateInput>({
    slug: '',
    name: '',
    description: '',
    iconAssetId: 'Sword',
    category: 'Combat',
    themeColor: '#ef4444',
    tagline: '',
    stationTags: '[]',
    xpCurve: 'exponential',
    maxLevel: 50,
    trainingMethodsJson: '[]',
    perksJson: '[]',
    milestonesJson: '[]',
    battlepassTiersJson: '[]',
  });

  const resourceKey = professionResourceKey(formData, activeSlug);
  const {
    canUndoDefinition,
    canRedoDefinition,
    syncFormRef,
    onFieldFocus,
    onFieldBlur,
    commitStructural,
    applyHistory,
  } = useDefinitionFormHistory<ProfessionTemplateInput>(resourceKey);

  syncFormRef(formData);

  const originalProfession = useMemo(
    () => professions.find((p) => p.slug === activeSlug),
    [professions, activeSlug]
  );

  const isDirty = useMemo(() => {
    if (!activeSlug) return true;
    if (!originalProfession) return false;
    return (
      formData.name !== originalProfession.name ||
      formData.description !== (originalProfession.description || '') ||
      formData.iconAssetId !== (originalProfession.iconAssetId || '') ||
      formData.category !== ((originalProfession as any).category || 'Combat') ||
      formData.themeColor !== ((originalProfession as any).themeColor || '#64748b') ||
      formData.tagline !== ((originalProfession as any).tagline || '') ||
      formData.stationTags !== ((originalProfession as any).stationTags || '[]') ||
      formData.xpCurve !== originalProfession.xpCurve ||
      formData.maxLevel !== originalProfession.maxLevel ||
      formData.trainingMethodsJson !== ((originalProfession as any).trainingMethodsJson || '[]') ||
      formData.perksJson !== ((originalProfession as any).perksJson || '[]') ||
      formData.milestonesJson !== ((originalProfession as any).milestonesJson || '[]') ||
      formData.battlepassTiersJson !== ((originalProfession as any).battlepassTiersJson || '[]')
    );
  }, [formData, originalProfession, activeSlug]);

  const loadList = async (q = search) => {
    setLoading(true);
    const res = await listProfessionTemplates(q);
    if (res.success && res.data) setProfessions(res.data as any);
    setLoading(false);
  };

  useEffect(() => {
    loadList();
  }, [search, dataVersion]);

  const filteredProfessions = useMemo(() => {
    if (activeCategoryFilter === 'ALL') return professions;
    return professions.filter(
      (p) => ((p as any).category || '').toLowerCase() === activeCategoryFilter.toLowerCase()
    );
  }, [professions, activeCategoryFilter]);

  const handleSelect = async (slug: string) => {
    if (isDirty && activeSlug) {
      if (!confirm('You have unsaved changes. Discard them?')) return;
    }
    setActiveSlug(slug);
    setValidationError(null);
    const res = await getProfessionTemplate(slug);
    if (res.success && res.data) {
      const d: any = res.data;
      setFormData({
        slug: d.slug,
        name: d.name,
        description: d.description || '',
        iconAssetId: d.iconAssetId || 'Zap',
        category: d.category || 'Combat',
        themeColor: d.themeColor || '#64748b',
        tagline: d.tagline || '',
        stationTags: d.stationTags || '[]',
        xpCurve: d.xpCurve || 'exponential',
        maxLevel: d.maxLevel || 99,
        trainingMethodsJson: d.trainingMethodsJson || '[]',
        perksJson: d.perksJson || '[]',
        milestonesJson: d.milestonesJson || '[]',
        battlepassTiersJson: d.battlepassTiersJson || '[]',
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
      name: 'New Profession',
      description: '',
      iconAssetId: 'Pickaxe',
      category: 'Gathering',
      themeColor: '#64748b',
      tagline: '',
      stationTags: '[]',
      xpCurve: 'exponential',
      maxLevel: 99,
      trainingMethodsJson: '[]',
      perksJson: '[]',
      milestonesJson: '[]',
      battlepassTiersJson: '[]',
    });
  };

  const handleSave = async () => {
    setValidationError(null);
    if (!formData.slug || !formData.name) {
      setValidationError('Slug and Name are required');
      return;
    }

    setSaving(true);
    const res = await upsertProfessionTemplate(formData);
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
    if (!confirm(`Delete profession ${activeSlug}? This cannot be undone.`)) return;
    const res = await deleteProfessionTemplate(activeSlug);
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

  // Parse helper collections
  const stationTagsArray: string[] = useMemo(() => {
    try {
      return JSON.parse(typeof formData.stationTags === 'string' ? formData.stationTags : '[]');
    } catch {
      return [];
    }
  }, [formData.stationTags]);

  const milestonesArray: ProfessionUnlockMilestone[] = useMemo(() => {
    try {
      return JSON.parse(formData.milestonesJson || '[]');
    } catch {
      return [];
    }
  }, [formData.milestonesJson]);

  const battlepassTiersArray: ProfessionBattlepassTier[] = useMemo(() => {
    try {
      return JSON.parse(formData.battlepassTiersJson || '[]');
    } catch {
      return [];
    }
  }, [formData.battlepassTiersJson]);

  const trainingMethodsArray: string[] = useMemo(() => {
    try {
      return JSON.parse(formData.trainingMethodsJson || '[]');
    } catch {
      return [];
    }
  }, [formData.trainingMethodsJson]);

  const handleAddMilestone = () => {
    const newMilestone: ProfessionUnlockMilestone = {
      level: 10,
      title: 'New Unlock Milestone',
      description: 'Grants access to new techniques or equipment.',
      type: 'EQUIPMENT',
      iconName: 'Award',
    };
    const next: ProfessionUnlockMilestone[] = [
      ...milestonesArray,
      newMilestone,
    ].sort((a, b) => a.level - b.level);
    const json = JSON.stringify(next);
    commitStructural({ ...formData, milestonesJson: json });
    setFormData({ ...formData, milestonesJson: json });
  };

  const handleUpdateMilestone = (index: number, patch: Partial<ProfessionUnlockMilestone>) => {
    const next = [...milestonesArray];
    next[index] = { ...next[index], ...patch };
    next.sort((a, b) => a.level - b.level);
    const json = JSON.stringify(next);
    setFormData({ ...formData, milestonesJson: json });
  };

  const handleDeleteMilestone = (index: number) => {
    const next = milestonesArray.filter((_, i) => i !== index);
    const json = JSON.stringify(next);
    commitStructural({ ...formData, milestonesJson: json });
    setFormData({ ...formData, milestonesJson: json });
  };

  const handleAddBattlepassTier = () => {
    const nextTierNum = battlepassTiersArray.length + 1;
    const rarity: ProfessionBattlepassTier['rarity'] =
      nextTierNum >= 10 ? 'MYTHIC' : nextTierNum >= 7 ? 'LEGENDARY' : 'RARE';
    const newTier: ProfessionBattlepassTier = {
      tier: nextTierNum,
      level: Math.min(nextTierNum * 10, Number(formData.maxLevel) || 99),
      rewardName: `Mastery Reward ${nextTierNum}`,
      rewardType: 'COSMETIC',
      rarity,
      description: `Cosmetic reward unlocked upon reaching tier ${nextTierNum}.`,
      iconName: 'Crown',
    };
    const next: ProfessionBattlepassTier[] = [...battlepassTiersArray, newTier];
    const json = JSON.stringify(next);
    commitStructural({ ...formData, battlepassTiersJson: json });
    setFormData({ ...formData, battlepassTiersJson: json });
  };

  const handleUpdateBattlepassTier = (index: number, patch: Partial<ProfessionBattlepassTier>) => {
    const next = [...battlepassTiersArray];
    next[index] = { ...next[index], ...patch };
    const json = JSON.stringify(next);
    setFormData({ ...formData, battlepassTiersJson: json });
  };

  const handleDeleteBattlepassTier = (index: number) => {
    const next = battlepassTiersArray.filter((_, i) => i !== index);
    const json = JSON.stringify(next);
    commitStructural({ ...formData, battlepassTiersJson: json });
    setFormData({ ...formData, battlepassTiersJson: json });
  };

  return (
    <CatalogEditorShell<ProfessionTemplate>
      title="Profession & Skill Studio"
      items={filteredProfessions}
      activeId={activeSlug}
      getItemId={(it) => it.slug}
      getItemName={(it) => it.name || it.slug}
      isDirty={(it) => (it.slug === activeSlug ? isDirty : false)}
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
      <div className="space-y-4 max-w-4xl pb-12">
        {/* Category Filter Badges */}
        <div className="flex items-center gap-1.5 p-1 bg-transparent/80 border border-amber-500/20 rounded-lg">
          {['ALL', 'Combat', 'Gathering', 'Artisan', 'Support'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                activeCategoryFilter === cat
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5/60'
              }`}
            >
              {cat === 'ALL' ? 'All Skills (27)' : cat}
            </button>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#806f47]/20 pb-2">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-md flex items-center gap-1.5 transition-all ${
              activeTab === 'OVERVIEW'
                ? 'bg-[#cbb26a]/10 text-[#e2d5b3] border-b-2 border-[#cbb26a]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5" /> Overview & Theming
          </button>
          <button
            onClick={() => setActiveTab('STATIONS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-md flex items-center gap-1.5 transition-all ${
              activeTab === 'STATIONS'
                ? 'bg-[#cbb26a]/10 text-[#e2d5b3] border-b-2 border-[#cbb26a]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Stations & Training
          </button>
          <button
            onClick={() => setActiveTab('MILESTONES')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-md flex items-center gap-1.5 transition-all ${
              activeTab === 'MILESTONES'
                ? 'bg-[#cbb26a]/10 text-[#e2d5b3] border-b-2 border-[#cbb26a]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" /> Milestones ({milestonesArray.length})
          </button>
          <button
            onClick={() => setActiveTab('BATTLEPASS')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-md flex items-center gap-1.5 transition-all ${
              activeTab === 'BATTLEPASS'
                ? 'bg-[#cbb26a]/10 text-[#e2d5b3] border-b-2 border-[#cbb26a]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" /> Battlepass Tiers ({battlepassTiersArray.length})
          </button>
        </div>

        {/* ─── TAB 1: OVERVIEW & THEMING ────────────────────────────────────── */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-4 sg-glass p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                  Skill Slug (ID)
                </label>
                <input
                  type="text"
                  className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 text-sm font-mono"
                  value={formData.slug}
                  disabled={!!activeSlug}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                    })
                  }
                  placeholder="e.g. woodcutting"
                />
              </div>

              <div>
                <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                  Profession Display Name
                </label>
                <input
                  type="text"
                  className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 text-sm"
                  value={formData.name}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Lumber Harvesting"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                  Category
                </label>
                <select
                  className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 text-sm"
                  value={formData.category || 'Combat'}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  onChange={(e) => {
                    commitStructural({ ...formData, category: e.target.value });
                    setFormData({ ...formData, category: e.target.value });
                  }}
                >
                  <option value="Combat">Combat</option>
                  <option value="Gathering">Gathering (Life)</option>
                  <option value="Artisan">Artisan (Life)</option>
                  <option value="Support">Support (Life)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                  Max Level
                </label>
                <input
                  type="number"
                  className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 text-sm"
                  value={formData.maxLevel}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  onChange={(e) =>
                    setFormData({ ...formData, maxLevel: parseInt(e.target.value) || 99 })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                  XP Curve
                </label>
                <select
                  className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 text-sm"
                  value={formData.xpCurve}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  onChange={(e) => {
                    commitStructural({ ...formData, xpCurve: e.target.value });
                    setFormData({ ...formData, xpCurve: e.target.value });
                  }}
                >
                  <option value="exponential">Exponential (Runescape-like)</option>
                  <option value="linear">Linear</option>
                  <option value="flat">Flat</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                  Theme Color
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    className="w-8 h-8 rounded border border-[#806f47]/30 bg-transparent cursor-pointer"
                    value={formData.themeColor || '#64748b'}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="flex-1 bg-[#111a2a] border border-[#806f47]/40 rounded px-2 py-1 outline-none text-xs font-mono text-[#e2d5b3]"
                    value={formData.themeColor || '#64748b'}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                Icon Identifier
              </label>
              <div className="flex items-center gap-3 mt-1">
                <div className="p-2 bg-slate-800 border border-[#806f47]/30 rounded-lg text-amber-400">
                  {renderSkillIcon(formData.iconAssetId || 'Zap', 'w-6 h-6')}
                </div>
                <input
                  type="text"
                  className="flex-1 bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] text-sm"
                  value={formData.iconAssetId || ''}
                  onFocus={onFieldFocus}
                  onBlur={onFieldBlur}
                  onChange={(e) => setFormData({ ...formData, iconAssetId: e.target.value })}
                  placeholder="e.g. Axe, Pickaxe, Sword, Anvil, FlaskConical"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                Tagline
              </label>
              <input
                type="text"
                className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 text-sm"
                value={formData.tagline || ''}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. Master of axes, fell ancient trees across the realm."
              />
            </div>

            <div>
              <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                Gameplay Description & Guide Summary
              </label>
              <textarea
                className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 min-h-[90px] text-sm"
                value={formData.description || ''}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Comprehensive summary of what this skill / profession governs in the realm."
              />
            </div>
          </div>
        )}

        {/* ─── TAB 2: STATIONS & TRAINING ─────────────────────────────────── */}
        {activeTab === 'STATIONS' && (
          <div className="space-y-4 sg-glass p-4 rounded-lg">
            <div>
              <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                Station & Node Tags (JSON Array)
              </label>
              <input
                type="text"
                className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 text-sm font-mono"
                value={typeof formData.stationTags === 'string' ? formData.stationTags : JSON.stringify(formData.stationTags)}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                onChange={(e) => setFormData({ ...formData, stationTags: e.target.value })}
                placeholder='["anvil", "furnace", "forge"]'
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {stationTagsArray.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-800 border border-[#806f47]/30 rounded text-xs text-amber-400 font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                Training Methods (JSON Array of Descriptions)
              </label>
              <textarea
                className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 min-h-[100px] text-xs font-mono"
                value={formData.trainingMethodsJson || '[]'}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                onChange={(e) => setFormData({ ...formData, trainingMethodsJson: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs text-amber-300 uppercase tracking-widest font-semibold">
                Per-Level Perks (JSON Array of Strings)
              </label>
              <textarea
                className="w-full bg-[#111a2a] border border-[#806f47]/40 rounded px-3 py-1.5 outline-none focus:border-[#cbb26a] text-[#e2d5b3] mt-1 min-h-[80px] text-xs font-mono"
                value={formData.perksJson || '[]'}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
                onChange={(e) => setFormData({ ...formData, perksJson: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* ─── TAB 3: MILESTONE UNLOCKS ────────────────────────────────────── */}
        {activeTab === 'MILESTONES' && (
          <div className="space-y-4 sg-glass p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Configure level-by-level equipment, ability, recipe, and gathering node unlocks.
              </span>
              <button
                onClick={handleAddMilestone}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {milestonesArray.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2.5 bg-slate-800/80 border border-[#806f47]/30 rounded-lg text-xs"
                >
                  <div className="w-16">
                    <span className="text-[10px] text-slate-400 block uppercase">Level</span>
                    <input
                      type="number"
                      className="w-full bg-transparent border border-[#806f47]/30 rounded px-1.5 py-0.5 text-center font-bold text-amber-400"
                      value={m.level}
                      onChange={(e) =>
                        handleUpdateMilestone(idx, { level: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>

                  <div className="w-28">
                    <span className="text-[10px] text-slate-400 block uppercase">Type</span>
                    <select
                      className="w-full bg-transparent border border-[#806f47]/30 rounded px-1 py-0.5 text-[11px] text-slate-200"
                      value={m.type}
                      onChange={(e) =>
                        handleUpdateMilestone(idx, { type: e.target.value as any })
                      }
                    >
                      <option value="EQUIPMENT">EQUIPMENT</option>
                      <option value="ABILITY">ABILITY</option>
                      <option value="RECIPE">RECIPE</option>
                      <option value="GATHER">GATHER</option>
                      <option value="PASSIVE">PASSIVE</option>
                      <option value="ZONE">ZONE</option>
                      <option value="CREATURE">CREATURE</option>
                    </select>
                  </div>

                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      className="w-full bg-transparent border border-[#806f47]/30 rounded px-2 py-0.5 text-xs font-semibold text-amber-200"
                      value={m.title}
                      onChange={(e) => handleUpdateMilestone(idx, { title: e.target.value })}
                      placeholder="Title"
                    />
                    <input
                      type="text"
                      className="w-full bg-transparent border border-[#806f47]/30 rounded px-2 py-0.5 text-[11px] text-slate-300"
                      value={m.description}
                      onChange={(e) =>
                        handleUpdateMilestone(idx, { description: e.target.value })
                      }
                      placeholder="Description"
                    />
                  </div>

                  <button
                    onClick={() => handleDeleteMilestone(idx)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: BATTLEPASS TRACK ─────────────────────────────────────── */}
        {activeTab === 'BATTLEPASS' && (
          <div className="space-y-4 sg-glass p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Configure 10-tier cosmetic reward tracks (titles, emotes, capes, banners, auras).
              </span>
              <button
                onClick={handleAddBattlepassTier}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Tier
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {battlepassTiersArray.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2.5 bg-slate-800/80 border border-[#806f47]/30 rounded-lg text-xs"
                >
                  <div className="w-14">
                    <span className="text-[10px] text-slate-400 block uppercase">Tier</span>
                    <input
                      type="number"
                      className="w-full bg-transparent border border-[#806f47]/30 rounded px-1.5 py-0.5 text-center font-bold text-amber-400"
                      value={t.tier}
                      onChange={(e) =>
                        handleUpdateBattlepassTier(idx, { tier: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>

                  <div className="w-14">
                    <span className="text-[10px] text-slate-400 block uppercase">Level</span>
                    <input
                      type="number"
                      className="w-full bg-transparent border border-[#806f47]/30 rounded px-1.5 py-0.5 text-center font-bold text-slate-200"
                      value={t.level}
                      onChange={(e) =>
                        handleUpdateBattlepassTier(idx, { level: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>

                  <div className="w-24">
                    <span className="text-[10px] text-slate-400 block uppercase">Rarity</span>
                    <select
                      className="w-full bg-transparent border border-[#806f47]/30 rounded px-1 py-0.5 text-[11px] text-slate-200"
                      value={t.rarity}
                      onChange={(e) =>
                        handleUpdateBattlepassTier(idx, { rarity: e.target.value as any })
                      }
                    >
                      <option value="COMMON">COMMON</option>
                      <option value="UNCOMMON">UNCOMMON</option>
                      <option value="RARE">RARE</option>
                      <option value="EPIC">EPIC</option>
                      <option value="LEGENDARY">LEGENDARY</option>
                      <option value="MYTHIC">MYTHIC</option>
                    </select>
                  </div>

                  <div className="w-24">
                    <span className="text-[10px] text-slate-400 block uppercase">Type</span>
                    <select
                      className="w-full bg-transparent border border-[#806f47]/30 rounded px-1 py-0.5 text-[11px] text-slate-200"
                      value={t.rewardType}
                      onChange={(e) =>
                        handleUpdateBattlepassTier(idx, { rewardType: e.target.value as any })
                      }
                    >
                      <option value="TITLE">TITLE</option>
                      <option value="COSMETIC">COSMETIC</option>
                      <option value="EMOTE">EMOTE</option>
                      <option value="AURA">AURA</option>
                      <option value="BANNER">BANNER</option>
                      <option value="CAPE">CAPE</option>
                    </select>
                  </div>

                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      className="w-full bg-transparent border border-[#806f47]/30 rounded px-2 py-0.5 text-xs font-semibold text-amber-200"
                      value={t.rewardName}
                      onChange={(e) =>
                        handleUpdateBattlepassTier(idx, { rewardName: e.target.value })
                      }
                      placeholder="Reward Name"
                    />
                    <input
                      type="text"
                      className="w-full bg-transparent border border-[#806f47]/30 rounded px-2 py-0.5 text-[11px] text-slate-300"
                      value={t.description}
                      onChange={(e) =>
                        handleUpdateBattlepassTier(idx, { description: e.target.value })
                      }
                      placeholder="Description"
                    />
                  </div>

                  <button
                    onClick={() => handleDeleteBattlepassTier(idx)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CatalogEditorShell>
  );
};
