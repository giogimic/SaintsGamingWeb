'use client';

import React, { useState, useRef } from 'react';
import {
  FolderDown,
  Download,
  Upload,
  CheckCircle2,
  ArrowRight,
  Boxes,
  Loader2,
  AlertCircle,
  FileCode,
  Layers,
  Database,
  X,
  Sparkles,
} from 'lucide-react';

interface SetupModeSelectionProps {
  onSelectFresh: () => void;
  onImportSuccess?: (defaultMapId: string) => void;
}

export function SetupModeSelection({ onSelectFresh, onImportSuccess }: SetupModeSelectionProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [parsedPackage, setParsedPackage] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await fetch('/api/setup/export');
      if (!res.ok) {
        throw new Error('Failed to generate export bundle');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saints-game-package-${Date.now()}.saints.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        if (!json || typeof json !== 'object') {
          throw new Error('Invalid JSON structure');
        }
        setParsedPackage(json);
      } catch (err: any) {
        setImportError(`Invalid JSON package: ${err.message}`);
        setParsedPackage(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!parsedPackage) return;
    try {
      setImporting(true);
      setImportError(null);

      const res = await fetch('/api/setup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageData: parsedPackage }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Import failed');
      }

      setImportSuccessMsg(data.message || 'Package successfully migrated and imported!');
      setTimeout(() => {
        if (onImportSuccess) {
          onImportSuccess(data.defaultMapId || 'STARTING_MEADOW');
        } else {
          window.location.href = '/studio';
        }
      }, 1500);
    } catch (err: any) {
      setImportError(err.message || 'Import error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* SECTION TITLE & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2 font-mono">
            <Boxes className="w-4 h-4 text-amber-400" />
            1. Initialization Mode Selection
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Start a fresh 3D Voxel foundation or restore and migrate an existing game package.
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a1424] hover:bg-[#0f1e36] border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold transition hover:border-amber-400/60 self-start sm:self-auto cursor-pointer"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export Live State (.json)
        </button>
      </div>

      {/* MODE SELECTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* OPTION 1: FRESH 3D VOXEL REALM */}
        <div
          onClick={onSelectFresh}
          className="group relative rounded-xl p-5 border transition-all cursor-pointer flex flex-col justify-between bg-gradient-to-br from-[#0c1626] via-[#08101e] to-[#0a1220] border-amber-500/50 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase tracking-wider bg-amber-400/15 border border-amber-400/40 text-amber-300">
                Recommended
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5 font-mono">
                Fresh 3D Voxel Realm
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Initializes a clean volumetric 3D Voxel foundation. Configure custom block scale (64px standard), bedrock foundation material, atmosphere presets, starter heroes, and companion battlers.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-amber-400 flex items-center gap-1">
              Configure 3D Realm
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
            <div className="w-5 h-5 rounded-full border border-amber-400 bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* OPTION 2: IMPORT & MIGRATE PACKAGE */}
        <div
          onClick={() => setIsImportModalOpen(true)}
          className="group relative rounded-xl p-5 border transition-all cursor-pointer flex flex-col justify-between bg-gradient-to-br from-[#081524] via-[#08101e] to-[#06111e] border-slate-800 hover:border-cyan-400/60 hover:shadow-lg hover:shadow-cyan-500/10"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                <FolderDown className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase tracking-wider bg-cyan-500/15 border border-cyan-400/40 text-cyan-300">
                Migration Tool
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5 font-mono">
                Import & Migrate Package
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Upload a <code className="text-cyan-300 font-mono text-[11px]">.saints.json</code> backup bundle. Automatically migrates legacy maps into native 3D Voxel World format upon restore.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-cyan-400 flex items-center gap-1">
              Select Package File
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
            <div className="w-5 h-5 rounded-full border border-cyan-400/60 bg-cyan-500/10 text-cyan-300 flex items-center justify-center">
              <Upload className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── IMPORT & MIGRATE MODAL (OS WINDOW STYLE) ─── */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#050b14]/95 border border-cyan-500/40 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            
            {/* Modal Window Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-cyan-950/40 via-[#0a1628] to-[#050b14] border-b border-cyan-500/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/80" />
                <span className="font-mono text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Import & Migrate Game Package
                </span>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedPackage(null);
                  setImportError(null);
                }}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs font-sans">
              <p className="text-slate-300 leading-relaxed">
                Select a valid <code className="text-cyan-300 font-mono">.saints.json</code> or JSON backup bundle to restore world maps, hero presets, and creature definitions.
              </p>

              {/* DROPZONE */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  parsedPackage
                    ? 'border-emerald-500/60 bg-emerald-950/20'
                    : 'border-slate-700 hover:border-cyan-400/60 bg-slate-950/60 hover:bg-slate-900/60'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,.saints.json"
                  className="hidden"
                />
                <Upload className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                {parsedPackage ? (
                  <div className="space-y-1">
                    <span className="font-mono font-bold text-emerald-400 text-xs flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Package Loaded & Validated
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Game: <strong>{parsedPackage.game?.name || 'Saints Game'}</strong> ({parsedPackage.maps?.length || 0} maps, {parsedPackage.starterHeroes?.length || 0} heroes)
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-slate-200">Click to browse or drop package file</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Supports .saints.json & exported game bundles</p>
                  </div>
                )}
              </div>

              {importError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 font-mono">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setParsedPackage(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={!parsedPackage || importing}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-600/20"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Restore & Migrate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
