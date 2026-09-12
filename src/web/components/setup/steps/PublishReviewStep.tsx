'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Gamepad2,
  Compass,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import type { GameDefinitionData } from './GameIdentityStep';
import type { SetupStartingMapData } from './StartingMapStep';

interface PublishReviewStepProps {
  gameDefinition: GameDefinitionData;
  startingMap: SetupStartingMapData;
  onBack: () => void;
  onCompleteSuccess: (defaultMapId: string) => void;
}

export function PublishReviewStep({
  gameDefinition,
  startingMap,
  onBack,
  onCompleteSuccess,
}: PublishReviewStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [persistedMapId, setPersistedMapId] = useState('STARTING_MEADOW');

  const handlePublishTransaction = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      // The new Coordinated Transaction endpoint:
      // Validates that drafts exist, validates the world artifact, and promotes everything to live.
      const payload = {
        bootstrapRevisionId: startingMap.bootstrapRevisionId,
        gameId: 'saints', // Using default canonical Game ID for initialization
        game: {
          name: gameDefinition.name,
          description: gameDefinition.description,
          genre: gameDefinition.genre,
        },
        startingMap: {
          id: startingMap.id || 'STARTING_MEADOW',
          name: startingMap.name || 'Starting Realm',
          spawnPoint: startingMap.spawnPoint,
          gates: startingMap.gates,
        },
      };

      const res = await fetch('/api/setup/initialize-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Validation failed. Drafts not published.');
      }

      setCompleted(true);
      const defaultId = data.startingMapId || startingMap.id || 'STARTING_MEADOW';
      setPersistedMapId(defaultId);

      setTimeout(() => {
        onCompleteSuccess(defaultId);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during final validation and publish.');
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="text-center py-10 space-y-4 font-mono">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-white uppercase tracking-widest sg-text-gradient">
          Initial World Published!
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Coordinated transaction successful. Drafts promoted to live. Redirecting to Saints Studio...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            4. Final Review & Publish
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Validate draft assets, world artifacts, and publish immutable initial revision.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Game Identity Summary */}
        <div className="p-4 rounded-xl bg-[#070e1b] border border-slate-800/80">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-3 flex items-center gap-2">
            <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
            Game Identity
          </h3>
          <div className="space-y-2">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-mono">Title</span>
              <span className="text-sm font-bold text-white">{gameDefinition.name}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-mono">Description</span>
              <span className="text-xs text-slate-300 line-clamp-2">{gameDefinition.description}</span>
            </div>
          </div>
        </div>

        {/* World Generation Summary */}
        <div className="p-4 rounded-xl bg-[#070e1b] border border-slate-800/80">
          <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-3 flex items-center gap-2">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            World Artifact
          </h3>
          <div className="space-y-2">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-mono">Revision ID</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 break-all">
                {startingMap.bootstrapRevisionId || 'PENDING'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-mono">Base Map</span>
              <span className="text-xs text-white">{startingMap.name} (Valid Spawn)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-sm text-emerald-100 flex gap-3">
        <Shield className="w-6 h-6 text-emerald-400 shrink-0" />
        <div>
          <strong className="block text-emerald-300 mb-1 font-mono uppercase tracking-widest text-[11px]">Coordinated Transaction Ready</strong>
          <span className="text-xs text-emerald-200/80 leading-relaxed">
            Publishing will validate that the generated terrain is non-flat, your actor drafts exist, and the starting spawn is valid. 
            If any validation checks fail, the game state will remain as draft and will not be promoted to live.
          </span>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="flex items-center justify-between pt-6 border-t border-border/40">
        <button
          onClick={onBack}
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <button
          onClick={handlePublishTransaction}
          disabled={submitting || !startingMap.bootstrapRevisionId}
          className="px-6 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Validating & Publishing...
            </>
          ) : (
            <>
              Publish Immutable Revision
              <CheckCircle2 className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
