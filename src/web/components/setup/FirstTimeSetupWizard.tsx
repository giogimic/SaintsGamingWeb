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
} from 'lucide-react';
import type { StarterPackMeta } from '@/shared/game/setup/prepackagedPacks';
import type { SetupStatus } from '@/shared/game/setup/setupDetection';

export function FirstTimeSetupWizard() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [availablePacks, setAvailablePacks] = useState<StarterPackMeta[]>([]);
  const [canSetup, setCanSetup] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);

  // Form State
  const [realmName, setRealmName] = useState('Saints Realm');
  const [selectedPackId, setSelectedPackId] = useState('saints-community-starter');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [completing, setCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch initial setup status
  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const res = await fetch('/api/setup/status');
        if (!res.ok) throw new Error('Failed to load setup status');
        const data = await res.json();
        setSetupStatus(data.status);
        setAvailablePacks(data.availablePacks || []);
        setCanSetup(data.canSetup);
        setAuthenticatedUser(data.authenticatedUser);
        if (data.status?.realmName) {
          setRealmName(data.status.realmName);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Error checking server state');
      } finally {
        setLoading(false);
      }
    }
    void fetchStatus();
  }, []);

  const handleImportPack = async () => {
    try {
      setImporting(true);
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
      setErrorMessage(err.message || 'Import failed');
    } finally {
      setImporting(false);
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
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition"
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
              Fresh Installation Detected
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Saints Realm <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">First-Time Setup</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl">
              Welcome to the Saints Gaming MMO platform. Configure your server identity, choose your initial starter bundle, and jump into Studio to start building.
            </p>
          </div>

          {/* STEP INDICATOR */}
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-2xl">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    step === s
                      ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/20 scale-105'
                      : step > s
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`w-4 h-0.5 ${step > s ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />}
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
                  Pristine Database State
                </div>
                <div>World Maps in DB: <span className="text-amber-300 font-mono">0 (Clean)</span></div>
                <div>Admin Session: <span className="text-emerald-300 font-mono">{authenticatedUser?.username || 'Owner'}</span></div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!realmName.trim()}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              Continue to Content Selection
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: STARTER PACK SELECTION */}
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
                className="text-xs text-slate-400 hover:text-white transition"
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
              className="px-6 py-3 rounded-xl text-slate-400 hover:text-white transition text-sm font-semibold"
            >
              Back
            </button>
            <button
              onClick={handleImportPack}
              disabled={importing}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing Bundle...
                </>
              ) : (
                <>
                  {selectedPackId === 'blank-canvas' ? 'Setup Clean Realm' : 'Import Selected Bundle'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: COMPLETION & LAUNCH */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 md:p-10 backdrop-blur-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Setup Complete & Realm Initialized!</h2>
              <p className="text-sm text-slate-300 max-w-lg mx-auto">
                {importResult?.message || 'Your realm is now configured and ready for world building and gameplay.'}
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
                <span className="text-slate-400">Next Step:</span>
                <span className="text-emerald-300 font-semibold">Open Studio to Design & Edit</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleCompleteSetup('/studio')}
                disabled={completing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-slate-950 bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 shadow-xl shadow-amber-500/20 transition disabled:opacity-50"
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50"
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
