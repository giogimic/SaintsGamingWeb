'use client';

import React, { useState, useEffect } from 'react';
import { CharacterClassDefinition, CharacterClassSystem } from '@/lib/game/CharacterClassSystem';
import SpriteBrowser from './SpriteBrowser';
import { GameAssetItem } from '@/lib/game/assets/AssetManager';
import {
  UserCheck,
  Plus,
  Trash2,
  Save,
  Tag,
  Shield,
  Eye,
  RefreshCw,
  Sparkles,
  Sliders,
  Check,
  X,
} from 'lucide-react';

export interface ClassEditorProps {
  gameId?: string;
}

export const ClassEditor: React.FC<ClassEditorProps> = ({ gameId = 'tuxemon' }) => {
  const defaultClasses: CharacterClassDefinition[] = [
    {
      id: 'class_tamer',
      gameId: 'tuxemon',
      slug: 'tamer',
      name: 'Tamer',
      description: 'Beast-focused class with enhanced capture rates and wild creature empathy.',
      color: '#0284c7',
      baseStats: { hp: 100, atk: 45, def: 45, spd: 55, ratk: 40, rdef: 40 },
      growthRates: { hp: 1.4, atk: 1.3, def: 1.3, spd: 1.5, ratk: 1.2, rdef: 1.2 },
      allowedSpriteTags: ['hero', 'player', 'tamer', 'adventurer'],
      spriteFilters: {},
      startingEquipment: ['tuxeball_pouch', 'basic_net'],
      learnableSkills: [{ level: 1, skill: 'capture' }],
      perks: ['MASTER_TAMER'],
      abilities: ['beast_empathy'],
      isPlayable: true,
      sortOrder: 1,
    },
    {
      id: 'class_animist',
      gameId: 'tuxemon',
      slug: 'animist',
      name: 'Animist',
      description: 'Spirit-focused class attuned to elemental forces and nature summoning.',
      color: '#16a34a',
      baseStats: { hp: 95, atk: 40, def: 40, spd: 50, ratk: 60, rdef: 55 },
      growthRates: { hp: 1.3, atk: 1.1, def: 1.1, spd: 1.3, ratk: 1.6, rdef: 1.5 },
      allowedSpriteTags: ['hero', 'player', 'animist', 'mystical'],
      spriteFilters: {},
      startingEquipment: ['nature_staff', 'spirit_pouch'],
      learnableSkills: [{ level: 1, skill: 'summoning' }],
      perks: ['SPIRIT_BOUND'],
      abilities: ['elemental_attunement'],
      isPlayable: true,
      sortOrder: 2,
    },
  ];

  const [classes, setClasses] = useState<CharacterClassDefinition[]>(defaultClasses);
  const [activeClass, setActiveClass] = useState<CharacterClassDefinition>(defaultClasses[0]);
  const [tagInput, setTagInput] = useState<string>('');
  const [matchingSpritesCount, setMatchingSpritesCount] = useState<number>(0);
  const [showSpriteBrowser, setShowSpriteBrowser] = useState<boolean>(false);

  useEffect(() => {
    // Calculate matching sprites
    if (activeClass) {
      const classSystem = CharacterClassSystem.getInstance();
      classSystem.getSpritesForClass(activeClass, gameId).then((sprites) => {
        setMatchingSpritesCount(sprites.length);
      });
    }
  }, [activeClass, gameId]);

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const tag = tagInput.trim().toLowerCase();
    if (!activeClass.allowedSpriteTags.includes(tag)) {
      const updated = {
        ...activeClass,
        allowedSpriteTags: [...activeClass.allowedSpriteTags, tag],
      };
      updateClassInList(updated);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = {
      ...activeClass,
      allowedSpriteTags: activeClass.allowedSpriteTags.filter((t) => t !== tagToRemove),
    };
    updateClassInList(updated);
  };

  const updateClassInList = (updated: CharacterClassDefinition) => {
    setActiveClass(updated);
    setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleAddNewClass = () => {
    const newCls: CharacterClassDefinition = {
      id: `class_${Date.now()}`,
      gameId,
      slug: `custom_class_${classes.length + 1}`,
      name: `New Class ${classes.length + 1}`,
      description: 'Custom character class definition.',
      color: '#6366f1',
      baseStats: { hp: 100, atk: 50, def: 50, spd: 50, ratk: 50, rdef: 50 },
      growthRates: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.3, ratk: 1.3, rdef: 1.3 },
      allowedSpriteTags: ['hero', 'player'],
      spriteFilters: {},
      startingEquipment: [],
      learnableSkills: [],
      perks: [],
      abilities: [],
      isPlayable: true,
      sortOrder: classes.length + 1,
    };
    setClasses([...classes, newCls]);
    setActiveClass(newCls);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 shadow-2xl max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-cyan-400" />
          <h2 className="font-bold text-slate-100 text-sm font-mono uppercase tracking-wide">
            Character Class Editor
          </h2>
        </div>
        <button
          onClick={handleAddNewClass}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-lg text-xs font-mono flex items-center gap-1 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Class</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Class Selection List */}
        <div className="space-y-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Classes ({classes.length})
          </span>
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setActiveClass(cls)}
              className={`w-full text-left p-2.5 rounded-lg font-mono text-xs border transition flex items-center justify-between ${
                activeClass.id === cls.id
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 shadow-sm'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border border-white/20"
                  style={{ backgroundColor: cls.color }}
                />
                <span className="font-bold">{cls.name}</span>
              </div>
              <span className="text-[10px] text-slate-500">{cls.slug}</span>
            </button>
          ))}
        </div>

        {/* Class Detail Editor */}
        <div className="md:col-span-3 space-y-4 font-mono text-xs bg-slate-900/40 p-4 rounded-lg border border-slate-800">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 text-[10px]">Class Name</label>
              <input
                type="text"
                value={activeClass.name}
                onChange={(e) => updateClassInList({ ...activeClass, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 text-[10px]">Class Slug</label>
              <input
                type="text"
                value={activeClass.slug}
                onChange={(e) => updateClassInList({ ...activeClass, slug: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 text-[10px]">Description</label>
            <input
              type="text"
              value={activeClass.description}
              onChange={(e) => updateClassInList({ ...activeClass, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            />
          </div>

          {/* Sprite Tag Filters */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-cyan-400 text-[11px] font-bold uppercase">
                <Tag className="w-3.5 h-3.5" />
                <span>Allowed Sprite Tag Filters</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Matching Sprites in Pool: <strong className="text-cyan-300">{matchingSpritesCount}</strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 py-1">
              {activeClass.allowedSpriteTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-slate-900 border border-cyan-500/40 text-cyan-300 rounded text-[11px] flex items-center gap-1"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400 text-slate-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Add tag (e.g. hero, tamer, warrior)..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded text-xs"
              >
                Add Tag
              </button>
              <button
                onClick={() => setShowSpriteBrowser(!showSpriteBrowser)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showSpriteBrowser ? 'Hide Preview' : 'Preview Pool'}</span>
              </button>
            </div>
          </div>

          {/* Sprite Pool Preview Drawer */}
          {showSpriteBrowser && (
            <div className="h-80 border border-slate-800 rounded-lg overflow-hidden">
              <SpriteBrowser
                classDef={activeClass}
                onSelect={(selected) => {
                  console.log('Selected sprite for class:', selected);
                }}
              />
            </div>
          )}

          {/* Base Stats Sliders */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <span className="text-cyan-400 text-[11px] font-bold uppercase block">
              Base Stats Configuration
            </span>
            <div className="grid grid-cols-3 gap-3">
              {['hp', 'atk', 'def', 'spd', 'ratk', 'rdef'].map((statKey) => (
                <div key={statKey}>
                  <label className="text-slate-400 block text-[10px] uppercase">{statKey}</label>
                  <input
                    type="number"
                    value={activeClass.baseStats[statKey] || 50}
                    onChange={(e) =>
                      updateClassInList({
                        ...activeClass,
                        baseStats: {
                          ...activeClass.baseStats,
                          [statKey]: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassEditor;
