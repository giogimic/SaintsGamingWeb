'use client';

import React from 'react';
import { Save, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { useSession } from 'next-auth/react';

export const DungeonStudioPanel: React.FC = () => {
  const { data: session } = useSession();
  const isAdmin = (session?.user?.permissionLevel ?? 0) >= 3;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-slate-400 font-mono text-xs">
        <ShieldAlert className="w-8 h-8 mb-2 text-red-500/50" />
        <p>Admin permissions required to modify Dungeon definitions.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-300 font-mono text-xs">
      <div className="flex items-center justify-between p-2 border-b border-[#806f47]/20 bg-[#0a1120]">
        <h2 className="font-bold text-slate-100 flex items-center gap-2">
          <span>🏰 Dungeon Studio</span>
        </h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors border border-blue-500/30">
            <Plus className="w-3 h-3" /> New Dungeon
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/40 transition-colors border border-green-500/30">
            <Save className="w-3 h-3" /> Save Changes
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-[#806f47]/20 bg-[#0a1120] flex flex-col">
          <div className="p-2 border-b border-[#806f47]/20">
            <input 
              type="text" 
              placeholder="Search dungeons..." 
              className="w-full bg-transparent border border-[#806f47]/30 rounded px-2 py-1 text-slate-300"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="p-2 mb-1 rounded bg-blue-900/30 border border-blue-500/50 cursor-pointer flex justify-between group">
              <span>Example Dungeon</span>
              <Trash2 className="w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-2xl space-y-6">
            
            <div className="space-y-4 bg-transparent/50 p-4 rounded border border-[#806f47]/20">
              <h3 className="text-sm font-semibold text-blue-400 border-b border-[#806f47]/20 pb-2">Basic Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">ID</label>
                  <input type="text" className="w-full bg-black/50/50 border border-[#806f47]/30 rounded px-2 py-1 text-slate-300" disabled value="example_dungeon_1" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Name</label>
                  <input type="text" className="w-full bg-transparent border border-[#806f47]/30 rounded px-2 py-1 text-slate-300 focus:border-blue-500 outline-none" defaultValue="Example Dungeon" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-slate-500">Description</label>
                  <textarea className="w-full bg-transparent border border-[#806f47]/30 rounded px-2 py-1 text-slate-300 focus:border-blue-500 outline-none h-20" defaultValue="A dark and scary place." />
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-transparent/50 p-4 rounded border border-[#806f47]/20">
              <h3 className="text-sm font-semibold text-blue-400 border-b border-[#806f47]/20 pb-2">Requirements & Limits</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">Min Level</label>
                  <input type="number" className="w-full bg-transparent border border-[#806f47]/30 rounded px-2 py-1 text-slate-300" defaultValue="1" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Max Level</label>
                  <input type="number" className="w-full bg-transparent border border-[#806f47]/30 rounded px-2 py-1 text-slate-300" placeholder="None" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Max Players</label>
                  <input type="number" className="w-full bg-transparent border border-[#806f47]/30 rounded px-2 py-1 text-slate-300" defaultValue="4" />
                </div>
              </div>
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded bg-transparent border-[#806f47]/30 text-blue-500 focus:ring-blue-500" />
                  <span className="text-slate-300">Is Instanced (Private Room)</span>
                </label>
                <p className="text-slate-500 mt-1 ml-6 leading-tight">
                  If unchecked, all players will share the same public dungeon map instance. 
                  If checked, a new private instance is spawned per party.
                </p>
              </div>
            </div>

            <div className="space-y-4 bg-transparent/50 p-4 rounded border border-[#806f47]/20">
              <h3 className="text-sm font-semibold text-amber-400 border-b border-[#806f47]/20 pb-2 flex justify-between items-center">
                <span>Entry Conditions (Rule Engine)</span>
                <button className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 border border-[#806f47]/30 hover:bg-slate-700">Edit Rules</button>
              </h3>
              <div className="p-2 bg-black/50/40 border border-[#806f47]/20 rounded font-mono text-[10px] text-slate-400">
                {`{
  "type": "AND",
  "conditions": [
    { "type": "HAS_ITEM", "itemId": "dungeon_key_1", "qty": 1 }
  ]
}`}
              </div>
            </div>

            <div className="space-y-4 bg-transparent/50 p-4 rounded border border-[#806f47]/20">
              <h3 className="text-sm font-semibold text-emerald-400 border-b border-[#806f47]/20 pb-2 flex justify-between items-center">
                <span>Linked Maps</span>
                <button className="px-2 py-0.5 bg-slate-800 rounded text-slate-300 border border-[#806f47]/30 hover:bg-slate-700">Add Map</button>
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-black/50/40 border border-[#806f47]/20 rounded">
                  <span className="text-blue-300">DEMO_SANDBOX</span>
                  <Trash2 className="w-3 h-3 text-red-500 cursor-pointer hover:text-red-400" />
                </div>
              </div>
              <p className="text-slate-500 mt-1 leading-tight">
                These maps belong to the dungeon. When entering the dungeon, the party is teleported to the default spawn of the first map.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DungeonStudioPanel;
