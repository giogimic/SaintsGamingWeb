'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from './store';
import { Globe, Users, Server, Play } from 'lucide-react';

interface ServerInfo {
  id: string;
  name: string;
  region: string;
  players: number;
  capacity: number;
  status: 'online' | 'offline';
}

export default function ServerSelect() {
  const setGameMode = useGameStore((state) => state.setGameMode);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [servers, setServers] = useState<ServerInfo[]>([
    { id: 'main', name: 'Saints Realm', region: 'Global', players: 0, capacity: 500, status: 'offline' }
  ]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const host = window.location.hostname;
        const res = await fetch(`http://${host}:3001/status`);
        if (res.ok) {
          const data = await res.json();
          setServers([
            { id: 'main', name: 'Saints Realm', region: 'Global', players: data.players, capacity: data.capacity, status: data.status }
          ]);
          setSelectedServer('main'); // Auto-select since there's only one
        }
      } catch (err) {
        console.error('Failed to fetch server status', err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = () => {
    if (selectedServer) {
      setGameMode('CHARACTER_SELECT');
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="absolute inset-0 pointer-events-none opacity-30" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #4c1d95 0%, #000 100%)' }} />
           
      <div className="absolute top-10 left-10 text-violet-400/50 flex items-center gap-2 z-10">
        <Globe size={24} />
        <span className="font-serif tracking-widest text-xl uppercase">Server Select</span>
      </div>

      <div className="w-full max-w-2xl sg-glass border border-white/10 rounded-xl shadow-[0_0_50px_rgba(139,92,246,0.3)] overflow-hidden flex flex-col relative z-10">
        <div className="bg-black/40 p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold sg-text-gradient">Available Realms</h2>
          <span className="text-xs text-gray-400 font-mono">Select a region to play</span>
        </div>

        <div className="p-4 flex flex-col gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {servers.map(server => (
            <div 
              key={server.id}
              onClick={() => server.status === 'online' && setSelectedServer(server.id)}
              className={`p-4 rounded-lg border transition-all flex items-center justify-between ${
                server.status === 'offline' 
                  ? 'bg-red-950/20 border-red-900/30 opacity-50 cursor-not-allowed'
                  : selectedServer === server.id
                    ? 'bg-violet-900/40 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.4)] cursor-pointer scale-[1.02]'
                    : 'bg-black/30 border-white/10 hover:border-violet-500/50 cursor-pointer hover:bg-violet-950/20'
              }`}
            >
              <div className="flex items-center gap-4">
                <Server size={24} className={server.status === 'online' ? 'text-emerald-400' : 'text-red-500'} />
                <div>
                  <h3 className="font-bold text-white text-lg">{server.name}</h3>
                  <div className="text-xs text-violet-300/70">{server.region}</div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-sm font-mono text-gray-300">
                    <Users size={14} className="text-violet-400" />
                    {server.players} / {server.capacity}
                  </div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${
                    server.status === 'online' ? 'text-emerald-400' : 'text-red-500'
                  }`}>
                    {server.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-black/40 p-4 border-t border-white/10 flex justify-end gap-3">
          <button 
            onClick={() => setGameMode('TITLE_SCREEN')}
            className="px-6 py-2 rounded-lg font-bold text-gray-400 hover:text-white transition-colors"
          >
            Back
          </button>
          <button 
            disabled={!selectedServer}
            onClick={handleConnect}
            className="px-8 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-gray-800 disabled:to-gray-900 disabled:text-gray-500 text-white font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)] hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] flex items-center gap-2"
          >
            <Play size={16} fill="currentColor" /> Connect
          </button>
        </div>
      </div>
    </div>
  );
}
