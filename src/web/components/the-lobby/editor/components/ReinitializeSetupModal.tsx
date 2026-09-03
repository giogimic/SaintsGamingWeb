'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Gamepad2,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Shield,
} from 'lucide-react';

interface ReinitializeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReinitializeSetupModal: React.FC<ReinitializeSetupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [step, setStep] = useState<'choose' | 'confirm_wipe'>('choose');
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [wipeError, setWipeError] = useState<string | null>(null);

  // Reset state whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep('choose');
      setWipeConfirmInput('');
      setIsWiping(false);
      setWipeError(null);
    }
  }, [isOpen]);

  // Close on Escape key when not wiping
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isWiping) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isWiping, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleKeepAndSetup = () => {
    onClose();
    window.location.href = '/setup';
  };

  const handleExecuteWipe = async () => {
    if (wipeConfirmInput.trim().toUpperCase() !== 'WIPE') return;
    setIsWiping(true);
    setWipeError(null);

    try {
      const res = await fetch('/api/setup/wipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to wipe realm');
      }

      // Successfully wiped non-bundled content; redirect to fresh setup
      window.location.href = '/setup';
    } catch (err: any) {
      setWipeError(err?.message || 'Failed to wipe non-bundled realm content');
      setIsWiping(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150 font-mono select-none">
      <div className="w-full max-w-lg rounded-2xl border border-primary/40 bg-[#050b14] shadow-[0_16px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col">
        
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-primary/15 via-[#0a1628] to-[#050b14] border-b border-primary/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/20 text-primary border border-primary/40 shrink-0">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 truncate">
                Re-Initialize Realm Setup
              </h2>
              <p className="text-[10px] text-muted-foreground truncate">
                Configure game engine options or wipe non-bundled content
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isWiping}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        {step === 'choose' ? (
          <div className="p-5 space-y-3.5 text-xs">
            <p className="text-slate-300 text-[11px] leading-relaxed">
              How would you like to re-initialize game setup? You can re-run the configuration wizard while keeping all existing content, or wipe everything that isn&apos;t bundled to start completely fresh.
            </p>

            {/* Option 1: Re-Setup (Keep Content) */}
            <div
              onClick={handleKeepAndSetup}
              className="group p-4 rounded-xl border border-border/60 bg-[#07111e]/90 hover:border-primary/70 hover:bg-primary/5 transition-all cursor-pointer space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100 group-hover:text-amber-300 flex items-center gap-2 text-xs">
                  <RefreshCw className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
                  Re-Setup (Keep Content)
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Preserve Data
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Keep all your authored maps, custom characters, creature pools, and uploaded assets. Opens the setup wizard so you can adjust engine parameters, change default camera, or add starter packs.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[10px] text-emerald-400/90 font-semibold">
                <CheckCircle2 className="w-3 h-3" />
                <span>Existing maps &amp; character progression remain untouched</span>
              </div>
            </div>

            {/* Option 2: Wipe & Fresh Setup */}
            <div
              onClick={() => setStep('confirm_wipe')}
              className="group p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 hover:border-rose-500/60 hover:bg-rose-950/35 transition-all cursor-pointer space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-300 group-hover:text-rose-200 flex items-center gap-2 text-xs">
                  <Trash2 className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                  Wipe &amp; Fresh Setup
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Destructive
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Wipe everything that isn&apos;t bundled with the engine (all custom maps, custom characters, map versions, and sync logs). Returns you to a clean setup canvas.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[10px] text-amber-400/90">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>Your Admin user account and bundled foundation (DEMO_SANDBOX) are preserved</span>
              </div>
            </div>
          </div>
        ) : (
          /* ── Secondary Confirmation for Wipe ── */
          <div className="p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-white">Confirm Realm Content Wipe</h3>
                <p className="text-[11px] text-rose-200/90 leading-relaxed">
                  This action is permanent and irreversible. All custom authored maps, custom characters, map versions, and non-bundled assets will be deleted.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">
                Type <span className="text-rose-400 underline">WIPE</span> to confirm:
              </label>
              <input
                type="text"
                value={wipeConfirmInput}
                onChange={(e) => setWipeConfirmInput(e.target.value)}
                placeholder="Type WIPE"
                disabled={isWiping}
                autoFocus
                className="w-full px-3 py-2 bg-[#07111e] border border-border/60 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500 transition-colors uppercase"
              />
            </div>

            {wipeError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                {wipeError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setStep('choose')}
                disabled={isWiping}
                className="px-3.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-white/5 cursor-pointer disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isWiping || wipeConfirmInput.trim().toUpperCase() !== 'WIPE'}
                onClick={handleExecuteWipe}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white border border-rose-500 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-950"
              >
                {isWiping ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Wiping Realm…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Wipe Everything &amp; Setup
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Footer for Choose Step ── */}
        {step === 'choose' && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-[#081220]/90 text-[10px] text-muted-foreground">
            <span>Saints Gaming • Realm Initializer</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
