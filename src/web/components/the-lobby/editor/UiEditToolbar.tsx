"use client";

import { useCallback, useState } from "react";
import { useGameStore } from "../store";
import { Check, Link2, RotateCcw } from "lucide-react";
import { createSocialPost } from "@/app/actions/social";

/**
 * Compact floating Viewfinder toolbar — always visible in Edit Interface mode.
 * Reset · Share · Save & Exit (no blocking modal).
 */
export function UiEditToolbar() {
  const isEditing = useGameStore(
    (s) => s.isEditingInterface || s.isUiEditMode
  );
  const setIsEditingInterface = useGameStore((s) => s.setIsEditingInterface);
  const uiSettings = useGameStore((s) => s.uiSettings);
  const resetUiLayout = useGameStore((s) => s.resetUiLayout);
  const showToast = useGameStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const handleReset = useCallback(() => {
    if (!confirm("Reset HUD layout to defaults?")) return;
    resetUiLayout();
    showToast("Layout reset to default.");
  }, [resetUiLayout, showToast]);

  const persistPreset = useCallback(async (name: string) => {
    const res = await fetch("/api/ui-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        data: uiSettings,
        isPublic: true,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.preset) {
      throw new Error(json.error || "Save failed");
    }
    return json.preset as { id: string; name: string };
  }, [uiSettings]);

  const handleShare = useCallback(async () => {
    setBusy(true);
    try {
      const preset = await persistPreset(
        `Layout ${new Date().toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`
      );
      await createSocialPost(
        `Check out my new UI Layout! [ui-preset:${preset.id}]`
      );
      showToast("Layout shared to Social Feed.");
    } catch {
      showToast("Failed to share layout.");
    } finally {
      setBusy(false);
    }
  }, [persistPreset, showToast]);

  const handleSaveAndExit = useCallback(async () => {
    setBusy(true);
    try {
      // Local positions already persist via DraggablePanel → localStorage.
      // Also snapshot a named preset so Share / social embeds stay in sync.
      await persistPreset("Autosave");
      showToast("Layout saved.");
    } catch {
      showToast("Layout kept locally — cloud snapshot skipped.");
    } finally {
      setIsEditingInterface(false);
      setBusy(false);
    }
  }, [persistPreset, setIsEditingInterface, showToast]);

  if (!isEditing) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[9999] flex justify-center px-4">
      <div
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/15 bg-[#0A0B10]/90 px-2 py-2 shadow-2xl backdrop-blur-xl"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(16,185,129,0.25)" }}
      >
        <span className="hidden sm:inline px-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
          Viewfinder
        </span>

        <button
          type="button"
          disabled={busy}
          onClick={handleReset}
          title="Reset to Default"
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#1A1C24]/80 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/85 transition hover:border-white/25 hover:bg-[#1A1C24] disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[#10B981]" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleShare()}
          title="Share Layout"
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[#1A1C24]/80 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/85 transition hover:border-white/25 hover:bg-[#1A1C24] disabled:opacity-40"
        >
          <Link2 className="h-3.5 w-3.5 text-[#8B5CF6]" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSaveAndExit()}
          title="Save & Exit"
          className="flex items-center gap-1.5 rounded-full bg-[#8B5CF6] px-4 py-2 text-[11px] font-black uppercase tracking-wider text-white shadow-[0_4px_0_0_#6D28D9] transition hover:brightness-110 active:translate-y-[2px] active:shadow-none disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          Save & Exit
        </button>
      </div>
    </div>
  );
}
