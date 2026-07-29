'use client';

import { useState } from 'react';
import { useGameStore } from './store';
import { Globe, Users, Server, Play } from 'lucide-react';

const MOCK_SERVERS = [
  { id: 'us-east-1', name: 'Saints Realm (US-East)', region: 'North America', players: 124, capacity: 500, status: 'online' },
  { id: 'eu-west-1', name: 'Saints Realm (EU-West)', region: 'Europe', players: 89, capacity: 500, status: 'online' },
  { id: 'dev-1', name: 'Development Server', region: 'Local', players: 2, capacity: 50, status: 'offline' },
];

export default function ServerSelect() {
  const setGameMode = useGameStore((state) => state.setGameMode);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

  const handleConnect = () => {
    if (selectedServer) {
      // In the future, this will change the socket URL in index.tsx
      // For now, just advance to character select or exploring
      setGameMode('CHARACTER_SELECT');
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-500">
      <div className="absolute top-10 left-10 text-amber-500/50 flex items-center gap-2">
        <Globe size={24} />
        <span className="font-serif tracking-widest text-xl uppercase">Server Select</span>
      </div>

      <div className="w-full max-w-2xl bg-[#1e1a14] border border-[#52493d] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        <div className="bg-[#383024] p-4 border-b border-[#52493d] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#d5c3a3]">Available Realms</h2>
          <span className="text-xs text-gray-400 font-mono">Select a region to play</span>
        </div>

        <div className="p-4 flex flex-col gap-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
          {MOCK_SERVERS.map(server => (
            <div 
              key={server.id}
              onClick={() => server.status === 'online' && setSelectedServer(server.id)}
              className={`p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                server.status === 'offline' 
                  ? 'bg-red-950/20 border-red-900/30 opacity-50 cursor-not-allowed'
                  : selectedServer === server.id
                    ? 'bg-amber-900/40 border-amber-500 shadow-[0_0_15px_rgba(217,119,6,0.2)] cursor-pointer scale-[1.02]'
                    : 'bg-[#2a241d] border-[#383024] hover:border-amber-700/50 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-4">
                <Server size={24} className={server.status === 'online' ? 'text-emerald-500' : 'text-red-500'} />
                <div>
                  <h3 className="font-bold text-white text-lg">{server.name}</h3>
                  <div className="text-xs text-gray-400">{server.region}</div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-sm font-mono text-gray-300">
                    <Users size={14} />
                    {server.players} / {server.capacity}
                  </div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider ${
                    server.status === 'online' ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {server.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#383024] p-4 border-t border-[#52493d] flex justify-end gap-3">
          <button 
            onClick={() => setGameMode('TITLE_SCREEN')}
            className="px-6 py-2 rounded-lg font-bold text-gray-400 hover:text-white transition-colors"
          >
            Back
          </button>
          <button 
            disabled={!selectedServer}
            onClick={handleConnect}
            className="px-8 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-colors shadow-lg flex items-center gap-2"
          >
            <Play size={16} /> Connect
          </button>
        </div>
      </div>
    </div>
  );
}
