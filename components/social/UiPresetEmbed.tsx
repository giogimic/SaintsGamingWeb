"use client";

import { useState } from "react";
import { useGameStore } from "@/components/the-lobby/store";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle, Loader2 } from "lucide-react";

export function UiPresetEmbed({ presetId }: { presetId: string }) {
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const loadUiPreset = useGameStore((state) => state.loadUiPreset);

  const handleApplyPreset = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ui-presets/${presetId}`);
      if (!res.ok) throw new Error("Failed to fetch preset");
      
      const json = await res.json();
      if (json.preset && json.preset.data) {
        const parsedData = JSON.parse(json.preset.data);
        loadUiPreset(parsedData);
        setApplied(true);
        setTimeout(() => setApplied(false), 3000);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load this UI layout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 p-3 border border-sg-primary/30 bg-sg-primary/10 rounded-lg flex items-center justify-between">
      <div className="flex flex-col">
        <span className="font-semibold text-sm">Custom UI Layout</span>
        <span className="text-xs text-muted-foreground">Click to apply this preset to your game client</span>
      </div>
      <Button 
        variant="default" 
        className="bg-sg-primary text-white hover:bg-sg-primary/80"
        size="sm" 
        onClick={handleApplyPreset} 
        disabled={loading || applied}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : applied ? (
          <CheckCircle className="w-4 h-4 mr-2" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {applied ? "Applied!" : "Apply Layout"}
      </Button>
    </div>
  );
}
