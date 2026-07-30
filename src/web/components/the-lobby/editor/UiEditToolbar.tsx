"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "../store";
import { X, Save, Share2, Trash2, Download } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { createSocialPost } from "@/app/actions/social";

type Preset = {
  id: string;
  name: string;
  data: string;
  createdAt: string;
};

export function UiEditToolbar() {
  const isUiEditMode = useGameStore((state) => state.isUiEditMode);
  const setIsUiEditMode = useGameStore((state) => state.setIsUiEditMode);
  const uiSettings = useGameStore((state) => state.uiSettings);
  const loadUiPreset = useGameStore((state) => state.loadUiPreset);
  const showToast = useGameStore((state) => state.showToast);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isUiEditMode) {
      fetchPresets();
    }
  }, [isUiEditMode]);

  const fetchPresets = async () => {
    try {
      const res = await fetch("/api/ui-presets");
      const json = await res.json();
      if (json.presets) {
        setPresets(json.presets);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/ui-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPresetName,
          data: uiSettings,
          isPublic: true,
        }),
      });
      const json = await res.json();
      if (json.preset) {
        setPresets([json.preset, ...presets]);
        setNewPresetName("");
        showToast("Preset saved successfully!");
      }
    } catch (e) {
      showToast("Failed to save preset.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    try {
      await fetch(`/api/ui-presets/${id}`, { method: "DELETE" });
      setPresets(presets.filter((p) => p.id !== id));
      showToast("Preset deleted.");
    } catch (e) {
      showToast("Failed to delete preset.");
    }
  };

  const handleLoadPreset = (dataString: string) => {
    try {
      const data = JSON.parse(dataString);
      loadUiPreset(data);
      showToast("Preset loaded!");
    } catch (e) {
      showToast("Failed to load preset data.");
    }
  };

  const handleSharePreset = async (id: string) => {
    try {
      await createSocialPost(`Check out my new UI Layout! 🎨 [ui-preset:${id}]`);
      showToast("Shared to Social Feed!");
    } catch (e) {
      showToast("Failed to share.");
    }
  };

  if (!isUiEditMode) return null;

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] pointer-events-auto bg-black/80 backdrop-blur-md border border-white/20 p-4 rounded-xl shadow-2xl w-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold sg-text-gradient">UI Layout Editor</h3>
        <Button variant="ghost" size="icon" onClick={() => setIsUiEditMode(false)}>
          <X className="w-5 h-5 text-white" />
        </Button>
      </div>

      <p className="text-sm text-zinc-300 mb-4">
        Drag and scale UI panels to your liking. Save your layout below or load an existing preset.
      </p>

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="New Preset Name"
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          className="bg-black/50 border-white/10"
        />
        <Button onClick={handleSavePreset} disabled={isLoading || !newPresetName.trim()} variant="default" className="bg-sg-primary text-white hover:bg-sg-primary/80">
          <Save className="w-4 h-4 mr-2" /> Save
        </Button>
      </div>

      <div className="text-sm font-semibold text-zinc-400 mb-2">Saved Presets</div>
      <ScrollArea className="h-48 border border-white/10 rounded-md bg-black/40 p-2">
        {presets.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center mt-4">No presets saved yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {presets.map((preset) => (
              <div key={preset.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 group">
                <span className="text-sm font-medium truncate flex-1">{preset.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleLoadPreset(preset.data)} title="Load Layout">
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSharePreset(preset.id)} title="Share to Feed">
                    <Share2 className="w-3 h-3 text-blue-400" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeletePreset(preset.id)} title="Delete">
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
