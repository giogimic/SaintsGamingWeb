'use client';

import React, { useState } from 'react';
import {
  User,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Swords,
  Wand2,
  Compass,
  Heart,
  ImageIcon,
  Layers,
  FileImage,
} from 'lucide-react';
import type { GameDefinitionData } from './GameDefinitionStep';
import { RoleAwareAssetPicker } from '@/web/components/shared/RoleAwareAssetPicker';
import { CanonicalAssetPreview } from '@/web/components/shared/CanonicalAssetPreview';
import type { GameAssetItem } from '@/engine/assets/AssetManager';

export interface SetupCharacterData {
  slug: string;
  name: string;
  classId: string;
  spriteKey: string;
  spriteBundleId?: string | null;
  flavor: string;
  tag: string;
  tagColor: string;
  assetType: 'SPRITE_SHEET' | 'MODULAR' | 'SINGLE_IMAGE';
}

export interface SetupCreatureData {
  slug: string;
  name: string;
  typePrimary: string;
  typeSecondary?: string;
  spriteOverworld: string;
  spriteBattle?: string;
  baseHp: number;
  physicalPower: number;
  physicalDefense: number;
  abilityPower: number;
  abilityDefense: number;
  flavor: string;
}

interface EntitySetupStepProps {
  gameDefinition: GameDefinitionData;
  characters: SetupCharacterData[];
  creatures: SetupCreatureData[];
  onUpdateCharacters: (chars: SetupCharacterData[]) => void;
  onUpdateCreatures: (creatures: SetupCreatureData[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const CLASS_OPTIONS = [
  { id: 'WARRIOR', name: 'Warrior', icon: Swords, color: '#f87171' },
  { id: 'MAGE', name: 'Mage', icon: Wand2, color: '#a78bfa' },
  { id: 'RANGER', name: 'Ranger', icon: Compass, color: '#fbbf24' },
  { id: 'PRIEST', name: 'Priest', icon: Heart, color: '#34d399' },
  { id: 'PALADIN', name: 'Paladin', icon: Shield, color: '#60a5fa' },
];

const PRESET_SPRITES = [
  { id: 'evil-berserker-bloodaxe-male', label: 'Warrior / Berserker', classId: 'WARRIOR' },
  { id: 'good-paladin-templar-female', label: 'Paladin / Templar', classId: 'PALADIN' },
  { id: 'good-wizard-archmage-male', label: 'Mage / Archmage', classId: 'MAGE' },
  { id: 'good-ranger-grovekeeper-female', label: 'Ranger / Scout', classId: 'RANGER' },
  { id: 'good-cleric-highpriestess-female', label: 'Priest / Cleric', classId: 'PRIEST' },
  { id: 'evil-assassin-nightstalker-female', label: 'Assassin / Shadow', classId: 'WARRIOR' },
];

const ELEMENT_TYPES = ['Solar', 'Hydro', 'Bio', 'Volt', 'Geo', 'Cryo', 'Aero', 'Cyber'];

export function EntitySetupStep({
  gameDefinition,
  characters,
  creatures,
  onUpdateCharacters,
  onUpdateCreatures,
  onNext,
  onBack,
}: EntitySetupStepProps) {
  const isCreatureGame = gameDefinition.genre === 'CREATURE_MMO';
  const [activeTab, setActiveTab] = useState<'characters' | 'creatures'>('characters');

  // Asset Picker State
  const [pickerContext, setPickerContext] = useState<{ entityType: 'CHARACTER' | 'CREATURE', role: string } | null>(null);

  // Character Form State
  const [charName, setCharName] = useState('Knight Commander');
  const [charClass, setCharClass] = useState('WARRIOR');
  const [charAssetType, setCharAssetType] = useState<'SPRITE_SHEET' | 'MODULAR' | 'SINGLE_IMAGE'>('SPRITE_SHEET');
  const [charSpriteAsset, setCharSpriteAsset] = useState<GameAssetItem | undefined>(undefined);
  const [charFlavor, setCharFlavor] = useState('A steadfast frontline protector of the realm.');

  // Modular Character Details
  const [charBaseBody, setCharBaseBody] = useState<string>('');
  const [charClothing, setCharClothing] = useState<string>('');

  // Form State: Creatures
  const [creatureName, setCreatureName] = useState('Aerochick');
  const [creatureElement, setCreatureElement] = useState('NATURE');
  const [creatureSpriteAsset, setCreatureSpriteAsset] = useState<GameAssetItem | undefined>(undefined);
  const [creatureHp, setCreatureHp] = useState(100);
  const [creatureAtk, setCreatureAtk] = useState(14);
  const [creatureDef, setCreatureDef] = useState(10);

  const handleAddCharacter = () => {
    if (!charName.trim()) return;
    const slug = charName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString().slice(-4);
    
    // Phase 3: Canonical Asset Mapping
    const spriteKey = charSpriteAsset?.id || '';
    const bundleId = charSpriteAsset?.isModularComponent ? charSpriteAsset.id : (charSpriteAsset?.id || null);

    const newChar: SetupCharacterData = {
      slug,
      name: charName.trim(),
      classId: charClass,
      spriteKey,
      spriteBundleId: bundleId,
      flavor: charFlavor.trim() || `${charName} the ${charClass}`,
      tag: characters.length === 0 ? 'Primary Hero' : 'Hero',
      tagColor: CLASS_OPTIONS.find((c) => c.id === charClass)?.color || '#38bdf8',
      assetType: charAssetType,
    };

    onUpdateCharacters([...characters, newChar]);
    setCharName('');
    setCharFlavor('');
  };

  const handleRemoveCharacter = (index: number) => {
    onUpdateCharacters(characters.filter((_, i) => i !== index));
  };

  const handleAddCreature = () => {
    if (!creatureName.trim()) return;
    const slug = creatureName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString().slice(-4);

    const sprite = creatureSpriteAsset?.id || '';

    const newCreature: SetupCreatureData = {
      slug,
      name: creatureName.trim(),
      typePrimary: creatureElement,
      spriteOverworld: sprite,
      spriteBattle: sprite,
      baseHp: creatureHp,
      physicalPower: creatureAtk,
      physicalDefense: creatureDef,
      abilityPower: creatureAtk,
      abilityDefense: creatureDef,
      flavor: `A companion creature native to ${gameDefinition.name}.`,
    };

    onUpdateCreatures([...creatures, newCreature]);
    setCreatureName('');
  };

  const handleRemoveCreature = (index: number) => {
    onUpdateCreatures(creatures.filter((_, i) => i !== index));
  };

  const hasMinimumRequirements = characters.length >= 1 && (!isCreatureGame || creatures.length >= 1);

  return (
    <div className="space-y-6">
      {/* SETUP ASSET PICKER OVERLAY */}
      {pickerContext && (
        <RoleAwareAssetPicker
          entityType={pickerContext.entityType}
          assetRole={pickerContext.role}
          onSelectAsset={(asset) => {
            if (pickerContext.entityType === 'CHARACTER') {
              setCharSpriteAsset(asset);
            } else {
              setCreatureSpriteAsset(asset);
            }
            setPickerContext(null);
          }}
          onCancel={() => setPickerContext(null)}
        />
      )}

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
              <User className="w-5 h-5 text-amber-400" />
              3. Entity & Character Content Setup
            </h2>
            <p className="text-sm text-slate-400">
              Create the initial character archetypes (and creatures) for your game world.
            </p>
          </div>

          {/* TAB SWITCHER IF CREATURE GAME */}
          {isCreatureGame && (
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => setActiveTab('characters')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'characters'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Player Characters ({characters.length})
              </button>
              <button
                onClick={() => setActiveTab('creatures')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'creatures'
                    ? 'bg-emerald-400 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Companion Creatures ({creatures.length})
              </button>
            </div>
          )}
        </div>

        {/* ─── TAB 1: PLAYER CHARACTERS ─── */}
        {activeTab === 'characters' && (
          <div className="space-y-6">
            {/* CURRENT CHARACTERS LIST */}
            {characters.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Configured Player Characters ({characters.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {characters.map((char, idx) => (
                    <div
                      key={char.slug}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">{char.name}</span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase"
                            style={{ backgroundColor: `${char.tagColor}20`, color: char.tagColor }}
                          >
                            {char.classId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{char.flavor}</div>
                        <div className="text-[10px] font-mono text-slate-500">Asset: {char.assetType}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveCharacter(idx)}
                        className="text-slate-500 hover:text-red-400 transition p-1 cursor-pointer"
                        title="Remove Character"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CHARACTER BUILDER FORM */}
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Player Character
              </h3>

              {/* ASSET TYPE SELECTION */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Character Asset Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'SPRITE_SHEET', label: 'Sprite Sheet', desc: '4-directional sheet with walk cycles', icon: Layers },
                    { id: 'MODULAR', label: 'Modular Character', desc: 'Modular composite (body, hair, clothing)', icon: ImageIcon },
                    { id: 'SINGLE_IMAGE', label: 'Single Image', desc: 'Static icon / 2D token sprite', icon: FileImage },
                  ].map((type) => {
                    const Icon = type.icon;
                    const isSelected = charAssetType === type.id;
                    return (
                      <div
                        key={type.id}
                        onClick={() => setCharAssetType(type.id as any)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/20 border-amber-400 text-white shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <Icon className="w-4 h-4 text-amber-400" />
                          {type.label}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">{type.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* NAME & CLASS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Character Name
                  </label>
                  <input
                    type="text"
                    value={charName}
                    onChange={(e) => setCharName(e.target.value)}
                    placeholder="e.g. Knight Commander, Shadow Assassin"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Class Archetype
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {CLASS_OPTIONS.map((c) => {
                      const isSelected = charClass === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCharClass(c.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold transition flex flex-col items-center gap-1 cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950 border-amber-400'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-[11px]">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ASSET SPECIFIC OPTIONS */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Select Character Asset
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setPickerContext({ entityType: 'CHARACTER', role: 'walk' })}
                      className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-700 hover:border-indigo-500 rounded-xl transition-colors text-left min-h-[5rem]"
                    >
                      <div className="flex flex-col overflow-hidden mr-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {charSpriteAsset ? charSpriteAsset.metadata?.originalName || charSpriteAsset.id : 'Choose Character Asset...'}
                        </span>
                        <span className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {charSpriteAsset ? `Selected Canonical Asset: ${charSpriteAsset.id}` : 'Opens the Asset Manager to select or upload a canonical asset'}
                        </span>
                      </div>
                      <ImageIcon className="w-5 h-5 text-slate-400 shrink-0" />
                    </button>
                    {charSpriteAsset && (
                      <div className="text-[10px] text-slate-500 bg-slate-900/50 p-2 rounded-lg font-mono truncate">
                        Source: {charSpriteAsset.source}
                      </div>
                    )}
                  </div>

                  <div className="h-48 md:h-56 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-inner">
                    <CanonicalAssetPreview asset={charSpriteAsset} role="walk" />
                  </div>
                </div>
              </div>

              {/* FLAVOR TEXT */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Flavor Text / Description
                </label>
                <input
                  type="text"
                  value={charFlavor}
                  onChange={(e) => setCharFlavor(e.target.value)}
                  placeholder="e.g. Master of arcane arts, strikes swiftly from distance..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-white text-xs outline-none transition"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddCharacter}
                  disabled={!charName.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 transition disabled:opacity-50 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Add This Character
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: COMPANION CREATURES ─── */}
        {activeTab === 'creatures' && (
          <div className="space-y-6">
            {/* CURRENT CREATURES LIST */}
            {creatures.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Configured Companion Creatures ({creatures.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {creatures.map((c, idx) => (
                    <div
                      key={c.slug}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">{c.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {c.typePrimary}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">HP: {c.baseHp} · Atk: {c.physicalPower} · Def: {c.physicalDefense}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveCreature(idx)}
                        className="text-slate-500 hover:text-red-400 transition p-1 cursor-pointer"
                        title="Remove Creature"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CREATURE BUILDER FORM */}
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Companion Creature
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Creature Species Name
                  </label>
                  <input
                    type="text"
                    value={creatureName}
                    onChange={(e) => setCreatureName(e.target.value)}
                    placeholder="e.g. Emberfang, Aquafin, Zephyros"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Primary Element Type
                  </label>
                  <select
                    value={creatureElement}
                    onChange={(e) => setCreatureElement(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                  >
                    {ELEMENT_TYPES.map((elem) => (
                      <option key={elem} value={elem}>
                        {elem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Creature Asset (Battle/Overworld)
                </label>
                <button
                  onClick={() => setPickerContext({ entityType: 'CREATURE', role: 'idle' })}
                  className="w-full flex items-center justify-between p-4 bg-slate-900 border border-slate-700 hover:border-emerald-500 rounded-xl transition-colors text-left"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {creatureSpriteAsset ? creatureSpriteAsset.metadata?.originalName || creatureSpriteAsset.id : 'Choose Creature Asset...'}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">
                      {creatureSpriteAsset ? `Selected Canonical Asset: ${creatureSpriteAsset.id}` : 'Opens the Asset Manager to select or upload a canonical asset'}
                    </span>
                  </div>
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                </button>
                <div className="mt-4 h-48 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-inner">
                  <CanonicalAssetPreview asset={creatureSpriteAsset} role="idle" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Base HP</label>
                  <input
                    type="number"
                    value={creatureHp}
                    onChange={(e) => setCreatureHp(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Attack Power</label>
                  <input
                    type="number"
                    value={creatureAtk}
                    onChange={(e) => setCreatureAtk(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Defense</label>
                  <input
                    type="number"
                    value={creatureDef}
                    onChange={(e) => setCreatureDef(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddCreature}
                  disabled={!creatureName.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition disabled:opacity-50 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Add This Creature
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={onNext}
          disabled={!hasMinimumRequirements}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-xl shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
        >
          Continue to Environment Setup
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
