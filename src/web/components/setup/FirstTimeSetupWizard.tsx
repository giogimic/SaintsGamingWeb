'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Compass,
  Layers,
  Wrench,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Globe2,
  Boxes,
  ShieldAlert,
  FolderOpen,
  Gamepad2,
  Sparkle,
  Hammer,
  Package,
  CheckSquare,
  Square,
  SkipForward,
} from 'lucide-react';
import type { StarterPackMeta } from '@/shared/game/setup/prepackagedPacks';
import type { SetupStatus } from '@/shared/game/setup/setupDetection';

interface AssetPackItem {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedCount: number;
  badge?: string;
  recommended?: boolean;
}

export function FirstTimeSetupWizard() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [availablePacks, setAvailablePacks] = useState<StarterPackMeta[]>([]);
  const [availableAssetPacks, setAvailableAssetPacks] = useState<AssetPackItem[]>([]);
  const [selectedAssetPackIds, setSelectedAssetPackIds] = useState<string[]>(['tilesets', 'creatures', 'npc']);
  const [canSetup, setCanSetup] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);

  // Form State
  const [realmName, setRealmName] = useState('Saints Realm');
  const [selectedPackId, setSelectedPackId] = useState('saints-community-starter');
  const [importingWorld, setImportingWorld] = useState(false);
  const [importingAssets, setImportingAssets] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string; assetCount?: number } | null>(null);
  const [completing, setCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch initial setup status and asset packs
  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const [statusRes, assetsRes] = await Promise.all([
          fetch('/api/setup/status'),
          fetch('/api/setup/assets').catch(() => null),
        ]);
        if (!statusRes.ok) throw new Error('Failed to load setup status');
        const data = await statusRes.json();
        setSetupStatus(data.status);
        setAvailablePacks(data.availablePacks || []);
        setCanSetup(data.canSetup);
        setAuthenticatedUser(data.authenticatedUser);
        if (data.status?.realmName) {
          setRealmName(data.status.realmName);
        }

        if (assetsRes && assetsRes.ok) {
          const assetsData = await assetsRes.json();
          if (assetsData.packs) {
            setAvailableAssetPacks(assetsData.packs);
          }
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error checking server state');
      } finally {
        setLoading(false);
      }
    }
    void fetchStatus();
  }, []);

  const handleImportWorldPack = async () => {
    try {
      setImportingWorld(true);
      setErrorMessage(null);
      const res = await fetch('/api/setup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: selectedPackId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import pack');
      setImportResult({ success: true, message: data.message });
      setStep(3);
    } catch (err: any) {
      setErrorMessage(err.message || 'World bundle import failed');
    } finally {
      setImportingWorld(false);
    }
  };

  const handleToggleAssetPack = (packId: string) => {
    setSelectedAssetPackIds((prev) =>
      prev.includes(packId) ? prev.filter((id) => id !== packId) : [...prev, packId]
    );
  };

  const handleImportAssetPacks = async () => {
    if (selectedAssetPackIds.length === 0) {
      setStep(4);
      return;
    }
    try {
      setImportingAssets(true);
      setErrorMessage(null);
      const res = await fetch('/api/setup/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packIds: selectedAssetPackIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to install asset packs');
      setImportResult((prev) => ({
        success: true,
        message: prev?.message || 'Setup initialized',
        assetCount: data.installedCount,
      }));
      setStep(4);
    } catch (err: any) {
      setErrorMessage(err.message || 'Asset installation failed');
    } finally {
      setImportingAssets(false);
    }
  };

  const handleCompleteSetup = async (targetRoute: '/studio' | '/lobby') => {
    try {
      setCompleting(true);
      setErrorMessage(null);
      const res = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ realmName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to finalize setup');
      router.push(targetRoute);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete setup');
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6">
        <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white tracking-wide">Connecting to Saints Realm Core...</h2>
        <p className="text-sm text-slate-400 mt-2">Checking database schema and fresh install state</p>
      </div>
    );
  }

  if (!canSetup && setupStatus?.userCount && setupStatus.userCount > 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-2xl p-8 text-center backdrop-blur-xl shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Administrator Access Required</h2>
          <p className="text-sm text-slate-300 mb-6">
            The First-Time Realm Setup Wizard is restricted to server administrators and world developers.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition cursor-pointer"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/60 via-slate-900/80 to-amber-950/40 border border-purple-500/20 p-8 md:p-10 mb-8 backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Fresh Installation Setup
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Saints Realm <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">First-Time Setup</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl">
              Welcome to the Saints Gaming MMO platform. Configure realm identity, starter content, and bundled asset libraries.
            </p>
          </div>

          {/* STEP INDICATOR */}
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-2xl">
            {[
              { num: 1, label: 'Identity' },
              { num: 2, label: 'Maps' },
              { num: 3, label: 'Assets' },
              { num: 4, label: 'Launch' },
            ].map(({ num, label }) => (
              <div key={num} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    step === num
                      ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/20 scale-105'
                      : step > num
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                  title={label}
                >
                  {step > num ? <CheckCircle2 className="w-4 h-4" /> : num}
                </div>
                {num < 4 && <div className={`w-3 h-0.5 ${step > num ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: REALM IDENTITY */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Globe2 className="w-5 h-5 text-amber-400" />
              1. Realm Configuration & Identity
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Name your realm. This title will appear on the server select screen, navigation bar, and world documents.
            </p>

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Realm / Community Name
                </label>
                <input
                  type="text"
                  value={realmName}
                  onChange={(e) => setRealmName(e.target.value)}
                  placeholder="e.g. Saints Realm, Aethervale MMO"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-white text-base outline-none transition"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="text-slate-300 font-semibold flex items-center gap-2">
                  <Sparkle className="w-3.5 h-3.5 text-amber-400" />
                  Database State
                </div>
                <div>World Maps in DB: <span className="text-amber-300 font-mono">{setupStatus?.mapCount ?? 0} {setupStatus?.mapCount === 0 ? '(Clean Canvas)' : 'Active Maps'}</span></div>
                <div>Admin Session: <span className="text-emerald-300 font-mono">{authenticatedUser?.username || 'Owner'}</span></div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!realmName.trim()}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              Continue to World Selection
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: STARTER WORLD BUNDLE */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-400" />
                2. Select Starter World Bundle
              </h2>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Back to Identity
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Choose how you want to initialize your world. You can import the full official 8-map starter pack or start with a 100% clean canvas for custom level design in Studio.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availablePacks.map((pack) => {
                const isSelected = selectedPackId === pack.id;
                return (
                  <div
                    key={pack.id}
                    onClick={() => setSelectedPackId(pack.id)}
                    className={`relative cursor-pointer rounded-2xl p-6 border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-950/30 border-amber-400 ring-2 ring-amber-400/20 shadow-xl'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {pack.badge && (
                      <span
                        className={`absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          pack.recommended
                            ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300'
                            : 'bg-slate-800 border border-slate-700 text-slate-400'
                        }`}
                      >
                        {pack.badge}
                      </span>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {pack.id === 'blank-canvas' ? (
                            <Layers className="w-5 h-5" />
                          ) : (
                            <Compass className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">{pack.name}</h3>
                          <div className="text-xs text-amber-300/80">{pack.tagline}</div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">{pack.description}</p>

                      <div className="space-y-1.5 pt-2">
                        {pack.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Pre-built Maps: <strong className="text-white">{pack.mapCount}</strong></span>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400 text-slate-950'
                            : 'border-slate-700'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 rounded-xl text-slate-400 hover:text-white transition text-sm font-semibold cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleImportWorldPack}
              disabled={importingWorld}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {importingWorld ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing Maps...
                </>
              ) : (
                <>
                  Continue to Asset Packs
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ASSET PACK SELECTION (Phase 7B Fresh Install Asset Import) */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                3. Bundled Asset Libraries
              </h2>
              <button
                onClick={() => setStep(2)}
                className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Back to World Bundle
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Select which bundled graphic assets to register into your realm database. You can install all packs now or add/upload custom assets later in Studio Asset Browser.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(availableAssetPacks.length > 0 ? availableAssetPacks : [
                { id: 'tilesets', name: 'Core Tilesets', description: '79 terrain, building, indoor/outdoor tilesets', category: 'environment', estimatedCount: 79, badge: 'Core', recommended: true },
                { id: 'creatures', name: 'Creature Battle Sheets', description: '413 Tuxemon battle spritesheets and forms', category: 'monster', estimatedCount: 413, badge: 'Creatures', recommended: true },
                { id: 'portraits', name: 'Creature Portraits', description: '~600 face, front, and back battle poses', category: 'monster', estimatedCount: 600 },
                { id: 'npc', name: 'NPC Walk Cycles (LPC)', description: '221 NPC character sprites & walk cycles', category: 'character', estimatedCount: 221, badge: 'Characters', recommended: true },
                { id: 'heroes', name: 'Hero Walk Cycles', description: '357 player operative character sprites', category: 'character', estimatedCount: 357 },
                { id: 'items', name: 'Item & Inventory Icons', description: '177 potion, berry, badge, tool icons', category: 'item', estimatedCount: 177 },
                { id: 'objects', name: 'Props & Objects', description: '24 boulders, signs, chests, interactive props', category: 'object', estimatedCount: 24 },
                { id: 'ui', name: 'Interface & Combat UI', description: '~50 combat, menu, and dialog UI assets', category: 'ui', estimatedCount: 50 },
              ]).map((pack) => {
                const isSelected = selectedAssetPackIds.includes(pack.id);
                return (
                  <div
                    key={pack.id}
                    onClick={() => handleToggleAssetPack(pack.id)}
                    className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between select-none ${
                      isSelected
                        ? 'bg-amber-950/20 border-amber-400/80 ring-1 ring-amber-400/30'
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                          <span className="font-bold text-white text-sm">{pack.name}</span>
                        </div>
                        {pack.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            {pack.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{pack.description}</p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Category: <strong className="text-slate-300 uppercase">{pack.category}</strong></span>
                      <span className="font-mono text-amber-300">~{pack.estimatedCount} assets</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-slate-400 hover:text-white transition text-sm font-semibold cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
              Skip Asset Installation
            </button>
            <button
              onClick={handleImportAssetPacks}
              disabled={importingAssets}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              {importingAssets ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Installing Selected Assets...
                </>
              ) : (
                <>
                  Install Selected Assets ({selectedAssetPackIds.length})
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: COMPLETION & LAUNCH */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 md:p-10 backdrop-blur-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Setup Complete & Realm Initialized!</h2>
              <p className="text-sm text-slate-300 max-w-lg mx-auto">
                {importResult?.message || 'Your realm is now configured and ready for world building and gameplay.'}
                {importResult?.assetCount ? ` Registered ${importResult.assetCount} assets.` : ''}
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Realm Title:</span>
                <span className="text-white font-semibold">{realmName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Selected Bundle:</span>
                <span className="text-amber-300 font-semibold">
                  {selectedPackId === 'blank-canvas' ? 'Clean Canvas (0 Maps)' : 'Saints Official Starter (8 Maps)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Installed Asset Packs:</span>
                <span className="text-emerald-300 font-semibold">
                  {selectedAssetPackIds.length > 0 ? `${selectedAssetPackIds.length} Packs Configured` : 'Custom / Deferred'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recommended Next Step:</span>
                <span className="text-amber-300 font-semibold">Open Studio to Design & Edit</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleCompleteSetup('/studio')}
                disabled={completing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-xl shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
              >
                {completing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Hammer className="w-4 h-4" />
                )}
                Launch World Studio (Recommended)
              </button>

              <button
                onClick={() => handleCompleteSetup('/lobby')}
                disabled={completing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50 cursor-pointer"
              >
                <Gamepad2 className="w-4 h-4 text-purple-400" />
                Enter Multiplayer Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

