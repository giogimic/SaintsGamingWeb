/**
 * Map Editor WebGL - Tile-based map editor using PixiJS
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';

interface TileInfo {
  tileId: number;
  name: string;
  tilesetName: string;
  tilesetPath: string;
  srcX: number;
  srcY: number;
  width: number;
  height: number;
  category: string;
  terrainType: string;
}

interface MapEditorProps {
  mapId?: string;
  onSave?: (mapData: any) => void;
}

export default function MapEditorWebGL({ mapId = 'route_1', onSave }: MapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const [selectedTile, setSelectedTile] = useState<number>(1);
  const [tileRegistry, setTileRegistry] = useState<Map<number, TileInfo>>(new Map());
  const [mapGrid, setMapGrid] = useState<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load tile registry
  useEffect(() => {
    const loadRegistry = async () => {
      try {
        const response = await fetch('/api/tile-registry');
        const tiles: TileInfo[] = await response.json();
        const registry = new Map<number, TileInfo>();
        tiles.forEach(tile => registry.set(tile.tileId, tile));
        setTileRegistry(registry);
      } catch (error) {
        console.error('Failed to load tile registry:', error);
      }
    };
    loadRegistry();
  }, []);

  // Initialize PixiJS editor
  useEffect(() => {
    if (!canvasRef.current || tileRegistry.size === 0) return;

    const app = new Application({
      view: canvasRef.current,
      width: 800,
      height: 600,
      backgroundColor: 0x2a2a2a,
      resolution: window.devicePixelRatio || 1,
      antialias: false,
    });

    appRef.current = app;

    // Create map container
    const mapContainer = new Container();
    app.stage.addChild(mapContainer);

    // Initialize empty map (20x15)
    const width = 20;
    const height = 15;
    const grid: number[][] = [];
    for (let y = 0; y < height; y++) {
      grid[y] = [];
      for (let x = 0; x < width; x++) {
        grid[y][x] = 0; // Empty tile
      }
    }
    setMapGrid(grid);

    // Render map
    const renderMap = () => {
      mapContainer.removeChildren();
      
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          const tileId = grid[y][x];
          const tileInfo = tileRegistry.get(tileId);
          
          if (tileInfo) {
            // Draw tile from atlas
            const tileSprite = new Graphics();
            tileSprite.beginFill(0x4ade80); // Green for grass
            tileSprite.drawRect(x * 32, y * 32, 32, 32);
            tileSprite.endFill();
            mapContainer.addChild(tileSprite);
          } else {
            // Empty tile
            const emptyTile = new Graphics();
            emptyTile.beginFill(0x3a3a3a);
            emptyTile.drawRect(x * 32, y * 32, 32, 32);
            emptyTile.endFill();
            mapContainer.addChild(emptyTile);
          }
        }
      }

      // Draw grid lines
      const gridLines = new Graphics();
      gridLines.lineStyle(1, 0x555555, 0.5);
      for (let x = 0; x <= width; x++) {
        gridLines.moveTo(x * 32, 0);
        gridLines.lineTo(x * 32, height * 32);
      }
      for (let y = 0; y <= height; y++) {
        gridLines.moveTo(0, y * 32);
        gridLines.lineTo(width * 32, y * 32);
      }
      mapContainer.addChild(gridLines);
    };

    renderMap();

    // Mouse interaction
    const handleMouseDown = (e: any) => {
      setIsDrawing(true);
      const pos = app.stage.toLocal(e.global);
      paintTile(Math.floor(pos.x / 32), Math.floor(pos.y / 32));
    };

    const handleMouseMove = (e: any) => {
      if (!isDrawing) return;
      const pos = app.stage.toLocal(e.global);
      paintTile(Math.floor(pos.x / 32), Math.floor(pos.y / 32));
    };

    const handleMouseUp = () => {
      setIsDrawing(false);
    };

    const paintTile = (tileX: number, tileY: number) => {
      if (tileX < 0 || tileX >= 20 || tileY < 0 || tileY >= 15) return;

      const newGrid = [...mapGrid];
      
      // Apply brush size
      for (let dy = 0; dy < brushSize; dy++) {
        for (let dx = 0; dx < brushSize; dx++) {
          const ny = tileY + dy;
          const nx = tileX + dx;
          if (ny < 15 && nx < 20) {
            newGrid[ny][nx] = selectedTile;
          }
        }
      }
      
      setMapGrid(newGrid);
      renderMap();
    };

    app.stage.interactive = true;
    app.stage.on('pointerdown', handleMouseDown);
    app.stage.on('pointermove', handleMouseMove);
    app.stage.on('pointerup', handleMouseUp);
    app.stage.on('pointerupoutside', handleMouseUp);

    return () => {
      app.destroy();
    };
  }, [tileRegistry, selectedTile, brushSize, isDrawing]);

  const handleSave = () => {
    onSave?.({
      id: mapId,
      grid: mapGrid,
      width: 20,
      height: 15,
    });
  };

  const categories = ['all', 'outdoor_grass', 'outdoor_tree', 'indoor_floor', 'cave', 'water'];

  return (
    <div className="flex gap-4 p-4 bg-gray-900 text-white">
      {/* Editor Canvas */}
      <div className="flex-1">
        <canvas ref={canvasRef} className="border-2 border-gray-700" />
      </div>

      {/* Tile Palette */}
      <div className="w-64 space-y-4">
        <div>
          <label className="block text-sm font-bold mb-2">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Brush Size</label>
          <div className="flex gap-2">
            {[1, 2, 3].map(size => (
              <button
                key={size}
                onClick={() => setBrushSize(size as 1 | 2 | 3)}
                className={`flex-1 px-3 py-1 rounded ${
                  brushSize === size ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                {size}x{size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Tiles</label>
          <div className="grid grid-cols-4 gap-1 max-h-96 overflow-y-auto">
            {Array.from(tileRegistry.entries())
              .filter(([_, tile]) => selectedCategory === 'all' || tile.category === selectedCategory)
              .slice(0, 100)
              .map(([tileId, tile]) => (
                <button
                  key={tileId}
                  onClick={() => setSelectedTile(tileId)}
                  className={`w-12 h-12 rounded border-2 ${
                    selectedTile === tileId ? 'border-blue-500' : 'border-gray-700'
                  }`}
                  style={{ backgroundColor: tile.terrainType === 'grass' ? '#4ade80' : '#3a3a3a' }}
                  title={`${tile.name} (${tile.terrainType})`}
                />
              ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
        >
          Save Map
        </button>
      </div>
    </div>
  );
}