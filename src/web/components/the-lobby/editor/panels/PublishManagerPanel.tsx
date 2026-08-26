'use client';

import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  History,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  Clock,
  ChevronRight,
} from 'lucide-react';
import {
  validateWorldForPublish,
  createPublishSnapshot,
  listPublishSnapshots,
  rollbackToSnapshot,
  type ValidationGateResult,
} from '@/app/actions/publishing';
import type { WorldPublishSnapshot } from '@prisma/client';
import { useEditorStore } from '../editor-store';

export const PublishManagerPanel: React.FC = () => {
  const dataVersion = useEditorStore((s) => s.dataVersion);
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);

  const [validation, setValidation] = useState<ValidationGateResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [snapshots, setSnapshots] = useState<WorldPublishSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  // Publish Form Modal
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [versionInput, setVersionInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runValidation = async () => {
    setValidating(true);
    const res = await validateWorldForPublish();
    setValidation(res);
    setValidating(false);
  };

  const loadSnapshots = async () => {
    setLoadingSnapshots(true);
    const res = await listPublishSnapshots();
    if (res.success && res.data) {
      setSnapshots(res.data);
    }
    setLoadingSnapshots(false);
  };

  useEffect(() => {
    runValidation();
    loadSnapshots();
  }, [dataVersion]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) {
      setErrorMsg('Release title is required');
      return;
    }
    setPublishing(true);
    setErrorMsg(null);

    const res = await createPublishSnapshot({
      title: titleInput,
      description: descInput,
      version: versionInput || undefined,
    });

    setPublishing(false);
    if (res.success) {
      setShowPublishModal(false);
      setTitleInput('');
      setDescInput('');
      setVersionInput('');
      loadSnapshots();
      incrementDataVersion();
    } else {
      setErrorMsg(res.error || 'Failed to publish release');
    }
  };

  const handleRollback = async (snapshot: WorldPublishSnapshot) => {
    if (
      !confirm(
        `Are you sure you want to restore the world to snapshot "${snapshot.version} (${snapshot.title})"? This will overwrite current draft changes.`
      )
    ) {
      return;
    }
    setRollingBackId(snapshot.id);
    const res = await rollbackToSnapshot(snapshot.id);
    setRollingBackId(null);
    if (res.success) {
      incrementDataVersion();
      runValidation();
    } else {
      alert(res.error || 'Rollback failed');
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#050b14]/95 text-slate-200 font-mono text-xs p-4 overflow-y-auto space-y-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[#806f47]/30 pb-3">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="font-extrabold text-[#cbb26a] tracking-wider uppercase text-sm">
              Publishing & Release Gates
            </h2>
            <p className="text-[10px] text-slate-500 font-sans">
              Author → Validate → Snapshot → Publish pipeline (Bible 35 / Studio Plan Part 6).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runValidation}
            disabled={validating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
            <span>Re-validate</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold border border-amber-400/50 shadow-[0_0_15px_rgba(217,119,6,0.3)] transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Create Release Snapshot</span>
          </button>
        </div>
      </div>

      {/* ── Validation Gate Status Banner ───────────────── */}
      <div className="rounded-xl border border-slate-800 bg-[#0a1120] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200">Pre-Flight Validation Gate</span>
          </div>
          {validation && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                validation.valid
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/40'
                  : 'bg-rose-950/80 text-rose-400 border border-rose-600/40'
              }`}
            >
              {validation.valid ? 'PASSED — READY TO PUBLISH' : `${validation.errorCount} BLOCKING ERRORS`}
            </span>
          )}
        </div>

        {validating ? (
          <div className="text-slate-500 text-center py-2">Running integrity diagnostics...</div>
        ) : validation ? (
          <div className="space-y-2">
            {validation.errors.length > 0 && (
              <div className="space-y-1 rounded bg-rose-950/20 border border-rose-500/30 p-2.5">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                  Blocking Errors:
                </span>
                {validation.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-rose-200">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="space-y-1 rounded bg-amber-950/20 border border-amber-500/30 p-2.5">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Non-Blocking Warnings:
                </span>
                {validation.warnings.map((warn, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            {validation.errors.length === 0 && validation.warnings.length === 0 && (
              <div className="flex items-center gap-2 text-emerald-400 text-[11px] py-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>All reference graphs, templates, and configurations pass integrity checks.</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Release Snapshots History ───────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-slate-200">Release Snapshot History</span>
          <span className="text-[10px] text-slate-500">({snapshots.length} snapshots recorded)</span>
        </div>

        {loadingSnapshots ? (
          <div className="text-slate-500 text-center py-6">Loading snapshot history...</div>
        ) : snapshots.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-[#0a1120] p-8 text-center text-slate-500 space-y-2">
            <Package className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No snapshots published yet.</p>
            <p className="text-[10px] text-slate-600">
              Create a release snapshot to create an immutable restore point of your world definitions.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snap) => {
              let summary: any = {};
              try {
                summary = JSON.parse(snap.contentSummary);
              } catch {}

              const isRollingBack = rollingBackId === snap.id;

              return (
                <div
                  key={snap.id}
                  className="rounded-xl border border-slate-800 bg-[#0a1120] p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-500/30 font-bold text-[10px]">
                        {snap.version}
                      </span>
                      <span className="font-bold text-slate-100 text-xs truncate">
                        {snap.title}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[8px] uppercase font-bold ${
                          snap.status === 'PUBLISHED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {snap.status}
                      </span>
                    </div>

                    {snap.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">{snap.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-[9px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(snap.createdAt).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span>Dungeons: {summary.dungeonCount ?? 0}</span>
                      <span>Shops: {summary.shopCount ?? 0}</span>
                      <span>Mounts: {summary.mountCount ?? 0}</span>
                      <span>Events: {summary.worldEventCount ?? 0}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRollback(snap)}
                    disabled={isRollingBack}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-rose-950/50 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                    title="Restore world templates to this snapshot version"
                  >
                    <RotateCcw className={`w-3 h-3 ${isRollingBack ? 'animate-spin' : ''}`} />
                    <span>{isRollingBack ? 'Restoring...' : 'Rollback to this'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Release Modal ───────────────────────── */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <form
            onSubmit={handlePublish}
            className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col w-full max-w-lg overflow-hidden font-mono text-xs"
          >
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <span className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <UploadCloud className="w-4 h-4 text-amber-400" />
                Publish Release Snapshot
              </span>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {errorMsg && (
                <div className="rounded bg-rose-950/40 border border-rose-500/50 p-2 text-rose-300 text-[11px]">
                  {errorMsg}
                </div>
              )}

              <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
                Release Title *
                <input
                  type="text"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="e.g. Copper Mines & Mount Expansion"
                  className="rounded bg-black/50 px-2.5 py-1.5 border border-slate-700 text-slate-200 text-xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
                Version Tag (Optional)
                <input
                  type="text"
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  placeholder="e.g. v1.1.0 (auto-generated if empty)"
                  className="rounded bg-black/50 px-2.5 py-1.5 border border-slate-700 text-slate-200 text-xs font-mono"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
                Release Notes / Description
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Summary of changes included in this release..."
                  className="rounded bg-black/50 px-2.5 py-2 border border-slate-700 text-slate-200 text-xs min-h-[80px]"
                />
              </label>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishing}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-black font-bold disabled:opacity-50 cursor-pointer"
              >
                {publishing ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
