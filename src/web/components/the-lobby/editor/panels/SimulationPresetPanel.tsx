'use client';

import React from 'react';
import { Save, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { useSession } from 'next-auth/react';

export const SimulationPresetPanel: React.FC = () => {
  const { data: session } = useSession();
  const isAdmin = (session?.user?.permissionLevel ?? 0) >= 3;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-slate-400 font-mono text-xs">
        <ShieldAlert className="w-8 h-8 mb-2 text-red-500/50" />
        <p>Admin permissions required to modify Simulation Presets.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050b14] text-slate-300 font-mono text-xs">
      <div className="flex items-center justify-between p-2 border-b border-slate-800 bg-[#0a1120]">
        <h2 className="font-bold text-slate-100 flex items-center gap-2">
          <span>⚙️ Simulation Presets</span>
        </h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors border border-blue-500/30">
            <Plus className="w-3 h-3" /> New Preset
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/40 transition-colors border border-green-500/30">
            <Save className="w-3 h-3" /> Save Changes
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-800 bg-[#0a1120] flex flex-col">
          <div className="p-2 border-b border-slate-800">
            <input 
              type="text" 
              placeholder="Search presets..." 
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="p-2 rounded hover:bg-slate-800/50 cursor-pointer flex justify-between group">
              <span>Classic Experience</span>
              <Trash2 className="w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="p-2 rounded bg-blue-900/30 border border-blue-500/50 cursor-pointer flex justify-between group">
              <span>Hardcore Mode</span>
              <Trash2 className="w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="p-2 rounded hover:bg-slate-800/50 cursor-pointer flex justify-between group">
              <span>Seasonal Server</span>
              <Trash2 className="w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-3xl space-y-6">
            
            <div className="space-y-4 bg-slate-900/50 p-4 rounded border border-slate-800">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-sm font-semibold text-blue-400">Basic Info</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-slate-300">Set as Global Default</span>
                  <input type="checkbox" className="rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-blue-500" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-500">ID</label>
                  <input type="text" className="w-full bg-black/50 border border-slate-700 rounded px-2 py-1 text-slate-300" disabled value="sim_hardcore" />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500">Name</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:border-blue-500 outline-none" defaultValue="Hardcore Mode" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-slate-500">Description</label>
                  <textarea className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 focus:border-blue-500 outline-none h-16" defaultValue="A punishing simulation where drops and gold are incredibly rare." />
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-slate-900/50 p-4 rounded border border-slate-800">
              <h3 className="text-sm font-semibold text-amber-400 border-b border-slate-800 pb-2">Global Multipliers</h3>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-slate-500 flex justify-between">
                    <span>XP Yield</span>
                    <span className="text-amber-300 font-mono">0.5x</span>
                  </label>
                  <input type="range" min="0.1" max="5.0" step="0.1" defaultValue="0.5" className="w-full accent-amber-500" />
                  <p className="text-[10px] text-slate-500 leading-tight">Globally modifies all experience gained by characters.</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-slate-500 flex justify-between">
                    <span>Drop Rate</span>
                    <span className="text-amber-300 font-mono">0.25x</span>
                  </label>
                  <input type="range" min="0.1" max="5.0" step="0.05" defaultValue="0.25" className="w-full accent-amber-500" />
                  <p className="text-[10px] text-slate-500 leading-tight">Modifies base drop probability for all loot tables.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-500 flex justify-between">
                    <span>Gold Yield</span>
                    <span className="text-amber-300 font-mono">0.1x</span>
                  </label>
                  <input type="range" min="0.1" max="5.0" step="0.1" defaultValue="0.1" className="w-full accent-amber-500" />
                  <p className="text-[10px] text-slate-500 leading-tight">Modifies all gold drops and quest rewards.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationPresetPanel;
