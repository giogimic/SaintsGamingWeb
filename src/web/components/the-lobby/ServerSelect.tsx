'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from './store';
import { Globe, Users, Server, Play, ArrowLeft } from 'lucide-react';

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
        const res = await fetch(`/api/game/server-status`);
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
    <div 
      className="absolute inset-0 z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500"
      style={{ backgroundColor: 'rgba(240, 248, 255, 0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="absolute top-8 left-8 text-slate-400 flex items-center gap-3 z-10">
        <div className="p-3 bg-white rounded-2xl shadow-sm border-2 border-slate-200">
          <Globe size={28} className="text-blue-400" />
        </div>
        <span className="font-extrabold tracking-widest text-2xl uppercase text-slate-700">Select Realm</span>
      </div>

      <div className="w-full max-w-2xl bg-white border-4 border-slate-200 rounded-[2rem] shadow-2xl flex flex-col relative z-10 overflow-hidden">
        <div className="bg-slate-50 p-6 border-b-4 border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-slate-800">Available Realms</h2>
          <span className="text-sm text-slate-500 font-bold uppercase tracking-wider bg-slate-200 px-3 py-1 rounded-full">Select a region</span>
        </div>

        <div className="p-6 flex flex-col gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar bg-slate-100">
          {servers.map(server => (
            <div 
              key={server.id}
              onClick={() => server.status === 'online' && setSelectedServer(server.id)}
              className={`p-5 rounded-2xl border-4 transition-all flex items-center justify-between shadow-sm ${
                server.status === 'offline' 
                  ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                  : selectedServer === server.id
                    ? 'bg-blue-50 border-blue-400 scale-[1.02] shadow-md'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 cursor-pointer hover:-translate-y-1'
              }`}
            >
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${server.status === 'online' ? 'bg-emerald-100 text-emerald-500' : 'bg-slate-200 text-slate-400'}`}>
                  <Server size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-xl mb-1">{server.name}</h3>
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">{server.region}</div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-slate-500 bg-white px-3 py-1.5 rounded-xl border-2 border-slate-100 shadow-sm">
                    <Users size={16} className="text-blue-400" />
                    {server.players} / {server.capacity}
                  </div>
                  <div className={`text-xs uppercase font-extrabold tracking-widest mt-2 px-2 py-0.5 rounded-md ${
                    server.status === 'online' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {server.status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 border-t-4 border-slate-200 flex justify-between items-center">
          <button 
            onClick={() => setGameMode('TITLE_SCREEN')}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-extrabold text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-all active:scale-95 border-2 border-slate-200"
          >
            <ArrowLeft size={20} strokeWidth={3} /> Back
          </button>
          <button 
            disabled={!selectedServer}
            onClick={handleConnect}
            className="px-8 py-3 bg-blue-500 hover:bg-blue-400 active:scale-95 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none text-white font-extrabold text-lg rounded-2xl transition-all shadow-[0_4px_0_0_#2563eb] hover:shadow-[0_2px_0_0_#2563eb] hover:translate-y-[2px] disabled:translate-y-[4px] flex items-center gap-2 uppercase tracking-wide"
          >
            <Play size={20} fill="currentColor" strokeWidth={3} /> Connect
          </button>
        </div>
      </div>
    </div>
  );
}
