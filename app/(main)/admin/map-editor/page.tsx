'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { saveWorldMap } from '@/app/actions/game-admin';
import { GAME_MAPS } from '@/components/cyber-terminal/data/maps';
import { MAP_COLS, MAP_ROWS, TILE_SIZE } from '@/components/cyber-terminal/constants';

const TILE_TYPES = [
  { id: 0, name: 'Grass', color: '#22c55e' },
  { id: 1, name: 'Wall/Tree', color: '#166534' },
  { id: 2, name: 'Tall Grass', color: '#4ade80' },
  { id: 3, name: 'Gate (North)', color: '#9333ea' },
  { id: 4, name: 'Gate (South)', color: '#c084fc' },
  { id: 5, name: 'Woodcutting', color: '#b45309' },
  { id: 6, name: 'Mining', color: '#78716c' },
  { id: 7, name: 'Shop', color: '#eab308' },
  { id: 8, name: 'Clinic', color: '#ec4899' },
  { id: 9, name: 'NPC Spawner', color: '#3b82f6' },
  { id: 10, name: 'Fishing', color: '#0ea5e9' }
];

export default function MapEditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [mapId, setMapId] = useState('SAINTS_VILLAGE');
  const [mapName, setMapName] = useState('Saints Village');
  const [grid, setGrid] = useState<number[][]>([]);
  const [selectedTile, setSelectedTile] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize empty grid if nothing loaded
  useEffect(() => {
    if (grid.length === 0) {
      const initialMap = GAME_MAPS['SAINTS_VILLAGE'];
      if (initialMap) {
        setGrid(JSON.parse(JSON.stringify(initialMap.grid))); // Deep copy
      } else {
        const newGrid = Array(MAP_ROWS).fill(0).map(() => Array(MAP_COLS).fill(0));
        setGrid(newGrid);
      }
    }
  }, [grid.length]);

  // Draw Grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        const tileVal = grid[y][x];
        const tileInfo = TILE_TYPES.find(t => t.id === tileVal);
        
        ctx.fillStyle = tileInfo ? tileInfo.color : '#000';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Grid lines
        ctx.strokeStyle = '#ffffff20';
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }, [grid]);

  const paintTile = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor(((clientX - rect.left) * scaleX) / TILE_SIZE);
    const y = Math.floor(((clientY - rect.top) * scaleY) / TILE_SIZE);

    if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
      if (grid[y][x] !== selectedTile) {
        const newGrid = [...grid];
        newGrid[y][x] = selectedTile;
        setGrid(newGrid);
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // Dummy gates/npcs for now. We can build specific editors for them later.
    const result = await saveWorldMap({
      id: mapId,
      name: mapName,
      gridData: JSON.stringify(grid),
      gatesData: JSON.stringify({}),
      npcsData: JSON.stringify([])
    });

    if (result.success) {
      toast.success('Map saved successfully!');
    } else {
      toast.error(result.error || 'Failed to save map.');
    }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">World Map Editor</h1>
        <p className="text-muted-foreground">Visually construct MMO zones and push them live to the database.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Map Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Map ID</label>
              <Input value={mapId} onChange={e => setMapId(e.target.value)} placeholder="e.g. SAINTS_VILLAGE" />
            </div>
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <Input value={mapName} onChange={e => setMapName(e.target.value)} placeholder="e.g. Saints Village" />
            </div>
            
            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium block mb-2">Tile Palette</label>
              <div className="grid grid-cols-2 gap-2">
                {TILE_TYPES.map(tile => (
                  <Button 
                    key={tile.id}
                    variant={selectedTile === tile.id ? 'default' : 'outline'}
                    className="w-full justify-start h-8 text-xs px-2"
                    onClick={() => setSelectedTile(tile.id)}
                  >
                    <div className="w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: tile.color }} />
                    {tile.name}
                  </Button>
                ))}
              </div>
            </div>

            <Button className="w-full mt-4" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving to Database...' : 'Deploy Map'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle>Canvas Editor</CardTitle>
            <CardDescription>Click and drag to paint tiles. (Cols: {MAP_COLS}, Rows: {MAP_ROWS})</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-auto bg-zinc-950 flex items-center justify-center p-4">
            <canvas
              ref={canvasRef}
              width={grid[0] ? grid[0].length * TILE_SIZE : 800}
              height={grid.length ? grid.length * TILE_SIZE : 600}
              className="bg-black border border-zinc-800 cursor-crosshair max-w-full"
              onMouseDown={(e) => { setIsDrawing(true); paintTile(e); }}
              onMouseUp={() => setIsDrawing(false)}
              onMouseLeave={() => setIsDrawing(false)}
              onMouseMove={paintTile}
              onTouchStart={(e) => { setIsDrawing(true); paintTile(e); }}
              onTouchEnd={() => setIsDrawing(false)}
              onTouchMove={paintTile}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
