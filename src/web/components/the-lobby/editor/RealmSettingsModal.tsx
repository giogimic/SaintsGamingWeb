'use client';

import React, { useState, useEffect } from 'react';
import { X, Globe, Save } from 'lucide-react';
import { useGameStore } from '../store';
import { DEFAULT_REALM_SETTINGS, getPlayerClassName, type RealmSettingsConfig } from '@/shared/game/realmSettings';

interface RealmSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RealmSettingsModal: React.FC<RealmSettingsModalProps> = ({ isOpen, onClose }) => {
  const showToast = useGameStore((s) => s.showToast);

  const [settings, setSettings] = useState<RealmSettingsConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('saints.realmSettings');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_REALM_SETTINGS;
  });

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('saints.realmSettings');
        if (saved) setSettings(JSON.parse(saved));
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const cleanSettings: RealmSettingsConfig = {
      playerClassName: getPlayerClassName(settings.playerClassName),
      realmName: settings.realmName?.trim() || DEFAULT_REALM_SETTINGS.realmName,
      motd: settings.motd?.trim() || DEFAULT_REALM_SETTINGS.motd,
      allowGuestAccess: settings.allowGuestAccess ?? true,
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('saints.realmSettings', JSON.stringify(cleanSettings));
    }
    setSettings(cleanSettings);
    showToast(`Realm settings saved! Player identity: ${cleanSettings.playerClassName}`);
    onClose();
  };

  const PRESET_IDENTITIES = ['Saint', 'Tamer', 'Operative', 'Hero', 'Hunter', 'Adventurer'];

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/80 backdrop-blur-md pointer-events-auto animate-in fade-in duration-200">
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6">
      <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] rounded-2xl border border-amber-500/40 bg-[#070e1b] p-6 shadow-2xl space-y-6 text-slate-200 font-sans overflow-y-auto sm:max-h-[calc(100vh-3rem)]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Realm & Identity Settings
              </h2>
              <p className="text-xs text-slate-400">Configure global world names and player conventions.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Player Class / Identity Name */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
              Player Identity Name (Default: Saint)
            </label>
            <p className="text-[11px] text-slate-400 leading-snug">
              The canonical title given to human players in this world (e.g. &ldquo;Saint&rdquo;, &ldquo;Tamer&rdquo;, &ldquo;Operative&rdquo;).
            </p>
            <input
              type="text"
              value={settings.playerClassName}
              onChange={(e) => setSettings({ ...settings, playerClassName: e.target.value })}
              placeholder="Saint"
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-slate-700 focus:border-amber-500 focus:outline-none text-white font-mono text-sm"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_IDENTITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSettings({ ...settings, playerClassName: p })}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                    settings.playerClassName === p
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                      : 'bg-black/40 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Realm Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Realm Display Name
            </label>
            <input
              type="text"
              value={settings.realmName}
              onChange={(e) => setSettings({ ...settings, realmName: e.target.value })}
              placeholder="Saints Realm"
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-slate-700 focus:border-amber-500 focus:outline-none text-white font-mono text-sm"
            />
          </div>

          {/* MOTD */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Message of the Day (MOTD)
            </label>
            <textarea
              rows={2}
              value={settings.motd}
              onChange={(e) => setSettings({ ...settings, motd: e.target.value })}
              placeholder="Welcome to Saints MMO!"
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-slate-700 focus:border-amber-500 focus:outline-none text-white font-mono text-xs resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Realm Settings
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};
