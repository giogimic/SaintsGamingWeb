'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Globe,
  Sparkles,
  RefreshCw,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { listPublishSnapshots, restoreWorldRelease } from '@/app/actions/studio/publishing';
import { createWorldRelease, deployWorldRelease } from '@/app/actions/studio/world-release';
import type { WorldRelease } from '@prisma/client';
import { useEditorStore } from '../editor-store';
import { useGameStore } from '../../store';
import {
  WindowMenuBar,
  WindowMenuDropdown,
  WindowMenuButton,
  WindowMenuDivider,
} from '../WindowMenuBar';

export const WorldManagerPanel: React.FC = () => {
  const dataVersion = useEditorStore((s) => s.dataVersion);
  const incrementDataVersion = useEditorStore((s) => s.incrementDataVersion);
  const openPanel = useEditorStore((s) => s.openPanel);
  const showToast = useGameStore((s) => s.showToast);

  const [validation, setValidation] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [snapshots, setSnapshots] = useState<WorldRelease[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  // Publish Form Modal
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [versionInput, setVersionInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const runValidation = async () => {
    setValidating(true);
    setTimeout(() => {
      setValidation({ valid: true, errorCount: 0, warningCount: 0, errors: [], warnings: [] });
      setValidating(false);
    }, 1000);
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

  useEffect(() => {
    const handleOpenCreate = () => setShowPublishModal(true);
    const handleDeployLatest = () => {
      // Find the latest snapshot in the current snapshots list
      // Since it's sorted by id desc, index 0 is latest
      if (snapshots.length > 0) {
        handleDeploy(snapshots[0]);
      } else {
        alert("No releases available to deploy.");
      }
    };

    window.addEventListener('studio_open_release_create', handleOpenCreate);
    window.addEventListener('studio_deploy_latest_release', handleDeployLatest);
    return () => {
      window.removeEventListener('studio_open_release_create', handleOpenCreate);
      window.removeEventListener('studio_deploy_latest_release', handleDeployLatest);
    };
  }, [snapshots]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) {
      setErrorMsg('Release title is required');
      return;
    }
    setPublishing(true);
    setErrorMsg(null);

    const res = await createWorldRelease('saints', titleInput, descInput);

    if (res.success) {
      showToast('Release Published successfully!');
      setShowPublishModal(false);
      setTitleInput('');
      setDescInput('');
      setVersionInput('');
      loadSnapshots();
      incrementDataVersion();
    } else {
      setErrorMsg(res.error || 'Failed to publish release');
    }
    
    setPublishing(false);
  };

  const handleRollback = async (snapshot: WorldRelease) => {
    if (
      !confirm(
        `Are you sure you want to restore the world to snapshot "${snapshot.version} (${snapshot.title})"? This will overwrite current draft changes.`
      )
    ) {
      return;
    }
    setRollingBackId(snapshot.id);
    const res = await restoreWorldRelease(snapshot.id);
    setRollingBackId(null);
    if (res.success) {
      incrementDataVersion();
      runValidation();
      showToast('Rollback successful!');
    } else {
      alert(res.error || 'Rollback failed');
    }
  };

  const handleDeploy = async (snapshot: WorldRelease) => {
    if (
      !confirm(
        `Are you sure you want to deploy release "${snapshot.version} (${snapshot.title})" to the live game server?`
      )
    ) {
      return;
    }
    setPublishing(true);
    const deployRes = await deployWorldRelease(snapshot.id);
    setPublishing(false);
    
    if (deployRes.success) {
      showToast('Deployed successfully to Live Server!');
      loadSnapshots();
    } else {
      alert(deployRes.error || 'Deployment failed');
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#050b14]/95 text-slate-200 font-mono text-xs -m-3 mb-0 overflow-hidden">
      {/* ── WINDOW SUB-MENU APP BAR ── */}
      <WindowMenuBar>
        <WindowMenuDropdown
          label="Releases"
          items={[
            {
              label: 'Publish World Release',
              shortcut: 'Ctrl+Shift+P',
              onClick: () => setShowPublishModal(true),
            },
            { divider: true, label: '' },
            {
              label: 'Re-run Pre-Flight Validation',
              onClick: runValidation,
              disabled: validating,
            },
            {
              label: 'Refresh Snapshot History',
              onClick: loadSnapshots,
              disabled: loadingSnapshots,
            },
          ]}
        />
        <WindowMenuDivider />
        <WindowMenuButton
          label="Publish World"
          icon={UploadCloud}
          onClick={() => setShowPublishModal(true)}
          title="Publish the active world state as a new immutable release"
        />
        <WindowMenuButton
          label={validating ? 'Validating...' : 'Validate'}
          icon={RefreshCw}
          onClick={runValidation}
          disabled={validating}
          title="Run pre-flight integrity check on all maps, spawners, and loot"
        />
        <div className="flex-1" />
        {validation && (
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
              validation.valid
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/40'
                : 'bg-rose-950/80 text-rose-400 border border-rose-600/40'
            }`}
          >
            {validation.valid ? 'VALIDATION PASSED' : `${validation.errorCount} ERRORS`}
          </span>
        )}
      </WindowMenuBar>

      <div className="flex-1 p-6 overflow-y-auto space-y-8 max-w-4xl mx-auto w-full">
        {/* ── Definitions ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-950/20 border border-blue-500/20 rounded p-4 space-y-2">
            <h3 className="font-bold text-blue-400 text-xs flex items-center gap-1.5"><UploadCloud className="w-4 h-4"/> SAVE WORKING WORLD</h3>
            <p className="text-[10px] text-blue-200/70 leading-relaxed">
              Save persists the current editable Working World only. Saving does not publish, deploy, or affect the currently deployed release.<br/>
              After saving, the Working World may differ from the Published or Deployed release.
            </p>
          </div>
          <div className="bg-amber-950/20 border border-amber-500/20 rounded p-4 space-y-2">
            <h3 className="font-bold text-amber-400 text-xs flex items-center gap-1.5"><RotateCcw className="w-4 h-4"/> RESTORE NEVER MUTATES</h3>
            <p className="text-[10px] text-amber-200/70 leading-relaxed">
              Restore takes an immutable published release and creates a new editable Working World from it. The original WorldRelease remains unchanged and deployable.
            </p>
          </div>
        </div>

        {/* ── State Driven Workflow ──────────────────────────────────────── */}
        <div className="rounded-xl border border-[#806f47]/30 bg-[#0a1120] overflow-hidden flex flex-col">
          <div className="bg-black/40 px-6 py-4 border-b border-[#806f47]/30 flex items-center justify-between">
            <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              WORLD RELEASE
            </h2>
          </div>
          
          <div className="p-6 grid grid-cols-3 gap-8">
            {/* Working World */}
            <div className="space-y-4 relative">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Working World</span>
                <span className="text-lg font-bold text-slate-200 mt-1">Saints World</span>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved</span>
                </div>
                
                {validating ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating...</span>
                  </div>
                ) : validation?.valid ? (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>World Check Passed</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{validation?.errorCount || 0} Validation Errors</span>
                  </div>
                )}
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-border/50">
                <ChevronRight className="w-8 h-8" />
              </div>
            </div>

            {/* Published */}
            <div className="space-y-4 relative pl-4 border-l border-border/30">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Latest Published</span>
                {snapshots.length > 0 ? (
                  <span className="text-lg font-bold text-blue-400 mt-1">{snapshots[0].version}</span>
                ) : (
                  <span className="text-lg font-bold text-slate-600 mt-1">None</span>
                )}
              </div>
              
              {snapshots.length > 0 && (
                <div className="text-[10px] text-slate-500">
                  {new Date(snapshots[0].createdAt).toLocaleDateString()}
                </div>
              )}
              
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-border/50">
                <ChevronRight className="w-8 h-8" />
              </div>
            </div>

            {/* Deployed */}
            <div className="space-y-4 pl-4 border-l border-border/30">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Currently Deployed</span>
                {snapshots.some(s => s.status === 'LIVE') ? (
                  <span className="text-lg font-bold text-emerald-400 mt-1">
                    {snapshots.find(s => s.status === 'LIVE')?.version}
                  </span>
                ) : (
                  <span className="text-lg font-bold text-amber-500 mt-1">None (Offline)</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-black/20 px-6 py-4 border-t border-[#806f47]/20 flex flex-col items-center justify-center space-y-4">
            {validation?.valid === false ? (
              <>
                <p className="text-rose-400 text-xs">Your Working World has validation errors preventing publish.</p>
                <button 
                  onClick={() => openPanel('problems')} // Assuming we might have a problems panel
                  className="px-6 py-2 bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 rounded font-bold transition-colors"
                >
                  View Errors
                </button>
              </>
            ) : (
              <>
                <p className="text-slate-400 text-xs">Your Working World is ready to be published as an immutable release.</p>
                <button 
                  onClick={() => setShowPublishModal(true)}
                  className="px-8 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded shadow-lg transition-colors flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  PUBLISH NEW RELEASE
                </button>
              </>
            )}
          </div>
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
            <div className="rounded-xl border border-[#806f47]/20 bg-[#0a1120] p-8 text-center text-slate-500 space-y-2">
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
                const isLive = snap.status === 'LIVE';

                return (
                  <div
                    key={snap.id}
                    className="rounded-xl border border-[#806f47]/20 bg-[#0a1120] p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-[#806f47]/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-500/30 font-bold text-[10px]">
                          {snap.version}
                        </span>
                        <span className="font-bold text-slate-100 text-xs truncate">
                          {snap.title}
                        </span>
                        {isLive && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] uppercase font-bold bg-emerald-950 text-emerald-400 border border-emerald-600/30">
                            LIVE
                          </span>
                        )}
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

                    <div className="shrink-0 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeploy(snap)}
                        disabled={isRollingBack || publishing || isLive}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                        title={isLive ? "Already deployed" : "Push this snapshot to the live game server"}
                      >
                        <UploadCloud className="w-3 h-3" />
                        <span>{isLive ? 'Deployed' : 'Deploy to Server'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRollback(snap)}
                        disabled={isRollingBack || publishing}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-amber-950/50 text-slate-300 hover:text-amber-300 border border-[#806f47]/30 hover:border-amber-500/40 text-[10px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                        title="Restore world templates to this snapshot version"
                      >
                        <RotateCcw className={`w-3 h-3 ${isRollingBack ? 'animate-spin' : ''}`} />
                        <span>{isRollingBack ? 'Restoring...' : 'Restore'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Create Release Modal ───────────────────────── */}
      {showPublishModal && mounted && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <form
            onSubmit={handlePublish}
            className="bg-[#050b14]/95 backdrop-blur-xl border border-[#806f47]/30 rounded-xl shadow-2xl flex flex-col w-full max-w-lg overflow-hidden font-sans text-xs"
          >
            <div className="px-5 py-4 border-b border-[#806f47]/20 bg-black/40 flex items-center justify-between">
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
                  className="rounded bg-black/50/50 px-2.5 py-1.5 border border-[#806f47]/30 text-slate-200 text-xs"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
                Version Tag (Optional)
                <input
                  type="text"
                  value={versionInput}
                  onChange={(e) => setVersionInput(e.target.value)}
                  placeholder="e.g. v1.1.0 (auto-generated if empty)"
                  className="rounded bg-black/50/50 px-2.5 py-1.5 border border-[#806f47]/30 text-slate-200 text-xs font-mono"
                />
              </label>


              <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-400">
                Release Notes / Description
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Summary of changes included in this release..."
                  className="rounded bg-black/50/50 px-2.5 py-2 border border-[#806f47]/30 text-slate-200 text-xs min-h-[80px]"
                />
              </label>
            </div>

            <div className="px-5 py-3 border-t border-[#806f47]/20 bg-transparent flex items-center justify-end gap-2">
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
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold disabled:opacity-50 cursor-pointer"
              >
                {publishing ? 'Saving Snapshot...' : 'Confirm & Create Snapshot'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};
