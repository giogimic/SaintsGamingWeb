'use client';

import React, { useState, useEffect } from 'react';
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
  Users,
} from 'lucide-react';
import {
  DEFAULT_REALM_SETTINGS,
  RealmSettingsConfig,
} from '@/shared/game/realmSettings';

export function RealmSettingsPanel() {
  const [settings, setSettings] = useState<RealmSettingsConfig>(DEFAULT_REALM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'heroes' | 'comms' | 'capture' | 'realm'>('heroes');

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
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all server & realm identity settings to defaults?')) {
      setSettings(DEFAULT_REALM_SETTINGS);
      setStatusMessage({ type: 'success', text: 'Reset to canonical defaults. Click Save to persist.' });
    }
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

  return (
    <div className="flex flex-col h-full bg-[#050b14]/95 text-slate-200 font-mono text-xs overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between p-3 border-b border-amber-500/20 bg-black/40 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">Server & Game Settings</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] transition cursor-pointer"
            title="Reset to canonical defaults (Saint/Soul Link/Soul/Camera)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1 rounded bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold text-[10px] uppercase tracking-wider shadow transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

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
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 bg-[#070e1a]/80 p-1 gap-1 text-[11px] shrink-0">
        {[
          { id: 'heroes', label: 'Hero Identity', icon: Shield },
          { id: 'comms', label: 'Soul Link Chat', icon: Radio },
          { id: 'capture', label: 'Souls & Cameras', icon: Camera },
          { id: 'realm', label: 'Realm Info', icon: Globe2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ── HERO & PLAYER IDENTITY ── */}
        {activeTab === 'heroes' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
              <div className="flex items-center gap-2 text-purple-300 font-bold mb-1">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span>Player Hero Title & Class Name</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Configure what players/heroes are named in your world. By default, heroes in Saints Gaming MMO are called <strong className="text-amber-300">Saints</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Singular Hero Title (e.g. Saint, Operative, Hero)
                </label>
                <input
                  type="text"
                  value={settings.playerClassName}
                  onChange={(e) => setSettings({ ...settings, playerClassName: e.target.value })}
                  placeholder="Saint"
                  className="w-full bg-black/60 border border-slate-700 focus:border-amber-400 rounded-lg p-2 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Plural Hero Title (e.g. Saints, Operatives, Heroes)
                </label>
                <input
                  type="text"
                  value={settings.playerClassNamePlural}
                  onChange={(e) => setSettings({ ...settings, playerClassNamePlural: e.target.value })}
                  placeholder="Saints"
                  className="w-full bg-black/60 border border-slate-700 focus:border-amber-400 rounded-lg p-2 text-white text-xs outline-none"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 rounded-xl bg-black/60 border border-slate-800 space-y-1.5">
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
              <p className="text-[10px] text-slate-400 leading-relaxed">
                By default, the global & local player communication channel is titled <strong className="text-teal-300">Soul Link</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Chat Box Title / Channel Name
                </label>
                <input
                  type="text"
                  value={settings.chatTitle}
                  onChange={(e) => setSettings({ ...settings, chatTitle: e.target.value })}
                  placeholder="Soul Link"
                  className="w-full bg-black/60 border border-slate-700 focus:border-teal-400 rounded-lg p-2 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Message of the Day (MOTD)
                </label>
                <textarea
                  rows={3}
                  value={settings.motd}
                  onChange={(e) => setSettings({ ...settings, motd: e.target.value })}
                  placeholder="Welcome to Saints MMO — where spirit captures and heroic battles unfold!"
                  className="w-full bg-black/60 border border-slate-700 focus:border-teal-400 rounded-lg p-2 text-white text-xs outline-none resize-none"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 rounded-xl bg-black/60 border border-slate-800 space-y-2">
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
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Configure the names of collectible beings and the equipment used to capture them. By default, beings are <strong className="text-amber-300">Souls</strong>, captured using <strong className="text-amber-300">Cameras</strong> and <strong className="text-amber-300">Film</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Creature Identity (Singular)
                </label>
                <input
                  type="text"
                  value={settings.creatureIdentity}
                  onChange={(e) => setSettings({ ...settings, creatureIdentity: e.target.value })}
                  placeholder="Soul"
                  className="w-full bg-black/60 border border-slate-700 focus:border-amber-400 rounded-lg p-2 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Creature Identity (Plural)
                </label>
                <input
                  type="text"
                  value={settings.creatureIdentityPlural}
                  onChange={(e) => setSettings({ ...settings, creatureIdentityPlural: e.target.value })}
                  placeholder="Souls"
                  className="w-full bg-black/60 border border-slate-700 focus:border-amber-400 rounded-lg p-2 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Capture Device Name
                </label>
                <input
                  type="text"
                  value={settings.captureToolName}
                  onChange={(e) => setSettings({ ...settings, captureToolName: e.target.value })}
                  placeholder="Camera"
                  className="w-full bg-black/60 border border-slate-700 focus:border-amber-400 rounded-lg p-2 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Capture Ammo / Item Name
                </label>
                <input
                  type="text"
                  value={settings.captureAmmoName}
                  onChange={(e) => setSettings({ ...settings, captureAmmoName: e.target.value })}
                  placeholder="Film"
                  className="w-full bg-black/60 border border-slate-700 focus:border-amber-400 rounded-lg p-2 text-white text-xs outline-none"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 rounded-xl bg-black/60 border border-slate-800 space-y-1.5">
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
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Configure your game realm name and tagline displayed on the home page showcase card.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Realm / Game Name
                </label>
                <input
                  type="text"
                  value={settings.realmName}
                  onChange={(e) => setSettings({ ...settings, realmName: e.target.value })}
                  placeholder="The Lobby"
                  className="w-full bg-black/60 border border-slate-700 focus:border-blue-400 rounded-lg p-2 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Game Description / Tagline
                </label>
                <textarea
                  rows={3}
                  value={settings.realmDescription}
                  onChange={(e) => setSettings({ ...settings, realmDescription: e.target.value })}
                  placeholder="The Lobby ~ Socialize, Battle, Capture, Explore! ~ Coming Soon ~"
                  className="w-full bg-black/60 border border-slate-700 focus:border-blue-400 rounded-lg p-2 text-white text-xs outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white">Allow Guest Access</div>
                  <div className="text-[10px] text-slate-400">Allow unregistered visitors to explore the world as guests.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowGuestAccess !== false}
                  onChange={(e) => setSettings({ ...settings, allowGuestAccess: e.target.checked })}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
