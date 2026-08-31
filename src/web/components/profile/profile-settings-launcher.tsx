"use client";

import React from "react";
import { Button } from "@/shared/ui/button";
import { Settings, Paintbrush, Film, User, Shield } from "lucide-react";
import { useUserSettingsStore, type UserSettingsTab } from "@/web/hooks/useUserSettingsStore";
import { soundSynth } from "@/engine/sound-synth";

export function ProfileSettingsLauncher() {
  const openSettings = useUserSettingsStore((state) => state.openSettings);

  const handleOpen = (tab: UserSettingsTab) => {
    try { soundSynth?.playUiClick?.(); } catch {}
    openSettings(tab);
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-primary/30 bg-primary/5">
      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary flex items-center justify-between">
        <span>Account & Preferences</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">OS Window</span>
      </div>

      <Button
        variant="default"
        size="sm"
        onClick={() => handleOpen("account")}
        className="w-full justify-start text-xs font-bold gap-2 shadow-sm font-mono cursor-pointer"
      >
        <User className="h-3.5 w-3.5 text-primary-foreground" />
        Account & Profile Settings
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpen("appearance")}
          className="justify-start text-xs gap-1.5 font-mono cursor-pointer"
        >
          <Paintbrush className="h-3.5 w-3.5 text-amber-400" />
          Themes
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpen("posts")}
          className="justify-start text-xs gap-1.5 font-mono cursor-pointer"
        >
          <Film className="h-3.5 w-3.5 text-primary" />
          Posts
        </Button>
      </div>
    </div>
  );
}
