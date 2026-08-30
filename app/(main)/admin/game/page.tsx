'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';
import { 
  Gamepad2, MapPin, Sparkles, RefreshCw, Plus, Trash2, 
  RotateCcw, DollarSign, Package, Compass, Layers, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { 
  fetchGamePlayers, 
  adminGivePlayerItem, 
  adminResetPlayerPosition, 
  adminAdjustPlayerGold, 
  adminDeleteGameCharacter,
  fetchWorldMapsDetailed 
} from '@/app/actions/game-admin';

export default function GameOperationsPage() {
  const [activeTab, setActiveTab] = useState<'heroes' | 'maps' | 'telemetry'>('heroes');
  const [players, setPlayers] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State for Item Injector & Gold
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [itemId, setItemId] = useState('');
  const [amount, setAmount] = useState(1);
  const [goldDelta, setGoldDelta] = useState(500);

  const loadData = async () => {
    setLoading(true);
    const [playersRes, mapsRes] = await Promise.all([
      fetchGamePlayers(),
      fetchWorldMapsDetailed(),
    ]);

    if (playersRes.success) setPlayers(playersRes.data);
    else toast.error(playersRes.error || 'Failed to load players');

    if (mapsRes.success) setMaps(mapsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGiveItem = async () => {
    if (!selectedPlayer) return toast.error('Select a character first');
    if (!itemId) return toast.error('Enter an Item ID');
    if (amount <= 0) return toast.error('Amount must be positive');

    const res = await adminGivePlayerItem(selectedPlayer, itemId, amount);
    if (res.success) {
      toast.success(`Injected ${amount}x ${itemId} successfully!`);
      setItemId('');
      setAmount(1);
      loadData();
    } else {
      toast.error(res.error || 'Failed to inject item');
    }
  };

  const handleAdjustGold = async (delta: number) => {
    if (!selectedPlayer) return toast.error('Select a character first');
    const res = await adminAdjustPlayerGold(selectedPlayer, delta);
    if (res.success) {
      toast.success(`Gold updated (Balance: ${res.newGold})`);
      loadData();
    } else {
      toast.error(res.error || 'Failed to adjust gold');
    }
  };

  const handleResetPosition = async (charId: string) => {
    if (!confirm("Reset character spawn position to default DEMO_SANDBOX (8, 8)?")) return;
    const res = await adminResetPlayerPosition(charId, "DEMO_SANDBOX", 8, 8);
    if (res.success) {
      toast.success("Character unstuck & position reset to DEMO_SANDBOX.");
      loadData();
    } else {
      toast.error(res.error || "Failed to reset position");
    }
  };

  const handleDeleteCharacter = async (charId: string, charName: string) => {
    if (!confirm(`Permanently delete hero character "${charName}"? This cannot be undone.`)) return;
    const res = await adminDeleteGameCharacter(charId);
    if (res.success) {
      toast.success(`Character "${charName}" deleted.`);
      if (selectedPlayer === charId) setSelectedPlayer(null);
      loadData();
    } else {
      toast.error(res.error || "Failed to delete character");
    }
  };

  const selectedCharObj = players.find((p) => p.id === selectedPlayer);
  let parsedState: any = {};
  if (selectedCharObj?.stateData) {
    try {
      parsedState = JSON.parse(selectedCharObj.stateData);
    } catch {}
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">World &amp; MMO</span>
            <span className="text-xs text-muted-foreground/40">•</span>
            <span className="text-xs text-[#cbb26a] font-mono">Live Character Roster</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <Gamepad2 className="h-8 w-8 text-primary" />
            MMO &amp; Hero Operations
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View active Saint heroes, inject test items or currency, rescue players stuck out of bounds, and review world atlas maps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadData} variant="outline" size="sm" disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" asChild className="gap-2 bg-primary text-primary-foreground shadow-md">
            <Link href="/studio">
              <Sparkles className="h-4 w-4" /> Open World Studio
            </Link>
          </Button>
        </div>
      </div>

      {/* Operation Tabs Navigation */}
      <div className="flex gap-2 border-b border-border/40 pb-2 text-sm font-medium">
        <button
          onClick={() => setActiveTab('heroes')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'heroes' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Gamepad2 className="h-4 w-4" /> Active Heroes &amp; Inventory ({players.length})
        </button>
        <button
          onClick={() => setActiveTab('maps')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'maps' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Compass className="h-4 w-4" /> World Maps &amp; Atlas ({maps.length})
        </button>
      </div>

      {/* ─── TAB 1: HEROES & INVENTORY CONTROL ────────────────────────────────── */}
      {activeTab === 'heroes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Heroes List */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-card/40 border-border/50 sg-glass">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Registered Hero Characters
                </CardTitle>
                <CardDescription>Select a character to inject items, edit currency, or reset position.</CardDescription>
              </CardHeader>
              <CardContent>
                {players.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/20">
                    No characters found in the database.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/40 text-muted-foreground uppercase">
                        <tr>
                          <th className="px-3 py-2.5 rounded-tl-md font-semibold">User</th>
                          <th className="px-3 py-2.5 font-semibold">Hero Name</th>
                          <th className="px-3 py-2.5 font-semibold">Map &amp; Coords</th>
                          <th className="px-3 py-2.5 font-semibold">Gold</th>
                          <th className="px-3 py-2.5 text-right rounded-tr-md font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {players.map((p) => {
                          let pState: any = {};
                          try { pState = JSON.parse(p.stateData || '{}'); } catch {}
                          const isSelected = selectedPlayer === p.id;
                          return (
                            <tr 
                              key={p.id} 
                              className={`hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/10 font-medium' : ''}`}
                            >
                              <td className="px-3 py-2.5 font-semibold text-foreground">{p.user?.username || 'Unknown'}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span>{p.name}</span>
                                  <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 bg-muted/50">
                                    {p.spriteId}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-mono text-muted-foreground">
                                {p.mapId || 'DEMO'} ({p.x}, {p.y})
                              </td>
                              <td className="px-3 py-2.5 font-mono text-amber-400 font-bold">
                                ${(pState.gold ?? 0).toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 text-right space-x-1">
                                <Button 
                                  size="sm" 
                                  variant={isSelected ? "default" : "secondary"}
                                  className="h-7 text-xs px-2"
                                  onClick={() => setSelectedPlayer(p.id)}
                                >
                                  {isSelected ? 'Selected' : 'Select'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-7 text-xs px-1.5 text-muted-foreground hover:text-amber-400"
                                  title="Unstuck / Reset Position to (8, 8)"
                                  onClick={() => handleResetPosition(p.id)}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-7 text-xs px-1.5 text-destructive hover:bg-destructive/10"
                                  title="Delete Character"
                                  onClick={() => handleDeleteCharacter(p.id, p.name)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Character Action Panel */}
          <div className="space-y-6">
            <Card className="bg-card/40 border-border/50 sg-glass sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Hero Control &amp; Item Injector
                </CardTitle>
                <CardDescription>
                  {selectedCharObj ? `Operating on ${selectedCharObj.name}` : 'Select a hero from the left table to operate.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Target Information */}
                <div className="p-3 bg-muted/40 rounded-lg border border-border/40 space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-mono">Selected Character</div>
                  <div className="font-bold text-sm text-foreground">
                    {selectedCharObj ? `${selectedCharObj.name} (${selectedCharObj.user?.username})` : 'None Selected'}
                  </div>
                  {selectedCharObj && (
                    <div className="text-xs font-mono text-muted-foreground">
                      Level: {parsedState.level || 1} • Gold: ${parsedState.gold || 0} • Map: {selectedCharObj.mapId}
                    </div>
                  )}
                </div>

                {/* Quick Currency Modifier */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-amber-400" /> Currency Adjuster
                  </label>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      disabled={!selectedPlayer} 
                      onClick={() => handleAdjustGold(500)}
                      className="flex-1 text-xs"
                    >
                      +500 Gold
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      disabled={!selectedPlayer} 
                      onClick={() => handleAdjustGold(5000)}
                      className="flex-1 text-xs"
                    >
                      +5k Gold
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      disabled={!selectedPlayer} 
                      onClick={() => handleAdjustGold(-500)}
                      className="text-xs text-destructive hover:bg-destructive/10"
                    >
                      -500
                    </Button>
                  </div>
                </div>

                {/* Item Injector Form */}
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Item ID Injector
                  </label>
                  <Input 
                    value={itemId} 
                    onChange={e => setItemId(e.target.value)} 
                    placeholder="e.g. bronze_sword, patch_kit" 
                    disabled={!selectedPlayer}
                    className="font-mono text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      min="1" 
                      value={amount} 
                      onChange={e => setAmount(parseInt(e.target.value) || 1)} 
                      disabled={!selectedPlayer}
                      className="w-24 text-xs"
                    />
                    <Button 
                      onClick={handleGiveItem} 
                      disabled={!selectedPlayer || !itemId} 
                      className="flex-1 text-xs font-bold"
                    >
                      Inject Item
                    </Button>
                  </div>
                </div>

                {/* Unstuck Button */}
                {selectedCharObj && (
                  <div className="pt-2 border-t border-border/40">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleResetPosition(selectedCharObj.id)}
                      className="w-full text-xs gap-2"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Emergency Unstuck Character
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 2: WORLD MAPS & ATLAS BROWSER ────────────────────────────────── */}
      {activeTab === 'maps' && (
        <div className="space-y-4">
          <Card className="bg-card/40 border-border/50 sg-glass">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Compass className="h-5 w-5 text-purple-400" /> World Maps &amp; Atlas Registry
                </CardTitle>
                <CardDescription>Inspect map versions, gates, NPC spawns, and launch the 2.5D Studio.</CardDescription>
              </div>
              <Button size="sm" asChild className="gap-2">
                <Link href="/studio">
                  <Sparkles className="h-4 w-4" /> Open World Studio
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {maps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
                  No world maps found in database.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {maps.map((map) => (
                    <div 
                      key={map.id} 
                      className="p-4 rounded-xl border border-border/50 bg-background/50 flex flex-col justify-between gap-3 hover:border-primary/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-bold text-sm text-foreground truncate">{map.name}</h3>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            v{map.version}
                          </Badge>
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">{map.id}</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-muted/30 rounded-lg border border-border/30">
                        <div>
                          <div className="font-bold text-foreground">{map.gateCount}</div>
                          <div className="text-[10px] text-muted-foreground">Gates</div>
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{map.npcCount}</div>
                          <div className="text-[10px] text-muted-foreground">NPCs</div>
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{map.encounterCount}</div>
                          <div className="text-[10px] text-muted-foreground">Spawns</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(map.updatedAt).toLocaleDateString()}
                        </span>
                        <Button size="sm" variant="ghost" asChild className="h-7 text-xs gap-1 text-primary hover:bg-primary/10">
                          <Link href="/studio">
                            Edit in Studio <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
