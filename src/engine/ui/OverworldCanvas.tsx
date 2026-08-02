"use client";

/**
 * OverworldCanvas — renders the game world using HTML5 Canvas
 * Handles tile map rendering, player sprite, NPCs, and camera
 */
import { useRef, useEffect, useCallback } from "react";
import { useGameStore, type MapData, type Direction } from "@/engine/store";
import { gameEngine } from "@/engine/engine";

const TILE_SIZE = 16;
const SCALE = 3; // Scale factor for visibility
const SCALED_TILE = TILE_SIZE * SCALE;

// Direction offsets for sprite facing
const DIR_OFFSETS: Record<Direction, { x: number; y: number }> = {
  down: { x: 0, y: 0 },
  up: { x: 0, y: 1 },
  left: { x: 1, y: 0 },
  right: { x: 2, y: 0 },
};

export default function OverworldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentMap = useGameStore((s) => s.currentMap);
  const player = useGameStore((s) => s.player);
  const phase = useGameStore((s) => s.phase);

  // Resize canvas to fill viewport
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gameEngine.camera.setSize(canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Set map size on camera when map changes
  useEffect(() => {
    if (currentMap) {
      gameEngine.camera.setMapSize(currentMap.width, currentMap.height);
    }
  }, [currentMap]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!currentMap) {
        // Loading screen
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "24px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Loading...", canvas.width / 2, canvas.height / 2);
        animFrameId = requestAnimationFrame(render);
        return;
      }

      const cam = gameEngine.camera;

      // Draw tiles
      drawTileMap(ctx, currentMap, cam.x, cam.y, canvas.width, canvas.height);

      // Draw NPCs
      drawNPCs(ctx, currentMap, cam.x, cam.y);

      // Draw player
      drawPlayer(ctx, player.position, player.direction, player.moving, cam.x, cam.y);

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameId);
  }, [currentMap, player]);

  // Show canvas whenever a map is loaded (don't stay blank if phase lags behind).
  const showCanvas =
    !!currentMap &&
    (phase === "overworld" || phase === "dialogue" || phase === "loading");

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{
        imageRendering: "pixelated",
        display: showCanvas ? "block" : "none",
      }}
    />
  );
}

// ─── Drawing Functions ───────────────────────────────────────────

function drawTileMap(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  camX: number,
  camY: number,
  viewWidth: number,
  viewHeight: number
) {
  // Calculate visible tile range
  const startCol = Math.max(0, Math.floor(camX / TILE_SIZE) - 1);
  const startRow = Math.max(0, Math.floor(camY / TILE_SIZE) - 1);
  const endCol = Math.min(map.width, Math.ceil((camX + viewWidth) / TILE_SIZE) + 1);
  const endRow = Math.min(map.height, Math.ceil((camY + viewHeight) / TILE_SIZE) + 1);

  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const tileId = map.tiles[row]?.[col] ?? 0;
      const screenX = col * TILE_SIZE - camX;
      const screenY = row * TILE_SIZE - camY;

      // DEMO_SANDBOX / WorldMap logic tiles: 0 = walkable grass (not void)
      const color = getTileColor(tileId);
      ctx.fillStyle = color;
      ctx.fillRect(screenX * SCALE, screenY * SCALE, SCALED_TILE, SCALED_TILE);
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.strokeRect(screenX * SCALE, screenY * SCALE, SCALED_TILE, SCALED_TILE);

      // Draw collision overlay (debug)
      if (map.collision[row]?.[col]) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
        ctx.fillRect(screenX * SCALE, screenY * SCALE, SCALED_TILE, SCALED_TILE);
      }
    }
  }
}

function drawNPCs(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  camX: number,
  camY: number
) {
  for (const npc of map.npcs) {
    const screenX = npc.x * TILE_SIZE - camX;
    const screenY = npc.y * TILE_SIZE - camY;

    // Draw NPC as colored rectangle with name (placeholder for sprite)
    ctx.fillStyle = "#4a9";
    ctx.fillRect(screenX * SCALE, screenY * SCALE, SCALED_TILE, SCALED_TILE);

    // NPC name label
    ctx.fillStyle = "#fff";
    ctx.font = `${10 * SCALE}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(
      npc.name,
      screenX * SCALE + SCALED_TILE / 2,
      screenY * SCALE - 4 * SCALE
    );
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  position: { x: number; y: number },
  direction: Direction,
  moving: boolean,
  camX: number,
  camY: number
) {
  const screenX = position.x * TILE_SIZE - camX;
  const screenY = position.y * TILE_SIZE - camY;

  // Player body
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(screenX * SCALE, screenY * SCALE, SCALED_TILE, SCALED_TILE);

  // Direction indicator
  const offset = DIR_OFFSETS[direction];
  ctx.fillStyle = "#60a5fa";
  ctx.fillRect(
    (screenX + offset.x * 0.3) * SCALE,
    (screenY + offset.y * 0.3) * SCALE,
    SCALED_TILE * 0.4,
    SCALED_TILE * 0.4
  );

  // Player label
  ctx.fillStyle = "#fff";
  ctx.font = `${10 * SCALE}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText("Player", screenX * SCALE + SCALED_TILE / 2, screenY * SCALE - 4 * SCALE);
}

function getTileColor(tileId: number): string {
  // WorldMap logic-tile palette (aligned with DEMO_SANDBOX / MapLogicTile ids)
  const colors: Record<number, string> = {
    0: "#3d8b4f",  // walkable grass
    1: "#3a3f45",  // solid wall
    2: "#1f7a32",  // tall grass (encounter)
    3: "#d4a017",  // gate A
    4: "#b8860b",  // gate B
    5: "#6b4423",  // tree
    6: "#8d6e63",  // ore
    7: "#e6c35c",  // shop
    8: "#5dade2",  // clinic
    9: "#7f8c8d",  // crafting
    10: "#2980b9", // fishing
    11: "#556b2f", // bramble
    12: "#4a4a8a", // base hub
  };
  return colors[tileId] || "#333";
}