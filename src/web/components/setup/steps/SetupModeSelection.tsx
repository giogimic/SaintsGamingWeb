'use client';

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  FolderDown,
  Download,
  Upload,
  CheckCircle2,
  ArrowRight,
  Boxes,
  FileJson,
  Loader2,
  AlertCircle,
  FileCode,
  Layers,
  Database,
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
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
              <Boxes className="w-5 h-5 text-amber-400" />
              Saints Game Setup Mode
            </h2>
            <p className="text-sm text-slate-400">
              Initialize a greenfield 3D Voxel World or migrate an existing game package via export/import.
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-all hover:border-amber-400/40"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Download className="w-4 h-4 text-amber-400" />}
            Export Game Package (.json)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OPTION 1: FRESH 3D VOXEL REALM */}
          <div
            onClick={onSelectFresh}
            className="group relative rounded-3xl p-7 border transition-all cursor-pointer flex flex-col justify-between bg-gradient-to-br from-amber-950/20 via-slate-950/60 to-purple-950/20 border-amber-500/50 hover:border-amber-400 ring-2 ring-amber-400/20 shadow-2xl hover:scale-[1.01]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-400/20 group-hover:scale-105 transition-transform">
                  <Boxes className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-400/20 border border-amber-400/40 text-amber-300">
                  Recommended
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                  Fresh 3D Voxel Realm
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Start fresh with a clean volumetric 3D Voxel foundation. Configure custom block scale (64px), Gunmetal bedrock foundation, atmosphere presets, starter heroes, and companion battlers.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                Configure 3D Voxel World
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="w-6 h-6 rounded-full border border-amber-400 bg-amber-500 text-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* OPTION 2: IMPORT & MIGRATE PACKAGE */}
          <div
            onClick={() => setIsImportModalOpen(true)}
            className="group relative rounded-3xl p-7 border transition-all cursor-pointer flex flex-col justify-between bg-gradient-to-br from-blue-950/20 via-slate-950/60 to-cyan-950/20 border-slate-800 hover:border-cyan-400/60 ring-1 ring-cyan-500/20 shadow-xl hover:scale-[1.01]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                  <FolderDown className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                  Migration Tool
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Import & Migrate Package
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Upload an existing <code className="text-cyan-300 font-mono text-xs">.saints.json</code> package or map backup. Automatically migrates any legacy layouts into pure 3D Voxel World documents upon restore.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                Upload & Migrate Bundle
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="w-6 h-6 rounded-full border border-cyan-400/60 bg-cyan-950 text-cyan-300 flex items-center justify-center">
                <Upload className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IMPORT & MIGRATION MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center">
                  <FolderDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Import & Migrate Package</h3>
                  <p className="text-xs text-slate-400">Restore world data and convert into 3D Voxel format</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedPackage(null);
                  setImportError(null);
                  setImportSuccessMsg(null);
                }}
                className="text-slate-400 hover:text-white text-sm font-semibold p-2"
              >
                ✕
              </button>
            </div>

            {/* Drop / Select Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-cyan-400/60 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.saints.json"
                className="hidden"
                onChange={handleFileChange}
              />
              <FileJson className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Click or Drag & Drop package file</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">Accepts .saints.json or .json backup archives</p>
            </div>

            {/* Preview of Parsed Package */}
            {parsedPackage && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span>Package Contents:</span>
                  <span className="text-cyan-400">{parsedPackage.game?.name || 'Saints Game'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="block text-slate-400 text-[10px]">Maps</span>
                    <span className="font-bold text-white text-sm">{parsedPackage.maps?.length || 0}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="block text-slate-400 text-[10px]">Heroes</span>
                    <span className="font-bold text-white text-sm">{parsedPackage.starterHeroes?.length || parsedPackage.characters?.length || 0}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <span className="block text-slate-400 text-[10px]">Creatures</span>
                    <span className="font-bold text-white text-sm">{parsedPackage.creatures?.length || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {importError && (
              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccessMsg && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!parsedPackage || importing}
                onClick={handleExecuteImport}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition-all"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? 'Migrating & Restoring...' : 'Restore & Migrate to 3D Voxels'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
