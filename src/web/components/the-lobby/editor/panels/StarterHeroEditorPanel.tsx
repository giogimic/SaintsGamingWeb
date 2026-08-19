'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllStarterHeroes, upsertStarterHero, deleteStarterHero,
  toggleStarterHeroActive, seedDefaultStarterHeroes, importStarterHeroesJson, StarterHeroData
} from '@/app/actions/starter-heroes';
import { GAME_SPRITES } from '@/web/components/the-lobby/data/sprites';
import { useEditorStore } from '../editor-store';
import { CatalogEditorShell } from '../components/CatalogEditorShell';
import {
  Plus, Trash2, Save, RefreshCw, Eye, EyeOff, Swords, Wand2, Feather,
  ChevronDown, ChevronUp, Database, AlertCircle, CheckCircle2, Users,
  Wand, FileJson, Copy, Download, Sparkles, BookOpen, Check, HelpCircle,
  FolderOpen, ImageIcon,
} from 'lucide-react';
import SpriteBrowser from '../SpriteBrowser';
import { CharacterSpritePreview } from '@/web/components/the-lobby/CharacterSpritePreview';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASS_OPTIONS = [
  { id: 'WARRIOR', label: 'Warrior', icon: Swords, color: '#f87171' },
  { id: 'MAGE', label: 'Mage', icon: Wand2, color: '#60a5fa' },
  { id: 'THIEF', label: 'Thief', icon: Feather, color: '#34d399' },
  { id: 'RANGER', label: 'Ranger', icon: Feather, color: '#fbbf24' },
  { id: 'PRIEST', label: 'Priest', icon: Sparkles, color: '#e2d5b3' },
];

const TAG_PRESETS = [
  { label: 'Beginner Friendly', color: '#34d399' },
  { label: 'Balanced', color: '#a78bfa' },
  { label: 'Advanced', color: '#f87171' },
  { label: 'Defensive', color: '#60a5fa' },
  { label: 'Mobile', color: '#fbbf24' },
  { label: 'Support', color: '#34d399' },
  { label: 'Skill Cap', color: '#f472b6' },
  { label: 'Epic', color: '#f87171' },
  { label: 'Classic', color: '#a3e635' },
  { label: 'Dark Arts', color: '#818cf8' },
  { label: 'Commander', color: '#fbbf24' },
  { label: 'Versatile', color: '#38bdf8' },
  { label: 'Beast Master', color: '#f472b6' },
  { label: 'Technomancer', color: '#818cf8' },
];

const ARCHETYPE_PRESETS: { name: string; icon: string; data: StarterHeroData }[] = [
  {
    name: '🐾 Tuxemon Beast Master',
    icon: '🐾',
    data: {
      slug: 'tuxemon_beast_master',
      name: 'Beast Master',
      classId: 'WARRIOR',
      spriteKey: 'catgirl',
      flavor: 'Tuxemon creature specialist with enhanced capture rates and wild empathy.',
      tag: 'Beast Master',
      tagColor: '#f472b6',
      sortOrder: 1,
      isActive: true,
      startingMap: 'DEMO_SANDBOX',
      startingX: 14,
      startingY: 15,
      startingInventory: '{"capture_script":25,"patch_kit":10,"treat_bag":5}',
    },
  },
  {
    name: '🔥 Arcane Elementalist',
    icon: '🔥',
    data: {
      slug: 'arcane_elementalist',
      name: 'Elementalist',
      classId: 'MAGE',
      spriteKey: 'magician_fiery',
      flavor: 'Arcane spellcaster attuned to volatile fire and elemental bursts.',
      tag: 'Elemental',
      tagColor: '#fb923c',
      sortOrder: 2,
      isActive: true,
      startingMap: 'DEMO_SANDBOX',
      startingX: 14,
      startingY: 15,
      startingInventory: '{"capture_script":10,"mana_potion":10}',
    },
  },
  {
    name: '🕷️ Spyder Covert Operative',
    icon: '🕷️',
    data: {
      slug: 'spyder_operative',
      name: 'Covert Operative',
      classId: 'THIEF',
      spriteKey: 'spyderboss',
      flavor: 'Tactical shadow agent equipped with stealth equipment and rapid strikes.',
      tag: 'Covert Ops',
      tagColor: '#38bdf8',
      sortOrder: 3,
      isActive: true,
      startingMap: 'DEMO_SANDBOX',
      startingX: 14,
      startingY: 15,
      startingInventory: '{"capture_script":15,"smoke_bomb":5}',
    },
  },
  {
    name: '🛡️ Grand Knight Lord',
    icon: '🛡️',
    data: {
      slug: 'grand_knight_lord',
      name: 'Grand Paladin',
      classId: 'WARRIOR',
      spriteKey: 'knightlord',
      flavor: 'Heavily armored commander. Unbreakable defense, rallies all nearby allies.',
      tag: 'Commander',
      tagColor: '#fbbf24',
      sortOrder: 4,
      isActive: true,
      startingMap: 'DEMO_SANDBOX',
      startingX: 14,
      startingY: 15,
      startingInventory: '{"capture_script":10,"heavy_shield":1}',
    },
  },
  {
    name: '🌿 Nature Druid',
    icon: '🌿',
    data: {
      slug: 'nature_druid',
      name: 'Nature Druid',
      classId: 'THIEF',
      spriteKey: 'florist',
      flavor: 'Forest herbalist wielding healing flora and evasive spore clouds.',
      tag: 'Support',
      tagColor: '#34d399',
      sortOrder: 5,
      isActive: true,
      startingMap: 'DEMO_SANDBOX',
      startingX: 14,
      startingY: 15,
      startingInventory: '{"capture_script":10,"herbal_salve":10}',
    },
  },
  {
    name: '⚡ Cyber Savant',
    icon: '⚡',
    data: {
      slug: 'cyber_savant',
      name: 'Cyber Savant',
      classId: 'MAGE',
      spriteKey: 'scientist',
      flavor: 'High-tech researcher using electronic gadgets and plasma shields.',
      tag: 'Technomancer',
      tagColor: '#818cf8',
      sortOrder: 6,
      isActive: true,
      startingMap: 'DEMO_SANDBOX',
      startingX: 14,
      startingY: 15,
      startingInventory: '{"capture_script":15,"energy_battery":5}',
    },
  },
];

const EMPTY_HERO: StarterHeroData = {
  slug: '',
  gameId: 'custom_1',
  name: '',
  classId: 'WARRIOR',
  spriteKey: 'warrior',
  flavor: '',
  tag: 'Balanced',
  tagColor: '#a78bfa',
  sortOrder: 0,
  isActive: true,
  startingMap: 'DEMO_SANDBOX',
  startingX: 14,
  startingY: 15,
  startingInventory: '{"capture_script":10,"patch_kit":5}',
};

// ─── Sprite Cell ────────────────────────────────────────────────────────────

function SpriteCell({ spriteKey, selected, onClick }: { spriteKey: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={spriteKey}
      className="relative aspect-square rounded-lg transition-all duration-150 flex items-center justify-center"
      style={{
        background: selected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)',
        border: selected ? '1px solid rgba(139,92,246,0.7)' : '1px solid rgba(255,255,255,0.06)',
        boxShadow: selected ? '0 0 10px rgba(139,92,246,0.3)' : 'none',
        transform: selected ? 'scale(1.08)' : 'scale(1)',
      }}
    >
      <div
        className="pixelated bg-no-repeat"
        style={{
          backgroundImage: `url('/game-assets/npc/${spriteKey}.png')`,
          backgroundPosition: '0px -64px',
          backgroundSize: '96px 128px',
          width: '32px',
          height: '32px',
          transform: selected ? 'scale(1.4)' : 'scale(1.1)',
        }}
      />
    </button>
  );
}

// ─── Hero List Item ────────────────────────────────────────────────────────────

function HeroListItem({
  hero,
  isSelected,
  onSelect,
  onToggle,
  onDelete,
}: {
  hero: any;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all group"
      style={{
        background: isSelected ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)',
        border: isSelected ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.05)',
        opacity: hero.isActive ? 1 : 0.45,
      }}
    >
      {/* Sprite thumb */}
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <CharacterSpritePreview
          spriteKey={hero.spriteKey}
          spriteBundleId={hero.spriteBundleId}
          size={24}
          scale={1.1}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-black text-violet-100 truncate">{hero.name}</div>
        <div className="text-[9px] text-violet-500/50 font-mono uppercase">{hero.classId} · {hero.spriteKey}</div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="p-1 rounded transition-colors"
          style={{ color: hero.isActive ? '#34d399' : 'rgba(255,255,255,0.2)' }}
          title={hero.isActive ? 'Active — click to hide' : 'Hidden — click to show'}
        >
          {hero.isActive ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded text-red-400/40 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div
        className="w-1 h-4 rounded-full shrink-0"
        style={{ background: hero.isActive ? '#34d399' : 'rgba(255,255,255,0.1)' }}
      />
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

export function StarterHeroEditorPanel() {
  const activeGameId = useEditorStore((s) => s.activeGameId);
  const [heroes, setHeroes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState<StarterHeroData>({ ...EMPTY_HERO, gameId: activeGameId });
  const [isNew, setIsNew] = useState(false);
  const [spriteFilter, setSpriteFilter] = useState('');
  const [spritePage, setSpritePage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showSpriteGrid, setShowSpriteGrid] = useState(true);
  const [showDocs, setShowDocs] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showCatalogBrowser, setShowCatalogBrowser] = useState(false);

  const spritesPerPage = 32;
  const filteredSprites = GAME_SPRITES.filter(s => !spriteFilter || s.includes(spriteFilter.toLowerCase()));
  const totalPages = Math.ceil(filteredSprites.length / spritesPerPage);
  const pageSprites = filteredSprites.slice(spritePage * spritesPerPage, (spritePage + 1) * spritesPerPage);

  const load = useCallback(async () => {
    const res = await getAllStarterHeroes(activeGameId);
    if (res.success) setHeroes(res.data);
  }, [activeGameId]);

  useEffect(() => {
    void load();
    setForm({ ...EMPTY_HERO, gameId: activeGameId });
    setIsNew(false);
    setSelected(null);
  }, [load, activeGameId]);

  useEffect(() => {
    const handleSpritePicked = (e: Event) => {
      const customEv = e as CustomEvent<{ key: string; source: string }>;
      if (customEv.detail?.key) {
        setForm((prev) => ({ ...prev, spriteKey: customEv.detail.key }));
        showStatus('success', `Assigned hero sprite: ${customEv.detail.key}`);
      }
    };
    window.addEventListener('studio_sprite_picked', handleSpritePicked);
    return () => window.removeEventListener('studio_sprite_picked', handleSpritePicked);
  }, []);

  useEffect(() => {
    const handleMakeHero = (e: Event) => {
      const customEv = e as CustomEvent<{ asset: any }>;
      const asset = customEv.detail?.asset;
      if (asset) {
        setSelected(null);
        setIsNew(true);
        const name = (asset.source.split('/').pop() || '').split('.')[0] || 'New Hero';
        const capitalName = name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
        setForm({
          ...EMPTY_HERO,
          gameId: activeGameId,
          sortOrder: heroes.length + 1,
          spriteKey: asset.source,
          name: capitalName,
          slug: `hero_${name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now().toString().slice(-4)}`
        });
        showStatus('success', `Initialized Starter Hero from Asset`);
      }
    };
    window.addEventListener('studio_make_starter_hero', handleMakeHero);
    return () => window.removeEventListener('studio_make_starter_hero', handleMakeHero);
  }, [activeGameId, heroes.length]);

  const showStatus = (type: 'success' | 'error', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleSelectHero = (hero: any) => {
    setSelected(hero);
    setForm({
      slug: hero.slug, gameId: hero.gameId || activeGameId, name: hero.name, classId: hero.classId,
      spriteKey: hero.spriteKey, spriteBundleId: hero.spriteBundleId || '', flavor: hero.flavor, tag: hero.tag,
      tagColor: hero.tagColor, sortOrder: hero.sortOrder, isActive: hero.isActive,
      startingMap: hero.startingMap, startingX: hero.startingX, startingY: hero.startingY,
      startingInventory: hero.startingInventory,
    });
    setIsNew(false);
  };

  const handleNew = () => {
    setSelected(null);
    setForm({ ...EMPTY_HERO, gameId: activeGameId, sortOrder: heroes.length + 1 });
    setIsNew(true);
  };

  const handleApplyPreset = (preset: typeof ARCHETYPE_PRESETS[0]) => {
    setSelected(null);
    setIsNew(true);
    setForm({
      ...preset.data,
      slug: `${preset.data.slug}_${Date.now().toString().slice(-4)}`,
      sortOrder: heroes.length + 1,
    });
    showStatus('success', `Applied archetype preset: ${preset.name}`);
  };

  const handleRandomize = () => {
    const randomSprite = GAME_SPRITES[Math.floor(Math.random() * GAME_SPRITES.length)];
    const randomClass = CLASS_OPTIONS[Math.floor(Math.random() * CLASS_OPTIONS.length)];
    const randomTag = TAG_PRESETS[Math.floor(Math.random() * TAG_PRESETS.length)];
    const cleanSpriteName = randomSprite.replace(/_/g, ' ');
    const capitalName = cleanSpriteName.charAt(0).toUpperCase() + cleanSpriteName.slice(1);

    setSelected(null);
    setIsNew(true);
    setForm({
      slug: `hero_${randomSprite}_${Date.now().toString().slice(-4)}`,
      name: capitalName,
      classId: randomClass.id,
      spriteKey: randomSprite,
      flavor: `Master of ${randomClass.label.toLowerCase()} combat and map exploration.`,
      tag: randomTag.label,
      tagColor: randomTag.color,
      sortOrder: heroes.length + 1,
      isActive: true,
      startingMap: 'DEMO_SANDBOX',
      startingX: 14,
      startingY: 15,
      startingInventory: '{"capture_script":10,"patch_kit":5}',
    });
    showStatus('success', `Generated random hero with sprite: ${randomSprite}`);
  };

  const handleSave = async () => {
    if (!form.slug || !form.name || !form.spriteKey) {
      showStatus('error', 'Slug, Name, and Sprite Key are required.');
      return;
    }
    setLoading(true);
    const res = await upsertStarterHero({ ...form, gameId: form.gameId || activeGameId });
    setLoading(false);
    if (res.success) {
      showStatus('success', `${form.name} saved successfully!`);
      await load();
      setIsNew(false);
    } else {
      showStatus('error', res.error || 'Save failed.');
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Delete "${slug}" permanently?`)) return;
    const res = await deleteStarterHero(slug);
    if (res.success) {
      showStatus('success', 'Deleted.');
      if (selected?.slug === slug) { setSelected(null); setIsNew(false); }
      await load();
    } else {
      showStatus('error', res.error || 'Delete failed.');
    }
  };

  const handleToggle = async (hero: any) => {
    const res = await toggleStarterHeroActive(hero.slug, !hero.isActive);
    if (res.success) await load();
  };

  const handleSeed = async () => {
    setLoading(true);
    const res = await seedDefaultStarterHeroes();
    setLoading(false);
    if (res.success) {
      showStatus('success', `Seeded ${res.created} default heroes!`);
      await load();
    } else {
      showStatus('error', res.error || 'Seed failed.');
    }
  };

  const handleImportJson = async () => {
    if (!jsonInput.trim()) return;
    setLoading(true);
    const res = await importStarterHeroesJson(jsonInput);
    setLoading(false);
    if (res.success) {
      showStatus('success', `Imported ${res.count} heroes from JSON!`);
      setShowJsonModal(false);
      setJsonInput('');
      await load();
    } else {
      showStatus('error', res.error || 'JSON import failed.');
    }
  };

  const handleCopyFormJson = () => {
    navigator.clipboard.writeText(JSON.stringify(form, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const f = (key: keyof StarterHeroData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // Validation state checks
  const isSpriteValid = Boolean(
    form.spriteKey && (
      GAME_SPRITES.includes(form.spriteKey) ||
      form.spriteKey.startsWith('/') ||
      form.spriteKey.startsWith('http') ||
      form.spriteKey.includes('.') ||
      form.spriteBundleId
    )
  );
  const isSlugValid = Boolean(form.slug && /^[a-z0-9_]+$/.test(form.slug));
  let isJsonValid = true;
  try { JSON.parse(form.startingInventory); } catch { isJsonValid = false; }

  const inputCls = "w-full bg-[#050b14] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 font-mono outline-none focus:border-[#806f47] transition-colors";
  const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1";
  const activeCount = heroes.filter((h) => h.isActive).length;

  return (
    <div className="relative h-full min-h-0">
      <CatalogEditorShell
        title="Starter Heroes"
        blurb={`Catalog mode · profile ${activeGameId} · ${activeCount}/${heroes.length} active · StarterHero SoT`}
        dirty={isNew}
        toolbar={
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setShowDocs((d) => !d)} className="rounded px-2 py-1 text-slate-300 hover:bg-white/5 flex items-center gap-1" title="Requirements guide">
              <BookOpen className="h-3.5 w-3.5" /> Guide
            </button>
            <button type="button" onClick={() => setShowJsonModal(true)} className="rounded px-2 py-1 text-slate-300 hover:bg-white/5 flex items-center gap-1" title="Import JSON">
              <FileJson className="h-3.5 w-3.5" /> JSON
            </button>
            <button type="button" onClick={() => void handleSeed()} disabled={loading} className="rounded px-2 py-1 text-slate-300 hover:bg-white/5 flex items-center gap-1" title="Seed defaults">
              <Database className="h-3.5 w-3.5" /> Seed
            </button>
            <button type="button" onClick={() => void load()} className="rounded p-1.5 text-slate-400 hover:bg-white/5" title="Refresh">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={handleNew} className="rounded p-1.5 text-emerald-400 hover:bg-white/5" title="New hero">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        }
        list={
          <div className="flex h-full min-h-0 flex-col gap-1.5">
            <button
              type="button"
              onClick={handleNew}
              className="w-full rounded-lg border border-[#806f47]/40 bg-[#806f47]/20 px-2 py-1.5 text-[10px] font-bold text-[#e2d5b3] hover:bg-[#806f47]/30 flex items-center justify-center gap-1"
            >
              <Plus size={11} strokeWidth={3} /> New Custom Hero
            </button>
            <button
              type="button"
              onClick={handleRandomize}
              className="w-full rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/5 flex items-center justify-center gap-1"
            >
              <Sparkles size={11} /> Random Archetype
            </button>
            <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 px-1 pt-1">Archetype Presets</div>
            <div className="max-h-28 space-y-0.5 overflow-y-auto pr-0.5">
              {ARCHETYPE_PRESETS.map((preset) => (
                <button
                  key={preset.data.slug}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="w-full truncate rounded px-2 py-1 text-left text-[9px] text-slate-400 hover:bg-white/5 hover:text-slate-200 flex items-center gap-1"
                >
                  <span>{preset.icon}</span>
                  <span className="truncate">{preset.name.replace(/^[^\s]+\s*/, '')}</span>
                </button>
              ))}
            </div>
            <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 px-1 border-t border-slate-800 pt-1">
              Heroes Pool ({heroes.length})
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {heroes.length === 0 ? (
                <p className="p-2 text-center text-[10px] text-slate-500">No heroes yet. Click Seed.</p>
              ) : (
                heroes.map((h) => (
                  <HeroListItem
                    key={h.slug}
                    hero={h}
                    isSelected={selected?.slug === h.slug && !isNew}
                    onSelect={() => handleSelectHero(h)}
                    onToggle={() => void handleToggle(h)}
                    onDelete={() => void handleDelete(h.slug)}
                  />
                ))
              )}
            </div>
          </div>
        }
      >
        {status && (
          <div className={`mb-2 flex items-center gap-1 rounded px-2 py-1 text-[10px] ${status.type === 'success' ? 'bg-emerald-900/40 text-emerald-200' : 'bg-red-900/40 text-red-200'}`}>
            {status.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {status.msg}
          </div>
        )}

        {(selected || isNew) ? (
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-[#806f47]/20 pb-2">
              <span className="text-[11px] font-bold text-[#e2d5b3]">
                {isNew ? 'New Hero Archetype' : `Editing: ${selected?.name}`}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyFormJson}
                  className="rounded px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/5 flex items-center gap-1"
                >
                  {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy Spec'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={loading || !isSpriteValid || !isSlugValid || !isJsonValid}
                  className="rounded bg-[#806f47]/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#e2d5b3] hover:bg-[#806f47]/70 disabled:opacity-40 flex items-center gap-1"
                >
                  <Save size={11} />
                  {loading ? 'Saving…' : 'Save Archetype'}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">

              {/* ── Validation Status Bar ── */}
              <div className="grid grid-cols-3 gap-2 text-[9px]">
                <div
                  className="px-2 py-1 rounded flex items-center gap-1 font-bold"
                  style={{
                    background: isSlugValid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: isSlugValid ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
                    color: isSlugValid ? '#6ee7b7' : '#fca5a5',
                  }}
                >
                  {isSlugValid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                  Slug: {isSlugValid ? 'Valid' : 'Required (lowercase/no spaces)'}
                </div>
                <div
                  className="px-2 py-1 rounded flex items-center gap-1 font-bold"
                  style={{
                    background: isSpriteValid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: isSpriteValid ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
                    color: isSpriteValid ? '#6ee7b7' : '#fca5a5',
                  }}
                >
                  {isSpriteValid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                  Sprite: {isSpriteValid ? 'Exists in Registry' : 'Sprite Not Found'}
                </div>
                <div
                  className="px-2 py-1 rounded flex items-center gap-1 font-bold"
                  style={{
                    background: isJsonValid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: isJsonValid ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
                    color: isJsonValid ? '#6ee7b7' : '#fca5a5',
                  }}
                >
                  {isJsonValid ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                  Inventory: {isJsonValid ? 'Valid JSON' : 'Invalid JSON Syntax'}
                </div>
              </div>

              {/* ── Identity ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Identity & Metadata
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Display Name *</label>
                    <input value={form.name} onChange={e => f('name', e.target.value)} className={inputCls} placeholder="e.g. Beast Master" />
                  </div>
                  <div>
                    <label className={labelCls}>Slug (Unique Identifier) *</label>
                    <input
                      value={form.slug}
                      onChange={e => f('slug', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className={inputCls}
                      placeholder="e.g. tuxemon_beast_master"
                      disabled={!isNew}
                      style={{ opacity: isNew ? 1 : 0.5 }}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className={labelCls}>Flavor Description (Shown under title in character creator)</label>
                  <input value={form.flavor} onChange={e => f('flavor', e.target.value)} className={inputCls} placeholder="Short 1-line description of archetype" maxLength={80} />
                  <p className="text-[8px] text-slate-600 mt-0.5">{form.flavor.length}/80 characters</p>
                </div>
              </section>

              {/* ── Class ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Archetype Combat Class
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {CLASS_OPTIONS.map(cls => {
                    const Icon = cls.icon;
                    const isActive = form.classId === cls.id;
                    return (
                      <button
                        key={cls.id}
                        onClick={() => f('classId', cls.id)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all"
                        style={{
                          background: isActive ? `${cls.color}18` : 'rgba(255,255,255,0.03)',
                          border: isActive ? `1px solid ${cls.color}50` : '1px solid rgba(255,255,255,0.06)',
                          boxShadow: isActive ? `0 0 10px ${cls.color}20` : 'none',
                        }}
                      >
                        <Icon size={14} style={{ color: isActive ? cls.color : 'rgba(139,92,246,0.35)' }} />
                        <span className="text-[9px] font-black" style={{ color: isActive ? cls.color : 'rgba(139,92,246,0.35)' }}>
                          {cls.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ── Tag / Badge ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Difficulty / Playstyle Tag
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {TAG_PRESETS.map(t => (
                    <button
                      key={t.label}
                      onClick={() => { f('tag', t.label); f('tagColor', t.color); }}
                      className="px-2 py-0.5 rounded text-[9px] font-black transition-all"
                      style={{
                        background: form.tag === t.label ? `${t.color}20` : 'rgba(255,255,255,0.04)',
                        border: form.tag === t.label ? `1px solid ${t.color}50` : '1px solid rgba(255,255,255,0.07)',
                        color: form.tag === t.label ? t.color : 'rgba(139,92,246,0.4)',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className={labelCls}>Custom Tag Text</label>
                    <input value={form.tag} onChange={e => f('tag', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Tag Badge Color</label>
                    <input type="color" value={form.tagColor} onChange={e => f('tagColor', e.target.value)}
                      className="h-7 w-14 rounded border border-slate-800 bg-transparent cursor-pointer" />
                  </div>
                  <div
                    className="px-2 py-1 rounded text-[9px] font-black self-end mb-0.5"
                    style={{
                      background: `${form.tagColor}18`,
                      border: `1px solid ${form.tagColor}50`,
                      color: form.tagColor,
                    }}
                  >
                    {form.tag || 'Preview'}
                  </div>
                </div>
              </section>

              {/* ── Sprite Key ── */}
              <section>
                <div
                  className="flex items-center justify-between pb-1 mb-2"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  <span className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em]">
                    Sprite Selection ({GAME_SPRITES.length} Presets + LPC Catalog)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCatalogBrowser(true)}
                      className="flex items-center gap-1 text-[9px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded transition-all cursor-pointer shadow"
                    >
                      <ImageIcon size={10} />
                      Pick from LPC / Catalog
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowSpriteGrid(s => !s); setSpritePage(0); }}
                      className="flex items-center gap-1 text-[9px] text-violet-500/50 hover:text-violet-300 transition-colors cursor-pointer"
                    >
                      {showSpriteGrid ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      {showSpriteGrid ? 'Hide grid' : 'Presets'}
                    </button>
                  </div>
                </div>

                {/* Selected sprite preview */}
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                    style={{
                      background: isSpriteValid ? 'rgba(139,92,246,0.1)' : 'rgba(239,68,68,0.1)',
                      border: isSpriteValid ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(239,68,68,0.3)',
                    }}
                  >
                    <CharacterSpritePreview
                      spriteKey={form.spriteKey}
                      spriteBundleId={form.spriteBundleId}
                      size={32}
                      scale={1.8}
                    />
                  </div>
                  <div className="flex-1">
                    <label className={labelCls}>Sprite Key / Asset URL *</label>
                    <input
                      value={form.spriteKey}
                      onChange={e => f('spriteKey', e.target.value)}
                      className={inputCls}
                      placeholder="e.g. warrior, catgirl, /uploads/lpc-hero.png"
                    />
                    <p className="text-[8px] text-slate-500 mt-0.5">
                      Enter classic NPC key, upload URL, or click "Pick from LPC / Catalog"
                    </p>
                  </div>
                </div>

                {/* Optional modular/composited sprite bundle override */}
                <div className="mb-2">
                  <label className={labelCls}>Sprite Bundle ID (optional)</label>
                  <input
                    value={form.spriteBundleId || ''}
                    onChange={e => f('spriteBundleId', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. paladin-male-042 (from Asset Browser bundleId)"
                  />
                  <p className="text-[8px] text-slate-600 mt-0.5">
                    Optional: id of an imported modular/composited character asset bundle (Studio Asset Browser).
                    When set, renderers may prefer this over Sprite Key. Sprite Key remains required as the fallback.
                  </p>
                </div>

                {/* Sprite grid */}
                {showSpriteGrid && (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid rgba(139,92,246,0.15)', background: 'rgba(0,0,0,0.3)' }}
                  >
                    {/* Search */}
                    <div className="px-2 py-1.5" style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
                      <input
                        value={spriteFilter}
                        onChange={e => { setSpriteFilter(e.target.value); setSpritePage(0); }}
                        className={inputCls + ' text-[10px]'}
                        placeholder="Search sprites... (e.g. catgirl, knight, witch, boss)"
                      />
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-8 gap-1 p-2 max-h-48 overflow-y-auto">
                      {pageSprites.map(sprite => (
                        <SpriteCell
                          key={sprite}
                          spriteKey={sprite}
                          selected={form.spriteKey === sprite}
                          onClick={() => f('spriteKey', sprite)}
                        />
                      ))}
                    </div>

                    {/* Pagination */}
                    <div
                      className="flex items-center justify-between px-2 py-1"
                      style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}
                    >
                      <button
                        onClick={() => setSpritePage(p => Math.max(0, p - 1))}
                        disabled={spritePage === 0}
                        className="px-2 py-0.5 rounded text-[9px] text-violet-400/60 disabled:opacity-30 hover:text-violet-300"
                      >
                        ← Prev
                      </button>
                      <span className="text-[9px] text-violet-600/40">
                        {spritePage + 1}/{totalPages} · {filteredSprites.length} sprites
                      </span>
                      <button
                        onClick={() => setSpritePage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={spritePage === totalPages - 1}
                        className="px-2 py-0.5 rounded text-[9px] text-violet-400/60 disabled:opacity-30 hover:text-violet-300"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* ── Spawn Settings ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Initial Spawn Position
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className={labelCls}>Map ID</label>
                    <input value={form.startingMap} onChange={e => f('startingMap', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Spawn X</label>
                    <input type="number" value={form.startingX} onChange={e => f('startingX', parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Spawn Y</label>
                    <input type="number" value={form.startingY} onChange={e => f('startingY', parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                </div>
              </section>

              {/* ── Sort & Visibility ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Sorting & Status
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>Sort Order (0 = first)</label>
                    <input type="number" value={form.sortOrder} onChange={e => f('sortOrder', parseInt(e.target.value) || 0)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Visible in Character Creator</label>
                    <button
                      onClick={() => f('isActive', !form.isActive)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all"
                      style={{
                        background: form.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.08)',
                        border: form.isActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.2)',
                        color: form.isActive ? '#6ee7b7' : '#fca5a5',
                      }}
                    >
                      {form.isActive ? <Eye size={11} /> : <EyeOff size={11} />}
                      {form.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </div>
                </div>
              </section>

              {/* ── Starting Inventory ── */}
              <section>
                <div
                  className="text-[9px] font-black text-violet-500/60 uppercase tracking-[0.2em] mb-2 pb-1"
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                >
                  Starting Inventory Specs (JSON Map)
                </div>
                <textarea
                  value={form.startingInventory}
                  onChange={e => f('startingInventory', e.target.value)}
                  rows={3}
                  className={inputCls + ' resize-none'}
                  placeholder='{"item_id": quantity}'
                />
                <p className="text-[8px] text-slate-600 mt-0.5">
                  Format: <code>{`{"capture_script":20,"patch_kit":10}`}</code>. Standard starter kit auto-granted on spawn.
                </p>
              </section>


            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-600">
            <Users size={32} />
            <p className="text-center text-[10px]">
              Select a hero to edit<br />or click &quot;New Custom Hero&quot;
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRandomize}
                className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-white/5"
              >
                <Sparkles size={11} /> Generate Random Hero
              </button>
              <button
                type="button"
                onClick={() => void handleSeed()}
                className="flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-white/5"
              >
                <Database size={11} /> Seed Defaults
              </button>
            </div>
          </div>
        )}
      </CatalogEditorShell>

      {/* Requirements Modal Overlay */}
      {showDocs && (
        <div
          className="pointer-events-auto absolute inset-0 z-30 p-4 overflow-y-auto animate-in fade-in duration-200"
          style={{ background: 'rgba(5,0,15,0.96)', backdropFilter: 'blur(10px)' }}
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-violet-500/20 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-400" />
                <h3 className="font-black text-violet-200 text-sm">Character Creation Studio Requirements</h3>
              </div>
              <button
                onClick={() => setShowDocs(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-900/30 text-violet-300 hover:bg-violet-800/40"
              >
                Close (ESC)
              </button>
            </div>

            <div className="space-y-3 text-[11px] text-violet-200/80 leading-relaxed font-mono">
              <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/20">
                <h4 className="font-bold text-violet-300 mb-1">📌 System Architecture & Flow</h4>
                <p>
                  The Saints Gaming Character Creator displays active <code className="text-violet-400">StarterHero</code> archetypes on Step 1 (HERO_PICK).
                  When a user picks an archetype, its sprite, class, starting map, and inventory specs are passed forward to character creation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/20 space-y-2">
                <h4 className="font-bold text-violet-300">📋 Field Specifications & Requirements</h4>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li><strong className="text-violet-200">slug</strong>: Unique key string (lowercase, underscores, no spaces). E.g. <code className="text-violet-400">tuxemon_beast_master</code>.</li>
                  <li><strong className="text-violet-200">name</strong>: Hero title displayed on character creator cards. Recommended 3–20 chars. E.g. <code className="text-violet-400">Beast Master</code>.</li>
                  <li><strong className="text-violet-200">classId</strong>: Must match an active class ID: <code className="text-violet-400">WARRIOR</code>, <code className="text-violet-400">MAGE</code>, or <code className="text-violet-400">THIEF</code>.</li>
                  <li><strong className="text-violet-200">spriteKey</strong>: Name of sprite file (without extension) in <code className="text-violet-400">/public/game-assets/npc/</code> (or Tuxemon pool). E.g. <code className="text-violet-400">catgirl</code>, <code className="text-violet-400">dragonrider</code>.</li>
                  <li><strong className="text-violet-200">flavor</strong>: 1-line description displayed under hero name. Max 80 chars.</li>
                  <li><strong className="text-violet-200">tag & tagColor</strong>: Difficulty/style badge text & hex color code (e.g. <code className="text-violet-400">Beast Master</code> / <code className="text-violet-400">#f472b6</code>).</li>
                  <li><strong className="text-violet-200">sortOrder</strong>: Integer index controlling card position in Character Creator.</li>
                  <li><strong className="text-violet-200">startingInventory</strong>: Valid JSON object string map of item IDs to quantities. E.g. <code className="text-violet-400">{`{"capture_script":20,"patch_kit":10}`}</code>.</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/20">
                <h4 className="font-bold text-violet-300 mb-1">💡 Example JSON Definition</h4>
                <pre className="p-2 rounded bg-[#050b14] border border-violet-900/50 text-[10px] text-violet-300 overflow-x-auto">
{`{
  "slug": "tuxemon_tamer",
  "name": "Beast Master",
  "classId": "WARRIOR",
  "spriteKey": "catgirl",
  "flavor": "Tuxemon creature specialist with high catch rate.",
  "tag": "Beast Master",
  "tagColor": "#f472b6",
  "sortOrder": 1,
  "isActive": true,
  "startingMap": "DEMO_SANDBOX",
  "startingX": 14,
  "startingY": 15,
  "startingInventory": "{\\"capture_script\\":20,\\"patch_kit\\":10}"
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON Import/Export Modal */}
      {showJsonModal && (
        <div
          className="pointer-events-auto absolute inset-0 z-30 p-4 flex items-center justify-center animate-in fade-in duration-200"
          style={{ background: 'rgba(5,0,15,0.96)', backdropFilter: 'blur(10px)' }}
        >
          <div className="w-full max-w-lg bg-[#0a051d] border border-violet-500/30 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-violet-500/20 pb-3">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-violet-400" />
                <h3 className="font-black text-violet-200 text-sm">JSON Import / Export</h3>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-[10px] text-violet-400/60">
              Paste single JSON object or array of objects to import, or copy current hero spec.
            </p>

            <textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              rows={8}
              className={inputCls + ' text-[10px] font-mono'}
              placeholder={`[\n  {\n    "slug": "custom_hero",\n    "name": "Custom Hero",\n    "classId": "WARRIOR",\n    "spriteKey": "warrior",\n    "flavor": "Custom archetype description",\n    "tag": "Custom",\n    "tagColor": "#a78bfa"\n  }\n]`}
            />

            <div className="flex items-center justify-between pt-2 border-t border-violet-500/20">
              <button
                onClick={() => setJsonInput(JSON.stringify(form, null, 2))}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-violet-900/40 text-violet-300 hover:bg-violet-800/50 flex items-center gap-1.5"
              >
                <Copy size={11} /> Load Current Form JSON
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportJson}
                  disabled={loading || !jsonInput.trim()}
                  className="px-4 py-1.5 rounded-lg font-black text-[10px] bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Download size={11} /> Import JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalog LPC Sprite Picker Modal */}
      {showCatalogBrowser && (
        <div
          className="pointer-events-auto absolute inset-0 z-40 p-4 flex items-center justify-center animate-in fade-in duration-200"
          style={{ background: 'rgba(5,0,15,0.96)', backdropFilter: 'blur(10px)' }}
        >
          <div className="w-full max-w-3xl h-[80vh] bg-[#0a051d] border border-cyan-500/40 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-cyan-500/30 bg-[#050b14]/80">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="font-black text-cyan-200 text-sm">
                  Select Character / LPC Sprite from Catalog
                </h3>
              </div>
              <button
                onClick={() => setShowCatalogBrowser(false)}
                className="text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <SpriteBrowser
                filterType="CHARACTER"
                onSelect={(selectedAssets) => {
                  const asset = selectedAssets[0];
                  if (asset) {
                    f('spriteKey', asset.source);
                    if (asset.variantFamily || asset.id) {
                      f('spriteBundleId', asset.variantFamily || asset.id);
                    }
                  }
                  setShowCatalogBrowser(false);
                }}
                onClose={() => setShowCatalogBrowser(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
