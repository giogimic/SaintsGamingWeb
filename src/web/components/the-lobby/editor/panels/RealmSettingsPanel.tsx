'use client';

import React, { useState, useEffect } from 'react';
import { useMapIndex } from '@/web/hooks/studio-data';
import type { MapIndexEntry } from '@/web/components/the-lobby/data/map-index';
import {
  Settings,
  Shield,
  Radio,
  Camera,
  Sparkles,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe2,
  Sun,
  Layers,
  Eye,
  Sliders,
  FileText,
  Palette,
  CloudSun,
} from 'lucide-react';
import {
  DEFAULT_REALM_SETTINGS,
  RealmSettingsConfig,
} from '@/shared/game/realmSettings';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuTabGroup,
  WindowMenuDivider,
} from '../WindowMenuBar';
import { soundSynth } from '@/engine/sound-synth';

export function RealmSettingsPanel() {
  const [settings, setSettings] = useState<RealmSettingsConfig>(DEFAULT_REALM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'heroes' | 'comms' | 'capture' | 'visuals' | 'realm'>('visuals');
  const { maps: availableMaps } = useMapIndex();

  // Load existing realm settings from server
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch('/api/realm/settings');
        if (res.ok) {
          const data = await res.json();
          if (data?.settings) {
            setSettings({
              ...DEFAULT_REALM_SETTINGS,
              ...data.settings,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load realm settings:', err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);
      const res = await fetch('/api/realm/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save realm settings');
      setStatusMessage({ type: 'success', text: 'Server settings saved successfully!' });
      
      // Notify Babylon Engine of visual updates
      window.dispatchEvent(
        new CustomEvent('studio_update_realm_visuals', {
          detail: { settings },
        })
      );
      
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all server, 2.5D visual & realm identity settings to defaults?')) {
      setSettings(DEFAULT_REALM_SETTINGS);
      setStatusMessage({ type: 'success', text: 'Reset to canonical defaults. Click Save to persist.' });
      window.dispatchEvent(
        new CustomEvent('studio_update_realm_visuals', {
          detail: { settings: DEFAULT_REALM_SETTINGS },
        })
      );
    }
  };

  const applyPreset = (presetName: string, presetUpdates: Partial<RealmSettingsConfig>) => {
    soundSynth?.playSelectSound?.();
    setSettings((prev) => ({ ...prev, ...presetUpdates }));
    setStatusMessage({ type: 'success', text: `Applied visual preset: ${presetName}. Click Save to persist.` });
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#050b14]/90 p-4 font-mono">
        <div className="flex items-center gap-2 text-xs text-amber-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading realm configuration...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'visuals', label: '2.5D / 3D Visuals', icon: Sun },
    { id: 'heroes', label: 'Hero Identity', icon: Shield },
    { id: 'comms', label: 'Soul Link Chat', icon: Radio },
    { id: 'capture', label: 'Souls & Cameras', icon: Camera },
    { id: 'realm', label: 'Realm Info', icon: Globe2 },
  ];

  return (
    <div className="flex flex-col h-full bg-[#050b14]/95 text-slate-200 font-mono text-xs overflow-hidden">
      {/* ── SUB-MENU APP TOOLBAR (Under Title Bar) ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="File"
          icon={FileText}
          items={[
            { label: 'Save Realm Config', icon: Save, shortcut: 'Ctrl+S', onClick: handleSave },
            { label: 'Reset to Defaults', icon: RotateCcw, onClick: handleResetToDefaults, danger: true },
          ]}
        />
        <WindowMenuDropdown
          label="Visual Presets"
          icon={Palette}
          items={[
            {
              label: 'Default 2.5D High Fantasy',
              icon: CloudSun,
              onClick: () =>
                applyPreset('Default 2.5D High Fantasy', {
                  enable3DLighting: true,
                  enableShadows: true,
                  shadowQuality: 'medium',
                  enableAtmosphericFog: true,
                  fogDensity: 0.015,
                  fogColor: '#0b1626',
                  terrainElevationScale: 1.0,
                  waterReflectionQuality: 'high',
                }),
            },
            {
              label: 'Midnight Atmosphere',
              icon: Sparkles,
              onClick: () =>
                applyPreset('Midnight Atmosphere', {
                  enable3DLighting: true,
                  enableShadows: true,
                  shadowQuality: 'high',
                  enableAtmosphericFog: true,
                  fogDensity: 0.025,
                  fogColor: '#050a14',
                  terrainElevationScale: 1.2,
                  waterReflectionQuality: 'high',
                }),
            },
            {
              label: 'Sunlit Golden Coast',
              icon: Sun,
              onClick: () =>
                applyPreset('Sunlit Golden Coast', {
                  enable3DLighting: true,
                  enableShadows: true,
                  shadowQuality: 'high',
                  enableAtmosphericFog: true,
                  fogDensity: 0.01,
                  fogColor: '#1a1810',
                  terrainElevationScale: 1.1,
                  waterReflectionQuality: 'high',
                }),
            },
            {
              label: 'Clean Flat Performance (Mobile/Low-End)',
              icon: Sliders,
              onClick: () =>
                applyPreset('Clean Flat Performance', {
                  enable3DLighting: false,
                  enableShadows: false,
                  shadowQuality: 'low',
                  enableAtmosphericFog: false,
                  terrainElevationScale: 1.0,
                  waterReflectionQuality: 'off',
                }),
            },
          ]}
        />
        <WindowMenuDivider />
        <WindowMenuTabGroup
          tabs={tabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
        />
        <div className="flex-1" />
        <WindowMenuButton
          label={saving ? 'Saving...' : 'Save'}
          icon={saving ? Loader2 : Save}
          onClick={handleSave}
          disabled={saving}
          active
          title="Save and broadcast settings to live server"
        />
      </WindowMenuBar>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-2 px-3 text-[11px] flex items-center gap-2 shrink-0 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 text-emerald-300 border-b border-emerald-500/30'
              : 'bg-rose-950/80 text-rose-300 border-b border-rose-500/30'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span className="truncate">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* ── 2.5D / 3D VISUALS & ENGINE PIPELINE ── */}
        {activeTab === 'visuals' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-950/20 border border-primary/30">
              <div className="flex items-center gap-2 text-primary font-bold mb-1">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Global 2.5D & 3D Visual Pipeline</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Tune the realm-wide 2.5D lighting, dynamic sun cascades, atmospheric fog, elevation exaggeration, and depth simulation rendered across all maps.
              </p>
            </div>

            {/* Lighting & Shadows */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sun className="w-3 h-3 text-amber-400" /> Lighting & Shadow Cascades
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#060e1c] border border-border/20 cursor-pointer">
                  <div>
                    <div className="text-[11px] font-bold text-foreground">3D Dynamic Lighting</div>
                    <div className="text-[8.5px] text-muted-foreground">Enable directional celestial sun/moon shader</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enable3DLighting !== false}
                    onChange={(e) => setSettings({ ...settings, enable3DLighting: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#060e1c] border border-border/20 cursor-pointer">
                  <div>
                    <div className="text-[11px] font-bold text-foreground">Real-time Shadows</div>
                    <div className="text-[8.5px] text-muted-foreground">Cast shadows from hero & world props</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableShadows !== false}
                    onChange={(e) => setSettings({ ...settings, enableShadows: e.target.checked })}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </label>
              </div>

              {settings.enableShadows !== false && (
                <div className="pt-2 border-t border-border/10 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Shadow Generator Quality</span>
                      <span className="text-[9px] font-bold text-primary uppercase">{settings.shadowQuality || 'medium'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['low', 'medium', 'high'] as const).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setSettings({ ...settings, shadowQuality: q })}
                          className={`py-1.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                            (settings.shadowQuality || 'medium') === q
                              ? 'bg-primary/20 border border-primary text-primary'
                              : 'bg-[#060e1c] border border-border/20 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shadow Darkness Opacity */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Shadow Darkness Opacity</span>
                      <span className="text-primary font-bold">{settings.shadowDarkness ?? 45}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={5}
                      value={settings.shadowDarkness ?? 45}
                      onChange={(e) => setSettings({ ...settings, shadowDarkness: parseInt(e.target.value) })}
                      className="w-full accent-primary h-1 cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] text-muted-foreground">
                      <span>Soft (10%)</span>
                      <span>Balanced (45%)</span>
                      <span>Dramatic (90%)</span>
                    </div>
                  </div>

                  {/* Cloud Shadow Drift */}
                  <label className="flex items-center justify-between p-2 rounded bg-[#060e1c] border border-border/20 cursor-pointer text-[10px]">
                    <div>
                      <div className="font-bold">Drifting Cloud Shadows</div>
                      <div className="text-[8.5px] text-muted-foreground">Procedural cloud shadows gliding across landscape</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!settings.enableCloudShadows}
                      onChange={(e) => setSettings({ ...settings, enableCloudShadows: e.target.checked })}
                      className="accent-primary"
                    />
                  </label>

                  {/* Sun Shafts / Volumetric Light Rays */}
                  <div className="space-y-1.5 pt-1 border-t border-border/10">
                    <label className="flex items-center justify-between p-2 rounded bg-[#060e1c] border border-border/20 cursor-pointer text-[10px]">
                      <div>
                        <div className="font-bold">Sun Shafts & Volumetric Light Rays</div>
                        <div className="text-[8.5px] text-muted-foreground">Atmospheric celestial godrays passing terrain</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!settings.enableSunShafts}
                        onChange={(e) => setSettings({ ...settings, enableSunShafts: e.target.checked })}
                        className="accent-primary"
                      />
                    </label>
                    {settings.enableSunShafts && (
                      <div className="space-y-1 p-2 rounded bg-[#060e1c]/60 border border-border/10">
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-muted-foreground">Sun Shaft Intensity</span>
                          <span className="text-primary font-bold">{settings.sunShaftIntensity || 40}%</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={settings.sunShaftIntensity || 40}
                          onChange={(e) => setSettings({ ...settings, sunShaftIntensity: parseInt(e.target.value) })}
                          className="w-full accent-primary h-1 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Atmosphere & Fog */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Atmospheric Fog & Sky Depth
              </div>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#060e1c] border border-border/20 cursor-pointer">
                <div>
                  <div className="text-[11px] font-bold text-foreground">Atmospheric Depth Fog</div>
                  <div className="text-[8.5px] text-muted-foreground">Soft horizon falloff that gives 2.5D visual depth</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableAtmosphericFog !== false}
                  onChange={(e) => setSettings({ ...settings, enableAtmosphericFog: e.target.checked })}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </label>

              {settings.enableAtmosphericFog !== false && (
                <div className="space-y-3 pt-1 border-t border-border/10">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Fog Density Falloff</span>
                      <span className="text-[10px] font-bold text-primary">{((settings.fogDensity || 0.015) * 1000).toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={1}
                      value={Math.round((settings.fogDensity || 0.015) * 1000)}
                      onChange={(e) => setSettings({ ...settings, fogDensity: parseInt(e.target.value) / 1000 })}
                      className="w-full accent-primary h-1 cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] text-muted-foreground">
                      <span>Subtle Crisp (0.005)</span>
                      <span>Dense Mystic (0.050)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-muted-foreground block">Sky & Horizon Fog Tint</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.fogColor || '#0b1626'}
                        onChange={(e) => setSettings({ ...settings, fogColor: e.target.value })}
                        className="h-7 w-10 rounded border border-border/40 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.fogColor || '#0b1626'}
                        onChange={(e) => setSettings({ ...settings, fogColor: e.target.value })}
                        className="flex-1 bg-[#060e1c] border border-border/30 rounded px-2 py-1 text-foreground text-xs font-mono"
                      />
                      {['#0b1626', '#120d20', '#1c150c', '#081414'].map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setSettings({ ...settings, fogColor: col })}
                          style={{ backgroundColor: col }}
                          className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                          title={col}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2.5D Elevation & Water */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-teal-400" /> Terrain Elevation & Water Simulation
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">2.5D Elevation Step Multiplier</span>
                  <span className="text-[10px] font-bold text-primary">{((settings.terrainElevationScale || 1.0)).toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={250}
                  step={5}
                  value={Math.round((settings.terrainElevationScale || 1.0) * 100)}
                  onChange={(e) => setSettings({ ...settings, terrainElevationScale: parseInt(e.target.value) / 100 })}
                  className="w-full accent-primary h-1 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-muted-foreground">
                  <span>Flat Tiles (0.5x)</span>
                  <span>Standard (1.0x)</span>
                  <span>Dramatic Cliffs (2.5x)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/10 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Water Shader & Reflections</span>
                  <span className="text-[9px] font-bold text-primary uppercase">{settings.waterReflectionQuality || 'high'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['off', 'low', 'high'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setSettings({ ...settings, waterReflectionQuality: w })}
                      className={`py-1.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                        (settings.waterReflectionQuality || 'high') === w
                          ? 'bg-primary/20 border border-primary text-primary'
                          : 'bg-[#060e1c] border border-border/20 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Environment: Time of Day Atmosphere */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-amber-400" /> Time of Day Atmosphere</span>
                <span className="text-primary font-bold uppercase text-[9px]">{settings.timeOfDayPreset || 'day'}</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: 'day', label: 'Day', color: '#fef08a' },
                  { id: 'golden_hour', label: 'Sunset', color: '#fb923c' },
                  { id: 'dusk', label: 'Dusk', color: '#c084fc' },
                  { id: 'midnight', label: 'Night', color: '#60a5fa' },
                  { id: 'fantasy_night', label: 'Mystic', color: '#34d399' },
                ].map((tod) => (
                  <button
                    key={tod.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, timeOfDayPreset: tod.id as any })}
                    className={`py-1.5 px-1 rounded text-[9px] font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      (settings.timeOfDayPreset || 'day') === tod.id
                        ? 'bg-primary/20 border border-primary text-primary'
                        : 'bg-[#060e1c] border border-border/20 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tod.color }} />
                    <span className="truncate">{tod.label}</span>
                  </button>
                ))}
              </div>

              {/* Celestial Moon Phase (For Night & Mystic Atmospheres) */}
              {((settings.timeOfDayPreset || 'day') === 'midnight' || (settings.timeOfDayPreset || 'day') === 'fantasy_night') && (
                <div className="space-y-1.5 pt-2 border-t border-border/10">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Celestial Moon Phase Night Glow</span>
                    <span className="text-primary font-bold uppercase text-[9px]">{settings.moonPhase || 'full'}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: 'full', label: 'Full Moon', desc: 'Silvery luminous glow', dot: '#93c5fd' },
                      { id: 'crescent', label: 'Crescent', desc: 'Moody dark night', dot: '#64748b' },
                      { id: 'new', label: 'New Moon', desc: 'Pitch starfield', dot: '#334155' },
                      { id: 'eclipse', label: 'Eclipse', desc: 'Crimson blood moon', dot: '#ef4444' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSettings({ ...settings, moonPhase: m.id as any })}
                        title={m.desc}
                        className={`py-1 px-1 rounded text-[8.5px] font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                          (settings.moonPhase || 'full') === m.id
                            ? 'bg-primary/20 border border-primary text-primary'
                            : 'bg-[#060e1c] border border-border/20 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.dot }} />
                        <span className="truncate">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Day/Night Cycle Duration */}
              <div className="space-y-1 pt-2 border-t border-border/10">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Dynamic Day/Night Cycle Duration</span>
                  <span className="text-primary font-bold">
                    {(settings.dayNightCycleDurationMinutes || 0) === 0 ? 'Static / Manual' : `${settings.dayNightCycleDurationMinutes} min cycle`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={settings.dayNightCycleDurationMinutes || 0}
                  onChange={(e) => setSettings({ ...settings, dayNightCycleDurationMinutes: parseInt(e.target.value) })}
                  className="w-full accent-primary h-1 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-muted-foreground">
                  <span>Static (0m)</span>
                  <span>Fast (15m)</span>
                  <span>Real-Time (60m)</span>
                </div>
              </div>
            </div>

            {/* Weather Particle Systems */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Weather Particle Systems</span>
                <span className="text-primary font-bold uppercase text-[9px]">{settings.weatherPreset || 'none'}</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: 'none', label: 'Clear' },
                  { id: 'gentle_rain', label: 'Rain' },
                  { id: 'falling_leaves', label: 'Leaves' },
                  { id: 'snow_flurries', label: 'Snow' },
                  { id: 'fireflies', label: 'Glow' },
                ].map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, weatherPreset: w.id as any })}
                    className={`py-1.5 px-1 rounded text-[9px] font-bold uppercase transition-colors cursor-pointer text-center ${
                      (settings.weatherPreset || 'none') === w.id
                        ? 'bg-primary/20 border border-primary text-primary'
                        : 'bg-[#060e1c] border border-border/20 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              {(settings.weatherPreset && settings.weatherPreset !== 'none') && (
                <div className="space-y-2 pt-2 border-t border-border/10">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Particle Density Intensity</span>
                      <span className="text-primary font-bold">{settings.weatherIntensity || 50}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={settings.weatherIntensity || 50}
                      onChange={(e) => setSettings({ ...settings, weatherIntensity: parseInt(e.target.value) })}
                      className="w-full accent-primary h-1 cursor-pointer"
                    />
                  </div>

                  {/* Wind Direction & Speed */}
                  <div className="space-y-1.5 pt-1 border-t border-border/10">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Particle Wind Direction</span>
                      <span className="text-primary font-bold uppercase text-[9px]">{settings.windDirection || 'south'}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { id: 'north', label: 'North' },
                        { id: 'east', label: 'East' },
                        { id: 'south', label: 'South' },
                        { id: 'west', label: 'West' },
                        { id: 'swirling', label: 'Swirl' },
                      ].map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSettings({ ...settings, windDirection: w.id as any })}
                          className={`py-1 px-1 rounded text-[8.5px] font-bold transition-colors cursor-pointer text-center truncate ${
                            (settings.windDirection || 'south') === w.id
                              ? 'bg-primary/20 border border-primary text-primary'
                              : 'bg-[#060e1c] border border-border/20 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Water Animation & Flow */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Water Shader Dynamics & Flow Speed</span>
                <span className="text-primary font-bold">{((settings.waterFlowSpeed || 1.0)).toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={Math.round((settings.waterFlowSpeed || 1.0) * 10)}
                onChange={(e) => setSettings({ ...settings, waterFlowSpeed: parseInt(e.target.value) / 10 })}
                className="w-full accent-primary h-1 cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-muted-foreground">
                <span>Calm Pond (0.5x)</span>
                <span>Gentle Stream (1.0x)</span>
                <span>Fast Rapids (3.0x)</span>
              </div>
            </div>

            {/* 3D Audio Acoustics & Spatial Rolloff */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                3D Spatial Audio & Realm Acoustics
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Acoustic Reverb Space</span>
                  <span className="text-primary font-bold uppercase text-[9px]">{settings.acousticPreset || 'none'}</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: 'none', label: 'Dry / Pure' },
                    { id: 'field', label: 'Open Field' },
                    { id: 'cave', label: 'Cavern' },
                    { id: 'hall', label: 'Cathedral' },
                    { id: 'catacomb', label: 'Catacomb' },
                  ].map((ac) => (
                    <button
                      key={ac.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, acousticPreset: ac.id as any })}
                      className={`py-1.5 px-1 rounded text-[8.5px] font-bold transition-colors cursor-pointer text-center truncate ${
                        (settings.acousticPreset || 'none') === ac.id
                          ? 'bg-primary/20 border border-primary text-primary'
                          : 'bg-[#060e1c] border border-border/20 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {ac.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-1.5 border-t border-border/10">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Spatial Distance Rolloff</span>
                  <span className="text-primary font-bold">{((settings.spatialAudioRolloff || 1.2)).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={Math.round((settings.spatialAudioRolloff || 1.2) * 10)}
                  onChange={(e) => setSettings({ ...settings, spatialAudioRolloff: parseInt(e.target.value) / 10 })}
                  className="w-full accent-primary h-1 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-border/10 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-foreground">Terrain Elevation Incline</div>
                  <div className="text-[8.5px] text-muted-foreground">Stepped retro cliffs vs smoothed vertex ramps</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({
                    ...settings,
                    elevationMode: (settings.elevationMode || 'stepped') === 'stepped' ? 'smooth' : 'stepped',
                  })}
                  className="px-2.5 py-1 rounded border border-border/30 bg-[#060e1c] text-[10px] font-bold text-primary hover:border-primary/40 cursor-pointer"
                >
                  {(settings.elevationMode || 'stepped') === 'stepped' ? 'Stepped Cliffs' : 'Smooth Slopes'}
                </button>
              </div>
            </div>

            {/* Camera Inertia & Pan Smoothing */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Camera Follow Smoothing & Inertia</span>
                <span className="text-primary font-bold">{Math.round((settings.cameraSmoothingFactor ?? 0.6) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={95}
                step={5}
                value={Math.round((settings.cameraSmoothingFactor ?? 0.6) * 100)}
                onChange={(e) => setSettings({ ...settings, cameraSmoothingFactor: parseInt(e.target.value) / 100 })}
                className="w-full accent-primary h-1 cursor-pointer"
              />
              <div className="flex justify-between text-[8px] text-muted-foreground">
                <span>Snappy (0%)</span>
                <span>Balanced (60%)</span>
                <span>Cinematic Glide (95%)</span>
              </div>
            </div>

            {/* Post-Processing & Viewport Overlays */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/30 space-y-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Post-Processing & Viewport Overlays
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center justify-between p-2 rounded bg-[#060e1c] border border-border/20 cursor-pointer text-[10px]">
                  <span>Anti-Aliasing (FXAA)</span>
                  <input
                    type="checkbox"
                    checked={settings.enableAntiAliasing !== false}
                    onChange={(e) => setSettings({ ...settings, enableAntiAliasing: e.target.checked })}
                    className="accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded bg-[#060e1c] border border-border/20 cursor-pointer text-[10px]">
                  <span>Subtle Bloom Highlights</span>
                  <input
                    type="checkbox"
                    checked={!!settings.enableBloom}
                    onChange={(e) => setSettings({ ...settings, enableBloom: e.target.checked })}
                    className="accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded bg-[#060e1c] border border-border/20 cursor-pointer text-[10px]">
                  <span>Elevation Contour Lines</span>
                  <input
                    type="checkbox"
                    checked={!!settings.elevationContourLines}
                    onChange={(e) => setSettings({ ...settings, elevationContourLines: e.target.checked })}
                    className="accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded bg-[#060e1c] border border-border/20 cursor-pointer text-[10px]">
                  <span>Tile Coordinates (Grid)</span>
                  <input
                    type="checkbox"
                    checked={!!settings.showTileCoordinatesOverlay}
                    onChange={(e) => setSettings({ ...settings, showTileCoordinatesOverlay: e.target.checked })}
                    className="accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between p-2 rounded bg-[#060e1c] border border-border/20 cursor-pointer text-[10px]">
                  <span>Water Shoreline Foam</span>
                  <input
                    type="checkbox"
                    checked={settings.enableWaterShorelineFoam !== false}
                    onChange={(e) => setSettings({ ...settings, enableWaterShorelineFoam: e.target.checked })}
                    className="accent-primary"
                  />
                </label>
              </div>

              {/* Ground Grid Styling */}
              <div className="space-y-2 pt-2 border-t border-border/10">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Ground Grid Style & Opacity</span>
                  <span className="text-primary font-bold">{settings.gridLineOpacity ?? 40}%</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'solid', label: 'Solid Grid' },
                    { id: 'dots', label: 'Dotted Grid' },
                    { id: 'isometric', label: 'Isometric Grid' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, gridLineStyle: g.id as any })}
                      className={`py-1 rounded text-[9.5px] font-bold transition-colors cursor-pointer text-center ${
                        (settings.gridLineStyle || 'solid') === g.id
                          ? 'bg-primary/20 border border-primary text-primary'
                          : 'bg-[#060e1c] border border-border/20 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={settings.gridLineOpacity ?? 40}
                  onChange={(e) => setSettings({ ...settings, gridLineOpacity: parseInt(e.target.value) })}
                  className="w-full accent-primary h-1 cursor-pointer"
                />
              </div>

              {/* Depth of Field (Tilt-Shift Diorama) */}
              <div className="space-y-2 pt-2 border-t border-border/10">
                <label className="flex items-center justify-between p-2 rounded bg-[#060e1c] border border-border/20 cursor-pointer text-[10px]">
                  <div>
                    <div className="font-bold">2.5D Diorama Tilt-Shift (Depth of Field)</div>
                    <div className="text-[8.5px] text-muted-foreground">Blur foreground and background for miniature look</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!settings.enableDepthOfField}
                    onChange={(e) => setSettings({ ...settings, enableDepthOfField: e.target.checked })}
                    className="accent-primary"
                  />
                </label>
                {settings.enableDepthOfField && (
                  <div className="space-y-1 p-2 rounded bg-[#060e1c]/60 border border-border/10">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-muted-foreground">Focal Distance Center</span>
                      <span className="text-primary font-bold">{settings.dofFocusDistance || 20}m</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={40}
                      step={1}
                      value={settings.dofFocusDistance || 20}
                      onChange={(e) => setSettings({ ...settings, dofFocusDistance: parseInt(e.target.value) })}
                      className="w-full accent-primary h-1 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Cinematic Vignette Shadow */}
              <div className="space-y-2 pt-2 border-t border-border/10">
                <label className="flex items-center justify-between p-2 rounded bg-[#060e1c] border border-border/20 cursor-pointer text-[10px]">
                  <div>
                    <div className="font-bold">Cinematic Viewport Vignette</div>
                    <div className="text-[8.5px] text-muted-foreground">Soft shadow gradient around screen edges</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableVignette !== false}
                    onChange={(e) => setSettings({ ...settings, enableVignette: e.target.checked })}
                    className="accent-primary"
                  />
                </label>
                {settings.enableVignette !== false && (
                  <div className="space-y-1 p-2 rounded bg-[#060e1c]/60 border border-border/10">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-muted-foreground">Vignette Edge Intensity</span>
                      <span className="text-primary font-bold">{((settings.vignetteWeight ?? 15) / 10).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={35}
                      step={1}
                      value={settings.vignetteWeight ?? 15}
                      onChange={(e) => setSettings({ ...settings, vignetteWeight: parseInt(e.target.value) })}
                      className="w-full accent-primary h-1 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Color Grading & Tone Palette */}
              <div className="space-y-2 pt-2 border-t border-border/10">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Color Grading & Film Tone</span>
                  <span className="text-primary font-bold uppercase text-[9px]">{settings.colorGradingPreset || 'neutral'}</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: 'neutral', label: 'Neutral', desc: 'True natural palette' },
                    { id: 'warm_amber', label: 'Warm', desc: 'Golden retro glow' },
                    { id: 'cool_emerald', label: 'Emerald', desc: 'Lush forest tones' },
                    { id: 'vivid_retro', label: 'Vivid', desc: 'High saturation vibrancy' },
                    { id: 'classic_sepia', label: 'Sepia', desc: 'Nostalgic parchment tint' },
                  ].map((cg) => (
                    <button
                      key={cg.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, colorGradingPreset: cg.id as any })}
                      title={cg.desc}
                      className={`py-1.5 px-1 rounded text-[8.5px] font-bold transition-colors cursor-pointer text-center truncate ${
                        (settings.colorGradingPreset || 'neutral') === cg.id
                          ? 'bg-primary/20 border border-primary text-primary'
                          : 'bg-[#060e1c] border border-border/20 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3D Ground Items & Footsteps */}
              <div className="space-y-2 pt-2 border-t border-border/10">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  3D Ground Item Drops & Avatar FX
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center justify-between p-2 rounded bg-[#060e1c] border border-border/20 cursor-pointer text-[10px]">
                    <div>
                      <div className="font-bold">3D Floating Ground Items</div>
                      <div className="text-[8.5px] text-muted-foreground">Upright bobbing item drops in 3D world</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enable3DGroundItems !== false}
                      onChange={(e) => setSettings({ ...settings, enable3DGroundItems: e.target.checked })}
                      className="accent-primary"
                    />
                  </label>
                  <label className="flex items-center justify-between p-2 rounded bg-[#060e1c] border border-border/20 cursor-pointer text-[10px]">
                    <div>
                      <div className="font-bold">Avatar Footstep Dust Puffs</div>
                      <div className="text-[8.5px] text-muted-foreground">Particle puffs when walking terrain</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enableFootstepParticles !== false}
                      onChange={(e) => setSettings({ ...settings, enableFootstepParticles: e.target.checked })}
                      className="accent-primary"
                    />
                  </label>
                </div>
                {settings.enable3DGroundItems !== false && (
                  <div className="space-y-1 p-2 rounded bg-[#060e1c]/60 border border-border/10">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-muted-foreground">3D Ground Item Spin Speed</span>
                      <span className="text-primary font-bold">{((settings.groundItemSpinSpeed || 1.5)).toFixed(1)} rad/s</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={Math.round((settings.groundItemSpinSpeed || 1.5) * 10)}
                      onChange={(e) => setSettings({ ...settings, groundItemSpinSpeed: parseInt(e.target.value) / 10 })}
                      className="w-full accent-primary h-1 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── HERO & PLAYER IDENTITY ── */}
        {activeTab === 'heroes' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
              <div className="flex items-center gap-2 text-purple-300 font-bold mb-1">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Player Hero Title & Class Name</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Configure what players/heroes are named in your world. By default, heroes in Saints Gaming MMO are called <strong className="text-amber-300">Saints</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Singular Hero Title (e.g. Saint, Operative, Hero)
                </label>
                <input
                  type="text"
                  value={settings.playerClassName}
                  onChange={(e) => setSettings({ ...settings, playerClassName: e.target.value })}
                  placeholder="Saint"
                  className="w-full bg-[#060e1c] border border-border/30 focus:border-primary rounded-lg p-2 text-foreground text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Plural Hero Title (e.g. Saints, Operatives, Heroes)
                </label>
                <input
                  type="text"
                  value={settings.playerClassNamePlural}
                  onChange={(e) => setSettings({ ...settings, playerClassNamePlural: e.target.value })}
                  placeholder="Saints"
                  className="w-full bg-[#060e1c] border border-border/30 focus:border-primary rounded-lg p-2 text-foreground text-xs outline-none"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/20 space-y-1.5">
              <div className="text-[10px] font-bold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-400" /> Live In-Game Preview
              </div>
              <div className="text-[10px] text-slate-300">
                Character Creation: <span className="text-amber-300 font-bold">Create New {settings.playerClassName || 'Saint'}</span>
              </div>
              <div className="text-[10px] text-slate-300">
                Roster Header: <span className="text-amber-300 font-bold">{settings.playerClassNamePlural?.toUpperCase() || 'SAINTS'} VAULT</span>
              </div>
              <div className="text-[10px] text-slate-300">
                Leaderboard: <span className="text-amber-300 font-bold">Top {settings.playerClassNamePlural || 'Saints'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── SOUL LINK CHAT & COMMS ── */}
        {activeTab === 'comms' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-500/30">
              <div className="flex items-center gap-2 text-teal-300 font-bold mb-1">
                <Radio className="w-3.5 h-3.5 text-teal-400" />
                <span>Soul Link & In-Game Communication</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                By default, the global & local player communication channel is titled <strong className="text-teal-300">Soul Link</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Chat Box Title / Channel Name
                </label>
                <input
                  type="text"
                  value={settings.chatTitle}
                  onChange={(e) => setSettings({ ...settings, chatTitle: e.target.value })}
                  placeholder="Soul Link"
                  className="w-full bg-[#060e1c] border border-border/30 focus:border-teal-400 rounded-lg p-2 text-foreground text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Message of the Day (MOTD)
                </label>
                <textarea
                  rows={3}
                  value={settings.motd}
                  onChange={(e) => setSettings({ ...settings, motd: e.target.value })}
                  placeholder="Welcome to Saints MMO — where spirit captures and heroic battles unfold!"
                  className="w-full bg-[#060e1c] border border-border/30 focus:border-teal-400 rounded-lg p-2 text-foreground text-xs outline-none resize-none"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/20 space-y-2">
              <div className="text-[10px] font-bold text-teal-300 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-teal-400" /> Chat Header Preview
              </div>
              <div className="p-2 rounded bg-black/80 border border-teal-500/30 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-teal-300 text-[10px]">
                  <Radio className="w-3 h-3 text-teal-400" />
                  <span>{settings.chatTitle || 'Soul Link'}</span>
                </div>
                <span className="text-[9px] text-teal-400/60 uppercase">Collapse</span>
              </div>
            </div>
          </div>
        )}

        {/* ── SOULS & CAPTURE MECHANICS ── */}
        {activeTab === 'capture' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-300 font-bold mb-1">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Souls, Spirits & Camera Capture Tools</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Configure the names of collectible beings and the equipment used to capture them. By default, beings are <strong className="text-amber-300">Souls</strong>, captured using <strong className="text-amber-300">Cameras</strong> and <strong className="text-amber-300">Film</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Creature Identity (Singular)
                </label>
                <input
                  type="text"
                  value={settings.creatureIdentity}
                  onChange={(e) => setSettings({ ...settings, creatureIdentity: e.target.value })}
                  placeholder="Soul"
                  className="w-full bg-[#060e1c] border border-border/30 focus:border-primary rounded-lg p-2 text-foreground text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Creature Identity (Plural)
                </label>
                <input
                  type="text"
                  value={settings.creatureIdentityPlural}
                  onChange={(e) => setSettings({ ...settings, creatureIdentityPlural: e.target.value })}
                  placeholder="Souls"
                  className="w-full bg-[#060e1c] border border-border/30 focus:border-primary rounded-lg p-2 text-foreground text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Capture Device Name
                </label>
                <input
                  type="text"
                  value={settings.captureToolName}
                  onChange={(e) => setSettings({ ...settings, captureToolName: e.target.value })}
                  placeholder="Camera"
                  className="w-full bg-[#060e1c] border border-border/30 focus:border-primary rounded-lg p-2 text-foreground text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Capture Ammo / Item Name
                </label>
                <input
                  type="text"
                  value={settings.captureAmmoName}
                  onChange={(e) => setSettings({ ...settings, captureAmmoName: e.target.value })}
                  placeholder="Film"
                  className="w-full bg-[#060e1c] border border-border/30 focus:border-primary rounded-lg p-2 text-foreground text-xs outline-none"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/20 space-y-1.5">
              <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" /> Encounter Dialogue Preview
              </div>
              <p className="text-[10px] text-slate-300 italic bg-white/5 p-2 rounded">
                &ldquo;A wild {settings.creatureIdentity || 'Soul'} appeared! You aim your {settings.captureToolName || 'Camera'}, load {settings.captureAmmoName || 'Film'}, and capture the wild {settings.creatureIdentity || 'Soul'}!&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* ── REALM INFO & DEPLOYMENT ── */}
        {activeTab === 'realm' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30">
              <div className="flex items-center gap-2 text-blue-300 font-bold mb-1">
                <Globe2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Realm Identity & Showcase</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Configure your game realm name and tagline displayed on the home page showcase card.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Realm / Game Name
                </label>
                <input
                  type="text"
                  value={settings.realmName}
                  onChange={(e) => setSettings({ ...settings, realmName: e.target.value })}
                  placeholder="The Lobby"
                  className="w-full bg-[#060e1c] border border-border/30 focus:border-blue-400 rounded-lg p-2 text-foreground text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Game Description / Tagline
                </label>
                <textarea
                  rows={3}
                  value={settings.realmDescription}
                  onChange={(e) => setSettings({ ...settings, realmDescription: e.target.value })}
                  placeholder="The Lobby ~ Socialize, Battle, Capture, Explore! ~ Coming Soon ~"
                  className="w-full bg-[#060e1c] border border-border/30 focus:border-blue-400 rounded-lg p-2 text-foreground text-xs outline-none resize-none"
                />
              </div>

              {/* Spawn / Lobby Map Selector */}
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="flex items-center gap-2 text-emerald-300 font-bold mb-1">
                  <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Spawn Hub Map</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
                  The map where new players spawn and where players return as a fallback. This map cannot be deleted while it is the active spawn hub.
                </p>
                <select
                  value={settings.spawnMapId || 'DEMO_SANDBOX'}
                  onChange={(e) => setSettings({ ...settings, spawnMapId: e.target.value })}
                  className="w-full bg-[#060e1c] border border-emerald-500/30 focus:border-emerald-400 rounded-lg p-2 text-foreground text-xs outline-none cursor-pointer"
                >
                  {(availableMaps || []).map((m: MapIndexEntry) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.id} ({m.id})
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 text-[9px] text-muted-foreground">
                  Current spawn hub: <span className="text-emerald-300 font-bold">{settings.spawnMapId || 'DEMO_SANDBOX'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-border/20">
                <div>
                  <div className="text-xs font-bold text-foreground">Allow Guest Access</div>
                  <div className="text-[10px] text-muted-foreground">Allow unregistered visitors to explore the world as guests.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowGuestAccess !== false}
                  onChange={(e) => setSettings({ ...settings, allowGuestAccess: e.target.checked })}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
