"use client";

/**
 * OverworldCanvas — renders the game world using HTML5 Canvas
 * Handles tile map rendering, player sprite, NPCs, and camera
 */
import { useRef, useEffect, useCallback } from "react";
import { useGameStore, type MapData, type Direction } from "@/lib/game/store";
import { gameEngine } from "@/lib/game/engine";

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

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{
        imageRendering: "pixelated",
        display: phase === "overworld" || phase === "dialogue" ? "block" : "none",
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

      if (tileId === 0) {
        // Empty/void tile — draw dark
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(screenX * SCALE, screenY * SCALE, SCALED_TILE, SCALED_TILE);
      } else {
        // Colored tile based on ID (placeholder — real implementation uses tileset image)
        const color = getTileColor(tileId);
        ctx.fillStyle = color;
        ctx.fillRect(screenX * SCALE, screenY * SCALE, SCALED_TILE, SCALED_TILE);

        // Grid lines for clarity
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.strokeRect(screenX * SCALE, screenY * SCALE, SCALED_TILE, SCALED_TILE);
      }

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
  // Placeholder tile colors — will be replaced with actual tileset rendering
  const colors: Record<number, string> = {
    1: "#4a7c59",  // grass
    2: "#2d5a3f",  // dark grass
    3: "#8b7355",  // dirt
    4: "#6b8cce",  // water
    5: "#c4a882",  // sand
    6: "#555",     // stone
    7: "#333",     // wall
    8: "#654321",  // tree trunk
    9: "#228b22",  // tree leaves
    10: "#ff6b6b", // tall grass (encounter zone)
    11: "#8b4513", // wooden floor
    12: "#d4a574", // light floor
    13: "#4a4a4a", // dark floor
    14: "#7cb342", // garden
  };
  return colors[tileId] || "#333";
}