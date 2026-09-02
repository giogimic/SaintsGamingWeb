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
  const [pickerContext, setPickerContext] = useState<{ entityType: 'CHARACTER' | 'CREATURE'; role: string } | null>(null);

  // Character Form State
  const [charName, setCharName] = useState('Knight Commander');
  const [charClass, setCharClass] = useState('WARRIOR');
  const [charAssetType, setCharAssetType] = useState<'SPRITE_SHEET' | 'MODULAR' | 'SINGLE_IMAGE'>('SPRITE_SHEET');
  const [charSpriteAsset, setCharSpriteAsset] = useState<GameAssetItem | undefined>(undefined);
  const [charFlavor, setCharFlavor] = useState('A steadfast frontline protector of the realm.');

  // Form State: Creatures
  const [creatureName, setCreatureName] = useState('Aerochick');
  const [creatureElement, setCreatureElement] = useState('Solar');
  const [creatureSpriteAsset, setCreatureSpriteAsset] = useState<GameAssetItem | undefined>(undefined);
  const [creatureHp, setCreatureHp] = useState(100);
  const [creatureAtk, setCreatureAtk] = useState(14);
  const [creatureDef, setCreatureDef] = useState(10);

  const handleAddCharacter = () => {
    if (!charName.trim()) return;
    const slug = charName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString().slice(-4);

    const spriteKey = charSpriteAsset?.source || charSpriteAsset?.id || 'evil-berserker-bloodaxe-male';
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
    setCharSpriteAsset(undefined);
  };

  const handleRemoveCharacter = (index: number) => {
    onUpdateCharacters(characters.filter((_, i) => i !== index));
  };

  const handleAddCreature = () => {
    if (!creatureName.trim()) return;
    const slug = creatureName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now().toString().slice(-4);

    const sprite = creatureSpriteAsset?.source || creatureSpriteAsset?.id || 'monster/battle/agnite-sheet';

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
    setCreatureSpriteAsset(undefined);
  };

  const handleRemoveCreature = (index: number) => {
    onUpdateCreatures(creatures.filter((_, i) => i !== index));
  };

  const hasMinimumRequirements = characters.length >= 1 && (!isCreatureGame || creatures.length >= 1);

  return (
    <div className="space-y-4">
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

      {/* SECTION HEADER & TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <User className="w-4 h-4 text-amber-400" />
            4. Entity & Character Content Setup
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure initial player character archetypes and starter creatures.
          </p>
        </div>

        {/* TAB SWITCHER */}
        {isCreatureGame && (
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('characters')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'characters'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3 h-3" />
              Heroes ({characters.length})
            </button>
            <button
              onClick={() => setActiveTab('creatures')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'creatures'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Creatures ({creatures.length})
            </button>
          </div>
        )}
      </div>

      {/* ─── TAB 1: PLAYER CHARACTERS ─── */}
      {activeTab === 'characters' && (
        <div className="space-y-3">
          {/* CURRENT CHARACTERS LIST */}
          {characters.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {characters.map((char, idx) => (
                <div
                  key={char.slug}
                  className="p-3 rounded-lg bg-[#070e1b] border border-slate-800/80 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white truncate">{char.name}</span>
                      <span
                        className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase"
                        style={{ backgroundColor: `${char.tagColor}20`, color: char.tagColor }}
                      >
                        {char.classId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{char.flavor}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveCharacter(idx)}
                    className="text-slate-500 hover:text-rose-400 transition p-1 cursor-pointer"
                    title="Remove Character"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* CHARACTER BUILDER FORM */}
          <div className="p-4 rounded-xl bg-[#070e1b] border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5 font-mono">
              <Plus className="w-3.5 h-3.5" />
              Add Character Archetype
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
                  Character Name
                </label>
                <input
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="e.g. Knight Commander, Shadow Assassin"
                  className="w-full bg-[#050b14] border border-slate-700/80 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
                  Class Archetype
                </label>
                <select
                  value={charClass}
                  onChange={(e) => setCharClass(e.target.value)}
                  className="w-full bg-[#050b14] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-sans"
                >
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ASSET SELECTOR & 3D PREVIEW */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
                Character Sprite Asset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <button
                  type="button"
                  onClick={() => setPickerContext({ entityType: 'CHARACTER', role: 'walk' })}
                  className="w-full flex items-center justify-between p-3 bg-[#050b14] border border-slate-700 hover:border-amber-400 rounded-lg transition text-left cursor-pointer"
                >
                  <div className="flex flex-col min-w-0 mr-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {charSpriteAsset ? charSpriteAsset.metadata?.originalName || charSpriteAsset.id : 'Select Character Sprite...'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                      {charSpriteAsset ? `Asset: ${charSpriteAsset.id}` : 'Click to browse canonical sprite library'}
                    </span>
                  </div>
                  <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                </button>

                <div className="h-28 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
                  <CanonicalAssetPreview asset={charSpriteAsset} role="walk" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <input
                type="text"
                value={charFlavor}
                onChange={(e) => setCharFlavor(e.target.value)}
                placeholder="Flavor text description..."
                className="w-2/3 bg-[#050b14] border border-slate-700/80 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none font-sans"
              />

              <button
                type="button"
                onClick={handleAddCharacter}
                disabled={!charName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-mono font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Hero
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: COMPANION CREATURES ─── */}
      {activeTab === 'creatures' && (
        <div className="space-y-3">
          {/* CURRENT CREATURES LIST */}
          {creatures.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {creatures.map((c, idx) => (
                <div
                  key={c.slug}
                  className="p-3 rounded-lg bg-[#070e1b] border border-slate-800/80 flex items-start justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white truncate">{c.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {c.typePrimary}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      HP: {c.baseHp} · Atk: {c.physicalPower} · Def: {c.physicalDefense}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCreature(idx)}
                    className="text-slate-500 hover:text-rose-400 transition p-1 cursor-pointer"
                    title="Remove Creature"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* CREATURE BUILDER FORM */}
          <div className="p-4 rounded-xl bg-[#070e1b] border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-mono">
              <Plus className="w-3.5 h-3.5" />
              Add Companion Creature
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
                  Creature Species Name
                </label>
                <input
                  type="text"
                  value={creatureName}
                  onChange={(e) => setCreatureName(e.target.value)}
                  placeholder="e.g. Emberfang, Aquafin, Zephyros"
                  className="w-full bg-[#050b14] border border-slate-700/80 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
                  Primary Element
                </label>
                <select
                  value={creatureElement}
                  onChange={(e) => setCreatureElement(e.target.value)}
                  className="w-full bg-[#050b14] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-sans"
                >
                  {ELEMENT_TYPES.map((elem) => (
                    <option key={elem} value={elem}>
                      {elem}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ASSET SELECTOR & 3D PREVIEW */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1 font-mono">
                Creature Sprite Asset (Classic Battler Sheet / Spritesheet)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <button
                  type="button"
                  onClick={() => setPickerContext({ entityType: 'CREATURE', role: 'idle' })}
                  className="w-full flex items-center justify-between p-3 bg-[#050b14] border border-slate-700 hover:border-emerald-400 rounded-lg transition text-left cursor-pointer"
                >
                  <div className="flex flex-col min-w-0 mr-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {creatureSpriteAsset ? creatureSpriteAsset.metadata?.originalName || creatureSpriteAsset.id : 'Choose Creature Sprite...'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                      {creatureSpriteAsset ? `Asset: ${creatureSpriteAsset.id}` : 'Click to select or upload a creature battler sheet'}
                    </span>
                  </div>
                  <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>

                <div className="h-28 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shadow-inner">
                  <CanonicalAssetPreview asset={creatureSpriteAsset} role="idle" />
                </div>
              </div>
            </div>

            {/* STATS & ADD BUTTON */}
            <div className="grid grid-cols-4 gap-2 pt-1 items-end">
              <div>
                <label className="block text-[9px] font-mono font-bold uppercase text-slate-400 mb-0.5">HP</label>
                <input
                  type="number"
                  value={creatureHp}
                  onChange={(e) => setCreatureHp(Number(e.target.value))}
                  className="w-full bg-[#050b14] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono font-bold uppercase text-slate-400 mb-0.5">Atk</label>
                <input
                  type="number"
                  value={creatureAtk}
                  onChange={(e) => setCreatureAtk(Number(e.target.value))}
                  className="w-full bg-[#050b14] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] font-mono font-bold uppercase text-slate-400 mb-0.5">Def</label>
                <input
                  type="number"
                  value={creatureDef}
                  onChange={(e) => setCreatureDef(Number(e.target.value))}
                  className="w-full bg-[#050b14] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleAddCreature}
                disabled={!creatureName.trim()}
                className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg font-mono font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Beast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER NAVIGATION */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <button
          onClick={onNext}
          disabled={!hasMinimumRequirements}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg font-mono font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50 cursor-pointer shadow-md shadow-amber-600/20"
        >
          Continue to Atmosphere
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
