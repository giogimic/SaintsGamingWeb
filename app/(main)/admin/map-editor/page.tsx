'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { saveWorldMap } from '@/app/actions/game-admin';
import { fetchAllGameQuests, fetchAllGameAssets } from '@/app/actions/game-dev';
import { GAME_MAPS } from '@/components/cyber-terminal/data/maps';
import { MAP_COLS, MAP_ROWS, TILE_SIZE } from '@/components/cyber-terminal/constants';
import { UserPlus, Layers, Save, Trash2 } from 'lucide-react';

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

interface PlacedNPC {
  id: string;
  name: string;
  spriteId: string;
  x: number;
  y: number;
  questId?: string;
}

export default function MapEditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [mapId, setMapId] = useState('SAINTS_VILLAGE');
  const [mapName, setMapName] = useState('Saints Village');
  const [grid, setGrid] = useState<number[][]>([]);
  const [placedNpcs, setPlacedNpcs] = useState<PlacedNPC[]>([]);
  
  // Editor mode
  const [editorMode, setEditorMode] = useState<'TILES' | 'NPCS'>('TILES');
  const [selectedTile, setSelectedTile] = useState(0);
  
  // NPC form placement state
  const [npcName, setNpcName] = useState('Village Elder');
  const [npcSpriteId, setNpcSpriteId] = useState('npc-1');
  const [selectedQuestId, setSelectedQuestId] = useState<string>('NONE');
  const [availableQuests, setAvailableQuests] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadDevData() {
      const qRes = await fetchAllGameQuests();
      if (qRes.success) setAvailableQuests(qRes.data);
      const aRes = await fetchAllGameAssets();
      if (aRes.success) setAvailableAssets(aRes.data);
    }
    loadDevData();
  }, []);

  // Initialize empty grid & map NPCs
  useEffect(() => {
    if (grid.length === 0) {
      const initialMap = GAME_MAPS['SAINTS_VILLAGE'];
      if (initialMap) {
        setGrid(JSON.parse(JSON.stringify(initialMap.grid)));
      } else {
        const newGrid = Array(MAP_ROWS).fill(0).map(() => Array(MAP_COLS).fill(0));
        setGrid(newGrid);
      }
    }
  }, [grid.length]);

  // Draw Grid & Placed NPCs
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw terrain tiles
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

    // Draw placed NPCs
    placedNpcs.forEach(npc => {
      const px = npc.x * TILE_SIZE;
      const py = npc.y * TILE_SIZE;

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // NPC Tag
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name.substring(0, 8), px + TILE_SIZE / 2, py - 4);

      if (npc.questId) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('!', px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 3);
      }
    });
  }, [grid, placedNpcs]);

  const paintTile = (e: React.MouseEvent | React.TouchEvent) => {
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
      if (editorMode === 'TILES') {
        if (!isDrawing) return;
        if (grid[y][x] !== selectedTile) {
          const newGrid = [...grid];
          newGrid[y][x] = selectedTile;
          setGrid(newGrid);
        }
      } else if (editorMode === 'NPCS') {
        // Place or overwrite NPC at coordinates
        const newNpc: PlacedNPC = {
          id: `npc_${Date.now()}`,
          name: npcName || 'Town NPC',
          spriteId: npcSpriteId || 'npc-1',
          x,
          y,
          questId: selectedQuestId !== 'NONE' ? selectedQuestId : undefined,
        };

        setPlacedNpcs(prev => [...prev.filter(n => !(n.x === x && n.y === y)), newNpc]);
        toast.success(`Placed NPC "${newNpc.name}" at (${x}, ${y})!`);
      }
    }
  };

  const handleRemoveNpc = (id: string) => {
    setPlacedNpcs(prev => prev.filter(n => n.id !== id));
    toast.success('NPC removed.');
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveWorldMap({
      id: mapId,
      name: mapName,
      gridData: JSON.stringify(grid),
      gatesData: JSON.stringify({}),
      npcsData: JSON.stringify(placedNpcs)
    });

    if (result.success) {
      toast.success('Map & Linked Quest NPCs saved successfully!');
    } else {
      toast.error(result.error || 'Failed to save map.');
    }
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">World Map & Quest NPC Editor</h1>
        <p className="text-muted-foreground">Visually construct MMO zones and anchor NPCs with linked quests directly to map tiles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Map & Mode Config</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Map ID</label>
              <Input value={mapId} onChange={e => setMapId(e.target.value)} placeholder="e.g. SAINTS_VILLAGE" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Display Name</label>
              <Input value={mapName} onChange={e => setMapName(e.target.value)} placeholder="e.g. Saints Village" />
            </div>

            {/* Mode Switcher */}
            <div className="pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Editor Tool Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={editorMode === 'TILES' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditorMode('TILES')}
                  className="gap-1 text-xs"
                >
                  <Layers className="h-3.5 w-3.5" /> Tile Painter
                </Button>
                <Button 
                  variant={editorMode === 'NPCS' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setEditorMode('NPCS')}
                  className="gap-1 text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Quest NPCs
                </Button>
              </div>
            </div>
            
            {editorMode === 'TILES' ? (
              <div className="pt-4 border-t border-border">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Tile Palette</label>
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
            ) : (
              <div className="pt-4 border-t border-border space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary block">NPC Placement Config</label>
                <div>
                  <label className="text-[10px] text-muted-foreground">NPC Name</label>
                  <Input value={npcName} onChange={e => setNpcName(e.target.value)} placeholder="e.g. Village Elder" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Sprite / Asset ID</label>
                  <Input value={npcSpriteId} onChange={e => setNpcSpriteId(e.target.value)} placeholder="e.g. npc-1 or custom asset name" />
                  {availableAssets.length > 0 && (
                    <select 
                      onChange={e => e.target.value !== 'NONE' && setNpcSpriteId(e.target.value)}
                      className="w-full mt-1.5 h-8 rounded border border-input bg-background px-2 text-[11px]"
                    >
                      <option value="NONE">-- Select Custom Asset Sprite --</option>
                      {availableAssets.map(a => (
                        <option key={a.id} value={a.filePath}>{a.name} ({a.category})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Link Quest</label>
                  <select 
                    value={selectedQuestId}
                    onChange={e => setSelectedQuestId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none"
                  >
                    <option value="NONE">-- No Quest Linked --</option>
                    {availableQuests.map(q => (
                      <option key={q.id} value={q.id}>{q.name} ({q.id})</option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded">
                  Click anywhere on the map canvas to anchor this NPC to that tile.
                </p>
              </div>
            )}

            {/* Placed NPCs list */}
            {placedNpcs.length > 0 && (
              <div className="pt-4 border-t border-border space-y-2">
                <span className="text-xs font-bold text-muted-foreground">Placed Map NPCs ({placedNpcs.length})</span>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {placedNpcs.map(npc => (
                    <div key={npc.id} className="flex items-center justify-between p-1.5 rounded bg-muted/40 text-xs">
                      <div className="truncate">
                        <span className="font-bold">{npc.name}</span> ({npc.x}, {npc.y})
                        {npc.questId && <span className="text-amber-400 ml-1">!</span>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleRemoveNpc(npc.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="w-full mt-4 gap-2" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Deploy Map & NPCs'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle>Canvas Editor</CardTitle>
            <CardDescription>
              {editorMode === 'TILES' 
                ? `Click & drag to paint tiles. (Cols: ${MAP_COLS}, Rows: ${MAP_ROWS})` 
                : 'Click on a tile to anchor your configured NPC with linked quest.'}
            </CardDescription>
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
