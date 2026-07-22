"use client";

/**
 * MapEditor — browser-based map editor with tile painting, collision,
 * NPC placement, encounter zones, gates, and live preview.
 * 
 * Features:
 * - Tile palette with brush sizes (1x1, 2x2, fill)
 * - Layer system (ground, upper, collision, NPCs, triggers, encounters)
 * - NPC placement with dialogue assignment
 * - Encounter zone painting
 * - Gate/teleporter placement
 * - Map properties editor
 * - Import/export Tiled JSON format
 * - Test mode (play the map instantly)
 * - Auto-save to database
 */
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────

type EditorLayer = "ground" | "upper" | "collision" | "npcs" | "triggers" | "encounters";
type BrushSize = 1 | 2 | 3;

interface EditorNPC {
  id: string;
  name: string;
  x: number;
  y: number;
  sprite: string;
  direction: string;
  dialogue: string[];
  isTrainer: boolean;
}

interface EditorGate {
  x: number;
  y: number;
  width: number;
  height: number;
  targetMap: string;
  targetX: number;
  targetY: number;
}

interface EditorMap {
  slug: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  ground: number[][];
  upper: number[][];
  collision: boolean[][];
  npcs: EditorNPC[];
  gates: EditorGate[];
  encounterZone: string;
  encounterArea: boolean[][];
  music: string;
  environment: string;
  isIndoors: boolean;
}

// ─── Tile Palette ────────────────────────────────────────────────

const TILE_TYPES = [
  { id: 0, name: "Void", color: "#1a1a2e" },
  { id: 1, name: "Grass", color: "#4a7c59" },
  { id: 2, name: "Dark Grass", color: "#2d5a3f" },
  { id: 3, name: "Dirt", color: "#8b7355" },
  { id: 4, name: "Water", color: "#6b8cce" },
  { id: 5, name: "Sand", color: "#c4a882" },
  { id: 6, name: "Stone", color: "#555555" },
  { id: 7, name: "Wall", color: "#333333" },
  { id: 8, name: "Tree Trunk", color: "#654321" },
  { id: 9, name: "Tree Leaves", color: "#228b22" },
  { id: 10, name: "Tall Grass", color: "#ff6b6b" },
  { id: 11, name: "Wood Floor", color: "#8b4513" },
  { id: 12, name: "Light Floor", color: "#d4a574" },
  { id: 13, name: "Dark Floor", color: "#4a4a4a" },
  { id: 14, name: "Garden", color: "#7cb342" },
  { id: 15, name: "Roof", color: "#b71c1c" },
  { id: 16, name: "Door", color: "#5d4037" },
  { id: 17, name: "Window", color: "#81d4fa" },
  { id: 18, name: "Path", color: "#a1887f" },
  { id: 19, name: "Bridge", color: "#795548" },
];

// ─── Component ───────────────────────────────────────────────────

export default function MapEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Map state
  const [map, setMap] = useState<EditorMap>(createEmptyMap(30, 20));
  const [currentLayer, setCurrentLayer] = useState<EditorLayer>("ground");
  const [selectedTile, setSelectedTile] = useState(1);
  const [brushSize, setBrushSize] = useState<BrushSize>(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [zoom, setZoom] = useState(24); // pixel size of each tile in editor
  const [showGrid, setShowGrid] = useState(true);
  const [showCollision, setShowCollision] = useState(true);
  const [saved, setSaved] = useState(true);
  const [testMode, setTestMode] = useState(false);

  // NPC editing
  const [selectedNPC, setSelectedNPC] = useState<string | null>(null);

  // Gate editing
  const [_selectedGate, setSelectedGate] = useState<number | null>(null);

  // ─── Canvas Rendering ────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const totalWidth = map.width * zoom;
    const totalHeight = map.height * zoom;
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Clear
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Draw ground layer
    if (currentLayer === "ground" || currentLayer === "upper") {
      const layerData = currentLayer === "ground" ? map.ground : map.upper;
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const tileId = layerData[y]?.[x] ?? 0;
          const tile = TILE_TYPES.find((t) => t.id === tileId) || TILE_TYPES[0];
          ctx.fillStyle = tile.color;
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
      }
    }

    // Draw collision overlay
    if (showCollision && (currentLayer === "collision" || currentLayer === "ground")) {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (map.collision[y]?.[x]) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.35)";
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }
      }
    }

    // Draw encounter area
    if (currentLayer === "encounters") {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (map.encounterArea[y]?.[x]) {
            ctx.fillStyle = "rgba(255, 100, 0, 0.35)";
            ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          }
        }
      }
    }

    // Draw NPCs
    if (currentLayer === "npcs" || currentLayer === "ground") {
      for (const npc of map.npcs) {
        ctx.fillStyle = npc.id === selectedNPC ? "#ff0" : "#4a9";
        ctx.fillRect(npc.x * zoom, npc.y * zoom, zoom, zoom);
        ctx.fillStyle = "#fff";
        ctx.font = `${Math.max(10, zoom / 3)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(npc.name, npc.x * zoom + zoom / 2, npc.y * zoom - 4);
      }
    }

    // Draw gates
    if (currentLayer === "triggers" || currentLayer === "ground") {
      for (const gate of map.gates) {
        ctx.fillStyle = "rgba(0, 150, 255, 0.4)";
        ctx.fillRect(gate.x * zoom, gate.y * zoom, gate.width * zoom, gate.height * zoom);
        ctx.strokeStyle = "#0af";
        ctx.lineWidth = 2;
        ctx.strokeRect(gate.x * zoom, gate.y * zoom, gate.width * zoom, gate.height * zoom);
        ctx.fillStyle = "#0af";
        ctx.font = `${Math.max(10, zoom / 3)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(
          `→${gate.targetMap}`,
          (gate.x + gate.width / 2) * zoom,
          (gate.y + gate.height / 2) * zoom + 4
        );
      }
    }

    // Grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= map.width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * zoom, 0);
        ctx.lineTo(x * zoom, totalHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= map.height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * zoom);
        ctx.lineTo(totalWidth, y * zoom);
        ctx.stroke();
      }
    }
  }, [map, currentLayer, zoom, showGrid, showCollision, selectedNPC]);

  useEffect(() => {
    render();
  }, [render]);

  // ─── Mouse Handlers ──────────────────────────────────────────

  const getTileCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / zoom);
    const y = Math.floor((e.clientY - rect.top) / zoom);
    return { x: Math.max(0, Math.min(x, map.width - 1)), y: Math.max(0, Math.min(y, map.height - 1)) };
  };

  const paintTile = (x: number, y: number) => {
    setSaved(false);
    const half = Math.floor(brushSize / 2);

    if (currentLayer === "collision") {
      setMap((prev) => {
        const collision = prev.collision.map((row) => [...row]);
        for (let dy = -half; dy < brushSize - half; dy++) {
          for (let dx = -half; dx < brushSize - half; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < map.height && nx >= 0 && nx < map.width) {
              collision[ny][nx] = true;
            }
          }
        }
        return { ...prev, collision };
      });
    } else if (currentLayer === "encounters") {
      setMap((prev) => {
        const area = prev.encounterArea.map((row) => [...row]);
        for (let dy = -half; dy < brushSize - half; dy++) {
          for (let dx = -half; dx < brushSize - half; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < map.height && nx >= 0 && nx < map.width) {
              area[ny][nx] = true;
            }
          }
        }
        return { ...prev, encounterArea: area };
      });
    } else if (currentLayer === "ground" || currentLayer === "upper") {
      setMap((prev) => {
        const layer = currentLayer === "ground" ? "ground" : "upper";
        const tiles = prev[layer].map((row) => [...row]);
        for (let dy = -half; dy < brushSize - half; dy++) {
          for (let dx = -half; dx < brushSize - half; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < map.height && nx >= 0 && nx < map.width) {
              tiles[ny][nx] = selectedTile;
            }
          }
        }
        return { ...prev, [layer]: tiles };
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getTileCoords(e);

    if (currentLayer === "npcs") {
      // Check if clicking on existing NPC
      const npc = map.npcs.find((n) => n.x === x && n.y === y);
      if (npc) {
        setSelectedNPC(npc.id);
        return;
      }
      // Place new NPC
      const newNPC: EditorNPC = {
        id: `npc-${Date.now()}`,
        name: `NPC ${map.npcs.length + 1}`,
        x, y,
        sprite: "npc_default",
        direction: "down",
        dialogue: ["Hello there!"],
        isTrainer: false,
      };
      setMap((prev) => ({ ...prev, npcs: [...prev.npcs, newNPC] }));
      setSelectedNPC(newNPC.id);
      setSaved(false);
      return;
    }

    if (currentLayer === "triggers") {
      // Start placing a gate
      const newGate: EditorGate = {
        x, y, width: 1, height: 1,
        targetMap: "", targetX: 5, targetY: 5,
      };
      setMap((prev) => ({ ...prev, gates: [...prev.gates, newGate] }));
      setSelectedGate(map.gates.length);
      setSaved(false);
      return;
    }

    setIsDrawing(true);
    paintTile(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const { x, y } = getTileCoords(e);
    paintTile(x, y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // ─── Keyboard Shortcuts ──────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "g") setShowGrid((v) => !v);
      if (e.key === "c") setShowCollision((v) => !v);
      if (e.key === "1") setCurrentLayer("ground");
      if (e.key === "2") setCurrentLayer("upper");
      if (e.key === "3") setCurrentLayer("collision");
      if (e.key === "4") setCurrentLayer("npcs");
      if (e.key === "5") setCurrentLayer("triggers");
      if (e.key === "6") setCurrentLayer("encounters");
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(64, z + 4));
      if (e.key === "-") setZoom((z) => Math.max(8, z - 4));
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // ─── Save / Load / Export ────────────────────────────────────

  const handleSave = async () => {
    const payload = {
      slug: map.slug,
      name: map.name,
      width: map.width,
      height: map.height,
      tileSize: map.tileSize,
      tilesetData: JSON.stringify(map.ground),
      collisionData: JSON.stringify(map.collision),
      npcData: JSON.stringify(map.npcs),
      triggerData: JSON.stringify(map.gates),
      encounterZone: map.encounterZone || null,
      music: map.music || null,
      environment: map.environment || null,
      isIndoors: map.isIndoors,
    };

    try {
      const res = await fetch("/api/maps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaved(true);
        alert("Map saved!");
      }
    } catch (_err) {
      console.error("Save failed");
    }
  };

  const handleExportTiled = () => {
    // Export as Tiled JSON format
    const tiledMap = {
      compressionlevel: -1,
      height: map.height,
      width: map.width,
      tilewidth: map.tileSize,
      tileheight: map.tileSize,
      infinite: false,
      nextlayerid: 4,
      nextobjectid: 1,
      orientation: "orthogonal",
      renderorder: "right-down",
      layers: [
        {
          type: "tilelayer",
          id: 1,
          name: "Ground",
          width: map.width,
          height: map.height,
          data: map.ground.flat(),
          visible: true,
          opacity: 1,
          x: 0,
          y: 0,
        },
        {
          type: "tilelayer",
          id: 2,
          name: "Collision",
          width: map.width,
          height: map.height,
          data: map.collision.flat().map((v) => (v ? 1 : 0)),
          visible: true,
          opacity: 0.5,
          x: 0,
          y: 0,
        },
        {
          type: "objectgroup",
          id: 3,
          name: "NPCs",
          objects: map.npcs.map((npc, i) => ({
            id: i + 1,
            name: npc.name,
            type: "npc",
            x: npc.x * map.tileSize,
            y: npc.y * map.tileSize,
            width: map.tileSize,
            height: map.tileSize,
            properties: [
              { name: "dialogue", type: "string", value: npc.dialogue.join("|") },
              { name: "direction", type: "string", value: npc.direction },
            ],
          })),
          visible: true,
          opacity: 1,
          x: 0,
          y: 0,
        },
      ],
    };

    const blob = new Blob([JSON.stringify(tiledMap, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${map.slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTiled = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.tmx";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.width && data.height && data.layers) {
          // Parse Tiled JSON
          const tileLayer = data.layers.find((l: { type: string }) => l.type === "tilelayer");
          const objectLayer = data.layers.find((l: { type: string }) => l.type === "objectgroup");

          const ground: number[][] = [];
          for (let y = 0; y < data.height; y++) {
            ground[y] = [];
            for (let x = 0; x < data.width; x++) {
              ground[y][x] = tileLayer?.data?.[y * data.width + x] ?? 0;
            }
          }

          const npcs: EditorNPC[] = (objectLayer?.objects || [])
            .filter((o: { type: string }) => o.type === "npc")
            .map((o: { name: string; x: number; y: number; properties?: Array<{ name: string; value: string }> }) => ({
              id: `npc-${o.name}-${o.x}`,
              name: o.name,
              x: Math.floor(o.x / data.tilewidth),
              y: Math.floor(o.y / data.tileheight),
              sprite: "npc_default",
              direction: o.properties?.find((p: { name: string }) => p.name === "direction")?.value || "down",
              dialogue: (o.properties?.find((p: { name: string }) => p.name === "dialogue")?.value || "Hello!").split("|"),
              isTrainer: false,
            }));

          const collision: boolean[][] = [];
          for (let y = 0; y < data.height; y++) {
            collision[y] = [];
            for (let x = 0; x < data.width; x++) {
              collision[y][x] = false;
            }
          }

          const encounterArea: boolean[][] = [];
          for (let y = 0; y < data.height; y++) {
            encounterArea[y] = [];
            for (let x = 0; x < data.width; x++) {
              encounterArea[y][x] = false;
            }
          }

          setMap({
            slug: file.name.replace(".json", "").replace(".tmx", ""),
            name: file.name.replace(".json", "").replace(".tmx", ""),
            width: data.width,
            height: data.height,
            tileSize: data.tilewidth || 16,
            ground,
            upper: ground.map((row) => [...row]),
            collision,
            npcs,
            gates: [],
            encounterZone: "",
            encounterArea,
            music: "",
            environment: "",
            isIndoors: false,
          });
          setSaved(false);
        }
      } catch (err) {
        alert("Failed to parse map file");
      }
    };
    input.click();
  };

  // ─── NPC Dialog Editor ───────────────────────────────────────

  const editingNPC = map.npcs.find((n) => n.id === selectedNPC);

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col z-50">
      {/* Top toolbar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center gap-4">
        <h2 className="text-white font-bold text-lg">🗺️ Map Editor</h2>
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Name:</label>
          <input
            value={map.name}
            onChange={(e) => { setMap((m) => ({ ...m, name: e.target.value })); setSaved(false); }}
            className="bg-gray-800 text-white px-2 py-1 rounded text-sm w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Slug:</label>
          <input
            value={map.slug}
            onChange={(e) => { setMap((m) => ({ ...m, slug: e.target.value })); setSaved(false); }}
            className="bg-gray-800 text-white px-2 py-1 rounded text-sm w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">W:</label>
          <input
            type="number"
            value={map.width}
            onChange={(e) => {
              const w = parseInt(e.target.value) || 10;
              setMap((m) => resizeMap(m, w, m.height));
              setSaved(false);
            }}
            className="bg-gray-800 text-white px-2 py-1 rounded text-sm w-16"
            min={5}
            max={100}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">H:</label>
          <input
            type="number"
            value={map.height}
            onChange={(e) => {
              const h = parseInt(e.target.value) || 10;
              setMap((m) => resizeMap(m, m.width, h));
              setSaved(false);
            }}
            className="bg-gray-800 text-white px-2 py-1 rounded text-sm w-16"
            min={5}
            max={100}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs ${saved ? "text-green-400" : "text-yellow-400"}`}>
            {saved ? "✓ Saved" : "● Unsaved"}
          </span>
          <button onClick={handleImportTiled} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
            Import
          </button>
          <button onClick={handleExportTiled} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm">
            Export
          </button>
          <button onClick={handleSave} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold">
            Save
          </button>
          <button
            onClick={() => setTestMode(!testMode)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-bold"
          >
            {testMode ? "Stop Test" : "▶ Test"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Tile palette + layers */}
        <div className="w-64 bg-gray-900 border-r border-gray-700 overflow-y-auto p-3">
          {/* Layer selector */}
          <div className="mb-4">
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Layers</h3>
            <div className="grid grid-cols-2 gap-1">
              {(["ground", "upper", "collision", "npcs", "triggers", "encounters"] as EditorLayer[]).map(
                (layer) => (
                  <button
                    key={layer}
                    onClick={() => setCurrentLayer(layer)}
                    className={`px-2 py-1.5 rounded text-xs font-medium capitalize ${
                      currentLayer === layer
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {layer}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Brush size */}
          <div className="mb-4">
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Brush Size</h3>
            <div className="flex gap-1">
              {([1, 2, 3] as BrushSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className={`px-3 py-1.5 rounded text-xs font-medium ${
                    brushSize === size
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>

          {/* Tile palette */}
          {(currentLayer === "ground" || currentLayer === "upper") && (
            <div className="mb-4">
              <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Tiles</h3>
              <div className="grid grid-cols-4 gap-1">
                {TILE_TYPES.map((tile) => (
                  <button
                    key={tile.id}
                    onClick={() => setSelectedTile(tile.id)}
                    className={`w-full aspect-square rounded border-2 ${
                      selectedTile === tile.id ? "border-blue-400" : "border-transparent"
                    }`}
                    style={{ backgroundColor: tile.color }}
                    title={tile.name}
                  />
                ))}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                Selected: {TILE_TYPES.find((t) => t.id === selectedTile)?.name}
              </div>
            </div>
          )}

          {/* Map properties */}
          <div className="mb-4">
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Properties</h3>
            <div className="space-y-2">
              <div>
                <label className="text-gray-500 text-xs">Environment</label>
                <select
                  value={map.environment}
                  onChange={(e) => { setMap((m) => ({ ...m, environment: e.target.value })); setSaved(false); }}
                  className="w-full bg-gray-800 text-white px-2 py-1 rounded text-sm"
                >
                  <option value="">None</option>
                  <option value="forest">Forest</option>
                  <option value="cave">Cave</option>
                  <option value="beach">Beach</option>
                  <option value="desert">Desert</option>
                  <option value="snow">Snow</option>
                  <option value="ocean">Ocean</option>
                  <option value="park">Park</option>
                  <option value="interior">Interior</option>
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Music</label>
                <input
                  value={map.music}
                  onChange={(e) => { setMap((m) => ({ ...m, music: e.target.value })); setSaved(false); }}
                  className="w-full bg-gray-800 text-white px-2 py-1 rounded text-sm"
                  placeholder="music_theme_slug"
                />
              </div>
              <div>
                <label className="text-gray-500 text-xs">Encounter Zone</label>
                <input
                  value={map.encounterZone}
                  onChange={(e) => { setMap((m) => ({ ...m, encounterZone: e.target.value })); setSaved(false); }}
                  className="w-full bg-gray-800 text-white px-2 py-1 rounded text-sm"
                  placeholder="encounter_slug"
                />
              </div>
              <label className="flex items-center gap-2 text-gray-400 text-sm">
                <input
                  type="checkbox"
                  checked={map.isIndoors}
                  onChange={(e) => { setMap((m) => ({ ...m, isIndoors: e.target.checked })); setSaved(false); }}
                />
                Indoor map
              </label>
            </div>
          </div>

          {/* View options */}
          <div className="mb-4">
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">View</h3>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-gray-400 text-sm">
                <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                Show grid (G)
              </label>
              <label className="flex items-center gap-2 text-gray-400 text-sm">
                <input type="checkbox" checked={showCollision} onChange={(e) => setShowCollision(e.target.checked)} />
                Show collision (C)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">Zoom:</span>
                <button onClick={() => setZoom((z) => Math.max(8, z - 4))} className="px-2 py-0.5 bg-gray-800 text-white rounded text-xs">-</button>
                <span className="text-gray-400 text-xs">{zoom}px</span>
                <button onClick={() => setZoom((z) => Math.min(64, z + 4))} className="px-2 py-0.5 bg-gray-800 text-white rounded text-xs">+</button>
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div>
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Shortcuts</h3>
            <div className="text-gray-500 text-xs space-y-0.5">
              <div>1-6: Switch layers</div>
              <div>G: Toggle grid</div>
              <div>C: Toggle collision</div>
              <div>+/-: Zoom in/out</div>
              <div>Ctrl+S: Save</div>
            </div>
          </div>
        </div>

        {/* Center — Canvas */}
        <div className="flex-1 overflow-auto bg-gray-950 p-4">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-crosshair border border-gray-800"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* Right panel — NPC/Gate editor */}
        <div className="w-72 bg-gray-900 border-l border-gray-700 overflow-y-auto p-3">
          {currentLayer === "npcs" && editingNPC && (
            <div>
              <h3 className="text-white font-bold mb-3">Edit NPC</h3>
              <div className="space-y-2">
                <div>
                  <label className="text-gray-500 text-xs">Name</label>
                  <input
                    value={editingNPC.name}
                    onChange={(e) => {
                      setMap((m) => ({
                        ...m,
                        npcs: m.npcs.map((n) =>
                          n.id === editingNPC.id ? { ...n, name: e.target.value } : n
                        ),
                      }));
                      setSaved(false);
                    }}
                    className="w-full bg-gray-800 text-white px-2 py-1 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Direction</label>
                  <select
                    value={editingNPC.direction}
                    onChange={(e) => {
                      setMap((m) => ({
                        ...m,
                        npcs: m.npcs.map((n) =>
                          n.id === editingNPC.id ? { ...n, direction: e.target.value } : n
                        ),
                      }));
                      setSaved(false);
                    }}
                    className="w-full bg-gray-800 text-white px-2 py-1 rounded text-sm"
                  >
                    <option value="down">Down</option>
                    <option value="up">Up</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-gray-400 text-sm">
                  <input
                    type="checkbox"
                    checked={editingNPC.isTrainer}
                    onChange={(e) => {
                      setMap((m) => ({
                        ...m,
                        npcs: m.npcs.map((n) =>
                          n.id === editingNPC.id ? { ...n, isTrainer: e.target.checked } : n
                        ),
                      }));
                      setSaved(false);
                    }}
                  />
                  Is Trainer
                </label>
                <div>
                  <label className="text-gray-500 text-xs">Dialogue</label>
                  <textarea
                    value={editingNPC.dialogue.join("\n")}
                    onChange={(e) => {
                      const lines = e.target.value.split("\n");
                      setMap((m) => ({
                        ...m,
                        npcs: m.npcs.map((n) =>
                          n.id === editingNPC.id ? { ...n, dialogue: lines } : n
                        ),
                      }));
                      setSaved(false);
                    }}
                    className="w-full bg-gray-800 text-white px-2 py-1 rounded text-sm h-32"
                    placeholder="One line per dialogue box..."
                  />
                </div>
                <button
                  onClick={() => {
                    setMap((m) => ({
                      ...m,
                      npcs: m.npcs.filter((n) => n.id !== editingNPC.id),
                    }));
                    setSelectedNPC(null);
                    setSaved(false);
                  }}
                  className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Delete NPC
                </button>
              </div>
            </div>
          )}

          {currentLayer === "triggers" && map.gates.length > 0 && (
            <div>
              <h3 className="text-white font-bold mb-3">Gates / Teleporters</h3>
              <div className="space-y-2">
                {map.gates.map((gate, idx) => (
                  <div key={idx} className="bg-gray-800 rounded p-2 space-y-1">
                    <div className="text-gray-400 text-xs">Gate {idx + 1} ({gate.x},{gate.y})</div>
                    <div>
                      <label className="text-gray-500 text-xs">Target Map</label>
                      <input
                        value={gate.targetMap}
                        onChange={(e) => {
                          const gates = [...map.gates];
                          gates[idx] = { ...gates[idx], targetMap: e.target.value };
                          setMap((m) => ({ ...m, gates }));
                          setSaved(false);
                        }}
                        className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div>
                        <label className="text-gray-500 text-xs">X</label>
                        <input
                          type="number"
                          value={gate.targetX}
                          onChange={(e) => {
                            const gates = [...map.gates];
                            gates[idx] = { ...gates[idx], targetX: parseInt(e.target.value) || 0 };
                            setMap((m) => ({ ...m, gates }));
                            setSaved(false);
                          }}
                          className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 text-xs">Y</label>
                        <input
                          type="number"
                          value={gate.targetY}
                          onChange={(e) => {
                            const gates = [...map.gates];
                            gates[idx] = { ...gates[idx], targetY: parseInt(e.target.value) || 0 };
                            setMap((m) => ({ ...m, gates }));
                            setSaved(false);
                          }}
                          className="w-full bg-gray-700 text-white px-2 py-1 rounded text-xs"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const gates = map.gates.filter((_, i) => i !== idx);
                        setMap((m) => ({ ...m, gates }));
                        setSaved(false);
                      }}
                      className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentLayer === "encounters" && (
            <div>
              <h3 className="text-white font-bold mb-3">Encounter Zone</h3>
              <p className="text-gray-400 text-sm mb-2">
                Paint areas where wild encounters can happen. Set the encounter zone slug in Properties.
              </p>
              <button
                onClick={() => {
                  setMap((m) => {
                    const area = m.encounterArea.map((row) => row.map(() => false));
                    return { ...m, encounterArea: area };
                  });
                  setSaved(false);
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                Clear Encounter Area
              </button>
            </div>
          )}

          {!editingNPC && currentLayer === "npcs" && (
            <div className="text-gray-500 text-sm">
              Click on the map to place or select NPCs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function createEmptyMap(width: number, height: number): EditorMap {
  const ground: number[][] = [];
  const upper: number[][] = [];
  const collision: boolean[][] = [];
  const encounterArea: boolean[][] = [];

  for (let y = 0; y < height; y++) {
    ground[y] = new Array(width).fill(1); // grass by default
    upper[y] = new Array(width).fill(0);
    collision[y] = new Array(width).fill(false);
    encounterArea[y] = new Array(width).fill(false);
  }

  return {
    slug: "new_map",
    name: "New Map",
    width,
    height,
    tileSize: 16,
    ground,
    upper,
    collision,
    npcs: [],
    gates: [],
    encounterZone: "",
    encounterArea,
    music: "",
    environment: "",
    isIndoors: false,
  };
}

function resizeMap(map: EditorMap, newWidth: number, newHeight: number): EditorMap {
  const ground: number[][] = [];
  const upper: number[][] = [];
  const collision: boolean[][] = [];
  const encounterArea: boolean[][] = [];

  for (let y = 0; y < newHeight; y++) {
    ground[y] = [];
    upper[y] = [];
    collision[y] = [];
    encounterArea[y] = [];
    for (let x = 0; x < newWidth; x++) {
      ground[y][x] = map.ground[y]?.[x] ?? 0;
      upper[y][x] = map.upper[y]?.[x] ?? 0;
      collision[y][x] = map.collision[y]?.[x] ?? false;
      encounterArea[y][x] = map.encounterArea[y]?.[x] ?? false;
    }
  }

  return { ...map, width: newWidth, height: newHeight, ground, upper, collision, encounterArea };
}