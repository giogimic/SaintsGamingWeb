'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../store';
import {
  HUD_THEME_LIST,
  getHudTheme,
  DEFAULT_HUD_THEME_ID,
  type HudThemeId,
  type HudEngineConfig,
} from '../../hud/hud-themes';
import { BUILTIN_HUD_PRESETS } from '../../hud/default-presets';
import {
  Palette,
  Sliders,
  Sparkles,
  Layout,
  Check,
  RotateCcw,
  Copy,
  Download,
  Upload,
  Eye,
  Shield,
  Heart,
  Compass,
  Radio,
  Settings,
  Flame,
  Backpack,
  Sword,
  ScrollText,
  Store,
  Users,
} from 'lucide-react';
import { soundSynth } from '@/engine/sound-synth';

export const InterfaceEditorPanel: React.FC = () => {
  const hudThemeId = useGameStore((s) => s.hudThemeId);
  const hudConfig = useGameStore((s) => s.hudConfig);
  const setHudTheme = useGameStore((s) => s.setHudTheme);
  const setHudScale = useGameStore((s) => s.setHudScale);
  const updateHudConfig = useGameStore((s) => s.updateHudConfig);
  const resetHudConfig = useGameStore((s) => s.resetHudConfig);
  const showToast = useGameStore((s) => s.showToast);
  const activeHudPreset = useGameStore((s) => s.activeHudPreset);
  const setActiveHudPreset = useGameStore((s) => s.setActiveHudPreset);

  const [activeTab, setActiveTab] = useState<'themes' | 'customizer' | 'dock' | 'presets' | 'share'>('themes');
  const [importJson, setImportJson] = useState('');
  const [copied, setCopied] = useState(false);

  const currentThemeId = (hudThemeId || hudConfig?.themeId || DEFAULT_HUD_THEME_ID) as HudThemeId;
  const currentTheme = getHudTheme(currentThemeId);

  const handleCopyJson = () => {
    try {
      const data = JSON.stringify(hudConfig, null, 2);
      navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Interface config copied to clipboard!');
    } catch {
      showToast('Failed to copy config');
    }
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJson);
      if (parsed && typeof parsed === 'object') {
        updateHudConfig(parsed);
        if (parsed.themeId) {
          setHudTheme(parsed.themeId);
        }
        showToast('Interface config imported successfully!');
        setImportJson('');
      }
    } catch {
      showToast('Invalid JSON config format.');
    }
  };

  const quickConfig = hudConfig?.quickMenuButtons || {
    inventory: true,
    skills: true,
    equipment: true,
    quests: true,
    gtc: true,
    party: true,
    dex: true,
    achievements: true,
    studio: true,
  };

  return (
    <div className="h-full flex flex-col bg-[#050b14]/95 text-slate-200 font-mono select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-card/40 shrink-0">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <span className="font-extrabold text-xs text-slate-100 tracking-wide">
            Game Interface Designer
          </span>
          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30 font-bold">
            {HUD_THEME_LIST.length} Styles
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            resetHudConfig();
            showToast('Reset UI to default style.');
          }}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-amber-300 px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition cursor-pointer"
          title="Reset to Defaults"
        >
          <RotateCcw className="w-3 h-3 text-primary" />
          <span>Reset</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 bg-black/40 text-[11px] shrink-0 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('themes')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
            activeTab === 'themes'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Palette className="w-3 h-3" />
          <span>Theme Styles</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('customizer')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
            activeTab === 'customizer'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Sliders className="w-3 h-3" />
          <span>Engine Controls</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dock')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
            activeTab === 'dock'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Layout className="w-3 h-3" />
          <span>Utility Dock</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
            activeTab === 'presets'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>Dock Presets</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('share')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
            activeTab === 'share'
              ? 'bg-primary/20 text-primary border border-primary/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Copy className="w-3 h-3" />
          <span>Export / Import</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* TAB 1: THEMES */}
        {activeTab === 'themes' && (
          <div className="space-y-3">
            <div className="text-[11px] text-slate-400">
              Select one of the 6 premade game engine interface themes to instantly transform HUD styling across the client:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {HUD_THEME_LIST.map((th) => {
                const isSelected = currentThemeId === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      soundSynth?.playActionSound?.();
                      setHudTheme(th.id);
                      showToast(`Selected "${th.name}" style.`);
                    }}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-primary/15 border-primary shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-card/40 border-border/40 hover:bg-white/5 hover:border-border/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                          style={{ backgroundColor: th.palette.primary }}
                        />
                        <span className="font-extrabold text-xs text-slate-100 truncate">
                          {th.name}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-extrabold text-primary border border-primary/30">
                          <Check className="w-2.5 h-2.5" /> ACTIVE
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {th.description}
                    </p>

                    {/* Color Swatch Strip */}
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
                      <span className="text-[8px] text-slate-500 font-bold uppercase">Palette:</span>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: th.palette.primary }} title="Primary" />
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: th.palette.hpFill }} title="HP Gauge" />
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: th.palette.mpFill }} title="MP Gauge" />
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: th.palette.xpFill }} title="XP Gauge" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOMIZER */}
        {activeTab === 'customizer' && (
          <div className="space-y-4">
            {/* Sliders Section */}
            <div className="p-3 rounded-xl bg-card/40 border border-border/40 space-y-3">
              <span className="text-xs font-extrabold text-primary uppercase block">
                Scale & Opacity
              </span>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-300">
                  <span>HUD Viewport Scale</span>
                  <span className="text-primary font-mono font-black">
                    {Math.round((hudConfig?.scale ?? 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="75"
                  max="125"
                  step="5"
                  value={Math.round((hudConfig?.scale ?? 1) * 100)}
                  onChange={(e) => setHudScale(Number(e.target.value) / 100)}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-300">
                  <span>Glass Backdrop Opacity</span>
                  <span className="text-primary font-mono font-black">
                    {Math.round((hudConfig?.opacity ?? 0.95) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="5"
                  value={Math.round((hudConfig?.opacity ?? 0.95) * 100)}
                  onChange={(e) => updateHudConfig({ opacity: Number(e.target.value) / 100 })}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Shape & Formatting Selectors */}
            <div className="p-3 rounded-xl bg-card/40 border border-border/40 space-y-3">
              <span className="text-xs font-extrabold text-primary uppercase block">
                Component Styles
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Frame Corner Style
                  </label>
                  <select
                    value={hudConfig?.borderRadius || 'rounded'}
                    onChange={(e) => updateHudConfig({ borderRadius: e.target.value as any })}
                    className="w-full text-xs p-1.5 rounded-lg bg-black/80 border border-border/50 text-slate-200 cursor-pointer"
                  >
                    <option value="rounded">Rounded (Default - 16px)</option>
                    <option value="compact">Compact (12px)</option>
                    <option value="capsule">Capsule (Rounded 24px)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Radar Minimap Shape
                  </label>
                  <select
                    value={hudConfig?.minimapShape || 'rounded'}
                    onChange={(e) => updateHudConfig({ minimapShape: e.target.value as any })}
                    className="w-full text-xs p-1.5 rounded-lg bg-black/80 border border-border/50 text-slate-200 cursor-pointer"
                  >
                    <option value="rounded">Rounded Box (12px)</option>
                    <option value="circle">Circular Radar</option>
                    <option value="square">Sharp Square (6px)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Vitality Gauge Format
                  </label>
                  <select
                    value={hudConfig?.vitalsFormat || 'dual-bar'}
                    onChange={(e) => updateHudConfig({ vitalsFormat: e.target.value as any })}
                    className="w-full text-xs p-1.5 rounded-lg bg-black/80 border border-border/50 text-slate-200 cursor-pointer"
                  >
                    <option value="dual-bar">Dual Full Bars (HP + MP + XP)</option>
                    <option value="compact-stacked">Compact Stacked</option>
                    <option value="heart-containers">Heart Containers (Pokemon / Zelda)</option>
                    <option value="icon-bars">Icon Bars (Discrete Emblems)</option>
                    <option value="pokemon-gauge">Pokemon Battle Gauge (Tri-Color HP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Vitals Module Layout
                  </label>
                  <select
                    value={hudConfig?.vitalsLayout || 'grouped'}
                    onChange={(e) => updateHudConfig({ vitalsLayout: e.target.value as any })}
                    className="w-full text-xs p-1.5 rounded-lg bg-black/80 border border-border/50 text-slate-200 cursor-pointer"
                  >
                    <option value="grouped">Grouped Panel (Single Box)</option>
                    <option value="separate">Separated Modules (Floating)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Hotbar Layout Form
                  </label>
                  <select
                    value={hudConfig?.hotbarLayout || '1x5'}
                    onChange={(e) => updateHudConfig({ hotbarLayout: e.target.value as any })}
                    className="w-full text-xs p-1.5 rounded-lg bg-black/80 border border-border/50 text-slate-200 cursor-pointer"
                  >
                    <option value="1x5">Single Row (1x5 slots)</option>
                    <option value="1x10">Single Row Wide (1x10 slots)</option>
                    <option value="2x5">Double Row Compact (2x5 slots)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="p-3 rounded-xl bg-card/40 border border-border/40 space-y-2">
              <span className="text-xs font-extrabold text-primary uppercase block">
                Visual Elements
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={hudConfig?.borderGlow !== false}
                    onChange={(e) => updateHudConfig({ borderGlow: e.target.checked })}
                    className="rounded accent-primary cursor-pointer"
                  />
                  <span>Border Glow Accents</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={hudConfig?.showCoords !== false}
                    onChange={(e) => updateHudConfig({ showCoords: e.target.checked })}
                    className="rounded accent-primary cursor-pointer"
                  />
                  <span>Minimap Coordinates</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={hudConfig?.showHotbarKeybinds !== false}
                    onChange={(e) => updateHudConfig({ showHotbarKeybinds: e.target.checked })}
                    className="rounded accent-primary cursor-pointer"
                  />
                  <span>Hotbar Keybind Badges</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DOCK */}
        {activeTab === 'dock' && (
          <div className="space-y-3">
            <div className="text-[11px] text-slate-400">
              Customize which utility shortcuts appear in the bottom-right Quick Menu dock:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl bg-card/40 border border-border/40">
              {[
                { key: 'inventory', label: 'Inventory Window [I]', icon: Backpack },
                { key: 'skills', label: 'Skills & Levels [K]', icon: Sword },
                { key: 'equipment', label: 'Equipment [C]', icon: Shield },
                { key: 'quests', label: 'Quest Journal [L]', icon: ScrollText },
                { key: 'gtc', label: 'Global Trade Center (GTC)', icon: Store },
                { key: 'party', label: 'Party Roster Overlay [P]', icon: Users },
              ].map((btn) => {
                const isEnabled = (quickConfig as any)[btn.key] !== false;
                const Icon = btn.icon;
                return (
                  <label
                    key={btn.key}
                    className="flex items-center justify-between p-2 rounded-lg bg-black/60 border border-border/40 hover:bg-white/5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs text-slate-200 truncate">{btn.label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) =>
                        updateHudConfig({
                          quickMenuButtons: {
                            ...quickConfig,
                            [btn.key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded accent-primary cursor-pointer shrink-0"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: PRESETS */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            <div className="text-[11px] text-slate-400">
              Select a screen docking preset to position HUD widgets across anchor locations:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BUILTIN_HUD_PRESETS.map((preset) => {
                const isSelected = activeHudPreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      soundSynth?.playActionSound?.();
                      setActiveHudPreset(preset.id);
                      showToast(`Applied preset "${preset.name}".`);
                    }}
                    className={`flex flex-col text-left p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-primary/15 border-primary shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                        : 'bg-card/40 border-border/40 hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-slate-100">{preset.name}</span>
                      {isSelected && (
                        <span className="flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-extrabold text-primary">
                          <Check className="w-2.5 h-2.5" /> ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: SHARE */}
        {activeTab === 'share' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-card/40 border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-primary uppercase">
                  Export Interface Configuration
                </span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-xs font-bold transition cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <textarea
                readOnly
                value={JSON.stringify(hudConfig, null, 2)}
                className="w-full h-28 text-[10px] font-mono p-2 rounded-lg bg-black/80 border border-border/50 text-slate-300 resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-card/40 border border-border/40 space-y-2">
              <span className="text-xs font-extrabold text-primary uppercase block">
                Import Configuration String
              </span>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste exported HUD config JSON string here..."
                className="w-full h-20 text-[10px] font-mono p-2 rounded-lg bg-black/80 border border-border/50 text-slate-300 placeholder-slate-600 resize-none"
              />
              <button
                type="button"
                onClick={handleImportJson}
                disabled={!importJson.trim()}
                className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs hover:brightness-110 disabled:opacity-50 transition cursor-pointer"
              >
                Apply Imported Configuration
              </button>
            </div>
          </div>
        )}

        {/* Live Mini Preview Bar */}
        <div className="p-3 rounded-xl bg-black/60 border border-border/40 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-extrabold uppercase text-slate-300 flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-primary" /> Live Engine Preview
            </span>
            <span className="text-primary font-bold">{currentTheme.name}</span>
          </div>

          <div
            className={`p-2.5 ${currentTheme.palette.glassBg} border ${currentTheme.palette.border} rounded-xl backdrop-blur-md flex items-center justify-between gap-2`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs"
                style={{
                  borderColor: currentTheme.palette.borderActive,
                  backgroundColor: currentTheme.palette.badgeBg,
                  color: currentTheme.palette.primary,
                }}
              >
                SG
              </div>
              <div className="flex flex-col gap-1">
                <div className="w-20 h-1.5 rounded-full overflow-hidden bg-black/80">
                  <div
                    className="h-full rounded-full"
                    style={{ width: '85%', backgroundColor: currentTheme.palette.hpFill }}
                  />
                </div>
                <div className="w-16 h-1.5 rounded-full overflow-hidden bg-black/80">
                  <div
                    className="h-full rounded-full"
                    style={{ width: '60%', backgroundColor: currentTheme.palette.mpFill }}
                  />
                </div>
                <div className="w-14 h-1.5 rounded-full overflow-hidden bg-black/80">
                  <div
                    className="h-full rounded-full"
                    style={{ width: '75%', backgroundColor: (currentTheme.palette as any).staminaFill || '#fbbf24' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {['1', '2', '3'].map((k) => (
                <div
                  key={k}
                  className={`w-6 h-6 rounded-md border flex items-center justify-center text-[9px] font-bold ${currentTheme.palette.badgeBg} text-slate-200`}
                  style={{ borderColor: currentTheme.palette.border }}
                >
                  {k}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
