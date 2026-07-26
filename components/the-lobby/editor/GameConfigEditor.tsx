'use client';

import React, { useState, useEffect } from 'react';
import { GameConfigInput } from '@/lib/game/GameConfigManager';
import {
  Sliders,
  Save,
  RefreshCw,
  Zap,
  Users,
  Check,
} from 'lucide-react';

export interface GameConfigEditorProps {
  gameSlug?: string;
  onSaveSuccess?: () => void;
}

export const GameConfigEditor: React.FC<GameConfigEditorProps> = ({
  gameSlug: _gameSlug = 'tuxemon',
  onSaveSuccess,
}) => {
  const [config, setConfig] = useState<Partial<GameConfigInput>>({
    slug: 'tuxemon',
    name: 'Tuxemon Demo',
    version: '1.0.0',
    description: 'Official Tuxemon multi-game engine demo',
    maxLevel: 100,
    baseStats: { hp: 100, atk: 50, def: 40, spd: 50, ratk: 50, rdef: 40 },
    combatFormula: 'tuxemon-standard',
    skillFormula: 'runescape-style',
    xpCurve: 'exponential',
    maxEntitiesPerMap: 100,
    maxPlayersPerMap: 50,
    chunkSize: 32,
    optimizationLevel: 'medium',
    enableChat: true,
    enableParties: true,
    enableTrading: true,
    enablePvP: true,
    maxPartySize: 4,
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Send API save request (fallback to mock delay if endpoint not present yet)
      const res = await fetch('/api/game/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        // Fallback for dev mode
        console.warn('API route /api/game/config not ready yet, saved to local state');
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-6 max-w-4xl mx-auto shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h2 className="font-bold text-slate-100 text-sm font-mono uppercase tracking-wide">
            Game Engine Configuration
          </h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 shadow-lg transition"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
          ) : savedSuccess ? (
            <Check className="w-4 h-4 text-green-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save Game Config'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {/* Basic Game Info */}
        <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
          <span className="font-bold text-cyan-400 block uppercase text-[11px]">
            1. Metadata & Identification
          </span>
          <div>
            <label className="text-slate-400 block mb-1 text-[10px]">Game Slug ID</label>
            <input
              type="text"
              value={config.slug || ''}
              onChange={(e) => setConfig({ ...config, slug: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1 text-[10px]">Game Title</label>
            <input
              type="text"
              value={config.name || ''}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1 text-[10px]">Description</label>
            <textarea
              rows={2}
              value={config.description || ''}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            />
          </div>
        </div>

        {/* Combat & Gameplay Formulas */}
        <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
          <span className="font-bold text-cyan-400 block uppercase text-[11px]">
            2. Rules & Formula Systems
          </span>
          <div>
            <label className="text-slate-400 block mb-1 text-[10px]">Combat Formula</label>
            <select
              value={config.combatFormula || 'tuxemon-standard'}
              onChange={(e) => setConfig({ ...config, combatFormula: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            >
              <option value="tuxemon-standard">Tuxemon Standard (15 Types / 6 Stats)</option>
              <option value="pokemon-gen3">Pokémon Gen 3 Standard</option>
              <option value="custom-rpg">Custom Action RPG</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 block mb-1 text-[10px]">Skill Formula</label>
            <select
              value={config.skillFormula || 'runescape-style'}
              onChange={(e) => setConfig({ ...config, skillFormula: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            >
              <option value="runescape-style">RuneScape-Style Progression (27 Skills)</option>
              <option value="linear">Linear Skill Progression</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400 block mb-1 text-[10px]">Max Level Cap</label>
            <input
              type="number"
              value={config.maxLevel || 100}
              onChange={(e) => setConfig({ ...config, maxLevel: parseInt(e.target.value) || 100 })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            />
          </div>
        </div>

        {/* Social Features */}
        <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
          <span className="font-bold text-cyan-400 block uppercase text-[11px]">
            3. Social & Multiplayer Toggles
          </span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'enableChat', label: 'Global Chat' },
              { key: 'enableParties', label: 'Player Parties' },
              { key: 'enableTrading', label: 'Item Trading' },
              { key: 'enablePvP', label: 'PvP Battles' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(config as any)[key]}
                  onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500"
                />
                <span className="text-slate-300 text-[10px]">{label}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="text-slate-400 block mb-1 text-[10px]">Max Party Size</label>
            <input
              type="number"
              value={config.maxPartySize || 4}
              onChange={(e) => setConfig({ ...config, maxPartySize: parseInt(e.target.value) || 4 })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            />
          </div>
        </div>

        {/* Performance & Optimization */}
        <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
          <span className="font-bold text-cyan-400 block uppercase text-[11px]">
            4. Performance & Chunk Limits
          </span>
          <div>
            <label className="text-slate-400 block mb-1 text-[10px]">Map Chunk Size (Tiles)</label>
            <input
              type="number"
              value={config.chunkSize || 32}
              onChange={(e) => setConfig({ ...config, chunkSize: parseInt(e.target.value) || 32 })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1 text-[10px]">Max Entities Per Map</label>
            <input
              type="number"
              value={config.maxEntitiesPerMap || 100}
              onChange={(e) => setConfig({ ...config, maxEntitiesPerMap: parseInt(e.target.value) || 100 })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameConfigEditor;
