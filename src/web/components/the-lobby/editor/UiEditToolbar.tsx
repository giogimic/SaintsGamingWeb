'use client';

import { useCallback, useState } from 'react';
import { useGameStore } from '../store';
import {
  Check,
  Link2,
  RotateCcw,
  Sliders,
  Eye,
  EyeOff,
  Copy,
  Download,
  Upload,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { createSocialPost } from '@/app/actions/social';
import { BUILTIN_HUD_PRESETS, WIDGET_METADATA } from '../hud/default-presets';

export function UiEditToolbar() {
  const isEditing = useGameStore((s) => s.isEditingInterface || s.isUiEditMode);
  const setIsEditingInterface = useGameStore((s) => s.setIsEditingInterface);
  const activePreset = useGameStore((s) => s.activeHudPreset);
  const customPresets = useGameStore((s) => s.customHudPresets);
  const setActiveHudPreset = useGameStore((s) => s.setActiveHudPreset);
  const resetHudPresetToDefault = useGameStore((s) => s.resetHudPresetToDefault);
  const saveCurrentHudPresetAs = useGameStore((s) => s.saveCurrentHudPresetAs);
  const deleteCustomHudPreset = useGameStore((s) => s.deleteCustomHudPreset);
  const setWidgetVisibility = useGameStore((s) => s.setWidgetVisibility);
  const exportHudPresetString = useGameStore((s) => s.exportHudPresetString);
  const importHudPresetString = useGameStore((s) => s.importHudPresetString);
  const showToast = useGameStore((s) => s.showToast);

  const [busy, setBusy] = useState(false);
  const [showVisibilityDrawer, setShowVisibilityDrawer] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);

  const handleReset = useCallback(() => {
    if (!confirm('Reset HUD layout to defaults?')) return;
    resetHudPresetToDefault();
    showToast('Layout reset to Modern MMO default.');
  }, [resetHudPresetToDefault, showToast]);

  const handlePresetSelect = (presetId: string) => {
    if (presetId === '__NEW__') {
      const name = prompt('Enter a name for your custom HUD preset:');
      if (name) {
        saveCurrentHudPresetAs(name);
        showToast(`Saved layout as "${name}".`);
      }
      return;
    }
    setActiveHudPreset(presetId);
    showToast('HUD preset applied.');
  };

  const handleCopyCode = () => {
    const code = exportHudPresetString();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Layout string copied to clipboard!');
    }
  };

  const handleImportCode = () => {
    if (!importText.trim()) return;
    const success = importHudPresetString(importText.trim());
    if (success) {
      showToast('Custom layout imported successfully!');
      setShowShareModal(false);
      setImportText('');
    } else {
      showToast('Invalid layout code. Please check and try again.');
    }
  };

  const handlePostToSocial = async () => {
    setBusy(true);
    try {
      const code = exportHudPresetString();
      await createSocialPost(
        `Check out my custom HUD layout for Saints Gaming!\n${code}`
      );
      showToast('Layout shared to Social Feed.');
      setShowShareModal(false);
    } catch {
      showToast('Failed to share layout to social feed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAndExit = useCallback(() => {
    setIsEditingInterface(false);
    setShowVisibilityDrawer(false);
    setShowShareModal(false);
    showToast('HUD Layout saved.');
  }, [setIsEditingInterface, showToast]);

  if (!isEditing) return null;

  const currentExportString = exportHudPresetString();

  return (
    <>
      {/* Floating Viewfinder Toolbar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[9999] flex justify-center px-4">
        <div
          className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/30 bg-[#0A0B10]/95 px-3 py-2 shadow-2xl backdrop-blur-xl"
          style={{
            boxShadow:
              '0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(16,185,129,0.25)',
          }}
        >
          {/* Badge */}
          <div className="flex items-center gap-1.5 px-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
              HUD Edit Mode
            </span>
          </div>

          {/* Preset Selector Dropdown */}
          <div className="flex items-center gap-1">
            <select
              value={activePreset?.id || 'preset-modern'}
              onChange={(e) => handlePresetSelect(e.target.value)}
              className="rounded-lg border border-white/15 bg-[#141721] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-emerald-400/50 focus:border-emerald-400 focus:outline-none"
            >
              <optgroup label="Default Layouts">
                {BUILTIN_HUD_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
              {customPresets.length > 0 && (
                <optgroup label="Custom Presets">
                  {customPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="__NEW__">+ Save As New Preset...</option>
            </select>

            {/* Delete custom preset if active */}
            {customPresets.some((p) => p.id === activePreset?.id) && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete preset "${activePreset.name}"?`)) {
                    deleteCustomHudPreset(activePreset.id);
                    showToast('Preset deleted.');
                  }
                }}
                title="Delete this custom preset"
                className="rounded-lg border border-red-500/20 bg-red-950/40 p-1.5 text-red-400 hover:bg-red-900/60"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Widget Visibility Drawer Button */}
          <button
            type="button"
            onClick={() => setShowVisibilityDrawer(!showVisibilityDrawer)}
            title="Toggle Widget Visibility"
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
              showVisibilityDrawer
                ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300'
                : 'border-white/10 bg-[#1A1C24]/80 text-white/85 hover:border-white/25 hover:bg-[#1A1C24]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Widgets</span>
          </button>

          {/* Share & Import Button */}
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            title="Share & Import Layout Code"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1A1C24]/80 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/85 transition hover:border-white/25 hover:bg-[#1A1C24]"
          >
            <Link2 className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Share / Code</span>
          </button>

          {/* Reset Button */}
          <button
            type="button"
            disabled={busy}
            onClick={handleReset}
            title="Reset to Default"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1A1C24]/80 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/85 transition hover:border-white/25 hover:bg-[#1A1C24] disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5 text-yellow-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Save & Exit Button */}
          <button
            type="button"
            disabled={busy}
            onClick={handleSaveAndExit}
            title="Save & Exit Edit Mode"
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-950/50 transition hover:brightness-110 active:translate-y-[1px] disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            Save & Exit
          </button>
        </div>
      </div>

      {/* Widget Visibility Drawer */}
      {showVisibilityDrawer && (
        <div className="pointer-events-auto fixed bottom-20 left-1/2 z-[9999] w-[min(90vw,420px)] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#0D0F18]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-white">
              HUD Widgets Visibility
            </span>
            <button
              type="button"
              onClick={() => setShowVisibilityDrawer(false)}
              className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {Object.entries(WIDGET_METADATA).map(([id, meta]) => {
              const widgetCfg = activePreset?.widgets?.[id];
              const isVisible = widgetCfg ? widgetCfg.visible : true;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-white/90">{meta.label}</span>
                  <button
                    type="button"
                    onClick={() => setWidgetVisibility(id, !isVisible)}
                    className={`flex items-center gap-1 rounded px-2 py-1 font-bold text-[10px] uppercase transition ${
                      isVisible
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    }`}
                  >
                    {isVisible ? (
                      <>
                        <Eye className="h-3 w-3" /> Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" /> Hidden
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Share / Code String Modal */}
      {showShareModal && (
        <div className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#0A0D16] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Share & Import HUD Layout</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Export Section */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Export Layout String
                </label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={currentExportString}
                    className="w-full h-18 resize-none rounded-lg border border-white/10 bg-black/60 p-2.5 font-mono text-[11px] text-cyan-200 focus:outline-none"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-2 text-xs font-bold uppercase text-cyan-300 hover:bg-cyan-900/60"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handlePostToSocial()}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold uppercase text-white hover:bg-cyan-500 disabled:opacity-50"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Post to Social Feed
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              {/* Import Section */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-purple-300">
                  Import Layout String
                </label>
                <textarea
                  placeholder="Paste a SG-HUD:v1:... code string here"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full h-18 resize-none rounded-lg border border-white/10 bg-black/60 p-2.5 font-mono text-[11px] text-purple-200 placeholder:text-white/30 focus:border-purple-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleImportCode}
                  disabled={!importText.trim()}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-2 text-xs font-bold uppercase text-white hover:brightness-110 disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  Load Layout Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
