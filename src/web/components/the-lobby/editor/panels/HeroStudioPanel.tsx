'use client';

import React, { useState } from 'react';
import { Shield, Sparkles, User, Sword, Backpack } from 'lucide-react';
import { useGameStore } from '../../store';
import {
  WindowMenuBar,
  WindowMenuTabGroup,
  WindowMenuDivider,
} from '../WindowMenuBar';
import { DEFAULT_REALM_SETTINGS, RealmSettingsConfig } from '@/shared/game/realmSettings';

export const HeroStudioPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'identity' | 'classes' | 'loadout'>('identity');
  const [settings, setSettings] = useState<RealmSettingsConfig>(DEFAULT_REALM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/realm/settings');
        if (res.ok) {
          const data = await res.json();
          if (data?.settings) {
            setSettings({ ...DEFAULT_REALM_SETTINGS, ...data.settings });
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await fetch('/api/realm/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#050b14]/90 font-mono -m-3 mb-0">
      <WindowMenuBar>
        <WindowMenuTabGroup
          tabs={[
            { id: 'identity', label: 'Identity', icon: Shield },
            { id: 'classes', label: 'Classes', icon: Sword },
            { id: 'loadout', label: 'Starter Loadout', icon: Backpack },
          ]}
          activeTab={activeTab}
          onChange={(id: string) => setActiveTab(id as any)}
        />
        <WindowMenuDivider />
        <div className="flex-1" />
        <span className="text-[9px] text-muted-foreground font-mono">
          Hero Studio
        </span>
      </WindowMenuBar>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* ── HERO IDENTITY ── */}
        {activeTab === 'identity' && (
          <div className="space-y-4 max-w-2xl">
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
                  value={settings.playerClassName || ''}
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
                  value={settings.playerClassNamePlural || ''}
                  onChange={(e) => setSettings({ ...settings, playerClassNamePlural: e.target.value })}
                  placeholder="Saints"
                  className="w-full bg-[#060e1c] border border-border/30 focus:border-primary rounded-lg p-2 text-foreground text-xs outline-none"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-3 rounded-xl bg-black/40 border border-border/20 space-y-1.5 mt-4">
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
            
            <div className="pt-2 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving || loading}
                className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 font-bold text-xs transition-colors"
              >
                {saving ? 'Saving...' : 'Save Identity'}
              </button>
            </div>
          </div>
        )}

        {/* ── CLASSES ── */}
        {activeTab === 'classes' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 pt-12">
            <Sword className="w-8 h-8 opacity-20" />
            <div className="text-xs">Class editor coming soon...</div>
          </div>
        )}

        {/* ── LOADOUT ── */}
        {activeTab === 'loadout' && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3 pt-12">
            <Backpack className="w-8 h-8 opacity-20" />
            <div className="text-xs">Starter loadout editor coming soon...</div>
          </div>
        )}
      </div>
    </div>
  );
};
