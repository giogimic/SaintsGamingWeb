"use client";

/**
 * /game — Full-screen Tuxemon game page
 * Integrates overworld, battle, dialogue, menus, and map editor
 */
import { useEffect, useState } from "react";
import { useGameStore } from "@/engine/store";
import { gameEngine } from "@/engine/engine";
import OverworldCanvas from "@/engine/ui/OverworldCanvas";
import BattleScene from "@/engine/ui/BattleScene";
import DialogueBox from "@/engine/ui/DialogueBox";
import MapEditor from "@/engine/ui/MapEditor";
import GameMenu from "@/engine/ui/GameMenu";
import HUD from "@/engine/ui/HUD";

const DEFAULT_GAME_MAP = "DEMO_SANDBOX";
const DEFAULT_SPAWN = { x: 14, y: 15 };

export default function GamePage() {
  const phase = useGameStore((s) => s.phase);
  const setPhase = useGameStore((s) => s.setPhase);
  const currentMap = useGameStore((s) => s.currentMap);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Start game engine on mount
  useEffect(() => {
    let cancelled = false;
    gameEngine.start();
    // Use seeded WorldMap DEMO_SANDBOX (legacy test_map / SaintsMap is not in this API).
    gameEngine
      .loadMap(DEFAULT_GAME_MAP, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y)
      .then((ok) => {
        if (cancelled) return;
        if (!ok) setLoadError(`Failed to load map: ${DEFAULT_GAME_MAP}`);
        else setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setLoadError(`Failed to load map: ${DEFAULT_GAME_MAP}`);
      });

    return () => {
      cancelled = true;
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

      {/* Loading / error screen — hide once engine store has a map */}
      {loadError ? (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="text-center max-w-md px-6">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-red-400 text-xl font-bold mb-2">{loadError}</div>
            <p className="text-gray-400 text-sm mb-4">
              Prefer{" "}
              <a href="/lobby" className="text-cyan-400 underline">
                /lobby
              </a>{" "}
              for the full Saints overworld.
            </p>
            <a
              href="/lobby"
              className="inline-block px-4 py-2 rounded bg-violet-700 hover:bg-violet-600 text-white text-sm"
            >
              Open Lobby
            </a>
          </div>
        </div>
      ) : phase === "loading" && !currentMap ? (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="text-center">
            <div className="text-4xl mb-4">🎮</div>
            <div className="text-white text-2xl font-bold animate-pulse">Loading...</div>
          </div>
        </div>
      ) : null}

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