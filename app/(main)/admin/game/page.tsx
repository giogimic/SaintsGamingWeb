'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { fetchGamePlayers, adminGivePlayerItem } from '@/app/actions/game-admin';

export default function GameAdminDashboard() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [itemId, setItemId] = useState('');
  const [amount, setAmount] = useState(1);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    setLoading(true);
    const res = await fetchGamePlayers();
    if (res.success) {
      setPlayers(res.data);
    } else {
      toast.error(res.error || 'Failed to load players');
    }
    setLoading(false);
  };

  const handleGiveItem = async () => {
    if (!selectedPlayer) return toast.error('Select a player first');
    if (!itemId) return toast.error('Enter an Item ID');
    if (amount <= 0) return toast.error('Amount must be positive');

    const res = await adminGivePlayerItem(selectedPlayer, itemId, amount);
    if (res.success) {
      toast.success(`Gave ${amount}x ${itemId} successfully!`);
      setItemId('');
      setAmount(1);
      loadPlayers(); // Refresh the data to show updated stats
    } else {
      toast.error(res.error || 'Failed to inject item');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Saints Sandbox Admin</h1>
          <p className="text-muted-foreground mt-1">Manage game state, view connected players, and inject items.</p>
        </div>
        <Button onClick={loadPlayers} variant="outline" disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PLAYERS LIST */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Characters</CardTitle>
              <CardDescription>All characters saved in the database.</CardDescription>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/20">
                  No players found in the database.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 font-semibold rounded-tl-md">Username</th>
                        <th className="px-4 py-3 font-semibold">Character Name</th>
                        <th className="px-4 py-3 font-semibold">Sprite</th>
                        <th className="px-4 py-3 font-semibold">Last Saved</th>
                        <th className="px-4 py-3 font-semibold text-right rounded-tr-md">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p) => (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{p.user?.username || 'Unknown'}</td>
                          <td className="px-4 py-3">{p.name}</td>
                          <td className="px-4 py-3">
                            <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-mono">
                              {p.spriteId}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(p.updatedAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              size="sm" 
                              variant={selectedPlayer === p.id ? "default" : "secondary"}
                              onClick={() => setSelectedPlayer(p.id)}
                            >
                              {selectedPlayer === p.id ? 'Selected' : 'Select'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ADMIN CONTROLS */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Item Injector</CardTitle>
              <CardDescription>Force an item into a player's inventory directly through the DB.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Target Player
                </label>
                <div className="p-3 bg-muted/50 rounded-md border font-mono text-sm break-all">
                  {selectedPlayer ? players.find(p => p.id === selectedPlayer)?.name : 'None Selected'}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Item ID (e.g., bronze_sword)
                </label>
                <Input 
                  value={itemId} 
                  onChange={e => setItemId(e.target.value)} 
                  placeholder="wood_log" 
                  disabled={!selectedPlayer}
                  className="font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Amount
                </label>
                <Input 
                  type="number" 
                  min="1" 
                  value={amount} 
                  onChange={e => setAmount(parseInt(e.target.value) || 1)} 
                  disabled={!selectedPlayer}
                />
              </div>

              <Button 
                onClick={handleGiveItem} 
                disabled={!selectedPlayer || !itemId} 
                className="w-full font-bold tracking-wide"
              >
                INJECT ITEM
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
