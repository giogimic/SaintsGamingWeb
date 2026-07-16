"use client";

import { useEffect, useState } from "react";
import { getGameServers, addGameServer, toggleMaintenance, deleteGameServer } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Server, Trash2, Plus, Wrench } from "lucide-react";

export default function GameServersAdminPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newServer, setNewServer] = useState({ name: "", game: "Palworld", ip: "", port: 8211 });

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    setLoading(true);
    const data = await getGameServers();
    setServers(data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addGameServer(newServer);
    setNewServer({ name: "", game: "Palworld", ip: "", port: 8211 });
    loadServers();
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleMaintenance(id, !currentStatus);
    loadServers();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this server?")) {
      await deleteGameServer(id);
      loadServers();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Server className="h-8 w-8 text-primary" />
            Game Servers
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your official community servers. Toggle maintenance mode or add new ones.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : servers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No servers configured yet.
              </CardContent>
            </Card>
          ) : (
            servers.map((server) => (
              <Card key={server.id} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full \${server.isActive ? 'bg-green-500' : 'bg-orange-500'}`} />
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold">{server.name}</h3>
                      <p className="text-sm text-muted-foreground">{server.game} | {server.ip}:{server.port}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`maint-\${server.id}`} className="cursor-pointer flex items-center gap-1">
                          <Wrench className="w-4 h-4 text-orange-500" /> Maintenance
                        </Label>
                        <Switch
                          id={`maint-\${server.id}`}
                          checked={!server.isActive}
                          onCheckedChange={() => handleToggle(server.id, server.isActive)}
                        />
                      </div>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(server.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add New Server</CardTitle>
              <CardDescription>Register a new server to show up on the /servers page.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Server Name</Label>
                  <Input 
                    required 
                    placeholder="e.g. Saints Gaming #4" 
                    value={newServer.name}
                    onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Game</Label>
                  <Input 
                    required 
                    value={newServer.game}
                    onChange={(e) => setNewServer({ ...newServer, game: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>IP Address</Label>
                  <Input 
                    required 
                    placeholder="192.168.1.100" 
                    value={newServer.ip}
                    onChange={(e) => setNewServer({ ...newServer, ip: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input 
                    type="number" 
                    required 
                    value={newServer.port}
                    onChange={(e) => setNewServer({ ...newServer, port: parseInt(e.target.value) })}
                  />
                </div>
                <Button type="submit" className="w-full gap-2">
                  <Plus className="w-4 h-4" /> Add Server
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
