"use client";

/**
 * /game — Full-screen Tuxemon game page
 * Integrates overworld, battle, dialogue, menus, and map editor
 */
import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/game/store";
import { gameEngine } from "@/lib/game/engine";
import OverworldCanvas from "@/components/game/OverworldCanvas";
import BattleScene from "@/components/game/BattleScene";
import DialogueBox from "@/components/game/DialogueBox";
import MapEditor from "@/components/game/MapEditor";
import GameMenu from "@/components/game/GameMenu";
import HUD from "@/components/game/HUD";

export default function GamePage() {
  const phase = useGameStore((s) => s.phase);
  const setPhase = useGameStore((s) => s.setPhase);
  const [editorOpen, setEditorOpen] = useState(false);

  // Start game engine on mount
  useEffect(() => {
    gameEngine.start();
    // Load default map
    gameEngine.loadMap("test_map", 5, 5).then(() => {
      setPhase("overworld");
    });

    return () => {
      gameEngine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle map editor with E key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "e" && e.ctrlKey) {
        e.preventDefault();
        setEditorOpen((v) => !v);
      }
      if (e.key === "Escape" && editorOpen) {
        setEditorOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editorOpen]);

  // Map editor takes over the screen
  if (editorOpen) {
    return <MapEditor />;
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      {/* Overworld canvas (visible in overworld/dialogue phases) */}
      <OverworldCanvas />

      {/* HUD overlay (HP, coins, XP, minimap) */}
      {(phase === "overworld" || phase === "dialogue") && <HUD />}

      {/* Dialogue box */}
      <DialogueBox />

      {/* Battle scene (full-screen takeover) */}
      <BattleScene />

      {/* Game menu (pause menu) */}
      {phase === "menu" && <GameMenu onClose={() => setPhase("overworld")} />}

      {/* Loading screen */}
      {phase === "loading" && (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🎮</div>
            <div className="text-white text-2xl font-bold animate-pulse">Loading...</div>
          </div>
        </div>
      )}

      {/* Editor toggle button */}
      <button
        onClick={() => setEditorOpen(true)}
        className="fixed bottom-4 right-4 px-3 py-2 bg-gray-800/80 hover:bg-gray-700 text-white rounded-lg text-sm backdrop-blur-sm border border-gray-600 z-40"
        title="Open Map Editor (Ctrl+E)"
      >
        🗺️ Editor
      </button>

      {/* Controls help */}
      <div className="fixed bottom-4 left-4 text-gray-500 text-xs z-40 space-y-0.5">
        <div>Arrow Keys / WASD — Move</div>
        <div>Enter / Z — Interact</div>
        <div>ESC — Menu</div>
        <div>Shift — Sprint</div>
        <div>Ctrl+E — Map Editor</div>
      </div>
    </div>
  );
}